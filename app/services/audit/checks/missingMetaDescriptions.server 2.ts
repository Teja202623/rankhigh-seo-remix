// app/services/audit/checks/missingMetaDescriptions.server.ts
/**
 * SEO Check #3: Missing Meta Descriptions
 *
 * Detects products, collections, and pages without meta descriptions.
 * Meta descriptions appear in search results and influence click-through rates,
 * though they're not a direct ranking factor.
 *
 * Severity: HIGH
 * Why: Missing descriptions hurt CTR and user experience in search results
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkMissingMetaDescriptions(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Check products for missing meta descriptions
  for (const product of context.products) {
    const hasMetaDescription =
      product.seo?.description && product.seo.description.trim() !== "";

    if (!hasMetaDescription) {
      issues.push({
        resourceId: product.id,
        resourceType: "PRODUCT",
        resourceTitle: product.title,
        resourceHandle: product.handle,
        url: `https://${context.shopDomain}/products/${product.handle}`,
        message: `Product "${product.title}" is missing a meta description`,
        suggestion:
          "Add a compelling meta description (150-160 characters) that includes keywords and encourages clicks. This appears in search results below the title.",
      });
    }
  }

  // Check collections for missing meta descriptions
  for (const collection of context.collections) {
    const hasMetaDescription =
      collection.seo?.description && collection.seo.description.trim() !== "";

    if (!hasMetaDescription) {
      issues.push({
        resourceId: collection.id,
        resourceType: "COLLECTION",
        resourceTitle: collection.title,
        resourceHandle: collection.handle,
        url: `https://${context.shopDomain}/collections/${collection.handle}`,
        message: `Collection "${collection.title}" is missing a meta description`,
        suggestion:
          "Add a description that summarizes the collection content and includes relevant keywords to improve search result appearance.",
      });
    }
  }

  // Check pages for missing meta descriptions
  for (const page of context.pages) {
    // Pages may not have explicit meta descriptions in basic API
    // Check if bodySummary exists (often used as meta description)
    const hasMetaDescription =
      page.bodySummary && page.bodySummary.trim() !== "";

    if (!hasMetaDescription) {
      issues.push({
        resourceId: page.id,
        resourceType: "PAGE",
        resourceTitle: page.title || "Untitled Page",
        resourceHandle: page.handle,
        url: `https://${context.shopDomain}/pages/${page.handle}`,
        message: `Page "${page.title || "Untitled"}" is missing a meta description`,
        suggestion:
          "Add a brief summary of the page content that entices users to click when they see it in search results.",
      });
    }
  }

  return {
    type: "MISSING_META_DESCRIPTION",
    severity: "HIGH",
    issues,
  };
}
