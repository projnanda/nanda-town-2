import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Public evidence export as newline-delimited JSON. Every figure the site shows
 * is derivable from this stream, so any claim can be independently recomputed.
 */
export async function GET(req: NextRequest) {
  const limRaw = Number(req.nextUrl.searchParams.get("limit") ?? "1000");
  const limit = Number.isFinite(limRaw) ? Math.min(5000, Math.max(1, Math.floor(limRaw))) : 1000;
  const rows = await db
    .select()
    .from(schema.evidence)
    .orderBy(desc(schema.evidence.observedAt))
    .limit(limit);
  const ndjson = rows
    .map((e) =>
      JSON.stringify({
        recordSlug: e.recordSlug,
        type: e.type,
        observer: e.observer,
        subjectFingerprint: e.subjectFingerprint,
        observedAt: e.observedAt.toISOString(),
        outcome: e.outcome,
      }),
    )
    .join("\n");
  return new NextResponse(ndjson + (ndjson ? "\n" : ""), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "public, max-age=120",
      "x-record-count": String(rows.length),
    },
  });
}
