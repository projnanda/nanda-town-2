import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { isValidSlug } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const [rec] = await db.select().from(schema.records).where(eq(schema.records.slug, slug));
  if (!rec || rec.status !== "listed") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ev = await db
    .select()
    .from(schema.evidence)
    .where(and(eq(schema.evidence.recordSlug, slug)))
    .orderBy(desc(schema.evidence.observedAt))
    .limit(50);
  return NextResponse.json(
    {
      record: {
        slug: rec.slug,
        kind: rec.kind,
        name: rec.name,
        summary: rec.summary,
        owner: { github: rec.ownerGithub },
        entry: rec.entry,
        tags: rec.tags,
        fingerprint: rec.fingerprint,
        updatedAt: rec.updatedAt.toISOString(),
      },
      evidence: ev.map((e) => ({
        type: e.type,
        observer: e.observer,
        subjectFingerprint: e.subjectFingerprint,
        observedAt: e.observedAt.toISOString(),
        outcome: e.outcome,
      })),
    },
    { headers: { "cache-control": "public, max-age=30" } },
  );
}
