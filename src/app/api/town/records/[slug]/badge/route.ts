import { NextRequest } from "next/server";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { isValidSlug } from "@/lib/records";
import { recordStats } from "@/lib/census";
import { pulseStatus } from "@/lib/pulse";

export const dynamic = "force-dynamic";

const C = { bg: "#f7f5ef", line: "#c9c1ab", ink: "#141312", muted: "#57524a", alive: "#6b8559", warn: "#b58432", accent: "#c45a3c", faint: "#8a8377" };

function esc(s: string) {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

/** A factual status badge an owner can embed. States what was observed and when; makes no uptime promise. */
function badge(label: string, value: string, color: string): Response {
  const lw = 7.2 * label.length + 20;
  const vw = 7.2 * value.length + 20;
  const w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <rect width="${w}" height="20" rx="3" fill="${C.bg}"/>
  <rect x="${lw}" width="${vw}" height="20" rx="3" fill="${color}"/>
  <rect x="${lw}" width="6" height="20" fill="${color}"/>
  <rect width="${w}" height="20" rx="3" fill="none" stroke="${C.line}" stroke-width="1"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11">
    <text x="${lw / 2}" y="14" fill="${C.muted}" text-anchor="middle">${esc(label)}</text>
    <text x="${lw + vw / 2}" y="14" fill="#fff6ef" text-anchor="middle">${esc(value)}</text>
  </g>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return badge("nanda town", "unknown", C.faint);
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") return badge("nanda town", "not listed", C.faint);
  const pulse = await pulseStatus();
  if (pulse.stale) return badge(esc(slug), "prober paused", C.faint);
  const stats = await recordStats(slug, 7);
  if (!stats || stats.liveness.total === 0) return badge(esc(slug), "not yet probed", C.faint);
  const st = stats.lastState;
  const color = st === "answered" ? C.alive : st === "auth_required" || st === "refused" ? C.warn : C.accent;
  const value = st === "answered" ? "answered last probe" : st === "auth_required" ? "auth required" : st === "refused" ? "refused" : "no answer";
  return badge(esc(slug), value, color);
}
