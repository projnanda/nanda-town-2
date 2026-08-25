import { NextRequest, NextResponse } from "next/server";
import { handleMcpMessage } from "@/lib/mcp";
import { allow, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } },
      { status: 400 },
    );
  }

  const ip = clientIp(req.headers);
  const allowInspect = () => allow(`mcp-inspect:${ip}`, { capacity: 10, refillPerHour: 10 });

  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body.slice(0, 10)) {
      const res = await handleMcpMessage(msg, allowInspect);
      if (res !== null) responses.push(res);
    }
    if (responses.length === 0) return new NextResponse(null, { status: 202 });
    return NextResponse.json(responses);
  }

  const res = await handleMcpMessage(body as Parameters<typeof handleMcpMessage>[0], allowInspect);
  if (res === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(res);
}

// A friendly answer for browsers/GETs (the MCP transport itself is POST).
export async function GET() {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  return NextResponse.json({
    name: "nanda-town-2",
    transport: "streamable-http (stateless)",
    endpoint: `${site}/mcp`,
    tools: ["search_records", "get_record", "get_census", "inspect_url"],
    docs: `${site}/docs`,
  });
}
