import { census, listRecords } from "@/lib/census";
import { CensusStrip, PlatMap } from "@/components/town";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [c, records] = await Promise.all([census(), listRecords()]);

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* hero */}
      <section className="pt-14 pb-10">
        <div className="survey-label mb-3">registry + live inspector · internet of agents</div>
        <h1 className="display text-4xl sm:text-6xl font-bold leading-[1.02] max-w-3xl">
          Every claim on this site is a<br className="hidden sm:block" /> timestamped{" "}
          <span className="text-accent">observation</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-[1.05rem] text-muted leading-relaxed">
          Nanda Town 2 is a registry of AI agents and agent-facing services where nothing is
          self-reported: every listing consents to scheduled probes, every probe is public
          evidence, and the whole registry is a{" "}
          <a
            href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
            className="underline decoration-line hover:decoration-accent"
          >
            git repository
          </a>{" "}
          you can fork. No badges, no scores, no certificates — observations.
        </p>
      </section>

      {/* inspect — the single-player tool */}
      <section id="inspect" className="pb-10 scroll-mt-20">
        <div className="parcel p-5 sm:p-6 border-l-4 border-l-accent">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="display text-xl font-semibold">Inspect an endpoint, right now</h2>
            <span className="stamp">free · no account</span>
          </div>
          <p className="text-sm text-muted mt-1.5 max-w-2xl">
            Paste an MCP server URL, an A2A agent card, an OpenAPI document, or any http(s)
            endpoint. The town probes it live — handshake, declared tools, latency, problems —
            and hands you a shareable report. Agents can do the same via the{" "}
            <Link href="/docs" className="underline decoration-line hover:decoration-accent">
              MCP tool <code className="mono">inspect_url</code>
            </Link>
            .
          </p>
          <form action="/api/inspect" method="POST" className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <input
              name="url"
              type="url"
              required
              maxLength={300}
              placeholder="https://your-mcp-server.example.com/mcp"
              className="mono text-sm flex-1 rounded border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent placeholder:text-faint"
            />
            <select
              name="type"
              className="mono text-sm rounded border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
              defaultValue="auto"
            >
              <option value="auto">auto-detect</option>
              <option value="mcp">MCP server</option>
              <option value="a2a">A2A agent card</option>
              <option value="openapi">OpenAPI doc</option>
              <option value="http">plain HTTP</option>
            </select>
            <button
              type="submit"
              className="mono text-sm uppercase tracking-wider rounded bg-accent text-white px-5 py-2.5 hover:opacity-90"
            >
              Probe it
            </button>
          </form>
          <p className="mono text-[0.68rem] text-faint mt-2.5">
            ports 80/443 only · private addresses refused · one scoped observation, not a
            certificate · 12 probes/hour
          </p>
        </div>
      </section>

      {/* census */}
      <section className="pb-10">
        <div className="survey-label mb-2">the census — honest numbers only</div>
        <CensusStrip c={c} />
      </section>

      {/* plat map */}
      <section className="pb-12">
        <PlatMap records={records} pulseStale={c.pulse.stale} />
      </section>

      {/* three doors */}
      <section className="pb-12">
        <div className="survey-label mb-3">three doors, one town</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/list" className="parcel p-5 hover:border-accent transition-colors">
            <div className="display font-semibold text-lg">Open a plot</div>
            <p className="text-sm text-muted mt-1.5">
              List an agent or a service. One YAML file, one pull request — GitHub is the
              authentication. Listing means consenting to probes.
            </p>
            <span className="mono text-[0.7rem] uppercase tracking-widest text-accent mt-3 inline-block">
              humans →
            </span>
          </Link>
          <Link href="/docs" className="parcel p-5 hover:border-accent transition-colors">
            <div className="display font-semibold text-lg">Mount the registry</div>
            <p className="text-sm text-muted mt-1.5">
              One MCP endpoint gives any agent the whole town: search listings, read evidence,
              probe endpoints. Agents are first-class users here.
            </p>
            <span className="mono text-[0.7rem] uppercase tracking-widest text-accent mt-3 inline-block">
              agents →
            </span>
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
            className="parcel p-5 hover:border-accent transition-colors"
          >
            <div className="display font-semibold text-lg">Fork the town</div>
            <p className="text-sm text-muted mt-1.5">
              The registry is data in a public repo; the site and prober are open source. Run
              your own town behind your own walls, or send PRs to this one.
            </p>
            <span className="mono text-[0.7rem] uppercase tracking-widest text-accent mt-3 inline-block">
              builders →
            </span>
          </a>
        </div>
      </section>

      {/* honesty block */}
      <section className="pb-12">
        <div className="parcel p-5 sm:p-6 bg-card-2">
          <div className="survey-label mb-2">what a listing here means — and doesn&apos;t</div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm leading-relaxed max-w-4xl">
            <p>
              <span className="text-alive font-semibold">It means:</span> a schema-valid record,
              claimed by a GitHub identity, that consented to scheduled probes — with every probe
              result published, timestamped, and attributed to its observer.
            </p>
            <p>
              <span className="text-accent font-semibold">It does not mean:</span> endorsed, safe,
              or reliable. One probe is one observation. When our prober itself is down, every
              liveness indicator on this site says so instead of pretending.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
