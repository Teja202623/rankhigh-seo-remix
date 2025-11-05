// app/services/sitemap.server.ts
import type { Store } from "@prisma/client";

/**
 * Sitemap Generation Service
 *
 * Generates XML sitemaps for Shopify stores following Google's sitemap protocol.
 * This service creates a basic sitemap structure that can be expanded with actual
 * store pages, products, and collections.
 *
 * Key Features:
 * - XML sitemap generation following sitemap.org protocol
 * - Priority and change frequency settings
 * - Support for multiple page types (products, collections, pages, blog posts)
 * - Proper URL encoding and XML escaping
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Represents a single URL entry in the sitemap
 */
export interface SitemapUrl {
  loc: string; // URL of the page
  lastmod?: string; // Last modification date (ISO 8601)
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; // Priority 0.0 to 1.0
}

/**
 * Configuration for sitemap generation
 */
export interface SitemapConfig {
  shopUrl: string;
  includeProducts?: boolean;
  includeCollections?: boolean;
  includePages?: boolean;
  includeBlogPosts?: boolean;
}

// ============================================================================
// SITEMAP GENERATION
// ============================================================================

/**
 * Generate a basic XML sitemap
 *
 * Creates a sitemap with common Shopify pages. In production, this should be
 * expanded to query the database for actual pages, products, and collections.
 *
 * @param config - Configuration for sitemap generation
 * @returns XML string representing the sitemap
 *
 * @example
 * ```ts
 * const sitemap = generateBasicSitemap({
 *   shopUrl: "example.myshopify.com",
 *   includeProducts: true,
 *   includeCollections: true
 * });
 * ```
 */
export function generateBasicSitemap(config: SitemapConfig): string {
  const { shopUrl } = config;

  // Normalize shop URL (remove protocol if present)
  const normalizedShopUrl = shopUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const baseUrl = `https://${normalizedShopUrl}`;

  // Default sitemap URLs - these are common on all Shopify stores
  const urls: SitemapUrl[] = [
    {
      loc: baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/collections`,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 0.9,
    },
    {
      loc: `${baseUrl}/collections/all`,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/pages/about`,
      changefreq: "monthly",
      priority: 0.6,
    },
    {
      loc: `${baseUrl}/pages/contact`,
      changefreq: "monthly",
      priority: 0.5,
    },
  ];

  return buildSitemapXml(urls);
}

/**
 * Generate sitemap for a store with database-backed URLs
 *
 * This is a placeholder for the full implementation that will query
 * the database for actual pages, products, and collections.
 *
 * @param store - Store record from database
 * @returns XML string representing the sitemap
 *
 * @example
 * ```ts
 * const store = await getStore("example.myshopify.com");
 * const sitemap = await generateStoreSitemap(store);
 * ```
 */
export async function generateStoreSitemap(store: Store): Promise<string> {
  // TODO: Query database for actual pages when Page model is populated
  // const pages = await prisma.page.findMany({
  //   where: { storeId: store.id, status: "ACTIVE" },
  //   select: { url: true, updatedAt: true, pageType: true },
  // });

  // For now, generate a basic sitemap
  return generateBasicSitemap({
    shopUrl: store.shopUrl,
    includeProducts: true,
    includeCollections: true,
    includePages: true,
    includeBlogPosts: true,
  });
}

/**
 * Build XML sitemap from URL array
 *
 * Converts an array of sitemap URLs into valid XML following the
 * sitemap protocol specification.
 *
 * @param urls - Array of sitemap URL entries
 * @returns XML string
 */
function buildSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      const lastmod = url.lastmod
        ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>`
        : "";
      const changefreq = url.changefreq
        ? `\n    <changefreq>${url.changefreq}</changefreq>`
        : "";
      const priority =
        url.priority !== undefined
          ? `\n    <priority>${url.priority.toFixed(1)}</priority>`
          : "";

      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>${lastmod}${changefreq}${priority}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Escape XML special characters
 *
 * Ensures URLs and content are properly escaped for XML.
 *
 * @param str - String to escape
 * @returns Escaped string safe for XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate sitemap URL
 *
 * Ensures a URL meets sitemap protocol requirements.
 *
 * @param url - URL to validate
 * @returns Boolean indicating if URL is valid
 */
export function isValidSitemapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      url.length <= 2048
    );
  } catch {
    return false;
  }
}

/**
 * Get sitemap stats
 *
 * Calculate statistics about a sitemap for display purposes.
 *
 * @param xml - Sitemap XML string
 * @returns Object with sitemap statistics
 */
export function getSitemapStats(xml: string): {
  urlCount: number;
  sizeInBytes: number;
  sizeInKB: number;
} {
  const urlCount = (xml.match(/<url>/g) || []).length;
  const sizeInBytes = new Blob([xml]).size;
  const sizeInKB = Math.round((sizeInBytes / 1024) * 100) / 100;

  return {
    urlCount,
    sizeInBytes,
    sizeInKB,
  };
}
