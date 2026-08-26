/**
 * On-demand inspection: paste a URL, the town probes it right now and hands
 * back a structured, shareable report. This is the single-player tool — it is
 * useful with zero listings and zero accounts.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { probeA2A, probeHttp, probeMcp, probeOpenapi, type ProbeOutcome } from "./probes";
import { observerId } from "./pulse";

export type InspectType = "auto" | "mcp" | "a2a" | "openapi" | "http";

export interface InspectionReport {
  id: string;
  targetUrl: string;
  requestedType: InspectType;
  observer: string;
  observedAt: string;
  outcomes: ProbeOutcome[];
  note: string;
}

export async function runInspection(targetUrl: string, type: InspectType): Promise<InspectionReport> {
  const outcomes: ProbeOutcome[] = [];

  if (type === "mcp") outcomes.push(await probeMcp(targetUrl));
  else if (type === "a2a") outcomes.push(await probeA2A(targetUrl));
  else if (type === "openapi") outcomes.push(await probeOpenapi(targetUrl));
  else if (type === "http") outcomes.push(await probeHttp(targetUrl));
  else {
    // auto: try MCP first (cheap POST), fall back through the others.
    const mcp = await probeMcp(targetUrl);
    outcomes.push(mcp);
    const mcpConclusive =
      mcp.state === "answered" && !mcp.problems.some((p) => p.includes("is this an MCP"));
    if (!mcpConclusive) {
      const http = await probeHttp(targetUrl);
      outcomes.push(http);
      const looksJson = (http.detail.contentType as string | null)?.includes("json");
      if (looksJson) outcomes.push(await probeA2A(targetUrl));
      if (targetUrl.includes("openapi") || targetUrl.endsWith(".json") || targetUrl.endsWith(".yaml")) {
        outcomes.push(await probeOpenapi(targetUrl));
      }
    }
  }

  const report: InspectionReport = {
    id: randomUUID().slice(0, 13).replace("-", ""),
    targetUrl,
    requestedType: type,
    observer: observerId(),
    observedAt: new Date().toISOString(),
    outcomes,
    note: "This report describes one request made at one time by one observer. It is not an assessment of the service's security, reliability, or availability.",
  };

  await db.insert(schema.inspections).values({
    id: report.id,
    targetUrl,
    report: report as unknown as Record<string, unknown>,
  });

  return report;
}

export async function getInspection(id: string): Promise<InspectionReport | null> {
  const [row] = await db.select().from(schema.inspections).where(eq(schema.inspections.id, id));
  return row ? (row.report as unknown as InspectionReport) : null;
}
