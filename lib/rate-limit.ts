import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

/* ------------------------------------------------------------------------ */
/* Shared limits (Upstash Redis)                                            */
/* ------------------------------------------------------------------------ */


/**
 * The real fix for the per-instance caveat above: counters in Upstash Redis,
 * shared by every instance and surviving deploys. Connect it from Vercel →
 * Storage → Upstash Redis; the integration injects KV_REST_API_URL /
 * KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN when set by hand).
 *
 * Without those variables — or if Redis errors — callers fall back to the
 * in-memory limiters above, so the endpoint never goes down because of this.
 */
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = new Map<string, Ratelimit>();

function limiterFor(limit: number, window: Duration, prefix: string) {
  const id = `${prefix}:${limit}:${window}`;
  let limiter = limiters.get(id);
  if (!limiter && redis) {
    limiter = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(limit, window), prefix: `lop:${prefix}` });
    limiters.set(id, limiter);
  }
  return limiter ?? null;
}

export const sharedLimitsEnabled = Boolean(redis);

/**
 * Shared fixed-window limit. Returns null when shared storage is unavailable,
 * so the caller can use the in-memory limiter instead.
 */
export async function sharedLimit(
  key: string,
  limit: number,
  window: Duration,
): Promise<RateLimitResult | null> {
  const limiter = limiterFor(limit, window, key.split(":")[0]);
  if (!limiter) return null;
  try {
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("Shared rate limit unavailable; using in-memory limit", error);
    return null;
  }
}
