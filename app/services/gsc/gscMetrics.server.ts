// app/services/gsc/gscMetrics.server.ts
// Service for fetching aggregated GSC metrics (Task 54 support)

import { google } from "googleapis";
import prisma from "~/db.server";
import { getValidAccessToken } from "./gscAuth.server";
import { GSCMetrics, GSCSearchAnalyticsResponse, GSCError } from "~/types/gsc";

/**
 * FREE Tier Configuration
 */
const FREE_TIER_DAYS = 28;
const CACHE_DURATION_HOURS = 24;

/**
 * Get Date Range for FREE Tier
 */
function getFreeTierDateRange() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has 2-3 day delay

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - FREE_TIER_DAYS);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Fetch Aggregated Metrics from GSC
 * Fetches overall performance metrics for the period
 *
 * @param storeId - Store ID
 * @param forceRefresh - Force refresh even if cached
 * @returns Aggregated metrics
 */
export async function fetchAggregatedMetrics(
  storeId: string,
  forceRefresh = false
): Promise<GSCMetrics> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedMetrics(storeId);
    if (cached) {
      console.log("[GSC Metrics] Returning cached data");
      return cached;
    }
  }

  // Get store GSC configuration
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      gscPropertyUrl: true,
      gscConnected: true,
    },
  });

  if (!store || !store.gscConnected || !store.gscPropertyUrl) {
    throw new GSCError(
      "NOT_CONNECTED",
      "Google Search Console not connected or property not selected",
      401
    );
  }

  const accessToken = await getValidAccessToken(storeId);
  const { startDate, endDate } = getFreeTierDateRange();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const webmasters = google.webmasters({ version: "v3", auth: oauth2Client });

  try {
    console.log(
      `[GSC Metrics] Fetching aggregated metrics for ${startDate} to ${endDate}`
    );

    // Fetch aggregated data (no dimensions = site-wide totals)
    const response = await webmasters.searchanalytics.query({
      siteUrl: store.gscPropertyUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [], // No dimensions = aggregated totals
      },
    });

    const data = response.data as GSCSearchAnalyticsResponse;

    if (!data.rows || data.rows.length === 0) {
      console.log("[GSC Metrics] No metrics data available");
      return {
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        startDate,
        endDate,
      };
    }

    // First row contains aggregated totals
    const row = data.rows[0];
    const metrics: GSCMetrics = {
      totalClicks: row.clicks,
      totalImpressions: row.impressions,
      averageCtr: row.ctr,
      averagePosition: row.position,
      startDate,
      endDate,
    };

    // Cache the results
    await cacheMetrics(storeId, metrics);

    console.log("[GSC Metrics] Fetched aggregated metrics:", metrics);
    return metrics;
  } catch (error: any) {
    console.error("[GSC Metrics] API error:", error);

    if (error.code === 403) {
      throw new GSCError(
        "API_ERROR",
        "Access forbidden. Please verify your property in Google Search Console.",
        403
      );
    }

    if (error.code === 429) {
      throw new GSCError(
        "QUOTA_EXCEEDED",
        "API quota exceeded. Please try again later.",
        429
      );
    }

    throw new GSCError(
      "API_ERROR",
      `Failed to fetch metrics: ${error.message}`,
      500
    );
  }
}

/**
 * Get Cached Metrics
 * Retrieves metrics from database cache if still valid
 */
