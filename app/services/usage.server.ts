// app/services/usage.server.ts
/**
 * Usage Tracking Service (Week 4 - FREE Tier Guardrails)
 *
 * Manages daily usage quotas for FREE tier features:
 * - SEO Audits (max 10 per day)
 * - Bulk Edits (max 10 per day)
 * - Meta Updates (max 50 per day)
 * - ALT Text Updates (max 100 per day)
 * - GSC API Calls (max 100 per day)
 * - Sitemap Generations (max 5 per day)
 *
 * Usage is tracked in the UsageTracking model with daily resets at 12:00 AM UTC.
 * Each store gets one UsageTracking record per day.
 */

import prisma from "~/db.server";

// ====================
// UTILITIES
// ====================

/**
 * Get start of day (midnight UTC)
 */
function getStartOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Calculate days between two dates
 */
function getDaysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((date1.getTime() - date2.getTime()) / oneDay);
}

// ====================
// TYPES
// ====================

export interface UsageQuotas {
  auditRuns: number;
  bulkEdits: number;
  metaUpdates: number;
  altUpdates: number;
  gscApiCalls: number;
  sitemapGenerations: number;
}

export interface UsageLimits {
  auditRuns: number;
  bulkEdits: number;
  metaUpdates: number;
  altUpdates: number;
  gscApiCalls: number;
  sitemapGenerations: number;
}

export interface UsageStatus {
  auditRuns: { used: number; limit: number; remaining: number; percentage: number };
  bulkEdits: { used: number; limit: number; remaining: number; percentage: number };
  metaUpdates: { used: number; limit: number; remaining: number; percentage: number };
  altUpdates: { used: number; limit: number; remaining: number; percentage: number };
  gscApiCalls: { used: number; limit: number; remaining: number; percentage: number };
  sitemapGenerations: { used: number; limit: number; remaining: number; percentage: number };
}

// ====================
// CONFIGURATION
// ====================

/**
 * FREE Tier daily limits
 */
export const FREE_TIER_USAGE_LIMITS: UsageLimits = {
  auditRuns: 10,
  bulkEdits: 10,
  metaUpdates: 50,
  altUpdates: 100,
  gscApiCalls: 100,
  sitemapGenerations: 5,
} as const;

// ====================
// INITIALIZATION & RESET
// ====================

/**
 * Get or create today's UsageTracking record for a store
 * If today's record doesn't exist, create it (and reset counters from yesterday)
 *
 * @param storeId - Store database ID
 * @returns UsageTracking record for today
 */
export async function getOrCreateTodayUsage(storeId: string) {
  const today = getStartOfDayUTC();

  // Try to find existing record for today
  let tracking = await prisma.usageTracking.findUnique({
    where: { storeId },
  });

  // If no record exists, or it's from a different day, create new one
  if (!tracking || getDaysDifference(today, tracking.date) > 0) {
    // Create new record with reset counters
    tracking = await prisma.usageTracking.upsert({
      where: { storeId },
      update: {
        date: today,
        auditRunsToday: 0,
        bulkEditsToday: 0,
        metaUpdatesToday: 0,
        altUpdatesToday: 0,
        gscApiCallsToday: 0,
        sitemapGenerationsToday: 0,
      },
      create: {
        storeId,
        date: today,
        auditRunsToday: 0,
        bulkEditsToday: 0,
        metaUpdatesToday: 0,
        altUpdatesToday: 0,
        gscApiCallsToday: 0,
        sitemapGenerationsToday: 0,
      },
    });

    console.log(
      `[UsageTracking] Reset usage counters for store ${storeId} (new day)`
    );
  }

  return tracking;
}

// ====================
// USAGE CHECKING & INCREMENTING
// ====================

/**
 * Check if a store can perform an action
 *
 * @param storeId - Store database ID
 * @param action - Action to check ("auditRun", "bulkEdit", "metaUpdate", "altUpdate", "gscApiCall", "sitemapGeneration")
 * @param amount - Number of units to check (default 1)
 * @returns { allowed: boolean, remaining: number, limit: number }
 */
