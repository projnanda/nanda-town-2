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

/** Every value here is recomputable from the published records. */
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

export interface RecordStats {
  slug: string;
  windowDays: number;
  liveness: {
    total: number;
    answered: number;
    answeredRate: number | null; // null when n = 0; never a fabricated 0%
    medianLatencyMs: number | null;
  };
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  lastState: string | null;
}

/**
 * Summary statistics for one record over a window. Reports n alongside every
 * rate so a percentage is never shown without its sample size; returns null
 * rather than 0% when there is no data.
 */
export async function recordStats(slug: string, windowDays = 30): Promise<RecordStats | null> {
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") return null;
  const rows = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where outcome->>'state' = 'answered')::int as answered,
      percentile_cont(0.5) within group (
        order by (outcome->>'latencyMs')::float
      ) filter (where outcome->>'state' = 'answered' and outcome->>'latencyMs' is not null) as median_latency,
      min(observed_at) as first_at,
      max(observed_at) as last_at
    from evidence
    where record_slug = ${slug} and type = 'liveness'
      and observed_at > now() - (${windowDays} || ' days')::interval
  `);
  const r = (rows.rows[0] ?? {}) as Record<string, unknown>;
  const total = Number(r.total ?? 0);
  const answered = Number(r.answered ?? 0);
  const [last] = await db
    .select()
    .from(schema.evidence)
    .where(and(eq(schema.evidence.recordSlug, slug), eq(schema.evidence.type, "liveness")))
    .orderBy(sql`observed_at desc`)
    .limit(1);
  return {
    slug,
    windowDays,
    liveness: {
      total,
      answered,
      answeredRate: total > 0 ? answered / total : null,
      medianLatencyMs: r.median_latency != null ? Math.round(Number(r.median_latency)) : null,
    },
    firstObservedAt: r.first_at ? new Date(String(r.first_at)).toISOString() : null,
    lastObservedAt: r.last_at ? new Date(String(r.last_at)).toISOString() : null,
    lastState: last ? String((last.outcome as Record<string, unknown>).state) : null,
  };
}
