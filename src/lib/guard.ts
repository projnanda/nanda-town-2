/**
 * SSRF-hardened outbound fetcher. Every network request the town makes to a
 * third-party endpoint (probes, inspections, introspection) goes through here.
 *
 * Defenses:
 * - Custom DNS lookup validates EVERY resolved address against a private/special
 *   blocklist and the socket connects only to a validated address (no
 *   check-then-refetch TOCTOU, which kills DNS rebinding).
 * - http/https only; ports 80/443 (or protocol default) only.
 * - Redirects followed manually (max 5), each hop re-validated.
 * - Hard timeout, response-size cap, no credentials ever attached.
 * - A stable, identifying User-Agent so operators know who probed them.
 */
import { Agent, request } from "undici";
import dns from "node:dns";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

export function isPublicIp(addr: string): boolean {
  const family = isIP(addr);
  if (family === 4) return isPublicV4(addr);
  if (family === 6) return isPublicV6(addr);
  return false;
}

function isPublicV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 0) return false; // 0.0.0.0/8
  if (a === 10) return false; // 10/8
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64/10 CGNAT
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12
  if (a === 192 && b === 0 && parts[2] === 0) return false; // 192.0.0/24
  if (a === 192 && b === 0 && parts[2] === 2) return false; // TEST-NET-1
  if (a === 192 && b === 168) return false; // 192.168/16
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && parts[2] === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast + reserved + broadcast
  return true;
}

function isPublicV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // v4-mapped / v4-compatible / NAT64 — validate the embedded v4.
  const v4tail = lower.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4tail && (lower.startsWith("::ffff:") || lower.startsWith("::") || lower.startsWith("64:ff9b:"))) {
    return isPublicV4(v4tail[1]);
  }
  if (lower === "::" || lower === "::1") return false;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return false; // fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return false; // fc00::/7 ULA
  if (lower.startsWith("ff")) return false; // multicast
  if (lower.startsWith("2001:db8")) return false; // documentation
  if (lower.startsWith("64:ff9b")) return false; // NAT64 without parseable tail
  return true;
}

class BlockedAddressError extends Error {
  constructor(addr: string) {
    super(`blocked non-public address: ${addr}`);
    this.name = "BlockedAddressError";
  }
}

// dns.lookup-compatible resolver that refuses to return non-public addresses.
// The socket then connects only to what this returned — no re-resolution.
const guardedLookup: typeof dns.lookup = ((
  hostname: string,
  options: unknown,
  callback?: unknown,
) => {
  const cb = (typeof options === "function" ? options : callback) as (
    err: NodeJS.ErrnoException | null,
    address?: unknown,
    family?: number,
  ) => void;
  const opts = (typeof options === "object" && options !== null ? options : {}) as dns.LookupOptions;
  dns.lookup(hostname, { all: true, family: (opts.family as 0 | 4 | 6) ?? 0 }, (err, addresses) => {
    if (err) return cb(err);
    const list = addresses as dns.LookupAddress[];
    if (!list.length) return cb(Object.assign(new Error(`no addresses for ${hostname}`), { code: "ENOTFOUND" }));
    const bad = list.find((a) => !isPublicIp(a.address));
    if (bad) return cb(new BlockedAddressError(bad.address));
    if (opts.all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}) as typeof dns.lookup;

const guardedAgent = new Agent({
  connect: { lookup: guardedLookup, timeout: TIMEOUT_MS },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
});

export interface GuardedResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
  truncated: boolean;
  latencyMs: number;
  finalUrl: string;
  redirects: number;
}

export class GuardedFetchError extends Error {
  constructor(
    message: string,
    public reason: "blocked" | "timeout" | "network" | "toolarge" | "badurl" | "redirects",
  ) {
    super(message);
    this.name = "GuardedFetchError";
  }
}

function validateUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new GuardedFetchError(`not a valid URL: ${raw}`, "badurl");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new GuardedFetchError(`protocol not allowed: ${u.protocol}`, "badurl");
  }
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new GuardedFetchError(`port not allowed: ${u.port} (only 80/443)`, "badurl");
  }
  if (u.username || u.password) {
    throw new GuardedFetchError("credentials in URL are not allowed", "badurl");
  }
  // Literal-IP hosts get pre-checked here too (lookup also catches them).
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicIp(host)) {
    throw new GuardedFetchError(`blocked non-public address: ${host}`, "blocked");
  }
  return u;
}

export async function guardedFetch(
  rawUrl: string,
  opts: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    maxBytes?: number;
  } = {},
): Promise<GuardedResponse> {
  const maxBytes = opts.maxBytes ?? 262_144; // 256 KB default
  const started = Date.now();
  let url = validateUrl(rawUrl);
  let redirects = 0;

  for (;;) {
    let res;
    try {
      res = await request(url.toString(), {
        method: opts.method ?? "GET",
        headers: {
          "user-agent": userAgent(),
          accept: opts.headers?.accept ?? "*/*",
          ...opts.headers,
        },
        body: opts.body,
        dispatcher: guardedAgent,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const msg = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
      if (msg.includes("blocked non-public address")) throw new GuardedFetchError(msg, "blocked");
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError" || msg.includes("Timeout"))) {
        throw new GuardedFetchError(`timed out after ${TIMEOUT_MS}ms`, "timeout");
      }
      throw new GuardedFetchError(msg, "network");
    }

    const status = res.statusCode;
    if (status >= 301 && status <= 308 && res.headers.location) {
      await res.body.dump();
      redirects += 1;
      if (redirects > MAX_REDIRECTS) throw new GuardedFetchError("too many redirects", "redirects");
      url = validateUrl(new URL(String(res.headers.location), url).toString());
      continue;
    }

    // Read body with a hard cap.
    const chunks: Buffer[] = [];
    let total = 0;
    let truncated = false;
    for await (const chunk of res.body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        chunks.push(buf.subarray(0, buf.length - (total - maxBytes)));
        truncated = true;
        res.body.destroy();
        break;
      }
      chunks.push(buf);
    }

    const headers: Record<string, string> = {};
    for (const k of ["content-type", "server", "mcp-session-id", "www-authenticate"]) {
      const v = res.headers[k];
      if (typeof v === "string") headers[k] = v.slice(0, 300);
    }

    return {
      status,
      headers,
      bodyText: Buffer.concat(chunks).toString("utf8"),
      truncated,
      latencyMs: Date.now() - started,
      finalUrl: url.toString(),
      redirects,
    };
  }
}

export function userAgent(): string {
  const site = process.env.SITE_URL ?? "https://nanda-town-2.up.railway.app";
  return `NandaTown2-Pulse/0.1 (+${site}/docs#pulse)`;
}