export async function canPerformAction(
  storeId: string,
  action: keyof UsageLimits,
  amount: number = 1
): Promise<{
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
}> {
  const tracking = await getOrCreateTodayUsage(storeId);

  // Map action names to field names
  const fieldMap: Record<keyof UsageLimits, keyof typeof tracking> = {
    auditRuns: "auditRunsToday",
    bulkEdits: "bulkEditsToday",
    metaUpdates: "metaUpdatesToday",
    altUpdates: "altUpdatesToday",
    gscApiCalls: "gscApiCallsToday",
    sitemapGenerations: "sitemapGenerationsToday",
  };

  const fieldName = fieldMap[action];
  const currentUsage = tracking[fieldName] as number;
  const limit = FREE_TIER_USAGE_LIMITS[action];
  const wouldExceed = currentUsage + amount > limit;

  return {
    allowed: !wouldExceed,
    used: currentUsage,
    remaining: Math.max(0, limit - currentUsage),
    limit,
  };
}

/**
 * Increment usage for an action (only call after checking canPerformAction)
 *
 * @param storeId - Store database ID
 * @param action - Action to increment
 * @param amount - Number of units to increment (default 1)
 */
export async function incrementUsage(
  storeId: string,
  action: keyof UsageLimits,
  amount: number = 1
): Promise<void> {
  const fieldMap: Record<keyof UsageLimits, string> = {
    auditRuns: "auditRunsToday",
    bulkEdits: "bulkEditsToday",
    metaUpdates: "metaUpdatesToday",
    altUpdates: "altUpdatesToday",
    gscApiCalls: "gscApiCallsToday",
    sitemapGenerations: "sitemapGenerationsToday",
  };

  const fieldName = fieldMap[action];

  await prisma.usageTracking.update({
    where: { storeId },
    data: {
      [fieldName]: {
        increment: amount,
      },
    },
  });

  console.log(
    `[UsageTracking] Incremented ${action} for store ${storeId} by ${amount}`
  );
}

// ====================
// STATUS & QUERIES
// ====================

/**
 * Get complete usage status for a store
 *
 * @param storeId - Store database ID
 * @returns Complete usage status with remaining counts
 */
export async function getUsageStatus(storeId: string): Promise<UsageStatus> {
  const tracking = await getOrCreateTodayUsage(storeId);

  const createStatus = (fieldName: keyof typeof tracking, limit: number) => {
    const used = tracking[fieldName] as number;
    const remaining = Math.max(0, limit - used);
    const percentage = Math.round((used / limit) * 100);

    return {
      used,
      limit,
      remaining,
      percentage,
    };
  };

  return {
    auditRuns: createStatus("auditRunsToday", FREE_TIER_USAGE_LIMITS.auditRuns),
    bulkEdits: createStatus(
      "bulkEditsToday",
      FREE_TIER_USAGE_LIMITS.bulkEdits
    ),
    metaUpdates: createStatus(
      "metaUpdatesToday",
      FREE_TIER_USAGE_LIMITS.metaUpdates
    ),
    altUpdates: createStatus(
      "altUpdatesToday",
      FREE_TIER_USAGE_LIMITS.altUpdates
    ),
    gscApiCalls: createStatus(
      "gscApiCallsToday",
      FREE_TIER_USAGE_LIMITS.gscApiCalls
    ),
    sitemapGenerations: createStatus(
      "sitemapGenerationsToday",
      FREE_TIER_USAGE_LIMITS.sitemapGenerations
    ),
  };
}

/**
 * Get current usage quotas for a store (without creating record)
 * Useful for read-only checks
 *
 * @param storeId - Store database ID
 * @returns UsageQuotas or null if no record found
 */
