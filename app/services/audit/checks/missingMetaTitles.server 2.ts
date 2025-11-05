// app/services/audit/checks/missingMetaTitles.server.ts
/**
 * SEO Check #1: Missing Meta Titles
 *
 * Detects products, collections, and pages that lack meta titles.
 * Meta titles are critical for SEO as they appear in search results
 * and directly impact click-through rates.
 *
 * Severity: CRITICAL
 * Why: Missing meta titles severely hurt search visibility
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkMissingMetaTitles(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Check products for missing meta titles
  for (const product of context.products) {
    const hasMetaTitle = product.seo?.title && product.seo.title.trim() !== "";

    if (!hasMetaTitle) {
      issues.push({
        resourceId: product.id,
        resourceType: "PRODUCT",
        resourceTitle: product.title,
        resourceHandle: product.handle,
        url: `https://${context.shopDomain}/products/${product.handle}`,
        message: `Product "${product.title}" is missing a meta title`,
        suggestion:
          "Add a unique, descriptive meta title (50-60 characters) that includes your target keywords. This appears in search results and browser tabs.",
      });
    }
  }

  // Check collections for missing meta titles
  for (const collection of context.collections) {
    const hasMetaTitle =
      collection.seo?.title && collection.seo.title.trim() !== "";

    if (!hasMetaTitle) {
      issues.push({
        resourceId: collection.id,
        resourceType: "COLLECTION",
        resourceTitle: collection.title,
        resourceHandle: collection.handle,
        url: `https://${context.shopDomain}/collections/${collection.handle}`,
        message: `Collection "${collection.title}" is missing a meta title`,
        suggestion:
          "Add a descriptive meta title that includes relevant keywords and describes the collection content.",
      });
    }
  }

  // Check pages for missing meta titles
  for (const page of context.pages) {
    // Pages don't have explicit meta titles in the basic API,
    // so we check if the page title exists (used as meta title)
    const hasMetaTitle = page.title && page.title.trim() !== "";

    if (!hasMetaTitle) {
      issues.push({
        resourceId: page.id,
        resourceType: "PAGE",
        resourceTitle: page.title || "Untitled Page",
        resourceHandle: page.handle,
        url: `https://${context.shopDomain}/pages/${page.handle}`,
        message: `Page "${page.title || "Untitled"}" is missing a meta title`,
        suggestion:
          "Add a clear, descriptive title for this page that tells visitors and search engines what the page is about.",
      });
    }
  }

  return {
    type: "MISSING_META_TITLE",
    severity: "CRITICAL",
    issues,
  };
}
