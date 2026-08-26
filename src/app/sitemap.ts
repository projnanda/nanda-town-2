import type { MetadataRoute } from "next";
import { listRecords } from "@/lib/census";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  const staticPaths = ["", "/records", "/list", "/docs", "/methods", "/status"].map((p) => ({
    url: `${site}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  let records: { slug: string; updatedAt: Date }[] = [];
  try {
    records = await listRecords();
  } catch {
    records = [];
  }
  const recordPaths = records.map((r) => ({
    url: `${site}/r/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  return [...staticPaths, ...recordPaths];
}
