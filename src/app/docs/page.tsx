import Image from "next/image";

export const dynamic = "force-static";

function Code({ children }: { children: string }) {
  return (
    <pre className="parcel p-4 mono text-[0.78rem] leading-relaxed overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

export default function DocsPage() {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  const repo = process.env.NEXT_PUBLIC_RECORDS_REPO ?? "projnanda/nanda-town-2";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-10 space-y-10">
      <div>
        <div className="survey-label mb-2">documentation</div>
        <h1 className="display text-4xl">How the town works</h1>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          The registry holds two kinds of record, agents and services. Its source of truth is
          the repository{" "}
          <a className="underline decoration-line hover:decoration-accent" href={`https://github.com/${repo}`}>
            {repo}
          </a>{" "}
. The database behind this site is a derived index, rebuilt from that repository.
        </p>
        <div className="illus aspect-[16/5] mt-5">
          <Image
            src="/illustrations/post-office.jpg"
            alt="Abstract folded envelopes gliding along fine rust ink lines from a terracotta square"
            width={1600}
            height={900}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">For agents: mount the registry (MCP)</h2>
        <p className="text-sm text-muted leading-relaxed">
          The town is itself an MCP server (streamable HTTP, stateless, no auth for reads).
          Add it to Claude Code, Cursor, or any MCP client:
        </p>
        <Code>{`# Claude Code
claude mcp add --transport http nanda-town-2 ${site}/mcp

# any MCP client config
{
  "mcpServers": {
    "nanda-town-2": { "type": "http", "url": "${site}/mcp" }
  }
}`}</Code>
        <p className="text-sm text-muted leading-relaxed">Four tools:</p>
        <ul className="text-sm text-muted space-y-1.5 list-disc list-inside">
          <li>
            <span className="mono text-ink">search_records</span> — list agents and services,
            each with its most recent probe observation
          </li>
          <li>
            <span className="mono text-ink">get_record</span> — one record + its recent evidence
          </li>
          <li>
            <span className="mono text-ink">get_census</span> — registry counts and the time of the last prober run
          </li>
          <li>
            <span className="mono text-ink">inspect_url</span> — probe a supplied endpoint (MCP
            handshake, A2A card, OpenAPI, or HTTP) and return the result
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">REST API</h2>
        <Code>{`GET ${site}/api/town/census
GET ${site}/api/town/records
GET ${site}/api/town/records?kind=agent
GET ${site}/api/town/records/<slug>        # record + evidence
POST ${site}/api/inspect                   # {"url": "...", "type": "auto|mcp|a2a|openapi|http"}`}</Code>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Listing: the record file</h2>
        <p className="text-sm text-muted leading-relaxed">
          One YAML file per record at <span className="mono text-ink">records/agents/&lt;slug&gt;.yaml</span> or{" "}
          <span className="mono text-ink">records/services/&lt;slug&gt;.yaml</span>. Records are added by
          pull request, authentication is your GitHub account, and CI validates each submission. The{" "}
          <a className="underline decoration-line hover:decoration-accent" href="/list">
            Open a plot
          </a>{" "}
          form generates this file.
        </p>
        <Code>{`slug: acme-payments
kind: service
name: "Acme Payments MCP"
summary: "Hosted MCP server exposing quote/pay/refund tools for agent checkouts."
owner:
  github: acme-dev
entry:
  mcp_url: https://mcp.acme.com    # or a2a_card_url / openapi_url / http_url / skill_md / package
consent:
  probes: true                      # required when entry has a live URL
tags: [payments, mcp]`}</Code>
      </section>

      <section className="space-y-3" id="pulse">
        <h2 className="display text-[1.5rem]">The pulse (how probing works)</h2>
        <ul className="text-sm text-muted space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Only listed records with <span className="mono text-ink">consent.probes: true</span> are probed. Declaring a URL in a record constitutes consent.</li>
          <li>Cadence: every 6 hours, plus a run at each deploy. Ports 80/443 only; private and internal addresses are refused at the socket level.</li>
          <li>The prober identifies itself as <span className="mono text-ink">NandaTown2-Pulse/0.1</span> with a link to this page. A 403 or 429 response pauses that target for 24 hours and is recorded as &quot;refused&quot;.</li>
          <li>A probe result records whether an endpoint answered one request at one time. It is not a statement about the service&apos;s general availability.</li>
          <li>If the prober misses its schedule, liveness indicators across the site are marked paused rather than shown as current.</li>
          <li>Opt out any time by deleting your record (PR). Evidence retention: 90 days rolling.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Evidence rules</h2>
        <ul className="text-sm text-muted space-y-1.5 list-disc list-inside leading-relaxed">
          <li>One evidence record = one observer, about one subject (an exact record fingerprint), at one time.</li>
          <li>Evidence is written by the prober. A listing cannot write evidence about itself.</li>
          <li>The registry does not compute scores or assign verification labels. It stores observation histories with timestamps and named observers.</li>
          <li>Every value displayed on the site is available over the API and can be recomputed from the published records.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Who runs this</h2>
        <p className="text-sm text-muted leading-relaxed">
          Nanda Town 2 is an open-source project by <span className="text-ink">Project NANDA</span>{" "}
          (Foundation for Agentic Networks). The NANDA effort began as research at the MIT Media
          Lab and is independent of MIT. All code and registry data are public and may be forked,
          run independently, or amended by pull request.
        </p>
      </section>
    </div>
  );
}
