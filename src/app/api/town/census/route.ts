import { NextResponse } from "next/server";
import { census } from "@/lib/census";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await census(), { headers: { "cache-control": "public, max-age=30" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "census unavailable" },
      { status: 503 },
    );
  }
}
