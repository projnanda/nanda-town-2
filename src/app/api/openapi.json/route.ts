import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** OpenAPI 3.1 description of the public API. Dogfooded: the town lists its own spec. */
export async function GET() {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Nanda Town 2 API",
      version: "0.1.0",
      description:
        "Public registry of AI agents and agent-facing services with scheduled probe evidence. The registry computes no scores and assigns no verification labels.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
    },
    servers: [{ url: site }],
    paths: {
      "/api/town/census": {
        get: {
          summary: "Registry counts and prober status",
          responses: { "200": { description: "Census object" } },
        },
      },
      "/api/town/records": {
        get: {
          summary: "List records",
          parameters: [
            { name: "kind", in: "query", schema: { type: "string", enum: ["agent", "service"] } },
          ],
          responses: { "200": { description: "Records with latest liveness" } },
        },
      },
      "/api/town/records/{slug}": {
        get: {
          summary: "One record and its recent evidence",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Record + evidence" }, "404": { description: "Not found" } },
        },
      },
      "/api/town/records/{slug}/stats": {
        get: {
          summary: "Summary statistics over a window",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "window", in: "query", schema: { type: "integer", minimum: 1, maximum: 90, default: 30 } },
          ],
          responses: { "200": { description: "Statistics with sample size" } },
        },
      },
      "/api/town/records/{slug}/history": {
        get: {
          summary: "Liveness time series",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 100 } },
          ],
          responses: { "200": { description: "Ordered observations" } },
        },
      },
      "/api/town/records/{slug}/probe": {
        post: {
          summary: "Probe a listed, consented record now",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Observations written" },
            "409": { description: "Record has not consented to probing" },
            "429": { description: "Rate limited" },
          },
        },
      },
      "/api/town/records/{slug}/badge": {
        get: {
          summary: "Embeddable SVG status badge",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "SVG image", content: { "image/svg+xml": {} } } },
        },
      },
      "/api/town/evidence": {
        get: {
          summary: "Full evidence export (NDJSON)",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 5000, default: 1000 } }],
          responses: { "200": { description: "Newline-delimited evidence records" } },
        },
      },
      "/api/inspect": {
        post: {
          summary: "Probe any endpoint and return a report",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: { type: "string" },
                    type: { type: "string", enum: ["auto", "mcp", "a2a", "openapi", "http"] },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Inspection report" }, "400": { description: "Invalid URL" }, "429": { description: "Rate limited" } },
        },
      },
    },
  };
  return NextResponse.json(spec, { headers: { "cache-control": "public, max-age=3600" } });
}
