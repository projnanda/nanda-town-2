/** Small in-memory token bucket, per key (IP). Good enough for one instance. */
const buckets = new Map<string, { tokens: number; refilledAt: number }>();

export function allow(key: string, opts: { capacity: number; refillPerHour: number }): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, refilledAt: now };
  const elapsedH = (now - b.refilledAt) / 3_600_000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsedH * opts.refillPerHour);
  b.refilledAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) buckets.clear(); // crude memory bound
  return true;
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : null) ?? headers.get("x-real-ip") ?? "unknown";
}
