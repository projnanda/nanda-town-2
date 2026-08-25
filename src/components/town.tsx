import Link from "next/link";
import type { Census, RecordWithLiveness } from "@/lib/census";
import type { ProbeOutcome } from "@/lib/probes";

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "never";
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function stateColor(state?: string | null): { cls: string; label: string } {
  switch (state) {
    case "answered":
      return { cls: "bg-alive", label: "answered" };
    case "auth_required":
      return { cls: "bg-warn", label: "auth required" };
    case "refused":
      return { cls: "bg-warn", label: "refused" };
    case "no_answer":
      return { cls: "bg-accent", label: "no answer" };
    case "error":
      return { cls: "bg-accent", label: "error" };
    default:
      return { cls: "bg-faint", label: "not probed yet" };
  }
}

export function StateDot({ state, pulseStale }: { state?: string | null; pulseStale?: boolean }) {
  const { cls, label } = stateColor(state);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${pulseStale ? "bg-faint" : cls}`} />
      <span className="mono text-[0.68rem] uppercase tracking-wider text-muted">
        {pulseStale ? "pulse paused" : label}
      </span>
    </span>
  );
}

export function RecordCard({ r, pulseStale }: { r: RecordWithLiveness; pulseStale: boolean }) {
  const entryKinds = Object.entries(r.entry)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k]) => k.replace("_url", "").replace("_", " "));
  return (
    <Link
      href={`/r/${r.slug}`}
      className="parcel block p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="display font-semibold text-[1.05rem] truncate">{r.name}</span>
            <span className="mono text-[0.65rem] uppercase tracking-widest text-faint border border-line rounded px-1.5 py-0.5">
              {r.kind}
            </span>
          </div>
          <p className="text-sm text-muted mt-1 line-clamp-2">{r.summary}</p>
        </div>
        <StateDot state={r.lastLiveness?.state} pulseStale={pulseStale} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {entryKinds.map((k) => (
          <span key={k} className="mono text-[0.65rem] uppercase tracking-wider text-accent">
            {k}
          </span>
        ))}
        {r.lastLiveness && (
          <span className="mono text-[0.65rem] text-faint">
            observed {timeAgo(r.lastLiveness.observedAt)}
          </span>
        )}
        <span className="mono text-[0.65rem] text-faint">@{r.ownerGithub}</span>
      </div>
    </Link>
  );
}

export function CensusStrip({ c }: { c: Census }) {
  const item = (label: string, value: string | number) => (
    <div className="flex flex-col gap-0.5">
      <span className="mono text-xl font-medium tabular-nums">{value}</span>
      <span className="survey-label">{label}</span>
    </div>
  );
  return (
    <div className="parcel px-5 py-4 flex flex-wrap gap-x-10 gap-y-4 items-end">
      {item("agents listed", c.agents)}
      {item("services listed", c.services)}
      {item("answered probes · 7d", `${c.answeredLast7d}/${c.probedLast7d}`)}
      {item("observations on file", c.observations)}
      <div className="flex flex-col gap-0.5">
        <span className={`mono text-xl font-medium ${c.pulse.stale ? "text-accent" : "text-alive"}`}>
          {c.pulse.stale ? "paused" : "beating"}
        </span>
        <span className="survey-label">
          pulse · {c.pulse.lastRanAt ? timeAgo(c.pulse.lastRanAt) : "no runs yet"}
        </span>
      </div>
    </div>
  );
}

export function OutcomeCard({ o }: { o: ProbeOutcome }) {
  const { cls, label } = stateColor(o.state);
  const detail = o.detail as Record<string, unknown>;
  const tools = (detail.tools ?? null) as { name: string; description: string }[] | null;
  return (
    <div className="parcel p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />
          <span className="mono text-sm font-medium uppercase tracking-wider">{o.probe}</span>
          <span className="mono text-[0.7rem] text-muted uppercase tracking-wider">{label}</span>
        </div>
        <div className="mono text-[0.7rem] text-faint">
          {o.status ? `HTTP ${o.status} · ` : ""}
          {typeof o.latencyMs === "number" ? `${o.latencyMs}ms` : ""}
        </div>
      </div>
      <div className="mono text-[0.72rem] text-muted mt-1 break-all">{o.target}</div>

      {Object.keys(detail).length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {Object.entries(detail)
            .filter(([k, v]) => k !== "tools" && v !== null && v !== undefined && v !== "")
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="survey-label pt-0.5">{k}</dt>
                <dd className="mono text-[0.8rem] break-all">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </dd>
              </div>
            ))}
        </dl>
      )}

      {tools && tools.length > 0 && (
        <div className="mt-3">
          <div className="survey-label mb-1.5">declared tools ({tools.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((t) => (
              <span
                key={t.name}
                title={t.description}
                className="mono text-[0.7rem] border border-line rounded px-1.5 py-0.5 bg-card-2"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {o.problems.length > 0 && (
        <ul className="mt-3 space-y-1">
          {o.problems.map((p, i) => (
            <li key={i} className="text-sm text-accent flex gap-2">
              <span className="mono">▲</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The plat map: a data view of real records. Empty parcels are literally open. */
export function PlatMap({ records, pulseStale }: { records: RecordWithLiveness[]; pulseStale: boolean }) {
  const services = records.filter((r) => r.kind === "service").slice(0, 6);
  const agents = records.filter((r) => r.kind === "agent").slice(0, 8);
  const openServices = Math.max(0, 6 - services.length);
  const openAgents = Math.max(0, 8 - agents.length);

  const parcel = (r: RecordWithLiveness) => {
    const { cls } = stateColor(r.lastLiveness?.state);
    return (
      <Link
        key={r.slug}
        href={`/r/${r.slug}`}
        className="parcel relative p-3 min-h-[86px] flex flex-col justify-between hover:border-accent transition-colors"
      >
        <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${pulseStale ? "bg-faint" : cls}`} />
        <span className="mono text-[0.72rem] font-medium leading-tight pr-4 break-words">{r.name}</span>
        <span className="mono text-[0.62rem] uppercase tracking-wider text-faint">{r.kind}</span>
      </Link>
    );
  };

  const open = (i: number, kind: string) => (
    <Link
      key={`${kind}-open-${i}`}
      href="/list"
      className="parcel-open p-3 min-h-[86px] flex flex-col items-center justify-center gap-1 hover:border-accent hover:text-accent transition-colors"
    >
      <span className="mono text-[0.66rem] uppercase tracking-widest">open plot</span>
      <span className="mono text-[0.6rem]">{kind}</span>
    </Link>
  );

  return (
    <div className="parcel p-5 sm:p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <span className="survey-label">plat of survey — nanda town 2</span>
        <span className="mono text-[0.65rem] text-faint">parcels = real records · dashed = open</span>
      </div>

      <div className="survey-label mb-2">services</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {services.map(parcel)}
        {Array.from({ length: openServices }, (_, i) => open(i, "service"))}
      </div>

      <div className="relative my-5 h-8 flex items-center">
        <div className="absolute inset-x-0 border-t-2 border-dashed border-line" />
        <span className="relative mx-auto bg-card px-3 survey-label">main street</span>
      </div>

      <div className="survey-label mb-2">agents</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {agents.map(parcel)}
        {Array.from({ length: openAgents }, (_, i) => open(i, "agent"))}
      </div>
    </div>
  );
}
