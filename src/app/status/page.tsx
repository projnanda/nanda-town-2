import Image from "next/image";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { PULSE_INTERVAL_MS, pulseStatus } from "@/lib/pulse";
import { timeAgo } from "@/components/town";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [pulse, beats] = await Promise.all([
    pulseStatus(),
    db.select().from(schema.heartbeats).orderBy(desc(schema.heartbeats.ranAt)).limit(20),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-10">
      <div className="survey-label mb-2">prober status</div>
      <h1 className="display text-4xl">Status</h1>
      <p className="text-muted text-sm mt-2 max-w-xl leading-relaxed">
        Listed endpoints that have consented are probed on a schedule. This page reports whether
        the prober has run as scheduled. When it has not, liveness indicators elsewhere on the
        site are marked paused.
      </p>

      <div className="illus aspect-[16/5] mt-5">
        <Image
          src="/illustrations/pulse.jpg"
          alt="A single rust ink line rising into heartbeat peaks, stitching through small watercolor houses"
          width={1600}
          height={900}
        />
      </div>

      <div className="parcel p-5 mt-6 flex flex-wrap gap-x-10 gap-y-4 items-end">
        <div>
          <div className={`mono text-2xl font-medium ${pulse.stale ? "text-accent" : "text-alive"}`}>
            {pulse.stale ? "PAUSED" : "BEATING"}
          </div>
          <div className="survey-label mt-1">pulse</div>
        </div>
        <div>
          <div className="mono text-2xl font-medium tabular-nums">
            {pulse.lastRanAt ? timeAgo(pulse.lastRanAt) : "never"}
          </div>
          <div className="survey-label mt-1">last run</div>
        </div>
        <div>
          <div className="mono text-2xl font-medium tabular-nums">{Math.round(PULSE_INTERVAL_MS / 3600000)}h</div>
          <div className="survey-label mt-1">cadence</div>
        </div>
        <div>
          <div className="mono text-2xl font-medium tabular-nums">{pulse.probed}</div>
          <div className="survey-label mt-1">targets last run</div>
        </div>
      </div>

      <div className="survey-label mt-8 mb-2">recent heartbeats</div>
      {beats.length === 0 ? (
        <div className="parcel-open p-6 mono text-sm text-muted">
          no heartbeats yet — the pulse runs shortly after each deploy, then every{" "}
          {Math.round(PULSE_INTERVAL_MS / 3600000)} hours
        </div>
      ) : (
        <div className="parcel divide-y divide-line-soft">
          {beats.map((b) => (
            <div key={b.id} className="px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1 items-baseline">
              <span className="mono text-[0.78rem] tabular-nums">{b.ranAt.toISOString()}</span>
              <span className="mono text-[0.72rem] text-muted">probed {b.probed}</span>
              {b.notes && <span className="mono text-[0.72rem] text-faint">{b.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
