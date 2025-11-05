// app/services/gsc/gscPages.server.ts
// Service for fetching top pages from Google Search Console (Task 53)

import { google } from "googleapis";
import prisma from "~/db.server";
import { getValidAccessToken } from "./gscAuth.server";
import {
  GSCPageData,
  GSCSearchAnalyticsResponse,
  GSCError,
} from "~/types/gsc";

/**
 * FREE Tier Limits
 * - Last 28 days of data only
 * - Top 3 pages only
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
 * Fetch Top Pages from GSC API
 * Fetches top 3 pages sorted by clicks (FREE tier)
 *
 * @param storeId - Store ID
 * @param forceRefresh - Force refresh even if cached
 * @returns Array of top page data
 */
export async function fetchTopPages(
  storeId: string,
  forceRefresh = false
): Promise<GSCPageData[]> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedPages(storeId);
    if (cached.length > 0) {
      console.log("[GSC Pages] Returning cached data");
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
      `[GSC Pages] Fetching top ${FREE_TIER_ROW_LIMIT} pages for ${startDate} to ${endDate}`
    );

    const response = await webmasters.searchanalytics.query({
      siteUrl: store.gscPropertyUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"], // Group by page URL
        rowLimit: FREE_TIER_ROW_LIMIT, // FREE tier limit
        startRow: 0,
      },
    });

    const data = response.data as GSCSearchAnalyticsResponse;

    if (!data.rows || data.rows.length === 0) {
      console.log("[GSC Pages] No page data available");
      return [];
    }

    // Transform API response to our format
    const pages: GSCPageData[] = data.rows.map((row) => ({
      pageUrl: row.keys[0], // First dimension is page URL
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    // Sort by clicks descending (GSC API doesn't always return sorted)
    pages.sort((a, b) => b.clicks - a.clicks);

    // Cache the results
    await cachePages(storeId, pages, startDate, endDate);

    // Update last sync timestamp
    await prisma.store.update({
      where: { id: storeId },
      data: { gscLastSync: new Date() },
    });

    console.log(`[GSC Pages] Fetched ${pages.length} pages`);
    return pages;
  } catch (error: any) {
    console.error("[GSC Pages] API error:", error);

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
      `Failed to fetch page data: ${error.message}`,
      500
    );
  }
}

/**
 * Get Cached Pages
 * Retrieves pages from database cache if still valid
 *
 * @param storeId - Store ID
 * @returns Cached page data or empty array
 */
async function getCachedPages(storeId: string): Promise<GSCPageData[]> {
  const cacheExpiry = new Date();
  cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);

  // Get most recent pages
  const cachedPages = await prisma.gSCPage.findMany({
    where: {
      storeId,
      createdAt: { gte: cacheExpiry },
    },
    orderBy: { clicks: "desc" },
    take: FREE_TIER_ROW_LIMIT,
  });

  if (cachedPages.length === 0) {
    return [];
  }

  return cachedPages.map((p) => ({
    pageUrl: p.pageUrl,
    clicks: p.clicks,
    impressions: p.impressions,
    ctr: p.ctr,
    position: p.position,
  }));
}

/**
 * Cache Pages
 * Saves page data to database for caching
 *
 * @param storeId - Store ID
 * @param pages - Page data to cache
 * @param startDate - Date range start
 * @param endDate - Date range end
 */
async function cachePages(
  storeId: string,
  pages: GSCPageData[],
  startDate: string,
  endDate: string
): Promise<void> {
  // Delete old cached data for this store
  await prisma.gSCPage.deleteMany({ where: { storeId } });

  // Insert new data
  const date = new Date(endDate); // Use end date as reference

  await prisma.gSCPage.createMany({
    data: pages.map((p) => ({
      storeId,
      pageUrl: p.pageUrl,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: p.ctr,
      position: p.position,
      date,
    })),
  });

  console.log(`[GSC Pages] Cached ${pages.length} pages`);
}

