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

/**
 * A process-wide daily ceiling, on top of the per-IP window.
 *
 * The per-IP limiter above is per-instance, so on serverless it is a weak bound
 * on total spend: many instances each keep their own counters, and a caller can
 * spread across IPs. The AI endpoint is unauthenticated and every call costs
 * real money against a key with a hard credit limit, so this adds an absolute
 * ceiling per instance per day — a circuit breaker, so the worst case is
 * bounded rather than open-ended.
 *
 * Known limitation: still per-instance, so the true ceiling is
 * (limit x live instances). A shared store (Upstash Redis, Cloudflare KV, or a
 * Supabase table) is the real fix; this is the honest cheap one.
 */
const dailyCounters = new Map<string, { day: string; count: number }>();

function secondsUntilUtcMidnight() {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

export function dailyCap(scope: string, limit: number): RateLimitResult {
  const day = new Date().toISOString().slice(0, 10);
  const retryAfter = secondsUntilUtcMidnight();
  const entry = dailyCounters.get(scope);

  if (!entry || entry.day !== day) {
    dailyCounters.set(scope, { day, count: 1 });
    return { ok: true, limit, remaining: Math.max(0, limit - 1), retryAfter };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, limit, remaining: 0, retryAfter };
  }
  return { ok: true, limit, remaining: Math.max(0, limit - entry.count), retryAfter };
}

export function dailyCapResponse(result: RateLimitResult) {
  return {
    error: "DAILY_LIMIT_REACHED" as const,
    message: "The editor has had a very busy day. Please try again tomorrow.",
    retryAfter: result.retryAfter,
  };
}
