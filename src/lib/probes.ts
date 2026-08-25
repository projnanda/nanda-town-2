/**
 * Probes. Each probe makes one scoped observation about one target at one time
 * and reports it in evidence language:
 *   state: "answered" | "auth_required" | "refused" | "no_answer" | "error"
 * We never say a service "is down" — we say it did not answer OUR probe at T.
 * Everything fetched here is untrusted data: size-capped, schema-checked,
 * truncated before storage, never executed, never treated as instructions.
 */
import { guardedFetch, GuardedFetchError } from "./guard";
import { parse as parseYaml } from "yaml";

export type ProbeState = "answered" | "auth_required" | "refused" | "no_answer" | "error";

export interface ProbeOutcome {
  probe: "http" | "mcp" | "a2a" | "openapi";
  target: string;
  state: ProbeState;
  latencyMs?: number;
  status?: number;
  detail: Record<string, unknown>;
  problems: string[];
}

const MCP_PROTOCOL = "2025-06-18";

function classify(status: number): ProbeState {
  if (status === 401 || status === 403) return "auth_required";
  if (status === 429) return "refused";
  if (status >= 200 && status < 400) return "answered";
  return "error";
}

function errOutcome(probe: ProbeOutcome["probe"], target: string, e: unknown): ProbeOutcome {
  if (e instanceof GuardedFetchError) {
    const state: ProbeState =
      e.reason === "timeout" || e.reason === "network" ? "no_answer" : "error";
    return { probe, target, state, detail: { reason: e.reason }, problems: [e.message] };
  }
  return {
    probe,
    target,
    state: "error",
    detail: {},
    problems: [e instanceof Error ? e.message.slice(0, 300) : "unknown error"],
  };
}

/** Plain HTTP(S) liveness. */
export async function probeHttp(url: string): Promise<ProbeOutcome> {
  try {
    const res = await guardedFetch(url, { maxBytes: 32_768 });
    return {
      probe: "http",
      target: url,
      state: classify(res.status),
      latencyMs: res.latencyMs,
      status: res.status,
      detail: {
        contentType: res.headers["content-type"] ?? null,
        server: res.headers["server"] ?? null,
        redirects: res.redirects,
      },
      problems: res.status >= 400 && res.status !== 401 && res.status !== 403 ? [`HTTP ${res.status}`] : [],
    };
  } catch (e) {
    return errOutcome("http", url, e);
  }
}

/** Parse a JSON-RPC response that may arrive as plain JSON or as an SSE stream. */
function parseRpcBody(bodyText: string, contentType: string | undefined): unknown {
  const ct = contentType ?? "";
  if (ct.includes("text/event-stream")) {
    for (const line of bodyText.split("\n")) {
      const t = line.trim();
      if (t.startsWith("data:")) {
        const payload = t.slice(5).trim();
        if (!payload) continue;
        try {
          const msg = JSON.parse(payload);
          if (msg && typeof msg === "object" && ("result" in msg || "error" in msg)) return msg;
        } catch {
          /* keep scanning */
        }
      }
    }
    return null;
  }
  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

async function mcpRpc(
  url: string,
  method: string,
  params: Record<string, unknown> | undefined,
  id: number,
  sessionId?: string,
): Promise<{ msg: unknown; status: number; latencyMs: number; sessionId?: string }> {
  const res = await guardedFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": MCP_PROTOCOL,
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }),
    maxBytes: 2_097_152,
  });
  return {
    msg: parseRpcBody(res.bodyText, res.headers["content-type"]),
    status: res.status,
    latencyMs: res.latencyMs,
    sessionId: res.headers["mcp-session-id"],
  };
}

/**
 * MCP handshake + tool introspection over streamable HTTP:
 * initialize → notifications/initialized → tools/list.
 */
export async function probeMcp(url: string): Promise<ProbeOutcome> {
  try {
    const init = await mcpRpc(
      url,
      "initialize",
      {
        protocolVersion: MCP_PROTOCOL,
        capabilities: {},
        clientInfo: { name: "nanda-town-2", version: "0.1.0" },
      },
      1,
    );

    if (init.status === 401 || init.status === 403) {
      return {
        probe: "mcp",
        target: url,
        state: "auth_required",
        status: init.status,
        latencyMs: init.latencyMs,
        detail: { note: "endpoint answered but requires authentication" },
        problems: [],
      };
    }

    const initMsg = init.msg as { result?: { serverInfo?: { name?: string; version?: string }; protocolVersion?: string; capabilities?: Record<string, unknown> }; error?: { message?: string; code?: number } } | null;

    if (!initMsg || (!initMsg.result && !initMsg.error)) {
      return {
        probe: "mcp",
        target: url,
        state: classify(init.status) === "answered" ? "error" : classify(init.status),
        status: init.status,
        latencyMs: init.latencyMs,
        detail: {},
        problems: [`HTTP ${init.status} but no parseable JSON-RPC response — is this an MCP streamable-HTTP endpoint?`],
      };
    }

    if (initMsg.error) {
      return {
        probe: "mcp",
        target: url,
        state: "answered",
        status: init.status,
        latencyMs: init.latencyMs,
        detail: { rpcError: { code: initMsg.error.code, message: String(initMsg.error.message ?? "").slice(0, 200) } },
        problems: [`initialize returned JSON-RPC error: ${String(initMsg.error.message ?? initMsg.error.code)}`],
      };
    }

    const serverInfo = initMsg.result?.serverInfo ?? {};
    const sessionId = init.sessionId;

    // Fire-and-forget per spec; some servers require it before further calls.
    try {
      await guardedFetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": MCP_PROTOCOL,
          ...(sessionId ? { "mcp-session-id": sessionId } : {}),
        },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
        maxBytes: 4096,
      });
    } catch {
      /* non-fatal */
    }

    const problems: string[] = [];
    let tools: { name: string; description: string }[] = [];
    try {
      const list = await mcpRpc(url, "tools/list", {}, 2, sessionId);
      const listMsg = list.msg as { result?: { tools?: { name?: string; description?: string }[] } } | null;
      const raw = listMsg?.result?.tools;
      if (Array.isArray(raw)) {
        tools = raw.slice(0, 50).map((t) => ({
          name: String(t?.name ?? "").slice(0, 120),
          description: String(t?.description ?? "").slice(0, 200),
        }));
      } else {
        problems.push("tools/list returned no tool array");
      }
    } catch (e) {
      problems.push(`tools/list failed: ${e instanceof Error ? e.message.slice(0, 200) : "error"}`);
    }

    return {
      probe: "mcp",
      target: url,
      state: "answered",
      status: init.status,
      latencyMs: init.latencyMs,
      detail: {
        serverName: String(serverInfo.name ?? "").slice(0, 120) || null,
        serverVersion: String(serverInfo.version ?? "").slice(0, 60) || null,
        protocolVersion: initMsg.result?.protocolVersion ?? null,
        toolCount: tools.length,
        tools,
      },
      problems,
    };
  } catch (e) {
    return errOutcome("mcp", url, e);
  }
}

