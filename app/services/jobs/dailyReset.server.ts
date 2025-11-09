// app/services/jobs/dailyReset.server.ts
/**
 * Daily Reset Job (Week 4)
 *
 * Resets all stores' usage counters at 12:00 AM UTC every day.
 * This job should be triggered by a cron service (e.g., Railway Cron, Vercel Crons, external scheduler).
 *
 * Implementation Notes:
 * - Call this function from an external cron job (not from app code)
 * - Schedule it to run at 12:00 AM UTC daily
 * - Add authentication to prevent unauthorized calls
 * - Logs reset count and any errors
 *
 * Example Cron Setup (Railway):
 * ```
 * curl -X POST https://your-app.railway.app/api/cron/daily-reset \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 * ```
 */

import prisma from "~/db.server";
import { startOfDay } from "date-fns";

// ====================
// TYPES
// ====================

export interface ResetJobResult {
  success: boolean;
  message: string;
  storesReset: number;
  timestamp: Date;
  duration: number; // milliseconds
}

// ====================
// MAIN JOB
// ====================

/**
 * Reset all stores' usage counters for the new day
 * Called by external cron job at 12:00 AM UTC
 *
 * @returns Result of the reset operation
 */
export async function resetDailyUsage(): Promise<ResetJobResult> {
  const startTime = Date.now();
  const today = startOfDay(new Date());

  try {
    console.log(
      `[DailyResetJob] Starting daily usage reset at ${new Date().toISOString()}`
    );

    // Reset all usage tracking records that are older than today
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

    const duration = Date.now() - startTime;

    console.log(
      `[DailyResetJob] Successfully reset usage for ${result.count} stores in ${duration}ms`
    );

    return {
      success: true,
      message: `Reset usage for ${result.count} stores`,
      storesReset: result.count,
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(
      `[DailyResetJob] Failed to reset daily usage:`,
      error
    );

    return {
      success: false,
      message: `Failed to reset usage: ${error instanceof Error ? error.message : String(error)}`,
      storesReset: 0,
      timestamp: new Date(),
      duration,
    };
  }
}

// ====================
// INITIALIZE JOB SCHEDULER (Optional)
// ====================

/**
 * Initialize a local scheduler for daily reset (fallback for development)
 * In production, use an external cron service like Railway Crons or Vercel Crons
 *
 * This function can be called on app startup if no external cron is available.
 */
let resetJobInterval: NodeJS.Timeout | null = null;

export function initializeDailyResetJob(): void {
  // Only initialize in development or if explicitly enabled
  const enableLocalScheduler = process.env.ENABLE_LOCAL_RESET_SCHEDULER === "true";

  if (!enableLocalScheduler && process.env.NODE_ENV === "production") {
    console.log(
      "[DailyResetJob] Skipping local scheduler (production mode). Use external cron service."
    );
    return;
  }

  // Cancel existing job if any
  if (resetJobInterval) {
    clearInterval(resetJobInterval);
  }

  // Schedule job to run every 24 hours
  // More robust approach: check every minute if it's midnight UTC
  resetJobInterval = setInterval(async () => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Run only at 12:00 AM UTC (00:00)
    if (currentHour === 0 && currentMinute === 0) {
      try {
        const result = await resetDailyUsage();
        console.log(
          `[DailyResetJob] Scheduler result: ${result.message}`
        );
      } catch (error) {
        console.error(
          `[DailyResetJob] Scheduler error:`,
          error
        );
      }
    }
  }, 60 * 1000); // Check every minute

  console.log(
    "[DailyResetJob] Local scheduler initialized (will reset daily at 12:00 AM UTC)"
  );
}

/**
 * Shut down the daily reset job scheduler
 */
export function shutdownDailyResetJob(): void {
  if (resetJobInterval) {
    clearInterval(resetJobInterval);
    resetJobInterval = null;
    console.log("[DailyResetJob] Scheduler shutdown");
  }
}
