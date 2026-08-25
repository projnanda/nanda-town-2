import { notFound } from "next/navigation";
import Link from "next/link";
import { getInspection } from "@/lib/inspect";
import { OutcomeCard } from "@/components/town";

export const dynamic = "force-dynamic";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8,16}$/.test(id)) notFound();
  const report = await getInspection(id);
  if (!report) notFound();

  const answered = report.outcomes.some((o) => o.state === "answered");
  const problems = report.outcomes.flatMap((o) => o.problems);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-10">
      <div className="survey-label mb-2">inspection report · {report.id}</div>
      <h1 className="display text-2xl sm:text-3xl break-all">{report.targetUrl}</h1>
      <div className="mono text-[0.72rem] text-faint mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <span>observer {report.observer}</span>
        <span>observed {new Date(report.observedAt).toUTCString()}</span>
        <span>requested type: {report.requestedType}</span>
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <span className={`stamp ${answered ? "" : ""}`}>
          {answered ? "endpoint answered" : "no conclusive answer"}
        </span>
        {problems.length > 0 && (
          <span className="mono text-[0.72rem] text-accent">
            {problems.length} problem{problems.length > 1 ? "s" : ""} noted
          </span>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {report.outcomes.map((o, i) => (
          <OutcomeCard key={i} o={o} />
        ))}
      </div>

      <div className="mt-8 parcel p-4 bg-card-2 text-sm leading-relaxed">
        <div className="survey-label mb-1.5">what this is</div>
        <p className="text-muted">{report.note}</p>
        <p className="text-muted mt-2">
          Want this endpoint probed on a schedule with a public history?{" "}
          <Link href="/list" className="underline decoration-line hover:decoration-accent text-ink">
            Open a plot
          </Link>{" "}
          — listing is a pull request, and listing means consenting to probes.
        </p>
      </div>
    </div>
  );
}
