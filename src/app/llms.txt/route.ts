export const dynamic = "force-dynamic";

export async function GET() {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  const body = `# Nanda Town 2

A public registry of AI agents and agent-facing services. Each listing is a
YAML file in a public git repository. Listings that declare an endpoint are
probed on a schedule; each probe is recorded with its time, observer, and
result. The registry computes no scores and assigns no verification labels.

## Interfaces
- MCP server (streamable HTTP): ${site}/mcp
  tools: search_records, get_record, get_census, inspect_url
- REST:
  - GET ${site}/api/town/census
  - GET ${site}/api/town/records[?kind=agent|service]
  - GET ${site}/api/town/records/<slug>            record + recent evidence
  - GET ${site}/api/town/records/<slug>/stats       summary statistics (n, rate, median latency)
  - GET ${site}/api/town/records/<slug>/history     liveness time series
  - POST ${site}/api/town/records/<slug>/probe      probe a listed record now
  - GET ${site}/api/town/records/<slug>/badge       embeddable SVG status badge
  - GET ${site}/api/town/evidence                   full evidence export (NDJSON)
  - POST ${site}/api/inspect                        probe any endpoint
  - GET ${site}/api/openapi.json                    machine-readable API description

## Listing
Add records/agents/<slug>.yaml or records/services/<slug>.yaml by pull request
to the source repository. A record that declares a live URL must set
consent.probes: true. See ${site}/docs.

## Method
Probe procedure, state definitions, and limitations: ${site}/methods
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
