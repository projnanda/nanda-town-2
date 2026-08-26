import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { isValidSlug } from "@/lib/records";

export const dynamic = "force-dynamic";

/** Liveness time series for one record — a free monitoring feed for its owner. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") return NextResponse.json({ error: "not found" }, { status: 404 });
  const limRaw = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limRaw) ? Math.min(500, Math.max(1, Math.floor(limRaw))) : 100;
  const rows = await db
    .select()
    .from(schema.evidence)
    .where(and(eq(schema.evidence.recordSlug, slug), eq(schema.evidence.type, "liveness")))
    .orderBy(desc(schema.evidence.observedAt))
    .limit(limit);
  return NextResponse.json(
    {
      slug,
      count: rows.length,
      observations: rows.map((e) => {
        const o = e.outcome as Record<string, unknown>;
        return {
          observedAt: e.observedAt.toISOString(),
          observer: e.observer,
          state: o.state,
          probe: o.probe,
          latencyMs: o.latencyMs ?? null,
          status: o.status ?? null,
          trigger: o.trigger ?? "scheduled",
        };
      }),
    },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
