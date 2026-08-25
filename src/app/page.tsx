import { census, listRecords } from "@/lib/census";
import { CensusStrip, PlatMap } from "@/components/town";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [c, records] = await Promise.all([census(), listRecords()]);

  return (
    <div>
      {/* hero */}
      <section className="paper-texture border-b border-line-soft">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-12 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <div className="survey-label mb-4">registry + live inspector · internet of agents</div>
            <h1 className="display text-[clamp(2.6rem,5.5vw,4.4rem)] leading-[1.04]">
              A town for agents, where every claim is{" "}
              <em className="text-accent">a timestamped observation.</em>
            </h1>
            <p className="mt-6 max-w-xl text-[1.05rem] text-muted leading-relaxed">
              Nanda Town 2 lists AI agents and agent-facing services — and takes nobody&apos;s
              word for anything. Every listing consents to scheduled probes, every probe is
              public evidence, and the whole registry is a{" "}
              <a
                href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                className="underline decoration-line hover:decoration-accent"
              >
                git repository
              </a>{" "}
              you can fork. No badges, no scores — observations.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#inspect"
                className="mono text-[0.78rem] uppercase tracking-[0.14em] rounded-full bg-accent text-[#fff6ef] px-6 py-3 hover:bg-accent-light transition-colors"
              >
                Inspect an endpoint
              </a>
              <Link
                href="/list"
                className="mono text-[0.78rem] uppercase tracking-[0.14em] rounded-full border border-line px-6 py-3 text-ink hover:border-accent hover:text-accent transition-colors bg-card"
              >
                Open a plot
              </Link>
            </div>
          </div>
          <div className="illus aspect-[4/5] max-h-[440px] hidden sm:block">
            <Image
              src="/illustrations/img_01_home_hero.jpg"
              alt="Ink-and-wash drawing of a network: rust threads converging at nodes on cream paper"
              width={1120}
              height={1400}
              priority
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        {/* inspect — the single-player tool */}
        <section id="inspect" className="pt-12 pb-10 scroll-mt-20">
          <div className="parcel p-6 sm:p-7">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="display text-[1.7rem]">
                Inspect an endpoint, <em>right now.</em>
              </h2>
              <span className="stamp">free · no account</span>
            </div>
            <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
              Paste an MCP server URL, an A2A agent card, an OpenAPI document, or any http(s)
              endpoint. The town probes it live — handshake, declared tools, latency, problems —
              and hands you a shareable report. Agents can do the same via the{" "}
              <Link href="/docs" className="underline decoration-line hover:decoration-accent">
                MCP tool <code className="mono">inspect_url</code>
              </Link>
              .
            </p>
            <form action="/api/inspect" method="POST" className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <input
                name="url"
                type="url"
                required
                maxLength={300}
                placeholder="https://your-mcp-server.example.com/mcp"
                className="mono text-sm flex-1 rounded-full border border-line bg-bg px-4 py-2.5 outline-none focus:border-accent placeholder:text-faint"
              />
              <select
                name="type"
                className="mono text-sm rounded-full border border-line bg-bg px-4 py-2.5 outline-none focus:border-accent"
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
                className="mono text-[0.78rem] uppercase tracking-[0.14em] rounded-full bg-accent text-[#fff6ef] px-6 py-2.5 hover:bg-accent-light transition-colors"
              >
                Probe it
              </button>
            </form>
            <p className="mono text-[0.68rem] text-faint mt-3">
              ports 80/443 only · private addresses refused · one scoped observation, not a
              certificate · 12 probes/hour
            </p>
          </div>
        </section>

        {/* census */}
        <section className="pb-10">
          <div className="survey-label mb-2.5">the census — honest numbers only</div>
          <CensusStrip c={c} />
        </section>

        {/* plat map */}
        <section className="pb-12">
          <PlatMap records={records} pulseStale={c.pulse.stale} />
        </section>

        {/* three doors */}
        <section className="pb-12">
          <div className="grid lg:grid-cols-[0.9fr_2fr] gap-6 items-stretch">
            <div className="illus hidden lg:block">
              <Image
                src="/illustrations/img_03_constellations.jpg"
                alt="Ink constellation drawing: nodes joined by fine rust lines"
                width={900}
                height={1100}
              />
            </div>
            <div>
              <div className="survey-label mb-3">three doors, one town</div>
              <div className="grid sm:grid-cols-1 gap-3">
                <Link href="/list" className="parcel p-5 hover:border-accent transition-colors flex gap-5 items-start">
                  <div className="min-w-0">
                    <div className="display text-[1.35rem]">
                      Open a plot <em className="text-accent">— humans.</em>
                    </div>
                    <p className="text-sm text-muted mt-1 leading-relaxed">
                      List an agent or a service. One YAML file, one pull request — GitHub is the
                      authentication. Listing means consenting to probes. A student&apos;s weekend
                      agent and an enterprise&apos;s endpoint go through the same gate.
                    </p>
                  </div>
                </Link>
                <Link href="/docs" className="parcel p-5 hover:border-accent transition-colors">
                  <div className="display text-[1.35rem]">
                    Mount the registry <em className="text-accent">— agents.</em>
                  </div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    One MCP endpoint gives any agent the whole town: search listings, read
                    evidence, probe endpoints. Agents are first-class users here.
                  </p>
                </Link>
                <a
                  href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                  className="parcel p-5 hover:border-accent transition-colors"
                >
                  <div className="display text-[1.35rem]">
                    Fork the town <em className="text-accent">— builders.</em>
                  </div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    The registry is data in a public repo; the site and prober are open source.
                    Run your own town behind your own walls, or send PRs to this one.
                  </p>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* honesty block */}
        <section className="pb-12">
          <div className="parcel p-6 sm:p-7 bg-card-2">
            <div className="survey-label mb-3">what a listing here means — and doesn&apos;t</div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3 text-[0.95rem] leading-relaxed max-w-4xl">
              <p>
                <span className="text-alive font-semibold">It means:</span> a schema-valid record,
                claimed by a GitHub identity, that consented to scheduled probes — with every
                probe result published, timestamped, and attributed to its observer.
              </p>
              <p>
                <span className="text-accent font-semibold">It does not mean:</span> endorsed,
                safe, or reliable. One probe is one observation. When our prober itself is down,
                every liveness indicator on this site says so instead of pretending.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
