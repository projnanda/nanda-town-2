export const dynamic = "force-static";

function Term({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="mono text-[0.8rem] text-ink pt-0.5">{t}</dt>
      <dd className="text-sm text-muted">{children}</dd>
    </div>
  );
}

export default function MethodsPage() {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-10 space-y-9">
      <div>
        <div className="survey-label mb-2">method</div>
        <h1 className="display text-4xl">How observations are made</h1>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          This page defines the probe procedure, the observation states, and the limits of what a
          probe establishes. It is the reference for interpreting anything shown elsewhere on the
          site. Every figure the site reports is derivable from the evidence export at{" "}
          <a className="underline decoration-line hover:decoration-accent" href="/api/town/evidence">
            /api/town/evidence
          </a>
          .
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Probe procedure</h2>
        <p className="text-sm text-muted leading-relaxed">
          A record is probed only when it is listed and has set{" "}
          <span className="mono text-ink">consent.probes: true</span>. Each probe is performed for
          every endpoint the record declares:
        </p>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 mt-1">
          <Term t="MCP">
            A JSON-RPC <span className="mono">initialize</span> call over streamable HTTP, followed
            by <span className="mono">notifications/initialized</span> and{" "}
            <span className="mono">tools/list</span>. The declared server name, protocol version,
            and tool list are recorded.
          </Term>
          <Term t="A2A">
            An HTTP GET of the agent-card URL. The response is parsed as JSON and checked for the
            required <span className="mono">name</span> and <span className="mono">url</span> fields.
          </Term>
          <Term t="OpenAPI">
            An HTTP GET of the document, parsed as JSON or YAML without resolving external
            references. The version, path count, and operation count are recorded.
          </Term>
          <Term t="HTTP">A plain GET; the response status, latency, and server header are recorded.</Term>
        </dl>
        <p className="text-sm text-muted leading-relaxed">
          Requests use ports 80 and 443 only, follow at most five redirects with each hop
          re-validated, time out at ten seconds, and cap the response body read. The prober
          identifies itself as <span className="mono text-ink">NandaTown2-Pulse/0.1</span> with a
          link to this page. The scheduled cadence is every six hours; a listed record may also be
          probed on demand from its page or via{" "}
          <span className="mono text-ink">POST /api/town/records/&lt;slug&gt;/probe</span>. Each
          observation records whether it was <span className="mono">scheduled</span> or{" "}
          <span className="mono">manual</span>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Observation states</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
          <Term t="answered">The endpoint returned a response with status 2xx or 3xx.</Term>
          <Term t="auth_required">The endpoint returned 401 or 403. It is reachable but declined the unauthenticated probe.</Term>
          <Term t="refused">The endpoint returned 429. The target is paused for 24 hours after this result.</Term>
          <Term t="no_answer">No response was received within the timeout, or the connection failed.</Term>
          <Term t="error">A response was received but could not be interpreted for the requested probe type, or the address was refused before connection.</Term>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Statistics</h2>
        <p className="text-sm text-muted leading-relaxed">
          Summary statistics at{" "}
          <span className="mono text-ink">/api/town/records/&lt;slug&gt;/stats</span> report the
          number of liveness observations in the window (n), the count that answered, the answered
          rate, and the median latency of answered probes. A rate is reported only when n is
          greater than zero; when n is zero the rate is <span className="mono">null</span> rather
          than a fabricated 0%. A rate over a small n carries a correspondingly wide uncertainty,
          which is why n is always reported alongside it. The window is a query parameter (1 to 90
          days, default 30).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Evidence model</h2>
        <p className="text-sm text-muted leading-relaxed">
          One evidence record states one observation: an observer, a subject (identified by the
          exact record fingerprint probed), a time, and an outcome. Evidence is written by the
          prober; a record cannot write evidence about itself. Records are retained for 90 days.
          Because evidence names the fingerprint of the record version it observed, a result never
          silently transfers to a later, edited version of the same record.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Capability change detection</h2>
        <p className="text-sm text-muted leading-relaxed">
          For MCP endpoints, each structural observation&apos;s tool list is compared with the
          previous one for the same target. When the set changes, the observation records the
          added and removed tool names and the time of the prior observation. A record file is
          frozen at merge, but the service it points to can change underneath it; this comparison
          surfaces that drift.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Limitations</h2>
        <ul className="text-sm text-muted space-y-1.5 list-disc list-inside leading-relaxed">
          <li>A probe observes one request at one time from one network location. It is not a measurement of general availability.</li>
          <li>An <span className="mono">answered</span> result confirms a response, not the correctness or safety of that response.</li>
          <li>The prober is a single observer. The evidence model names the observer so that independent observers can be added without changing the schema, but at present there is one.</li>
          <li>A hosted model or service can change behaviour without changing the record that points to it; only tool-list drift on MCP endpoints is currently detected.</li>
          <li>If the prober misses its schedule, liveness indicators are marked paused; a paused indicator means absence of recent observation, not a negative result.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="display text-[1.5rem]">Reproducibility</h2>
        <p className="text-sm text-muted leading-relaxed">
          The registry data is a public git repository and the derived index is rebuilt from it.
          The full evidence stream is exported as newline-delimited JSON at{" "}
          <a className="underline decoration-line hover:decoration-accent" href="/api/town/evidence">
            {site.replace(/^https?:\/\//, "")}/api/town/evidence
          </a>
          , so every count, rate, and history shown on the site can be recomputed from primary
          records. The API is described in{" "}
          <a className="underline decoration-line hover:decoration-accent" href="/api/openapi.json">
            OpenAPI form
          </a>
          .
        </p>
      </section>
    </div>
  );
}
