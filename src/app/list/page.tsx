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
        A listing is one YAML file in a public repository. Completing this form generates the
        file and opens a pre-filled pull request on GitHub; authentication is your GitHub
        account, and the site holds no accounts of its own. CI validates the schema and runs a
        trial probe against the submitted URL. Once the pull request is merged, the record is
        listed. <span className="text-ink">A record that declares a live URL consents to scheduled
        probing</span>, and its probe history is public.
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
                Add a SKILL.md alongside the record file in the same pull request. A record without a URL is not probed.
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
              src="/illustrations/open-plots.jpg"
              alt="Watercolor patchwork of parcels, most empty, one outlined in dashed rust ink waiting to be claimed"
              width={1200}
              height={1200}
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
              <li>GitHub asks you to sign in, which serves as authentication, and opens the pull request.</li>
              <li>CI validates the schema and runs a trial probe against the URL.</li>
              <li>A maintainer merges the pull request. The site reconciles from the repository within minutes.</li>
              <li>The prober begins probing the endpoint on schedule, and the results are published.</li>
              <li>To delist, delete the file by pull request. The history remains in the repository.</li>
            </ol>
          </div>
          <div className="parcel p-4 text-[0.82rem] text-muted leading-relaxed">
            <div className="survey-label mb-1.5">who can list</div>
            <p>
              Anyone. A record may describe an individual&apos;s agent, a company&apos;s MCP
              server, an A2A endpoint, or a SKILL.md describing an existing API. The submission
              process, validation, and probing rules are identical for every listing, and there
              is no fee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
