import { NextRequest, NextResponse } from "next/server";
import { loadFromFs, loadFromGitHub, reconcile } from "@/lib/records";

export const dynamic = "force-dynamic";

/** Operator-only: force a reconcile from GitHub main (fallback: bundled FS copy). */
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = process.env.RECORDS_REPO;
  const fromGh = repo ? await loadFromGitHub(repo) : null;
  if (fromGh) {
    const result = await reconcile(fromGh, `github:${repo}@main`);
    return NextResponse.json({ source: `github:${repo}`, ...result });
  }
  const fromFs = await loadFromFs(process.cwd());
  const result = await reconcile(fromFs, "fs:deploy");
  return NextResponse.json({ source: "fs (github snapshot unavailable)", ...result });
}
