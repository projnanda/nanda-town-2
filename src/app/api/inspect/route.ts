import { NextRequest, NextResponse } from "next/server";
import { runInspection, type InspectType } from "@/lib/inspect";
import { allow, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!allow(`inspect:${ip}`, { capacity: 12, refillPerHour: 12 })) {
    return NextResponse.json({ error: "rate limit exceeded — try again later" }, { status: 429 });
  }

  let url = "";
  let type: InspectType = "auto";
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    url = String(body.url ?? "");
    type = (["auto", "mcp", "a2a", "openapi", "http"].includes(body.type) ? body.type : "auto") as InspectType;
  } else {
    const form = await req.formData().catch(() => null);
    url = String(form?.get("url") ?? "");
    const t = String(form?.get("type") ?? "auto");
    type = (["auto", "mcp", "a2a", "openapi", "http"].includes(t) ? t : "auto") as InspectType;
  }

  if (!url || url.length > 300) {
    return NextResponse.json({ error: "provide a url (max 300 chars)" }, { status: 400 });
  }

  try {
    const report = await runInspection(url, type);
    // Browser form → redirect to the report page; API → JSON.
    if (!ct.includes("application/json")) {
      return NextResponse.redirect(new URL(`/inspect/${report.id}`, req.url), 303);
    }
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "inspection failed" },
      { status: 400 },
    );
  }
}
