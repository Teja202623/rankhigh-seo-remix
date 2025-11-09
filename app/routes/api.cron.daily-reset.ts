// app/routes/api.cron.daily-reset.ts
/**
 * API Endpoint: Daily Usage Reset
 *
 * POST /api/cron/daily-reset
 *
 * Resets all stores' daily usage counters at 12:00 AM UTC.
 * Should be called by an external cron service (Railway Crons, Vercel Crons, etc.)
 *
 * Security:
 * - Requires valid CRON_SECRET in Authorization header
 * - Only accepts POST requests
 *
 * Example call:
 * ```bash
 * curl -X POST https://your-app.railway.app/api/cron/daily-reset \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 * ```
 */

import { json, type ActionFunction } from "@remix-run/node";
import { resetDailyUsage } from "~/services/jobs/dailyReset.server";

export const action: ActionFunction = async ({ request }) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn(
      "[DailyResetEndpoint] CRON_SECRET not configured. Rejecting request."
    );
    return json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring("Bearer ".length);

  if (token !== cronSecret) {
    console.warn(
      "[DailyResetEndpoint] Invalid cron secret provided"
    );
    return json(
      { error: "Invalid credentials" },
      { status: 403 }
    );
  }

  try {
    // Execute the reset job
    const result = await resetDailyUsage();

    if (result.success) {
      return json(
        {
          success: true,
          message: result.message,
          storesReset: result.storesReset,
          timestamp: result.timestamp,
          duration: `${result.duration}ms`,
        },
        { status: 200 }
      );
    } else {
      return json(
        {
          success: false,
          message: result.message,
          timestamp: result.timestamp,
          duration: `${result.duration}ms`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DailyResetEndpoint] Unexpected error:", error);

    return json(
      {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
};
