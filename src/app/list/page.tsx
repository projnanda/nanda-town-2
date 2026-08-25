"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const REPO = process.env.NEXT_PUBLIC_RECORDS_REPO ?? "projnanda/nanda-town-2";

export default function ListPage() {
  const [kind, setKind] = useState<"service" | "agent">("service");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [github, setGithub] = useState("");
  const [entryType, setEntryType] = useState<"mcp_url" | "a2a_card_url" | "openapi_url" | "http_url" | "skill">("mcp_url");
  const [entryValue, setEntryValue] = useState("");
  const [tags, setTags] = useState("");

  const autoSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

  const effSlug = slug || autoSlug(name);
  const isUrlEntry = entryType !== "skill";

  const yaml = useMemo(() => {
    const lines = [
      `slug: ${effSlug || "my-record"}`,
      `kind: ${kind}`,
      `name: ${JSON.stringify(name || "My thing")}`,
      `summary: ${JSON.stringify(summary || "One plain sentence about what this is.")}`,
      `owner:`,
      `  github: ${github || "your-github-username"}`,
      `entry:`,
      isUrlEntry
        ? `  ${entryType}: ${entryValue || "https://example.com/mcp"}`
        : `  skill_md: ./SKILL.md`,
      `consent:`,
      `  probes: ${isUrlEntry ? "true" : "false"}`,
    ];
    const t = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (t.length) lines.push(`tags: [${t.join(", ")}]`);
    return lines.join("\n") + "\n";
  }, [effSlug, kind, name, summary, github, entryType, entryValue, tags, isUrlEntry]);

  const prUrl = useMemo(() => {
    const filename = `records/${kind}s/${effSlug || "my-record"}.yaml`;
    return `https://github.com/${REPO}/new/main?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(yaml)}`;
  }, [kind, effSlug, yaml]);

  const input =
    "mono text-sm w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent placeholder:text-faint";

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-10">
      <div className="survey-label mb-2">open a plot</div>
      <h1 className="display text-4xl">List an agent or a service</h1>
      <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
        A listing is one YAML file in a public git repo. Fill this in, and the button opens a
        pre-filled pull request on GitHub — <span className="text-ink">GitHub is the
        authentication</span>; there are no accounts here. CI validates the schema and dry-runs a
        probe on your PR. Merged means listed. <span className="text-ink">Listing a live URL means
        consenting to scheduled probes</span>, and your probe history is public.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mt-7">
        {/* form */}
        <div className="space-y-4">
          <div>
            <label className="survey-label block mb-1.5">kind</label>
            <div className="flex gap-2">
              {(["service", "agent"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`mono text-[0.75rem] uppercase tracking-widest px-4 py-2 rounded-full border ${
                    kind === k ? "border-accent text-accent bg-accent-soft" : "border-line text-muted"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="survey-label block mb-1.5">name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Payments MCP" maxLength={80} />
          </div>

          <div>
            <label className="survey-label block mb-1.5">slug (folder name)</label>
            <input className={input} value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))} placeholder={autoSlug(name) || "acme-payments"} maxLength={64} />
          </div>

          <div>
            <label className="survey-label block mb-1.5">summary — one plain sentence</label>
            <input className={input} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What does it do, for whom?" maxLength={280} />
          </div>

          <div>
            <label className="survey-label block mb-1.5">your github username (the owner)</label>
            <input className={input} value={github} onChange={(e) => setGithub(e.target.value.replace(/^@/, ""))} placeholder="octocat" maxLength={60} />
          </div>

          <div>
            <label className="survey-label block mb-1.5">way in</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(
                [
                  ["mcp_url", "MCP server"],
                  ["a2a_card_url", "A2A card"],
                  ["openapi_url", "OpenAPI"],
                  ["http_url", "HTTP endpoint"],
                  ["skill", "SKILL.md only"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEntryType(v)}
                  className={`mono text-[0.7rem] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                    entryType === v ? "border-accent text-accent bg-accent-soft" : "border-line text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isUrlEntry ? (
              <input className={input} value={entryValue} onChange={(e) => setEntryValue(e.target.value)} placeholder="https://…" maxLength={300} />
            ) : (
              <p className="mono text-[0.72rem] text-muted">
                Add a SKILL.md next to your record file in the same PR. No URL → no probes.
              </p>
            )}
          </div>

          <div>
            <label className="survey-label block mb-1.5">tags (comma-separated, optional)</label>
            <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="payments, mcp, hosted" />
          </div>
        </div>

        {/* preview + submit */}
        <div className="space-y-4">
          <div className="illus aspect-[16/7] hidden lg:block">
            <Image
              src="/illustrations/img_05_marketplace.jpg"
              alt="Ink-and-wash drawing of a marketplace of connected stalls"
              width={1000}
              height={440}
            />
          </div>
          <div>
            <div className="survey-label mb-1.5">your record file</div>
            <pre className="parcel p-4 mono text-[0.78rem] leading-relaxed overflow-x-auto whitespace-pre">{yaml}</pre>
          </div>
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="mono block text-center text-[0.78rem] uppercase tracking-[0.14em] rounded-full bg-accent text-[#fff6ef] px-5 py-3 hover:bg-accent-light transition-colors"
          >
            Open the pull request on GitHub →
          </a>
          <div className="parcel p-4 bg-card-2 text-[0.82rem] text-muted leading-relaxed">
            <div className="survey-label mb-1.5">what happens next</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>GitHub asks you to sign in (that&apos;s the authentication) and opens a PR.</li>
              <li>CI validates the schema and dry-runs a probe against your URL.</li>
              <li>A maintainer merges. The site reconciles from the repo within minutes.</li>
              <li>The pulse probes your endpoint on a schedule; your history goes public.</li>
              <li>Delist any time: delete your file in a PR. History stays in git.</li>
            </ol>
          </div>
          <div className="parcel p-4 text-[0.82rem] text-muted leading-relaxed">
            <div className="survey-label mb-1.5">who can list</div>
            <p>
              Anyone — a student&apos;s weekend agent, a startup&apos;s MCP server, an
              enterprise&apos;s A2A endpoint, or just a SKILL.md that teaches agents to use an
              API you already have. Same file, same gate, same evidence rules for everyone. No
              fees, no fast lane.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
