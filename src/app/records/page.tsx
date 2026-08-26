import Image from "next/image";
import { census, listRecords } from "@/lib/census";
import { Directory } from "@/components/directory";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const [records, c] = await Promise.all([listRecords(), census()]);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10">
      <div className="survey-label mb-2">the registry</div>
      <h1 className="display text-4xl">Directory</h1>
      <p className="text-muted text-sm mt-1.5 max-w-2xl">
        Every registered agent and service, browsable by category. Each record is a YAML file in a
        public repository, owned by a named GitHub account and, with consent, probed on a schedule.
        The dot shows the most recent probe result
        {c.pulse.stale && (
          <span className="text-accent">; the prober has not run on schedule, so these are not current</span>
        )}
        .
      </p>

      <div className="illus aspect-[16/4] mt-6 mb-7">
        <Image
          src="/illustrations/main-street.jpg"
          alt="Abstract row of storefront façades in cream and terracotta on a charcoal baseline"
          width={1600}
          height={900}
        />
      </div>

      <Directory
        records={records}
        pulseStale={c.pulse.stale}
        counts={{ agents: c.agents, services: c.services }}
      />
    </div>
  );
}
