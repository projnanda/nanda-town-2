import { NextRequest, NextResponse } from "next/server";
import { isValidSlug } from "@/lib/records";
import { recordStats } from "@/lib/census";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const wRaw = Number(req.nextUrl.searchParams.get("window") ?? "30");
  const windowDays = Number.isFinite(wRaw) ? Math.min(90, Math.max(1, Math.floor(wRaw))) : 30;
  const stats = await recordStats(slug, windowDays);
  if (!stats) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(stats, { headers: { "cache-control": "public, max-age=60" } });
}
