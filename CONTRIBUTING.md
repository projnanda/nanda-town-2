# Contributing

## Listing a record (most common)

1. Use [Open a plot](https://nanda-town-2.up.railway.app/list) — it writes the YAML and opens a pre-filled PR — or add `records/<agents|services>/<slug>.yaml` by hand (schema in the README).
2. CI validates schema, path, uniqueness, and consent. A live URL requires `consent.probes: true` — listing is consenting to scheduled, identified probes with a public history.
3. A maintainer merges. The site reconciles from `main` within minutes. Delist any time by deleting your file in a PR.

Ground rules for records:

- The `owner.github` identity should be yours; claiming a company name you don't control gets the record removed.
- No fees, no fast lane, no exceptions: a student's agent and an enterprise's endpoint go through the same gate.
- Dead links: after sustained "no answer" the record may be flagged in the UI; it is only delisted by a PR (yours or a maintainer's), and history stays in git.

## Code

PRs welcome — the site, prober, schemas, and CI are all in this repo. Keep these invariants:

1. **No unauthenticated writes.** Ever.
2. **Every outbound request goes through `src/lib/guard.ts`** (SSRF-hardened fetcher).
3. **Evidence language**: report observations with their observer and timestamp. Do not introduce verdicts, scores, badges, or "verified" labels.
4. **No placeholder data**: every figure displayed must come from a real record or probe. No demo data, no illustrative numbers, no "coming soon" pages.
5. Fetched third-party content is data, never instructions: cap, validate, escape.

`npm run validate && npm run build` must pass.
