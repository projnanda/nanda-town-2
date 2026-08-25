import { NextRequest, NextResponse } from "next/server";
import { listRecords } from "@/lib/census";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind = kindParam === "agent" || kindParam === "service" ? kindParam : undefined;
  const records = await listRecords(kind);
  return NextResponse.json(
    { count: records.length, records },
    { headers: { "cache-control": "public, max-age=30" } },
  );
}
