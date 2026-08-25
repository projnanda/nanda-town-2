import { db, schema } from "@/db/client";
import { and, eq, gte, sql } from "drizzle-orm";
import { pulseStatus } from "./pulse";

export interface Census {
  agents: number;
  services: number;
  probedLast7d: number;
  answeredLast7d: number;
  observations: number;
  pulse: { lastRanAt: string | null; stale: boolean };
  asOf: string;
}

/** Honest numbers only: everything here is recomputable from public data. */
export async function census(): Promise<Census> {
  const counts = await db
    .select({ kind: schema.records.kind, n: sql<number>`count(*)::int` })
    .from(schema.records)
    .where(eq(schema.records.status, "listed"))
    .groupBy(schema.records.kind);

  const agents = counts.find((c) => c.kind === "agent")?.n ?? 0;
  const services = counts.find((c) => c.kind === "service")?.n ?? 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const probed = await db
    .select({ slug: schema.evidence.recordSlug, answered: sql<boolean>`bool_or(outcome->>'state' = 'answered')` })
    .from(schema.evidence)
    .where(and(eq(schema.evidence.type, "liveness"), gte(schema.evidence.observedAt, weekAgo)))
    .groupBy(schema.evidence.recordSlug);

  const [obs] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.evidence);
  const pulse = await pulseStatus();

  return {
    agents,
    services,
    probedLast7d: probed.length,
    answeredLast7d: probed.filter((p) => p.answered).length,
    observations: obs?.n ?? 0,
    pulse: { lastRanAt: pulse.lastRanAt?.toISOString() ?? null, stale: pulse.stale },
    asOf: new Date().toISOString(),
  };
}

export interface RecordWithLiveness {
  slug: string;
  kind: string;
  name: string;
  summary: string;
  ownerGithub: string;
  entry: Record<string, unknown>;
  tags: string[];
  consentProbes: boolean;
  updatedAt: Date;
  lastLiveness: { state: string; observedAt: string; latencyMs: number | null } | null;
}

export async function listRecords(kind?: "agent" | "service"): Promise<RecordWithLiveness[]> {
  const rows = await db.execute(sql`
    select r.slug, r.kind, r.name, r.summary, r.owner_github, r.entry, r.tags, r.consent_probes, r.updated_at,
      (
        select jsonb_build_object('state', e.outcome->>'state', 'observedAt', e.observed_at, 'latencyMs', e.outcome->'latencyMs')
        from evidence e
        where e.record_slug = r.slug and e.type = 'liveness'
        order by e.observed_at desc limit 1
      ) as last_liveness
    from records r
    where r.status = 'listed' ${kind ? sql`and r.kind = ${kind}` : sql``}
    order by r.updated_at desc
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug),
    kind: String(r.kind),
    name: String(r.name),
    summary: String(r.summary),
    ownerGithub: String(r.owner_github),
    entry: (r.entry ?? {}) as Record<string, unknown>,
    tags: (r.tags ?? []) as string[],
    consentProbes: !!r.consent_probes,
    updatedAt: new Date(String(r.updated_at)),
    lastLiveness: (r.last_liveness ?? null) as RecordWithLiveness["lastLiveness"],
  }));
}
