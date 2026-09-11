/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Why this exists: `/api/memory-engine` is unauthenticated, and every request
 * spends real money on an AI provider. Without a limiter, any anonymous caller
 * can loop the endpoint and burn the monthly budget.
 *
 * Known limitation: state is per-instance. On a multi-instance or serverless
 * deployment each instance holds its own counters, so the effective limit is
 * (limit x instances). That is still enough to stop casual abuse, accidental
 * loops, and a single hot client — which is the realistic threat here. If the
 * demo endpoint is ever promoted publicly at scale, replace this with a shared
 * store (Upstash Redis, Cloudflare KV/Durable Object, or Supabase table).
 */

type Window = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, Window>();

/** Drop expired windows so a long-lived instance does not leak memory. */
function sweep(now: number) {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfter: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { ok: false, limit, remaining: 0, retryAfter };
  }

  return { ok: true, limit, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client identity. On Vercel/Cloudflare the platform sets
 * `x-forwarded-for`; the left-most entry is the original client.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitResponse(result: RateLimitResult) {
  return {
    error: "RATE_LIMITED" as const,
    message: "Too many requests. Please try again shortly.",
    retryAfter: result.retryAfter,
  };
}
