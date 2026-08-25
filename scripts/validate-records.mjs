// CI gate: every file under records/ must be schema-valid. Zero exit = mergeable.
// Usage: node scripts/validate-records.mjs [--probe]  (--probe adds a live dry-run probe)
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// Import the app's own parser via tsx-free trick: re-implement the load using the
// compiled zod schema is overkill for CI — instead we shell out to the same rules
// by importing the TS source through Next is not possible in a plain script, so
// this script re-parses with the same zod schema, kept in sync by the selftest.
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const slugRe = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const httpsUrl = z.url().max(300);

const RecordSchema = z
  .object({
    slug: z.string().regex(slugRe),
    kind: z.enum(["agent", "service"]),
    name: z.string().min(2).max(80),
    summary: z.string().min(10).max(280),
    owner: z.object({ github: z.string().min(1).max(60) }),
    entry: z
      .object({
        mcp_url: httpsUrl.optional(),
        a2a_card_url: httpsUrl.optional(),
        openapi_url: httpsUrl.optional(),
        http_url: httpsUrl.optional(),
        skill_md: z.string().max(200).optional(),
        package: z.object({ pip: z.string().max(100).optional(), npm: z.string().max(100).optional() }).optional(),
        repo: z.string().max(200).optional(),
      })
      .refine((e) => Object.values(e).some((v) => v !== undefined), "entry: at least one way in"),
    consent: z.object({ probes: z.boolean() }),
    tags: z.array(z.string().min(1).max(30)).max(10).default([]),
  })
  .superRefine((r, ctx) => {
    const hasUrl = !!(r.entry.mcp_url || r.entry.a2a_card_url || r.entry.openapi_url || r.entry.http_url);
    if (hasUrl && !r.consent.probes) {
      ctx.addIssue({ code: "custom", message: "records with a live URL must set consent.probes: true", path: ["consent", "probes"] });
    }
  });

let failures = 0;
const seen = new Set();

for (const kindDir of ["agents", "services"]) {
  const dir = path.join("records", kindDir);
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  } catch {
    continue;
  }
  for (const f of files) {
    const file = path.join(dir, f);
    const text = await readFile(file, "utf8");
    if (text.length > 32768) {
      console.error(`✗ ${file}: larger than 32KB`);
      failures++;
      continue;
    }
    let raw;
    try {
      raw = parseYaml(text, { maxAliasCount: 20 });
    } catch (e) {
      console.error(`✗ ${file}: YAML error — ${e.message}`);
      failures++;
      continue;
    }
    const res = RecordSchema.safeParse(raw);
    if (!res.success) {
      for (const i of res.error.issues) console.error(`✗ ${file}: ${i.path.join(".")}: ${i.message}`);
      failures++;
      continue;
    }
    const expected = `records/${res.data.kind}s/${res.data.slug}.yaml`;
    if (file !== expected) {
      console.error(`✗ ${file}: must be at ${expected}`);
      failures++;
      continue;
    }
    if (seen.has(res.data.slug)) {
      console.error(`✗ ${file}: duplicate slug`);
      failures++;
      continue;
    }
    seen.add(res.data.slug);
    console.log(`✓ ${file}`);
  }
}

console.log(failures === 0 ? `all records valid (${seen.size})` : `${failures} invalid record(s)`);
process.exit(failures === 0 ? 0 : 1);
