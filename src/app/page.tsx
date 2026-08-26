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
            <div className="survey-label mb-4">agent and service registry</div>
            <h1 className="display text-[clamp(2.6rem,5.5vw,4.4rem)] leading-[1.04]">
              A public registry of AI agents and{" "}
              <em className="text-accent">the services they use.</em>
            </h1>
            <p className="mt-6 max-w-xl text-[1.05rem] text-muted leading-relaxed">
              Each listing is a YAML file in a{" "}
              <a
                href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                className="underline decoration-line hover:decoration-accent"
              >
                public repository
              </a>
              . Listings that declare an endpoint are probed on a schedule, and each probe is
              recorded with its time, its observer, and its result. The site displays those
              records. It does not rank, score, or certify.
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
              src="/illustrations/rooftops.jpg"
              alt="Abstract watercolor rooftops in ochre and sienna with one glowing terracotta window"
              width={1200}
              height={1500}
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
              <h2 className="display text-[1.7rem]">Inspect an endpoint</h2>
              <span className="stamp">no account required</span>
            </div>
            <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
              Submit an MCP server URL, an A2A agent card, an OpenAPI document, or any http(s)
              endpoint. The prober performs the relevant handshake and returns what it observed:
              declared tools, response status, latency, and any problems found. The report has a
              permanent link. The same probe is available to agents as the MCP tool{" "}
              <Link href="/docs" className="underline decoration-line hover:decoration-accent">
                <code className="mono">inspect_url</code>
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
              ports 80/443 only · private and internal addresses refused · 12 requests per hour
            </p>
          </div>
        </section>

        {/* census */}
        <section className="pb-10">
          <div className="survey-label mb-2.5">census</div>
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
                src="/illustrations/town-square.jpg"
                alt="Watercolor circles gathered in a ring around an open plaza of empty paper"
                width={1200}
                height={1200}
              />
            </div>
            <div>
              <div className="survey-label mb-3">how to take part</div>
              <div className="grid sm:grid-cols-1 gap-3">
                <Link href="/list" className="parcel p-5 hover:border-accent transition-colors">
                  <div className="survey-label mb-1">for people</div>
                  <div className="display text-[1.35rem]">Open a plot</div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    List an agent or a service by adding one YAML file through a pull request.
                    Authentication is your GitHub account. A listing that declares an endpoint
                    consents to scheduled probing. The same process applies to every submission.
                  </p>
                </Link>
                <Link href="/docs" className="parcel p-5 hover:border-accent transition-colors">
                  <div className="survey-label mb-1">for agents</div>
                  <div className="display text-[1.35rem]">Mount the registry</div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    The registry is available over MCP. One endpoint provides search, record
                    lookup, the census, and probing of an endpoint you supply.
                  </p>
                </Link>
                <a
                  href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                  className="parcel p-5 hover:border-accent transition-colors"
                >
                  <div className="survey-label mb-1">for developers</div>
                  <div className="display text-[1.35rem]">Fork the town</div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    The registry data, the site, and the prober are public under Apache 2.0. The
                    repository can be forked and run independently, or amended by pull request.
                  </p>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* the town at dusk — closing image */}
        <section className="pb-12">
          <div className="illus aspect-[16/6]">
            <Image
              src="/illustrations/town-dusk.jpg"
              alt="Abstract village at dusk: umber gabled silhouettes with small glowing orange windows"
              width={1600}
              height={900}
            />
          </div>
        </section>

        {/* scope */}
        <section className="pb-12">
          <div className="parcel p-6 sm:p-7 bg-card-2">
            <div className="survey-label mb-3">scope of a listing</div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3 text-[0.95rem] leading-relaxed max-w-4xl">
              <p>
                A listing indicates that a record passed schema validation, names a GitHub
                account as its owner, and — where it declares an endpoint — has consented to
                scheduled probing. Probe results are published with their time and observer.
              </p>
              <p>
                A listing does not indicate endorsement, security, or reliability. A probe
                describes one request at one time. If the prober has not run on schedule,
                liveness indicators are marked paused rather than shown as current.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
