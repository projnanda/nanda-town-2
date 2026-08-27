/**
 * The record system. Source of truth = records/**.yaml in the git repo.
 * Postgres is a derived index. Sync is a full idempotent reconcile from a
 * complete snapshot (filesystem at boot, GitHub main on a timer) — there is
 * deliberately no incremental path, so there is nothing to drift.
 */
import { z } from "zod";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { db, schema } from "@/db/client";
import { and, eq, notInArray, sql } from "drizzle-orm";

const slugRe = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/**
 * Cheap shape check used before any slug reaches the database. Postgres rejects
 * null bytes outright, so an unvalidated slug turns a "not found" into a 500.
 */
export function isValidSlug(s: unknown): boolean {
  return typeof s === "string" && slugRe.test(s);
}
const httpsUrl = z.url().max(300).refine((u) => u.startsWith("https://") || u.startsWith("http://"), "must be http(s)");

export const RecordSchema = z
  .object({
    slug: z.string().regex(slugRe, "slug: lowercase letters, digits, hyphens, 3-64 chars"),
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
        package: z
          .object({ pip: z.string().max(100).optional(), npm: z.string().max(100).optional() })
          .optional(),
        repo: z.string().max(200).optional(),
      })
      .refine((e) => Object.values(e).some((v) => v !== undefined), "entry: at least one way in is required"),
    consent: z.object({ probes: z.boolean() }),
    tags: z.array(z.string().min(1).max(30)).max(10).default([]),
  })
  .superRefine((r, ctx) => {
    const hasUrl = !!(r.entry.mcp_url || r.entry.a2a_card_url || r.entry.openapi_url || r.entry.http_url);
    if (hasUrl && !r.consent.probes) {
      ctx.addIssue({
        code: "custom",
        message: "records with a live URL must set consent.probes: true — listing means consenting to scheduled probes",
        path: ["consent", "probes"],
      });
    }
  });

export type TownRecord = z.infer<typeof RecordSchema>;

export function fingerprint(r: TownRecord): string {
  const canonical = JSON.stringify(r, Object.keys(r as Record<string, unknown>).sort());
  return "sha256:" + createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export interface ParsedFile {
  file: string;
  record?: TownRecord;
  errors: string[];
}

export function parseRecordFile(file: string, text: string): ParsedFile {
  if (text.length > 32_768) return { file, errors: ["file larger than 32KB"] };
  let raw: unknown;
  try {
    raw = parseYaml(text, { maxAliasCount: 20 });
  } catch (e) {
    return { file, errors: [`YAML parse error: ${e instanceof Error ? e.message.slice(0, 200) : "?"}`] };
  }
  const res = RecordSchema.safeParse(raw);
  if (!res.success) {
    return { file, errors: res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const expectedDir = res.data.kind === "agent" ? "agents" : "services";
  if (!file.includes(`${expectedDir}/${res.data.slug}.yaml`)) {
    return { file, errors: [`file path must be records/${expectedDir}/${res.data.slug}.yaml`] };
  }
  return { file, record: res.data, errors: [] };
}

export async function loadFromFs(rootDir: string): Promise<ParsedFile[]> {
  const out: ParsedFile[] = [];
  for (const kindDir of ["agents", "services"]) {
    const dir = path.join(rootDir, "records", kindDir);
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    } catch {
      continue;
    }
    for (const f of files) {
      const full = path.join(dir, f);
      const text = await readFile(full, "utf8");
      out.push(parseRecordFile(`records/${kindDir}/${f}`, text));
    }
  }
  return out;
}

/** Snapshot of records/ on the default branch of the GitHub repo (post-deploy freshness). */
export async function loadFromGitHub(repo: string): Promise<ParsedFile[] | null> {
  try {
    const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "nanda-town-2" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!treeRes.ok) return null;
    const tree = (await treeRes.json()) as { tree?: { path: string; type: string }[]; truncated?: boolean };
    if (!tree.tree || tree.truncated) return null;
    const files = tree.tree
      .filter((t) => t.type === "blob" && /^records\/(agents|services)\/[^/]+\.ya?ml$/.test(t.path))
      .slice(0, 500);
    const out: ParsedFile[] = [];
    for (const f of files) {
      const raw = await fetch(`https://raw.githubusercontent.com/${repo}/main/${f.path}`, {
        headers: { "user-agent": "nanda-town-2" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!raw.ok) return null; // partial snapshots are not snapshots
      out.push(parseRecordFile(f.path, await raw.text()));
    }
    return out;
  } catch {
    return null;
  }
}

/** Full reconcile: upsert everything in the snapshot, delist everything absent from it. */
export async function reconcile(parsed: ParsedFile[], source: string): Promise<{ upserted: number; delisted: number; invalid: string[] }> {
  const parsedOk = parsed.filter((p): p is ParsedFile & { record: TownRecord } => !!p.record);
  const invalid = parsed.filter((p) => p.errors.length).map((p) => `${p.file}: ${p.errors[0]}`);

  // Slug is the primary key, so two files claiming one slug would overwrite each
  // other and the winner would depend on directory read order. That is a slug
  // takeover waiting to happen, so publish neither and report the collision:
  // an ambiguous record is worse than a missing one.
  const byslug = new Map<string, (ParsedFile & { record: TownRecord })[]>();
  for (const p of parsedOk) {
    const list = byslug.get(p.record.slug) ?? [];
    list.push(p);
    byslug.set(p.record.slug, list);
  }
  const valid: (ParsedFile & { record: TownRecord })[] = [];
  for (const [slug, files] of byslug) {
    if (files.length > 1) {
      invalid.push(
        `duplicate slug "${slug}" declared by ${files.map((f) => f.file).join(" and ")} — none listed`,
      );
      continue;
    }
    valid.push(files[0]);
  }
  const slugs = valid.map((p) => p.record.slug);

  for (const { record } of valid) {
    const fp = fingerprint(record);
    // Version history: one row per (slug, fingerprint) ever seen. The unique
    // index makes this idempotent across reconciles.
    await db
      .insert(schema.recordHistory)
      .values({
        recordSlug: record.slug,
        fingerprint: fp,
        name: record.name,
        kind: record.kind,
        source,
      })
      .onConflictDoNothing();
    await db
      .insert(schema.records)
      .values({
        slug: record.slug,
        kind: record.kind,
        name: record.name,
        summary: record.summary,
        ownerGithub: record.owner.github,
        entry: record.entry as Record<string, unknown>,
        consentProbes: record.consent.probes,
        tags: record.tags,
        status: "listed",
        fingerprint: fp,
        sourceCommit: source,
      })
      .onConflictDoUpdate({
        target: schema.records.slug,
        set: {
          kind: record.kind,
          name: record.name,
          summary: record.summary,
          ownerGithub: record.owner.github,
          entry: record.entry as Record<string, unknown>,
          consentProbes: record.consent.probes,
          tags: record.tags,
          status: "listed",
          fingerprint: fp,
          sourceCommit: source,
          updatedAt: sql`now()`,
        },
      });
  }

  let delisted = 0;
  if (slugs.length > 0) {
    // Only flip records that are currently listed and absent from the snapshot,
    // so the delisted count is a true delta and reconcile is idempotent (a
    // second run over the same snapshot delists 0).
    const res = await db
      .update(schema.records)
      .set({ status: "delisted", updatedAt: sql`now()` })
      .where(and(eq(schema.records.status, "listed"), notInArray(schema.records.slug, slugs)))
      .returning({ slug: schema.records.slug });
    delisted = res.length;
  }
  return { upserted: valid.length, delisted, invalid };
}
