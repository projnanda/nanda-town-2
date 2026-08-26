/**
 * Town Pulse — the prober. Probes only records that are listed AND consented.
 * Writes evidence rows and a heartbeat. If the heartbeat goes stale the UI
 * switches every liveness surface to "pulse paused" — the site is never
 * allowed to claim freshness it does not have.
 *
 * The same probe path serves the 6-hour schedule and the per-record
 * "probe now" trigger; the trigger is recorded in each outcome.
 */
import { db, schema } from "@/db/client";
import { and, desc, eq, sql } from "drizzle-orm";
import { probeEntry, type EntryUrls, type ProbeOutcome } from "./probes";

export const PULSE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
export const PULSE_STALE_MS = PULSE_INTERVAL_MS * 2 + 30 * 60 * 1000; // 2 missed runs + grace

export type ProbeTrigger = "scheduled" | "manual";

export function observerId(): string {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  return `town-pulse@${new URL(site).host}`;
}

/**
 * Compare an MCP structural outcome's declared tool list with the previous
 * structural observation of the same target. A changed tool list between
 * probes is a capability change worth recording: the record file was frozen
 * while the service behind it moved.
 */
async function annotateToolDrift(slug: string, outcome: ProbeOutcome): Promise<ProbeOutcome> {
  if (outcome.probe !== "mcp" || outcome.state !== "answered") return outcome;
  const current = ((outcome.detail.tools ?? []) as { name: string }[]).map((t) => t.name);
  const [prev] = await db
    .select()
    .from(schema.evidence)
    .where(and(eq(schema.evidence.recordSlug, slug), eq(schema.evidence.type, "structural")))
    .orderBy(desc(schema.evidence.observedAt))
    .limit(1);
  if (!prev) return outcome;
  const prevOutcome = prev.outcome as unknown as ProbeOutcome;
  if (prevOutcome.probe !== "mcp" || prevOutcome.target !== outcome.target) return outcome;
  const previous = ((prevOutcome.detail?.tools ?? []) as { name: string }[]).map((t) => t.name);
  const added = current.filter((n) => !previous.includes(n));
  const removed = previous.filter((n) => !current.includes(n));
  if (added.length === 0 && removed.length === 0) return outcome;
  return {
    ...outcome,
    detail: {
      ...outcome.detail,
      toolsChangedSincePreviousProbe: { added, removed, previousObservedAt: prev.observedAt.toISOString() },
    },
  };
}

/** Probe one listed, consented record and write its evidence. */
export async function probeRecord(
  rec: typeof schema.records.$inferSelect,
  trigger: ProbeTrigger,
): Promise<number> {
  const entry = rec.entry as EntryUrls;
  const hasUrl = entry.mcp_url || entry.a2a_card_url || entry.openapi_url || entry.http_url;
  if (!hasUrl) return 0;

  let observations = 0;
  const outcomes = await probeEntry(entry);
  for (const raw of outcomes) {
    const o = await annotateToolDrift(rec.slug, raw);
    const withTrigger = { ...o, trigger } as unknown as Record<string, unknown>;
    await db.insert(schema.evidence).values({
      recordSlug: rec.slug,
      type: o.probe === "http" ? "liveness" : "structural",
      observer: observerId(),
      subjectFingerprint: rec.fingerprint,
      outcome: withTrigger,
    });
    observations += 1;
    // Every structural probe is also a liveness observation.
    if (o.probe !== "http") {
      await db.insert(schema.evidence).values({
        recordSlug: rec.slug,
        type: "liveness",
        observer: observerId(),
        subjectFingerprint: rec.fingerprint,
        outcome: {
          probe: o.probe,
          target: o.target,
          state: o.state,
          latencyMs: o.latencyMs ?? null,
          status: o.status ?? null,
          trigger,
        },
      });
      observations += 1;
    }
  }
  return observations;
}

export async function runPulse(): Promise<{ probed: number; observations: number }> {
  const targets = await db
    .select()
    .from(schema.records)
    .where(and(eq(schema.records.status, "listed"), eq(schema.records.consentProbes, true)));

  let probed = 0;
  let observations = 0;

  for (const rec of targets) {
    const n = await probeRecord(rec, "scheduled");
    if (n > 0) {
      probed += 1;
      observations += n;
    }
    // Be a polite neighbor: small gap between targets.
    await new Promise((r) => setTimeout(r, 500));
  }

  await db.insert(schema.heartbeats).values({ probed, notes: `observations=${observations}` });

  // Retention: keep evidence bounded (90 days).
  await db.execute(sql`delete from evidence where observed_at < now() - interval '90 days'`);
  await db.execute(sql`delete from inspections where created_at < now() - interval '30 days'`);

  return { probed, observations };
}

export async function pulseStatus(): Promise<{ lastRanAt: Date | null; stale: boolean; probed: number }> {
  const [hb] = await db
    .select()
    .from(schema.heartbeats)
    .orderBy(sql`ran_at desc`)
    .limit(1);
  if (!hb) return { lastRanAt: null, stale: true, probed: 0 };
  return {
    lastRanAt: hb.ranAt,
    stale: Date.now() - hb.ranAt.getTime() > PULSE_STALE_MS,
    probed: hb.probed,
  };
}
