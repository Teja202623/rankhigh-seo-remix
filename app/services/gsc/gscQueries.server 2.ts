// app/services/gsc/gscQueries.server.ts
// Service for fetching top queries from Google Search Console (Task 52)

import { google } from "googleapis";
import prisma from "~/db.server";
import { getValidAccessToken } from "./gscAuth.server";
import {
  GSCQueryData,
  GSCSearchAnalyticsResponse,
  GSCError,
} from "~/types/gsc";

/**
 * FREE Tier Limits
 * - Last 28 days of data only
 * - Top 3 queries only
 * - Data cached for 24 hours
 */
const FREE_TIER_ROW_LIMIT = 3;
const FREE_TIER_DAYS = 28;
const CACHE_DURATION_HOURS = 24;

/**
 * Get Date Range for FREE Tier
 * Returns start and end dates for last 28 days
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
 * Fetch Top Queries from GSC API
 * Fetches top 3 queries sorted by clicks (FREE tier)
 *
 * @param storeId - Store ID
 * @param forceRefresh - Force refresh even if cached
 * @returns Array of top query data
 */
export async function fetchTopQueries(
  storeId: string,
  forceRefresh = false
): Promise<GSCQueryData[]> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedQueries(storeId);
    if (cached.length > 0) {
      console.log("[GSC Queries] Returning cached data");
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
      `[GSC Queries] Fetching top ${FREE_TIER_ROW_LIMIT} queries for ${startDate} to ${endDate}`
    );

    const response = await webmasters.searchanalytics.query({
      siteUrl: store.gscPropertyUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"], // Group by query
        rowLimit: FREE_TIER_ROW_LIMIT, // FREE tier limit
        startRow: 0,
      },
    });

    const data = response.data as GSCSearchAnalyticsResponse;

    if (!data.rows || data.rows.length === 0) {
      console.log("[GSC Queries] No query data available");
      return [];
    }

    // Transform API response to our format
    const queries: GSCQueryData[] = data.rows.map((row) => ({
      query: row.keys[0], // First dimension is query
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    // Sort by clicks descending (GSC API doesn't always return sorted)
    queries.sort((a, b) => b.clicks - a.clicks);

    // Cache the results
    await cacheQueries(storeId, queries, startDate, endDate);

    // Update last sync timestamp
    await prisma.store.update({
      where: { id: storeId },
      data: { gscLastSync: new Date() },
    });

    console.log(`[GSC Queries] Fetched ${queries.length} queries`);
    return queries;
  } catch (error: any) {
    console.error("[GSC Queries] API error:", error);

    // Handle specific error cases
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
      `Failed to fetch query data: ${error.message}`,
      500
    );
  }
}

/**
 * Get Cached Queries
 * Retrieves queries from database cache if still valid
 *
 * @param storeId - Store ID
 * @returns Cached query data or empty array
 */
async function getCachedQueries(storeId: string): Promise<GSCQueryData[]> {
  const cacheExpiry = new Date();
  cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);

  // Get most recent queries
  const cachedQueries = await prisma.gSCQuery.findMany({
    where: {
      storeId,
      createdAt: { gte: cacheExpiry },
    },
    orderBy: { clicks: "desc" },
    take: FREE_TIER_ROW_LIMIT,
  });

  if (cachedQueries.length === 0) {
    return [];
  }

  return cachedQueries.map((q) => ({
    query: q.query,
    clicks: q.clicks,
    impressions: q.impressions,
    ctr: q.ctr,
    position: q.position,
  }));
}

/**
 * Cache Queries
 * Saves query data to database for caching
 *
 * @param storeId - Store ID
 * @param queries - Query data to cache
 * @param startDate - Date range start
 * @param endDate - Date range end
 */
async function cacheQueries(
  storeId: string,
  queries: GSCQueryData[],
  startDate: string,
  endDate: string
): Promise<void> {
  // Delete old cached data for this store
  await prisma.gSCQuery.deleteMany({ where: { storeId } });

  // Insert new data
  const date = new Date(endDate); // Use end date as reference

  await prisma.gSCQuery.createMany({
    data: queries.map((q) => ({
      storeId,
      query: q.query,
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position,
      date,
    })),
  });

  console.log(`[GSC Queries] Cached ${queries.length} queries`);
}

/**
 * Get Query Trends
 * Compares current queries with previous period (if available)
 * Returns trend indicators for each query
 *
 * @param storeId - Store ID
 * @returns Query data with trend indicators
 */
export async function getQueryTrends(storeId: string): Promise<
  (GSCQueryData & {
    trend?: "up" | "down" | "stable";
    changePercent?: number;
  })[]
> {
  const currentQueries = await fetchTopQueries(storeId);

  // For FREE tier, we only show current data without historical comparison
  // PRO tier could implement trend analysis with historical data
  return currentQueries.map((q) => ({
    ...q,
    trend: "stable", // FREE tier: No historical comparison
  }));
}

/**
 * Get Total Queries Count
 * Returns total number of unique queries in period
 * Note: This is an approximation based on top queries for FREE tier
 *
 * @param storeId - Store ID
 * @returns Estimated total queries
 */
export async function getTotalQueriesCount(storeId: string): Promise<number> {
  const queries = await fetchTopQueries(storeId);
  // For FREE tier, we can only return the count of top queries
  // PRO tier could fetch actual count from GSC
  return queries.length;
}

/**
 * Search Queries
 * Search through cached queries by keyword
 *
 * @param storeId - Store ID
 * @param searchTerm - Search term
 * @returns Matching queries
 */
export async function searchQueries(
  storeId: string,
  searchTerm: string
): Promise<GSCQueryData[]> {
  const allQueries = await fetchTopQueries(storeId);

  // Simple case-insensitive search
  const lowerSearch = searchTerm.toLowerCase();
  return allQueries.filter((q) => q.query.toLowerCase().includes(lowerSearch));
}

/**
 * Get Query Performance Summary
 * Returns summary statistics for all queries
 *
 * @param storeId - Store ID
 * @returns Summary statistics
 */
export async function getQueryPerformanceSummary(storeId: string): Promise<{
  totalQueries: number;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}> {
  const queries = await fetchTopQueries(storeId);

  if (queries.length === 0) {
    return {
      totalQueries: 0,
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
    };
  }

  const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
  const averageCtr = totalClicks / totalImpressions || 0;
  const averagePosition =
    queries.reduce((sum, q) => sum + q.position, 0) / queries.length;

  return {
    totalQueries: queries.length,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
  };
}

/**
 * Get Top Queries (alias for fetchTopQueries)
 */
export const getTopQueries = fetchTopQueries;
