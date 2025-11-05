// app/middleware/rateLimit.server.ts
// Rate Limiting Middleware Helper (Task 68)

import { json } from "@remix-run/node";
import {
  checkRateLimit,
  buildRateLimitKey,
  RATE_LIMITS,
  type RateLimitConfig,
} from "~/services/rateLimit.server";

/**
 * Rate limit response error
 */
export function rateLimitExceeded(resetAt: Date) {
  return json(
    {
      error: "Rate limit exceeded",
      message: `Too many requests. Please try again after ${resetAt.toLocaleTimeString()}.`,
      resetAt: resetAt.toISOString(),
    },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Apply rate limiting to a route action/loader
 *
 * Usage in loader/action:
 * ```typescript
 * export async function action({ request }: ActionFunctionArgs) {
 *   const { session } = await authenticate.admin(request);
 *   const store = await getStore(session.shop);
 *
 *   // Apply rate limit
 *   const rateLimitResult = await applyRateLimit(store.id, "audit");
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitExceeded(rateLimitResult.resetAt);
 *   }
 *
 *   // Continue with action...
 * }
 * ```
 */
export async function applyRateLimit(
  storeId: string,
  action: keyof typeof RATE_LIMITS
) {
  const config = RATE_LIMITS[action];
  const key = buildRateLimitKey(storeId, action);

  return checkRateLimit(key, config);
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 *
 * Usage:
 * ```typescript
 * export const action = withRateLimit("audit", async ({ request }: ActionFunctionArgs) => {
 *   // Your action code here
 * });
 * ```
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  action: keyof typeof RATE_LIMITS,
  handler: T
): T {
  return (async (...args: any[]) => {
    // Extract request from args (assuming first arg has request)
    const request = args[0]?.request;

    if (!request) {
      throw new Error("withRateLimit: request object not found in handler arguments");
    }

    // Get store ID from session (you'll need to authenticate first)
    // This is a simplified version - in practice, you'd extract storeId from your auth
    // For now, we'll pass storeId through a header or similar mechanism

    const storeId = request.headers.get("x-store-id");
    if (!storeId) {
      // If no store ID, skip rate limiting (development mode or not authenticated)
      return handler(...args);
    }

    const rateLimitResult = await applyRateLimit(storeId, action);
    if (!rateLimitResult.allowed) {
      return rateLimitExceeded(rateLimitResult.resetAt);
    }

    return handler(...args);
  }) as T;
}

/**
 * Add rate limit headers to responses
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: {
    limit: number;
    remaining: number;
    resetAt: Date;
  }
): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set("X-RateLimit-Limit", result.limit.toString());
  newHeaders.set("X-RateLimit-Remaining", result.remaining.toString());
  newHeaders.set(
    "X-RateLimit-Reset",
    Math.ceil(result.resetAt.getTime() / 1000).toString()
  );
  return newHeaders;
}
