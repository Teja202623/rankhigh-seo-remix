// app/utils/limitErrors.server.ts
/**
 * Limit Exceeded Error Utilities (Week 4)
 *
 * Provides error classes and helper functions for handling FREE tier limit violations.
 */

import { json } from "@remix-run/node";

// ====================
// ERROR CLASSES
// ====================

/**
 * Custom error for when a usage limit is exceeded
 */
export class LimitExceededError extends Error {
  constructor(
    public feature: string,
    public used: number,
    public limit: number,
    public resetAt: Date
  ) {
    super(
      `${feature} limit exceeded (${used}/${limit}). Resets at ${resetAt.toISOString()}`
    );
    this.name = "LimitExceededError";
  }
}

/**
 * Custom error for when approaching a usage limit (warning)
 */
export class LimitWarningError extends Error {
  constructor(
    public feature: string,
    public used: number,
    public limit: number,
    public percentage: number
  ) {
    super(
      `${feature} limit warning (${percentage}% used)`
    );
    this.name = "LimitWarningError";
  }
}

// ====================
// RESPONSE BUILDERS
// ====================

/**
 * Build a 429 Too Many Requests response for limit exceeded
 *
 * @param feature - Feature name ("audits", "bulk-edits", etc.)
 * @param used - Number of uses so far
 * @param limit - Usage limit
 * @param resetAt - When the limit resets
 * @returns JSON response with 429 status
 */
export function limitExceededResponse(
  feature: string,
  used: number,
  limit: number,
  resetAt: Date
) {
  const resetTime = resetAt.toISOString();
  const secondsUntilReset = Math.ceil(
    (resetAt.getTime() - Date.now()) / 1000
  );

  return json(
    {
      error: "limit_exceeded",
      message: `${feature} limit exceeded. You've used ${used} of ${limit} allowed for today.`,
      feature,
      used,
      limit,
      resetAt: resetTime,
      secondsUntilReset,
      upgradeUrl: "/upgrade",
    },
    {
      status: 429,
      headers: {
        "Retry-After": secondsUntilReset.toString(),
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetTime,
      },
    }
  );
}

/**
 * Build a warning response (200 OK) when approaching limit
 *
 * @param feature - Feature name
 * @param used - Number of uses so far
 * @param limit - Usage limit
 * @param percentage - Usage percentage
 * @returns JSON response with 200 status and warning
 */
export function limitWarningResponse(
  feature: string,
  used: number,
  limit: number,
  percentage: number
) {
  return json(
    {
      warning: "approaching_limit",
      message: `You've used ${percentage}% of your ${feature} quota for today.`,
      feature,
      used,
      limit,
      percentage,
      recommendation: "Consider upgrading to PRO for unlimited access.",
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": Math.max(0, limit - used).toString(),
      },
    }
  );
}

// ====================
// BATCH OPERATIONS
// ====================

/**
 * Validates a batch operation against limit
 *
 * Example:
 * ```typescript
 * const validation = validateBatchOperation(
 *   "bulk-edits",
 *   50,    // items to update
 *   10,    // limit per day
 *   2      // already used today
 * );
 *
 * if (!validation.allowed) {
 *   return limitExceededResponse(
 *     validation.feature,
 *     validation.would_use,
 *     validation.limit,
 *     validation.resetAt
 *   );
 * }
 * ```
 */
export function validateBatchOperation(
  feature: string,
  itemCount: number,
  limit: number,
  currentUsage: number
) {
  const wouldUse = currentUsage + itemCount;
  const allowed = wouldUse <= limit;
  const remaining = Math.max(0, limit - currentUsage);
  const canUpdate = Math.min(itemCount, remaining);

  return {
    feature,
    allowed,
    itemCount,
    limit,
    currentUsage,
    would_use: wouldUse,
    remaining,
    canUpdate, // How many of the items can actually be updated
    message: allowed
      ? `Can update all ${itemCount} items`
      : `Can only update ${canUpdate} of ${itemCount} items (${limit} limit)`,
    resetAt: new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
    ),
  };
}

// ====================
// USER-FACING ERROR MESSAGES
// ====================

export const ERROR_MESSAGES = {
  audit_limit: "You've reached your daily audit limit. Upgrade to PRO for unlimited audits.",
  "bulk-edit_limit":
    "You've reached your daily bulk edit limit. Upgrade to PRO for unlimited edits.",
  meta_update_limit:
    "You've reached your daily meta update limit. Upgrade to PRO for unlimited updates.",
  alt_update_limit:
    "You've reached your daily ALT text update limit. Upgrade to PRO for unlimited updates.",
  gsc_api_limit:
    "You've reached your daily Google Search Console API call limit. Upgrade to PRO for unlimited calls.",
  sitemap_limit:
    "You've reached your daily sitemap generation limit. Upgrade to PRO for unlimited generations.",
  warning_audit: "You've used 80%+ of your daily audit limit.",
  warning_meta: "You've used 80%+ of your daily meta update limit.",
  warning_alt: "You've used 80%+ of your daily ALT text update limit.",
} as const;

// ====================
// LOGGING
// ====================

/**
 * Log a limit violation for analytics/monitoring
 */
export function logLimitViolation(
  storeId: string,
  feature: string,
  used: number,
  limit: number
): void {
  console.warn(
    `[LimitViolation] Store ${storeId} exceeded ${feature} limit: ${used}/${limit}`
  );
  // TODO: Send to monitoring service (e.g., Sentry, DataDog)
}

/**
 * Log a limit warning
 */
export function logLimitWarning(
  storeId: string,
  feature: string,
  used: number,
  limit: number,
  percentage: number
): void {
  console.info(
    `[LimitWarning] Store ${storeId} at ${percentage}% of ${feature} limit: ${used}/${limit}`
  );
  // TODO: Send to monitoring service
}
