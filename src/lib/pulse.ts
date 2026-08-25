/**
 * Town Pulse — the scheduled prober. Probes only records that are listed AND
 * consented. Writes evidence rows and a heartbeat. If the heartbeat goes
 * stale the UI switches every liveness surface to "pulse paused since T" —
 * the site is never allowed to claim freshness it does not have.
 */
import { db, schema } from "@/db/client";
import { and, eq, sql } from "drizzle-orm";
import { probeEntry, type EntryUrls } from "./probes";

export const PULSE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
export const PULSE_STALE_MS = PULSE_INTERVAL_MS * 2 + 30 * 60 * 1000; // 2 missed runs + grace

export function observerId(): string {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  return `town-pulse@${new URL(site).host}`;
}

export async function runPulse(): Promise<{ probed: number; observations: number }> {
  const targets = await db
    .select()
    .from(schema.records)
    .where(and(eq(schema.records.status, "listed"), eq(schema.records.consentProbes, true)));

  let probed = 0;
  let observations = 0;

  for (const rec of targets) {
    const entry = rec.entry as EntryUrls;
    const hasUrl = entry.mcp_url || entry.a2a_card_url || entry.openapi_url || entry.http_url;
    if (!hasUrl) continue;
    probed += 1;
    const outcomes = await probeEntry(entry);
    for (const o of outcomes) {
      await db.insert(schema.evidence).values({
        recordSlug: rec.slug,
        type: o.probe === "mcp" || o.probe === "a2a" || o.probe === "openapi" ? "structural" : "liveness",
        observer: observerId(),
        subjectFingerprint: rec.fingerprint,
        outcome: o as unknown as Record<string, unknown>,
      });
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
          },
        });
        observations += 1;
      }
      observations += 1;
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
