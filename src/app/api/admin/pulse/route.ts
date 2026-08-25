import { NextRequest, NextResponse } from "next/server";
import { runPulse } from "@/lib/pulse";

export const dynamic = "force-dynamic";

/** Operator-only: trigger a pulse run now. */
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runPulse();
  return NextResponse.json(result);
}