export async function getUsageQuotas(storeId: string): Promise<UsageQuotas | null> {
  const tracking = await prisma.usageTracking.findUnique({
    where: { storeId },
  });

  if (!tracking) {
    return null;
  }

  // Check if it's still today
  const today = getStartOfDayUTC();
  if (getDaysDifference(today, tracking.date) > 0) {
    // It's a new day, return zeros
    return {
      auditRuns: 0,
      bulkEdits: 0,
      metaUpdates: 0,
      altUpdates: 0,
      gscApiCalls: 0,
      sitemapGenerations: 0,
    };
  }

  return {
    auditRuns: tracking.auditRunsToday,
    bulkEdits: tracking.bulkEditsToday,
    metaUpdates: tracking.metaUpdatesToday,
    altUpdates: tracking.altUpdatesToday,
    gscApiCalls: tracking.gscApiCallsToday,
    sitemapGenerations: tracking.sitemapGenerationsToday,
  };
}

/**
 * Check if usage is at warning threshold (80%)
 *
 * @param storeId - Store database ID
 * @param action - Action to check
 * @returns boolean - true if at or above 80% usage
 */
export async function isAtWarningThreshold(
  storeId: string,
  action: keyof UsageLimits
): Promise<boolean> {
  const status = await getUsageStatus(storeId);
  return status[action].percentage >= 80;
}

/**
 * Check if usage is at or above limit
 *
 * @param storeId - Store database ID
 * @param action - Action to check
 * @returns boolean - true if limit reached
 */
export async function isLimitReached(
  storeId: string,
  action: keyof UsageLimits
): Promise<boolean> {
  const status = await getUsageStatus(storeId);
  return status[action].used >= status[action].limit;
}

// ====================
// ADMIN/TESTING UTILITIES
// ====================

/**
 * Reset usage for a store (admin only, for testing)
 *
 * @param storeId - Store database ID
 */
export async function resetUsage(storeId: string): Promise<void> {
  await prisma.usageTracking.update({
    where: { storeId },
    data: {
      auditRunsToday: 0,
      bulkEditsToday: 0,
      metaUpdatesToday: 0,
      altUpdatesToday: 0,
      gscApiCallsToday: 0,
      sitemapGenerationsToday: 0,
    },
  });

  console.log(`[UsageTracking] Reset usage for store ${storeId}`);
}

/**
 * Batch reset all stores' usage (called by daily cron job)
 * Should be called at 12:00 AM UTC
 *
 * @returns Number of records reset
 */
export async function resetAllUsage(): Promise<number> {
  const today = getStartOfDayUTC();

  const result = await prisma.usageTracking.updateMany({
    where: {
      date: {
        lt: today, // Only reset old records
      },
    },
    data: {
      date: today,
      auditRunsToday: 0,
      bulkEditsToday: 0,
      metaUpdatesToday: 0,
      altUpdatesToday: 0,
      gscApiCallsToday: 0,
      sitemapGenerationsToday: 0,
    },
  });

  console.log(
    `[UsageTracking] Batch reset usage for ${result.count} stores`
  );

  return result.count;
}

/**
 * Get usage statistics across all stores (admin dashboard)
 */
export async function getGlobalUsageStats() {
  const today = getStartOfDayUTC();

  const stats = await prisma.usageTracking.aggregate({
    where: {
      date: {
        gte: today,
      },
    },
    _sum: {
      auditRunsToday: true,
      bulkEditsToday: true,
      metaUpdatesToday: true,
      altUpdatesToday: true,
      gscApiCallsToday: true,
      sitemapGenerationsToday: true,
    },
    _count: true,
  });

  return {
    totalStores: stats._count,
    totalAuditRuns: stats._sum.auditRunsToday || 0,
    totalBulkEdits: stats._sum.bulkEditsToday || 0,
    totalMetaUpdates: stats._sum.metaUpdatesToday || 0,
    totalAltUpdates: stats._sum.altUpdatesToday || 0,
    totalGscApiCalls: stats._sum.gscApiCallsToday || 0,
    totalSitemapGenerations: stats._sum.sitemapGenerationsToday || 0,
  };
}
