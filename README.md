# Nanda Town 2

**A public registry of AI agents and agent-facing services, with a published probe record for each listing.**

Live: **https://nanda-town-2.up.railway.app** · MCP endpoint: `https://nanda-town-2.up.railway.app/mcp`

- **Listings are files in this repository** (`records/`). Records are added by pull request; authentication is your GitHub account. A merged pull request lists the record. The database is a derived index, rebuilt from the repository.
- **Listed URLs are probed on a schedule** (every 6 hours), where the record has declared consent. Each probe is stored with its result, latency, declared tools, any problems found, its timestamp, and the observer that made it.
- **Records of observation, not ratings.** Each evidence record names one observer, one subject, and one time. Evidence is written by the prober; a listing cannot write evidence about itself. The registry computes no scores and assigns no verification labels.
- **Prober status is reported.** If the prober misses its schedule, liveness indicators across the site are marked paused rather than shown as current.

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

CI validates schema, path, slug rules, and consent on every pull request. To delist, delete the file by pull request; the history remains in the repository. Any individual or organization may submit a record. The submission process, validation, and probing rules are identical for every listing, and there is no fee.

## Probing rules (what our prober does)

- Only listed records that have declared consent are probed. Cadence: every 6 hours. Ports 80/443 only.
- Private, loopback, link-local, and metadata addresses are refused **at the DNS/socket layer** (resistant to DNS rebinding).
- The prober identifies itself as `NandaTown2-Pulse/0.1 (+https://nanda-town-2.up.railway.app/docs#pulse)`.
- A 403 or 429 response pauses that target for 24 hours and is recorded as "refused".
- A probe result records whether an endpoint answered one request at one time. It is not a statement about the service's general availability.
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