async function getCachedMetrics(storeId: string): Promise<GSCMetrics | null> {
  const cacheExpiry = new Date();
  cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);

  const cachedMetric = await prisma.gSCMetric.findFirst({
    where: {
      storeId,
      createdAt: { gte: cacheExpiry },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!cachedMetric) {
    return null;
  }

  return {
    totalClicks: cachedMetric.totalClicks,
    totalImpressions: cachedMetric.totalImpressions,
    averageCtr: cachedMetric.averageCtr,
    averagePosition: cachedMetric.averagePosition,
    startDate: cachedMetric.startDate.toISOString().split("T")[0],
    endDate: cachedMetric.endDate.toISOString().split("T")[0],
  };
}

/**
 * Cache Metrics
 * Saves metrics to database for caching
 */
async function cacheMetrics(
  storeId: string,
  metrics: GSCMetrics
): Promise<void> {
  // Delete old cached data for this store
  await prisma.gSCMetric.deleteMany({ where: { storeId } });

  // Insert new data
  await prisma.gSCMetric.create({
    data: {
      storeId,
      totalClicks: metrics.totalClicks,
      totalImpressions: metrics.totalImpressions,
      averageCtr: metrics.averageCtr,
      averagePosition: metrics.averagePosition,
      startDate: new Date(metrics.startDate),
      endDate: new Date(metrics.endDate),
    },
  });

  console.log("[GSC Metrics] Cached aggregated metrics");
}

/**
 * Get Metrics with Comparison
 * Returns current metrics with comparison to previous period
 * Note: FREE tier only shows current period
 */
export async function getMetricsWithComparison(storeId: string): Promise<{
  current: GSCMetrics;
  previous?: GSCMetrics;
  changes?: {
    clicksChange: number;
    impressionsChange: number;
    ctrChange: number;
    positionChange: number;
  };
}> {
  const current = await fetchAggregatedMetrics(storeId);

  // FREE tier: No historical comparison
  // PRO tier could fetch previous period and calculate changes
  return {
    current,
  };
}

/**
 * Format Metrics for Display
 * Formats metrics with human-readable numbers
 */
export function formatMetrics(metrics: GSCMetrics): {
  totalClicks: string;
  totalImpressions: string;
  averageCtr: string;
  averagePosition: string;
} {
  return {
    totalClicks: formatNumber(metrics.totalClicks),
    totalImpressions: formatNumber(metrics.totalImpressions),
    averageCtr: formatPercentage(metrics.averageCtr),
    averagePosition: formatPosition(metrics.averagePosition),
  };
}

/**
 * Format Number with Commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format Percentage
 */
function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(2)}%`;
}

/**
 * Format Position
 */
function formatPosition(num: number): string {
  return num.toFixed(1);
}

/**
 * Get Metrics Summary
 * Returns a textual summary of performance
 */
export async function getMetricsSummary(storeId: string): Promise<string> {
  const metrics = await fetchAggregatedMetrics(storeId);

  const formatted = formatMetrics(metrics);

  return `Your site received ${formatted.totalClicks} clicks from ${formatted.totalImpressions} impressions (${formatted.averageCtr} CTR) with an average position of ${formatted.averagePosition} in the last 28 days.`;
}

/**
 * Check if Metrics are Healthy
 * Basic health check for metrics
 */
export async function checkMetricsHealth(storeId: string): Promise<{
  isHealthy: boolean;
  warnings: string[];
  suggestions: string[];
}> {
  const metrics = await fetchAggregatedMetrics(storeId);
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Low CTR warning
  if (metrics.averageCtr < 0.02) {
    warnings.push("Your average CTR is below 2%");
    suggestions.push(
      "Consider improving your meta titles and descriptions to increase click-through rate"
    );
  }

  // Low impressions warning
  if (metrics.totalImpressions < 100) {
    warnings.push("Your site has low visibility in search results");
    suggestions.push(
      "Focus on creating more SEO-optimized content and building backlinks"
    );
  }

  // High position warning
  if (metrics.averagePosition > 20) {
    warnings.push("Your average position is below the first page of results");
    suggestions.push(
      "Work on improving your on-page SEO and content quality to rank higher"
    );
  }

  return {
    isHealthy: warnings.length === 0,
    warnings,
    suggestions,
  };
}

/**
 * Get GSC Metrics (alias for fetchAggregatedMetrics)
 */
export const getGSCMetrics = fetchAggregatedMetrics;
