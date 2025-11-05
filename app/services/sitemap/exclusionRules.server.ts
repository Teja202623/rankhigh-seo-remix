// app/services/sitemap/exclusionRules.server.ts

import type {
  ExclusionRules,
  ShopifyProductNode,
  SitemapUrl,
} from "~/types/sitemap";

/**
 * Default system exclusions that are always applied for SEO best practices
 */
const SYSTEM_EXCLUSIONS = [
  /\/search/, // Search results page
  /\/cart/, // Shopping cart
  /\/checkout/, // Checkout pages
  /\/account/, // Customer account pages
  /\/password/, // Password page
  /\/challenge/, // Challenge/CAPTCHA pages
  /\/admin/, // Admin pages
  /\/apps/, // App pages
  /\/cdn-cgi/, // CDN pages
];

/**
 * Checks if a URL should be excluded based on exclusion rules
 * @param url - The URL to check
 * @param exclusionRules - The exclusion rules configuration
 * @returns true if the URL should be excluded, false otherwise
 */
export function shouldExcludeUrl(
  url: string,
  exclusionRules: ExclusionRules
): boolean {
  const path = new URL(url).pathname;

  // Check system exclusions
  if (exclusionRules.excludeSearch && /\/search/.test(path)) {
    return true;
  }

  if (exclusionRules.excludeCart && /\/cart/.test(path)) {
    return true;
  }

  if (exclusionRules.excludeCheckout && /\/checkout/.test(path)) {
    return true;
  }

  if (exclusionRules.excludeAccount && /\/account/.test(path)) {
    return true;
  }

  // Check custom exclusion patterns
  if (exclusionRules.customExclusions.length > 0) {
    for (const pattern of exclusionRules.customExclusions) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(path)) {
          return true;
        }
      } catch (error) {
        // Invalid regex pattern, skip it
        console.warn(`Invalid regex pattern: ${pattern}`, error);
      }
    }
  }

  return false;
}

/**
 * Checks if a product should be excluded based on exclusion rules
 * @param product - The Shopify product node
 * @param exclusionRules - The exclusion rules configuration
 * @returns true if the product should be excluded, false otherwise
 */
export function shouldExcludeProduct(
  product: ShopifyProductNode,
  exclusionRules: ExclusionRules
): boolean {
  // Always exclude draft and archived products
  if (
    exclusionRules.excludeDraft &&
    (product.status === "DRAFT" || product.status === "ARCHIVED")
  ) {
    return true;
  }

  // Exclude out-of-stock products if enabled
  if (exclusionRules.excludeOutOfStock) {
    // If totalInventory is 0 or undefined, consider it out of stock
    if (!product.totalInventory || product.totalInventory <= 0) {
      return true;
    }
  }

  return false;
}

/**
 * Filters an array of sitemap URLs based on exclusion rules
 * @param urls - Array of sitemap URLs to filter
 * @param exclusionRules - The exclusion rules configuration
 * @returns Filtered array of sitemap URLs
 */
export function filterUrlsByExclusionRules(
  urls: SitemapUrl[],
  exclusionRules: ExclusionRules
): SitemapUrl[] {
  return urls.filter((url) => !shouldExcludeUrl(url.loc, exclusionRules));
}

/**
 * Parses custom exclusion patterns from a string (comma or newline separated)
 * @param patternsString - String containing patterns
 * @returns Array of pattern strings
 */
export function parseCustomExclusions(patternsString: string): string[] {
  if (!patternsString || patternsString.trim() === "") {
    return [];
  }

  // Split by comma or newline
  const patterns = patternsString
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return patterns;
}

/**
 * Validates a regex pattern to ensure it's valid
 * @param pattern - The regex pattern string
 * @returns Object with valid flag and error message if invalid
 */
export function validateRegexPattern(pattern: string): {
  valid: boolean;
  error?: string;
} {
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid regex pattern",
    };
  }
}

/**
 * Gets default exclusion rules for new stores
 * @returns Default ExclusionRules configuration
 */
export function getDefaultExclusionRules(): ExclusionRules {
  return {
    excludePasswordProtected: false,
    excludeOutOfStock: false,
    excludeDraft: true, // Always exclude draft/archived by default
    excludeSearch: true, // SEO best practice
    excludeCart: true, // SEO best practice
    excludeCheckout: true, // SEO best practice
    excludeAccount: true, // SEO best practice
    customExclusions: [],
  };
}

/**
 * Converts database exclusion fields to ExclusionRules object
 * @param dbData - Database fields from Store model
 * @returns ExclusionRules object
 */
export function dbToExclusionRules(dbData: {
  sitemapExcludePasswordProtected: boolean;
  sitemapExcludeOutOfStock: boolean;
  sitemapExcludeDraft: boolean;
  sitemapExcludeSearch: boolean;
  sitemapExcludeCart: boolean;
  sitemapExcludeCheckout: boolean;
  sitemapExcludeAccount: boolean;
  sitemapCustomExclusions: string | null;
}): ExclusionRules {
  return {
    excludePasswordProtected: dbData.sitemapExcludePasswordProtected,
    excludeOutOfStock: dbData.sitemapExcludeOutOfStock,
    excludeDraft: dbData.sitemapExcludeDraft,
    excludeSearch: dbData.sitemapExcludeSearch,
    excludeCart: dbData.sitemapExcludeCart,
    excludeCheckout: dbData.sitemapExcludeCheckout,
    excludeAccount: dbData.sitemapExcludeAccount,
    customExclusions: dbData.sitemapCustomExclusions
      ? JSON.parse(dbData.sitemapCustomExclusions)
      : [],
  };
}

/**
 * Estimates URL count after applying exclusion rules
 * @param totalProducts - Total products count
 * @param totalCollections - Total collections count
 * @param totalPages - Total pages count
 * @param totalBlogPosts - Total blog posts count
 * @param exclusionRules - The exclusion rules configuration
 * @returns Estimated URL count
 */
export function estimateUrlCount(
  totalProducts: number,
  totalCollections: number,
  totalPages: number,
  totalBlogPosts: number,
  exclusionRules: ExclusionRules
): number {
  // Start with base counts
  let estimate = 0;

  // Homepage and collections page
  estimate += 2;

  // Add products (assume 20% reduction for out-of-stock/draft if enabled)
  if (exclusionRules.excludeOutOfStock || exclusionRules.excludeDraft) {
    estimate += Math.floor(totalProducts * 0.8);
  } else {
    estimate += totalProducts;
  }

  // Add collections
  estimate += totalCollections;

  // Add pages
  estimate += totalPages;

  // Add blog posts
  estimate += totalBlogPosts;

  return estimate;
}