/**
 * Get Page Trends
 * Compares current pages with previous period (if available)
 * Returns trend indicators for each page
 *
 * @param storeId - Store ID
 * @returns Page data with trend indicators
 */
export async function getPageTrends(storeId: string): Promise<
  (GSCPageData & {
    trend?: "up" | "down" | "stable";
    changePercent?: number;
  })[]
> {
  const currentPages = await fetchTopPages(storeId);

  // For FREE tier, we only show current data without historical comparison
  // PRO tier could implement trend analysis with historical data
  return currentPages.map((p) => ({
    ...p,
    trend: "stable", // FREE tier: No historical comparison
  }));
}

/**
 * Get Total Pages Count
 * Returns total number of pages with traffic in period
 * Note: This is an approximation based on top pages for FREE tier
 *
 * @param storeId - Store ID
 * @returns Estimated total pages
 */
export async function getTotalPagesCount(storeId: string): Promise<number> {
  const pages = await fetchTopPages(storeId);
  // For FREE tier, we can only return the count of top pages
  // PRO tier could fetch actual count from GSC
  return pages.length;
}

/**
 * Get Page by URL
 * Find specific page data by URL
 *
 * @param storeId - Store ID
 * @param url - Page URL to find
 * @returns Page data or null
 */
export async function getPageByUrl(
  storeId: string,
  url: string
): Promise<GSCPageData | null> {
  const allPages = await fetchTopPages(storeId);

  // Normalize URLs for comparison
  const normalizedUrl = url.toLowerCase();
  const page = allPages.find((p) =>
    p.pageUrl.toLowerCase().includes(normalizedUrl)
  );

  return page || null;
}

/**
 * Get Page Performance Summary
 * Returns summary statistics for all pages
 *
 * @param storeId - Store ID
 * @returns Summary statistics
 */
export async function getPagePerformanceSummary(storeId: string): Promise<{
  totalPages: number;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}> {
  const pages = await fetchTopPages(storeId);

  if (pages.length === 0) {
    return {
      totalPages: 0,
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
    };
  }

  const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
  const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
  const averageCtr = totalClicks / totalImpressions || 0;
  const averagePosition =
    pages.reduce((sum, p) => sum + p.position, 0) / pages.length;

  return {
    totalPages: pages.length,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
  };
}

/**
 * Compare Page Performance
 * Compare performance of two pages
 *
 * @param storeId - Store ID
 * @param url1 - First page URL
 * @param url2 - Second page URL
 * @returns Comparison data
 */
export async function comparePagePerformance(
  storeId: string,
  url1: string,
  url2: string
): Promise<{
  page1: GSCPageData | null;
  page2: GSCPageData | null;
  comparison: {
    clicksDiff: number;
    impressionsDiff: number;
    ctrDiff: number;
    positionDiff: number;
  } | null;
}> {
  const page1 = await getPageByUrl(storeId, url1);
  const page2 = await getPageByUrl(storeId, url2);

  if (!page1 || !page2) {
    return { page1, page2, comparison: null };
  }

  return {
    page1,
    page2,
    comparison: {
      clicksDiff: page1.clicks - page2.clicks,
      impressionsDiff: page1.impressions - page2.impressions,
      ctrDiff: page1.ctr - page2.ctr,
      positionDiff: page1.position - page2.position,
    },
  };
}

/**
 * Get Pages by Performance Threshold
 * Filter pages by minimum performance criteria
 *
 * @param storeId - Store ID
 * @param minClicks - Minimum clicks threshold
 * @returns Pages meeting criteria
 */
export async function getPagesByPerformance(
  storeId: string,
  minClicks: number
): Promise<GSCPageData[]> {
  const allPages = await fetchTopPages(storeId);
  return allPages.filter((p: GSCPageData) => p.clicks >= minClicks);
}

/**
 * Get Top Pages (alias for fetchTopPages)
 */
export const getTopPages = fetchTopPages;
