import Link from "next/link";
import { census, listRecords } from "@/lib/census";
import { RecordCard } from "@/components/town";

export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind: kindParam } = await searchParams;
  const kind = kindParam === "agent" || kindParam === "service" ? kindParam : undefined;
  const [records, c] = await Promise.all([listRecords(kind), census()]);

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`mono text-[0.72rem] uppercase tracking-widest px-3 py-1.5 rounded border ${
        active ? "border-accent text-accent bg-accent-soft" : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10">
      <div className="survey-label mb-2">the registry</div>
      <h1 className="display text-4xl">Records</h1>
      <p className="text-muted text-sm mt-1.5 max-w-2xl">
        Every record is a YAML file in a public git repo, claimed by a GitHub identity, probed on
        a schedule with its consent. Dot = latest probe observation
        {c.pulse.stale && (
          <span className="text-accent"> — pulse currently paused, states may be stale</span>
        )}
        .
      </p>

      <div className="flex gap-2 mt-5 mb-6">
        {tab("/records", "all", !kind)}
        {tab("/records?kind=agent", `agents · ${c.agents}`, kind === "agent")}
        {tab("/records?kind=service", `services · ${c.services}`, kind === "service")}
      </div>

      {records.length === 0 ? (
        <div className="parcel-open p-10 text-center">
          <p className="mono text-sm text-muted">no {kind ?? ""} records yet — the plots are open</p>
          <Link href="/list" className="mono text-[0.72rem] uppercase tracking-widest text-accent mt-2 inline-block">
            open a plot →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 pb-10">
          {records.map((r) => (
            <RecordCard key={r.slug} r={r} pulseStale={c.pulse.stale} />
          ))}
        </div>
      )}
    </div>
  );
}
