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
          One registry, two kinds of records (agents and services), three doors (list, mount,
          fork). The registry&apos;s source of truth is the git repo{" "}
          <a className="underline decoration-line hover:decoration-accent" href={`https://github.com/${repo}`}>
            {repo}
          </a>{" "}
          — the database here is a derived index.
        </p>
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
            <span className="mono text-ink">search_records</span> — find listed agents/services,
            each with its latest probe observation
          </li>
          <li>
            <span className="mono text-ink">get_record</span> — one record + its recent evidence
          </li>
          <li>
            <span className="mono text-ink">get_census</span> — honest counts + prober freshness
          </li>
          <li>
            <span className="mono text-ink">inspect_url</span> — probe any endpoint right now
            (MCP handshake, A2A card, OpenAPI, HTTP) — use it to check your own server
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
          <span className="mono text-ink">records/services/&lt;slug&gt;.yaml</span>. A PR is the gate;
          GitHub is the authentication; CI validates. The{" "}
          <a className="underline decoration-line hover:decoration-accent" href="/list">
            Open a plot
          </a>{" "}
          form writes this file for you.
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
          <li>Only listed records with <span className="mono text-ink">consent.probes: true</span> are probed — listing a URL is consenting.</li>
          <li>Cadence: every 6 hours, plus a run at each deploy. Ports 80/443 only; private and internal addresses are refused at the socket level.</li>
          <li>Prober identity: <span className="mono text-ink">NandaTown2-Pulse/0.1</span> with a link back here. HTTP 429/403 pauses that target for a day and is recorded as &quot;refused&quot;, not &quot;down&quot;.</li>
          <li>Language rule: we publish &quot;did not answer our probe at T&quot; — never &quot;is down&quot;. One probe is one observation.</li>
          <li>Dead-man switch: when the prober itself misses its schedule, every liveness surface on this site says &quot;pulse paused&quot; instead of showing stale green dots.</li>
          <li>Opt out any time by deleting your record (PR). Evidence retention: 90 days rolling.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Evidence rules</h2>
        <ul className="text-sm text-muted space-y-1.5 list-disc list-inside leading-relaxed">
          <li>One evidence record = one observer, about one subject (an exact record fingerprint), at one time.</li>
          <li>A record never writes its own evidence.</li>
          <li>There are no scores, badges, or &quot;verified&quot; labels — only observation histories with timestamps and attributed observers.</li>
          <li>Everything shown is available raw over the API; anything you can&apos;t recompute, we don&apos;t show.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Who runs this</h2>
        <p className="text-sm text-muted leading-relaxed">
          Nanda Town 2 is an open-source project by <span className="text-ink">Project NANDA</span>{" "}
          (Foundation for Agentic Networks); the NANDA effort started as research at MIT Media
          Lab and is independent of MIT. All code and all registry data are public. Fork it,
          run your own town, or send PRs to this one.
        </p>
      </section>
    </div>
  );
}
