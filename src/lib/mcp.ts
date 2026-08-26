/**
 * The town's own MCP server (streamable HTTP, stateless). Any agent can mount
 * https://<site>/mcp and get: registry search, record lookup, the census, and
 * the live endpoint inspector.
 */
import { census, listRecords } from "./census";
import { runInspection, type InspectType } from "./inspect";
import { db, schema } from "@/db/client";
import { and, desc, eq } from "drizzle-orm";

const PROTOCOL = "2025-06-18";

type Rpc = { jsonrpc?: string; id?: number | string | null; method?: string; params?: Record<string, unknown> };

const TOOLS = [
  {
    name: "search_records",
    description:
      "Search the Nanda Town 2 registry of agents and services. Returns listings with their most recent probe observation.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["agent", "service"], description: "Filter by kind" },
        q: { type: "string", description: "Substring match on name, summary, and tags" },
      },
    },
  },
  {
    name: "get_record",
    description: "Fetch one registry record by slug, including its recent evidence (probe observations).",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "get_census",
    description:
      "Registry counts: listed agents and services, how many answered a probe in the last 7 days, and when the prober last ran.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "inspect_url",
    description:
      "Probe a supplied endpoint and return a structured report: MCP handshake and tool list, A2A agent card check, OpenAPI parse, or HTTP response. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The http(s) endpoint to probe (ports 80/443 only)" },
        type: { type: "string", enum: ["auto", "mcp", "a2a", "openapi", "http"], description: "Probe type, default auto" },
      },
      required: ["url"],
    },
  },
] as const;

function ok(id: Rpc["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcErr(id: Rpc["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
function text(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

async function callTool(name: string, args: Record<string, unknown>, allowInspect: () => boolean) {
  switch (name) {
    case "search_records": {
      const kind = args.kind === "agent" || args.kind === "service" ? args.kind : undefined;
      const q = typeof args.q === "string" ? args.q.toLowerCase().slice(0, 100) : undefined;
      let rows = await listRecords(kind);
      if (q) {
        rows = rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.summary.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q)),
        );
      }
      return text({
        count: rows.length,
        records: rows.slice(0, 50).map((r) => ({
          slug: r.slug,
          kind: r.kind,
          name: r.name,
          summary: r.summary,
          entry: r.entry,
          tags: r.tags,
          lastProbe: r.lastLiveness,
        })),
      });
    }
    case "get_record": {
      const slug = String(args.slug ?? "");
      const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
      if (!rec || rec.status !== "listed") return text({ error: `no listed record with slug "${slug}"` });
      const ev = await db
        .select()
        .from(schema.evidence)
        .where(and(eq(schema.evidence.recordSlug, slug)))
        .orderBy(desc(schema.evidence.observedAt))
        .limit(20);
      return text({
        record: {
          slug: rec.slug,
          kind: rec.kind,
          name: rec.name,
          summary: rec.summary,
          owner: { github: rec.ownerGithub },
          entry: rec.entry,
          tags: rec.tags,
          fingerprint: rec.fingerprint,
        },
        evidence: ev.map((e) => ({
          type: e.type,
          observer: e.observer,
          observedAt: e.observedAt.toISOString(),
          outcome: e.outcome,
        })),
      });
    }
    case "get_census":
      return text(await census());
    case "inspect_url": {
      if (!allowInspect()) return text({ error: "rate limit exceeded — try again later" });
      const url = String(args.url ?? "");
      const type = (["auto", "mcp", "a2a", "openapi", "http"].includes(String(args.type)) ? args.type : "auto") as InspectType;
      const report = await runInspection(url, type);
      const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
      return text({ reportUrl: `${site}/inspect/${report.id}`, ...report });
    }
    default:
      return null;
  }
}

/** Handle one JSON-RPC message; returns the response body or null (notification). */
export async function handleMcpMessage(msg: Rpc, allowInspect: () => boolean): Promise<unknown | null> {
  if (!msg || typeof msg.method !== "string") {
    return rpcErr(msg?.id ?? null, -32600, "invalid request");
  }
  const isNotification = msg.id === undefined;

  switch (msg.method) {
    case "initialize":
      return ok(msg.id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "nanda-town-2", title: "Nanda Town 2 Registry", version: "0.1.0" },
        instructions:
          "A registry of AI agents and agent-facing services. Use search_records and get_record to look up listings and their probe history, and inspect_url to probe a supplied endpoint. Each probe result describes one request at one time; the registry does not score or certify listings.",
      });
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(name, args, allowInspect);
        if (result === null) return rpcErr(msg.id, -32602, `unknown tool: ${name}`);
        return ok(msg.id, result);
      } catch (e) {
        return ok(msg.id, {
          content: [{ type: "text", text: `tool error: ${e instanceof Error ? e.message : "unknown"}` }],
          isError: true,
        });
      }
    }
    default:
      if (isNotification) return null; // notifications/* — accept silently
      return rpcErr(msg.id, -32601, `method not found: ${msg.method}`);
  }
}
