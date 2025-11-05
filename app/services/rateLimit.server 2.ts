// app/services/rateLimit.server.ts
// Rate Limiting Middleware (Task 68)

/**
 * Rate Limiting Service for RankHigh SEO App
 *
 * FREE Tier Limits:
 * - 100 requests per hour per store
 * - 10 audit runs per day
 * - 50 meta updates per day
 * - 100 GSC API calls per day
 *
 * Uses in-memory storage for FREE tier (no Redis needed)
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix timestamp
}

interface RateLimitStore {
  [key: string]: RateLimitRecord;
}

// In-memory storage (clears on server restart)
const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  limit: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given key
 *
 * @param key - Unique identifier (e.g., "store:123:audit" or "store:123:global")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore[key];

  // Create new record if doesn't exist or expired
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore[key] = record;
  }

  // Check if limit exceeded
  const allowed = record.count < config.limit;

  // Increment count if allowed
  if (allowed) {
    record.count++;
  }

  return {
    allowed,
    limit: config.limit,
    remaining: Math.max(0, config.limit - record.count),
    resetAt: new Date(record.resetAt),
  };
}

/**
 * Reset rate limit for a given key (useful for testing or admin overrides)
 */
export function resetRateLimit(key: string): void {
  delete rateLimitStore[key];
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore[key];

  if (!record || record.resetAt < now) {
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: new Date(now + config.windowMs),
    };
  }

  return {
    allowed: record.count < config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - record.count),
    resetAt: new Date(record.resetAt),
  };
}

// Predefined rate limit configs for FREE tier
export const RATE_LIMITS = {
  GLOBAL: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 requests per hour
  AUDIT: { limit: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 audits per day
  META_UPDATE: { limit: 50, windowMs: 24 * 60 * 60 * 1000 }, // 50 updates per day
  ALT_UPDATE: { limit: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100 updates per day
  GSC_API: { limit: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100 GSC calls per day
  SITEMAP_GEN: { limit: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 sitemaps per day
} as const;

/**
 * Helper to build rate limit keys
 */
export function buildRateLimitKey(storeId: string, action: string): string {
  return `store:${storeId}:${action}`;
}
