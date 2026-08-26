import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { pulseStatus } from "@/lib/pulse";
import { isValidSlug } from "@/lib/records";
import { OutcomeCard, StateDot, timeAgo } from "@/components/town";
import { ProbeButton } from "@/components/probe-button";
import { recordStats } from "@/lib/census";
import type { ProbeOutcome } from "@/lib/probes";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") notFound();

  const [ev, pulse, stats, versions] = await Promise.all([
    db
      .select()
      .from(schema.evidence)
      .where(and(eq(schema.evidence.recordSlug, slug)))
      .orderBy(desc(schema.evidence.observedAt))
      .limit(40),
    pulseStatus(),
    recordStats(slug, 30),
    db
      .select({ id: schema.recordHistory.id })
      .from(schema.recordHistory)
      .where(eq(schema.recordHistory.recordSlug, slug)),
  ]);

  const liveness = ev.filter((e) => e.type === "liveness");
  const structural = ev.filter((e) => e.type === "structural");
  const latest = liveness[0];
  const entry = rec.entry as Record<string, unknown>;

  // 30-day answered series for the tally strip.
  const tally = liveness.slice(0, 30).map((e) => ({
    ok: (e.outcome as Record<string, unknown>).state === "answered",
    at: e.observedAt,
  }));

  return (
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-10">
      <div className="survey-label mb-2">
        record · {rec.kind} · parcel {rec.slug}
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="display text-4xl">{rec.name}</h1>
        <StateDot
          state={latest ? String((latest.outcome as Record<string, unknown>).state) : undefined}
          pulseStale={pulse.stale}
        />
      </div>
      <p className="text-muted mt-2 max-w-2xl">{rec.summary}</p>

      <div className="mono text-[0.72rem] text-faint mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <span>owner @{rec.ownerGithub}</span>
        <span>fingerprint {rec.fingerprint.slice(0, 20)}…</span>
        <span>updated {timeAgo(rec.updatedAt)}</span>
        {rec.tags.length > 0 && <span>tags: {rec.tags.join(", ")}</span>}
      </div>

      {rec.consentProbes && (
        <section className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          {stats && stats.liveness.total > 0 ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="mono text-lg font-medium tabular-nums">
                  {stats.liveness.answeredRate != null
                    ? `${Math.round(stats.liveness.answeredRate * 100)}%`
                    : "—"}
                </span>
                <span className="survey-label">
                  answered · {stats.liveness.answered}/{stats.liveness.total} · {stats.windowDays}d
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="mono text-lg font-medium tabular-nums">
                  {stats.liveness.medianLatencyMs != null ? `${stats.liveness.medianLatencyMs}ms` : "—"}
                </span>
                <span className="survey-label">median latency</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="mono text-lg font-medium">—</span>
              <span className="survey-label">no observations in window</span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="mono text-lg font-medium tabular-nums">{versions.length}</span>
            <span className="survey-label">record version{versions.length === 1 ? "" : "s"}</span>
          </div>
          <ProbeButton slug={rec.slug} />
        </section>
      )}

      {/* entry / how to reach it */}
      <section className="mt-8">
        <div className="survey-label mb-2">ways in</div>
        <div className="parcel p-4 space-y-2">
          {Object.entries(entry)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-x-4 gap-y-0.5 items-baseline">
                <span className="survey-label w-28 shrink-0">{k.replace(/_/g, " ")}</span>
                <span className="mono text-[0.8rem] break-all">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          {rec.consentProbes ? (
            <div className="mono text-[0.68rem] text-alive pt-1">
              ✓ consented to scheduled probes
            </div>
          ) : (
            <div className="mono text-[0.68rem] text-faint pt-1">
              no live URL — not probed (package/skill entry)
            </div>
          )}
        </div>
      </section>

      {/* liveness history */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
          <div className="survey-label">liveness — last {tally.length} observations</div>
          {pulse.stale && (
            <span className="mono text-[0.68rem] text-accent">
              prober last ran {pulse.lastRanAt ? timeAgo(pulse.lastRanAt) : "never"}; the history
              below is complete up to that point
            </span>
          )}
        </div>
        {tally.length === 0 ? (
          <div className="parcel-open p-5 mono text-sm text-muted">no probe observations yet</div>
        ) : (
          <div className="parcel p-4">
            <div className="flex gap-1 flex-wrap">
              {tally
                .slice()
                .reverse()
                .map((t, i) => (
                  <span
                    key={i}
                    title={`${t.ok ? "answered" : "did not answer"} · ${t.at.toISOString()}`}
                    className={`inline-block w-3 h-6 rounded-sm ${t.ok ? "bg-alive" : "bg-accent"}`}
                  />
                ))}
            </div>
            <div className="mono text-[0.68rem] text-faint mt-2">
              one bar per probe by {latest?.observer} · green: the endpoint answered · orange: no
              answer at that time
            </div>
          </div>
        )}
      </section>

      {/* structural evidence */}
      {structural.length > 0 && (
        <section className="mt-8">
          <div className="survey-label mb-2">structural evidence — what it declared when probed</div>
          <div className="space-y-3">
            {structural.slice(0, 3).map((e) => (
              <div key={e.id}>
                <div className="mono text-[0.66rem] text-faint mb-1">
                  observed {timeAgo(e.observedAt)} by {e.observer} · subject {e.subjectFingerprint.slice(0, 16)}…
                </div>
                <OutcomeCard o={e.outcome as unknown as ProbeOutcome} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="parcel p-4 bg-card-2 mono text-[0.72rem] text-muted leading-relaxed">
          Each evidence record names one observer, one subject, and one time. Evidence is
          written by the prober, not by the listing. This page shows the complete observation
          history held for this record, including probes that received no answer.
          Raw JSON: <span className="text-ink">/api/town/records/{rec.slug}</span>
        </div>
      </section>
    </div>
  );
}
