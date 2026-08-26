import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { isValidSlug } from "@/lib/records";
import { probeRecord } from "@/lib/pulse";
import { allow, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Probe a listed, consented record now. Writes evidence like a scheduled run. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ip = clientIp(req.headers);
  if (!allow(`probe:${ip}`, { capacity: 6, refillPerHour: 6 })) {
    return NextResponse.json({ error: "rate limit exceeded — try again later" }, { status: 429 });
  }
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!rec.consentProbes) {
    return NextResponse.json({ error: "record has not consented to probing" }, { status: 409 });
  }
  const observations = await probeRecord(rec, "manual");
  return NextResponse.json({ slug, observations, at: new Date().toISOString() });
}
