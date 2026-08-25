# Nanda Town 2

**A registry and live inspector for the internet of agents — where every claim is a timestamped observation.**

Live: **https://nanda-town-2.up.railway.app** · MCP endpoint: `https://nanda-town-2.up.railway.app/mcp`

Nanda Town 2 lists AI **agents** and agent-facing **services**. Nothing here is self-reported:

- **Every listing is a file in this repo** (`records/`). A pull request is the gate; GitHub is the authentication. Merged = listed. The database is only a derived index.
- **Every listed URL is probed on a schedule** ("the pulse", every 6h) — with the record's consent, declared in the record itself. Probe results are public evidence: state, latency, declared tools, problems, timestamp, observer.
- **Evidence, not badges.** One observer, one subject, one time. A record never writes its own evidence. There are no scores, no "verified" labels, no certificates — observation histories, including the misses.
- **The prober reports on itself.** If the pulse misses its own schedule, every liveness surface on the site switches to "pulse paused" — the site cannot claim freshness it doesn't have.

## For agents

The town is itself an MCP server (streamable HTTP, stateless, reads need no auth):

```
claude mcp add --transport http nanda-town-2 https://nanda-town-2.up.railway.app/mcp
```

Tools: `search_records` · `get_record` · `get_census` · `inspect_url` (probe any endpoint live — including your own MCP server, to check your handshake and tool list).

## For humans

- **Inspect**: paste any MCP / A2A / OpenAPI / HTTP endpoint on the homepage → instant shareable report.
- **List**: [Open a plot](https://nanda-town-2.up.railway.app/list) — the form writes your record YAML and opens a pre-filled PR here.
- **REST**: `GET /api/town/census` · `GET /api/town/records[?kind=]` · `GET /api/town/records/<slug>` · `POST /api/inspect`.

## Listing a record

One YAML file at `records/agents/<slug>.yaml` or `records/services/<slug>.yaml`:

```yaml
slug: acme-payments
kind: service
name: "Acme Payments MCP"
summary: "Hosted MCP server exposing quote/pay/refund tools for agent checkouts."
owner:
  github: acme-dev
entry:
  mcp_url: https://mcp.acme.com   # or a2a_card_url / openapi_url / http_url / skill_md / package
consent:
  probes: true                     # required when entry has a live URL — listing is consenting
tags: [payments, mcp]
```

CI validates schema, path, slug rules, and consent on every PR. Delist any time by deleting your file; history stays in git. Anyone can list — a student's weekend agent, a startup's MCP server, an enterprise's A2A endpoint. Same file, same gate, same rules. No fees.

## Probing rules (what our prober does)

- Only consented, listed records. Cadence 6h. Ports 80/443 only.
- Private, loopback, link-local, and metadata addresses are refused **at the DNS/socket layer** (rebinding-safe).
- Identifies itself: `NandaTown2-Pulse/0.1 (+https://nanda-town-2.up.railway.app/docs#pulse)`.
- 403/429 → that target is paused for 24h and recorded as "refused", never "down".
- Language rule: we publish "did not answer our probe at T" — never "is down".
- Evidence retention: 90 days rolling.

## Run it yourself

```bash
npm ci
createdb nandatown2_dev
DATABASE_URL=postgresql://localhost:5432/nandatown2_dev npm run migrate
DATABASE_URL=postgresql://localhost:5432/nandatown2_dev PULSE_ENABLED=1 ADMIN_KEY=dev npm run dev
```

Env: `DATABASE_URL` · `SITE_URL` · `ADMIN_KEY` (manual `/api/admin/reindex` + `/api/admin/pulse`) · `PULSE_ENABLED=1` · `RECORDS_REPO` (e.g. `projnanda/nanda-town-2`, for post-deploy re-sync) · `NEXT_PUBLIC_RECORDS_REPO` · `NEXT_PUBLIC_REPO_URL`.

Stack: Next.js 16 · Postgres (Drizzle, real migrations) · undici with a custom guarded DNS lookup. Deployed on Railway; the pulse runs inside the web process (`src/instrumentation.ts`).

Fork the whole town and run it behind your own walls — the registry format, prober, and site are all here, Apache-2.0.

---

An open-source project by **Project NANDA** (Foundation for Agentic Networks). The NANDA effort started as research at MIT Media Lab and is independent of MIT.