/** A2A agent-card fetch: GET the card URL, check its basic shape. */
export async function probeA2A(url: string): Promise<ProbeOutcome> {
  try {
    const res = await guardedFetch(url, { headers: { accept: "application/json" }, maxBytes: 262_144 });
    const state = classify(res.status);
    if (state !== "answered") {
      return { probe: "a2a", target: url, state, status: res.status, latencyMs: res.latencyMs, detail: {}, problems: [`HTTP ${res.status}`] };
    }
    let card: Record<string, unknown> | null = null;
    try {
      card = JSON.parse(res.bodyText);
    } catch {
      return {
        probe: "a2a",
        target: url,
        state: "answered",
        status: res.status,
        latencyMs: res.latencyMs,
        detail: {},
        problems: ["endpoint answered but the body is not JSON — expected an A2A agent card"],
      };
    }
    const problems: string[] = [];
    for (const field of ["name", "url"]) {
      if (!card || typeof card[field] !== "string") problems.push(`agent card is missing "${field}"`);
    }
    const skills = Array.isArray(card?.skills) ? (card!.skills as unknown[]).length : 0;
    return {
      probe: "a2a",
      target: url,
      state: "answered",
      status: res.status,
      latencyMs: res.latencyMs,
      detail: {
        name: typeof card?.name === "string" ? card.name.slice(0, 120) : null,
        declaredUrl: typeof card?.url === "string" ? card.url.slice(0, 300) : null,
        skillCount: skills,
        hasCapabilities: !!card?.capabilities,
      },
      problems,
    };
  } catch (e) {
    return errOutcome("a2a", url, e);
  }
}

/** OpenAPI document fetch: parse safely (no $ref resolution), count operations. */
export async function probeOpenapi(url: string): Promise<ProbeOutcome> {
  try {
    const res = await guardedFetch(url, { maxBytes: 2_097_152 });
    const state = classify(res.status);
    if (state !== "answered") {
      return { probe: "openapi", target: url, state, status: res.status, latencyMs: res.latencyMs, detail: {}, problems: [`HTTP ${res.status}`] };
    }
    let doc: Record<string, unknown> | null = null;
    try {
      doc = res.bodyText.trimStart().startsWith("{")
        ? JSON.parse(res.bodyText)
        : (parseYaml(res.bodyText, { maxAliasCount: 100 }) as Record<string, unknown>);
    } catch {
      return {
        probe: "openapi",
        target: url,
        state: "answered",
        status: res.status,
        latencyMs: res.latencyMs,
        detail: {},
        problems: ["endpoint answered but the body is not parseable JSON/YAML"],
      };
    }
    const problems: string[] = [];
    const version = (doc?.openapi ?? doc?.swagger) as string | undefined;
    if (!version) problems.push('document has no "openapi" or "swagger" version field');
    const paths = (doc?.paths ?? {}) as Record<string, unknown>;
    const pathCount = Object.keys(paths).length;
    let opCount = 0;
    for (const p of Object.values(paths)) {
      if (p && typeof p === "object") {
        for (const m of ["get", "post", "put", "patch", "delete", "head", "options"]) {
          if (m in (p as Record<string, unknown>)) opCount += 1;
        }
      }
    }
    const info = (doc?.info ?? {}) as Record<string, unknown>;
    return {
      probe: "openapi",
      target: url,
      state: "answered",
      status: res.status,
      latencyMs: res.latencyMs,
      detail: {
        openapiVersion: version ? String(version).slice(0, 20) : null,
        title: typeof info.title === "string" ? info.title.slice(0, 120) : null,
        pathCount,
        operationCount: opCount,
        truncated: res.truncated,
      },
      problems,
    };
  } catch (e) {
    return errOutcome("openapi", url, e);
  }
}

export interface EntryUrls {
  mcp_url?: string;
  a2a_card_url?: string;
  openapi_url?: string;
  http_url?: string;
}

/** Run every probe that applies to a record's entry. */
export async function probeEntry(entry: EntryUrls): Promise<ProbeOutcome[]> {
  const jobs: Promise<ProbeOutcome>[] = [];
  if (entry.mcp_url) jobs.push(probeMcp(entry.mcp_url));
  if (entry.a2a_card_url) jobs.push(probeA2A(entry.a2a_card_url));
  if (entry.openapi_url) jobs.push(probeOpenapi(entry.openapi_url));
  if (entry.http_url) jobs.push(probeHttp(entry.http_url));
  return Promise.all(jobs);
}
