import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client only if environment variables are configured
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Standard Rate Limiter: 30 requests per 60 seconds (sliding window)
export const standardRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: true,
      prefix: "@tacticus/standard",
    })
  : null;

// Raid Rate Limiter: 20 requests per 60 seconds (more restrictive for heavy endpoints)
export const raidRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      analytics: true,
      prefix: "@tacticus/raid",
    })
  : null;

// Chat Rate Limiter: 10 requests per 60 seconds (for Claude API calls)
export const chatRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "@tacticus/chat",
    })
  : null;

export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/**
 * Check rate limit for a given identifier (usually user UID).
 * Returns success: true if request is allowed, false if rate limited.
 * When Redis is not configured (dev mode), always allows requests.
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null = standardRateLimit
): Promise<RateLimitResult> {
  if (!limiter) {
    // No Redis configured - allow all requests (dev mode)
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, reset };
  } catch (error) {
    // If Redis fails, log error but allow request (fail open for availability)
    console.error("Rate limit check failed:", error);
    return { success: true };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {};

  if (result.limit !== undefined) {
    headers["X-RateLimit-Limit"] = String(result.limit);
  }
  if (result.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(result.remaining);
  }
  if (result.reset !== undefined) {
    headers["X-RateLimit-Reset"] = String(result.reset);
    // Calculate seconds until reset
    const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
    headers["Retry-After"] = String(retryAfter);
  }

  return headers;
}
