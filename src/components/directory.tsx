"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RecordWithLiveness } from "@/lib/census";
import { RecordCard } from "@/components/town";

type Kind = "all" | "agent" | "service";

// "agent"/"service" are covered by the kind toggle; don't repeat them as categories.
const KIND_TAGS = new Set(["agent", "service"]);

const ENTRY_LABELS: Record<string, string> = {
  mcp_url: "MCP",
  a2a_card_url: "A2A",
  openapi_url: "OpenAPI",
  http_url: "HTTP",
  skill_md: "SKILL.md",
  package: "package",
};

function entryTypes(r: RecordWithLiveness): string[] {
  return Object.keys(ENTRY_LABELS).filter((k) => (r.entry as Record<string, unknown>)[k] != null);
}

export function Directory({
  records,
  pulseStale,
  counts,
}: {
  records: RecordWithLiveness[];
  pulseStale: boolean;
  counts: { agents: number; services: number };
}) {
  const [kind, setKind] = useState<Kind>("all");
  const [query, setQuery] = useState("");
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [activeIface, setActiveIface] = useState<string | null>(null);
  const [answeredOnly, setAnsweredOnly] = useState(false);

  // Category facets (tags), counted over the current kind selection.
  const categories = useMemo(() => {
    const inKind = records.filter((r) => kind === "all" || r.kind === kind);
    const m = new Map<string, number>();
    for (const r of inKind) for (const t of r.tags) if (!KIND_TAGS.has(t)) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [records, kind]);

  const ifaces = useMemo(() => {
    const inKind = records.filter((r) => kind === "all" || r.kind === kind);
    const m = new Map<string, number>();
    for (const r of inKind) for (const e of entryTypes(r)) m.set(e, (m.get(e) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [records, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (answeredOnly && r.lastLiveness?.state !== "answered") return false;
      if (activeIface && !entryTypes(r).includes(activeIface)) return false;
      if (activeCats.size > 0 && !r.tags.some((t) => activeCats.has(t))) return false;
      if (q) {
        const hay = `${r.name} ${r.summary} ${r.tags.join(" ")} ${r.ownerGithub}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, kind, query, activeCats, activeIface, answeredOnly]);

  const anyFilter = query.trim() !== "" || activeCats.size > 0 || activeIface !== null || answeredOnly;

  // Grouped-by-category view (only when no explicit filter is active).
  const grouped = useMemo(() => {
    if (anyFilter) return [];
    const inKind = records.filter((r) => kind === "all" || r.kind === kind);
    const byCat = new Map<string, RecordWithLiveness[]>();
    for (const r of inKind) {
      const cats = r.tags.filter((t) => !KIND_TAGS.has(t));
      if (cats.length === 0) cats.push("uncategorized");
      for (const t of cats) {
        const list = byCat.get(t) ?? [];
        list.push(r);
        byCat.set(t, list);
      }
    }
    return [...byCat.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [records, kind, anyFilter]);

  function toggleCat(t: string) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const kindBtn = (k: Kind, label: string) => (
    <button
      type="button"
      onClick={() => {
        setKind(k);
        setActiveCats(new Set());
        setActiveIface(null);
      }}
      className={`mono text-[0.72rem] uppercase tracking-widest px-4 py-1.5 rounded-full border transition-colors ${
        kind === k ? "border-accent text-accent bg-accent-soft" : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {kindBtn("all", `all · ${counts.agents + counts.services}`)}
        {kindBtn("agent", `agents · ${counts.agents}`)}
        {kindBtn("service", `services · ${counts.services}`)}
        <div className="flex-1 min-w-[180px]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search name, summary, owner…"
          className="mono text-sm rounded-full border border-line bg-bg px-4 py-1.5 outline-none focus:border-accent placeholder:text-faint w-full sm:w-72"
        />
      </div>

      {/* interface + liveness filters */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-3">
        <span className="survey-label mr-1">interface</span>
        {ifaces.map(([e, n]) => (
          <button
            key={e}
            type="button"
            onClick={() => setActiveIface((cur) => (cur === e ? null : e))}
            className={`mono text-[0.66rem] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
              activeIface === e ? "border-accent text-accent bg-accent-soft" : "border-line text-muted hover:text-ink"
            }`}
          >
            {ENTRY_LABELS[e]} · {n}
          </button>
        ))}
        <span className="w-3" />
        <button
          type="button"
          onClick={() => setAnsweredOnly((v) => !v)}
          className={`mono text-[0.66rem] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
            answeredOnly ? "border-alive text-alive bg-alive-soft" : "border-line text-muted hover:text-ink"
          }`}
        >
          answered only
        </button>
      </div>

      {/* category facets */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-6">
        <span className="survey-label mr-1">category</span>
        {categories.map(([t, n]) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleCat(t)}
            className={`mono text-[0.66rem] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
              activeCats.has(t) ? "border-accent text-accent bg-accent-soft" : "border-line text-muted hover:text-ink"
            }`}
          >
            {t} · {n}
          </button>
        ))}
        {anyFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCats(new Set());
              setActiveIface(null);
              setAnsweredOnly(false);
            }}
            className="mono text-[0.66rem] uppercase tracking-wider px-2.5 py-1 rounded-full text-accent hover:underline"
          >
            clear ✕
          </button>
        )}
      </div>

      {/* results */}
      {anyFilter ? (
        <>
          <div className="survey-label mb-3">
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </div>
          {filtered.length === 0 ? (
            <div className="parcel-open p-10 text-center mono text-sm text-muted">
              nothing matches these filters
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 pb-10">
              {filtered.map((r) => (
                <RecordCard key={r.slug} r={r} pulseStale={pulseStale} />
              ))}
            </div>
          )}
        </>
      ) : grouped.length === 0 ? (
        <div className="parcel-open p-10 text-center">
          <p className="mono text-sm text-muted">no records yet — the plots are open</p>
          <Link href="/list" className="mono text-[0.72rem] uppercase tracking-widest text-accent mt-2 inline-block">
            open a plot →
          </Link>
        </div>
      ) : (
        <div className="space-y-9 pb-10">
          {grouped.map(([cat, recs]) => (
            <section key={cat}>
              <div className="flex items-baseline gap-3 mb-3 border-b border-line-soft pb-1.5">
                <button
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className="display text-[1.3rem] hover:text-accent transition-colors"
                >
                  {cat}
                </button>
                <span className="mono text-[0.7rem] text-faint">{recs.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {recs.map((r) => (
                  <RecordCard key={`${cat}-${r.slug}`} r={r} pulseStale={pulseStale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
