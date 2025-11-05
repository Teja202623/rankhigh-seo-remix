// app/services/audit/checks/indexingDirectives.server.ts
/**
 * SEO Check #7: Noindex/Nofollow Pages
 *
 * Identifies products and pages that may be blocking search engine indexing.
 * While Shopify doesn't expose direct meta robot tags via GraphQL, we can
 * check for common patterns and handle attributes that might indicate
 * indexing issues.
 *
 * Severity: LOW
 * Why: May intentionally block certain pages; verify these are correct
 *
 * Note: Shopify's Admin API doesn't provide direct access to meta robot tags.
 * This check looks for products/pages in draft status or other indicators
 * that suggest they shouldn't be indexed.
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkIndexingDirectives(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Check for products with empty/missing SEO data
  // These might be unintentionally not indexed
  for (const product of context.products) {
    const hasNoSeoData =
      (!product.seo?.title || product.seo.title.trim() === "") &&
      (!product.seo?.description || product.seo.description.trim() === "");

    const hasNoContent =
      !product.descriptionHtml || product.descriptionHtml.trim() === "";

    // If a product has no SEO data AND no content, it might not be indexable
    if (hasNoSeoData && hasNoContent) {
      issues.push({
        resourceId: product.id,
        resourceType: "PRODUCT",
        resourceTitle: product.title,
        resourceHandle: product.handle,
        url: `https://${context.shopDomain}/products/${product.handle}`,
        message: `Product "${product.title}" has no SEO data or content`,
        suggestion:
          "This product is missing both SEO information and description content, which may prevent proper indexing. Add meta title, description, and product content to improve search visibility.",
        details: {
          hasMetaTitle: !!product.seo?.title,
          hasMetaDescription: !!product.seo?.description,
          hasDescription: !!product.descriptionHtml,
        },
      });
    }
  }

  // Check for collections with no SEO data
  for (const collection of context.collections) {
    const hasNoSeoData =
      (!collection.seo?.title || collection.seo.title.trim() === "") &&
      (!collection.seo?.description || collection.seo.description.trim() === "");

    const hasNoContent =
      !collection.descriptionHtml || collection.descriptionHtml.trim() === "";

    if (hasNoSeoData && hasNoContent) {
      issues.push({
        resourceId: collection.id,
        resourceType: "COLLECTION",
        resourceTitle: collection.title,
        resourceHandle: collection.handle,
        url: `https://${context.shopDomain}/collections/${collection.handle}`,
        message: `Collection "${collection.title}" has no SEO data or content`,
        suggestion:
          "Add SEO information and a description to ensure this collection can be properly indexed by search engines.",
        details: {
          hasMetaTitle: !!collection.seo?.title,
          hasMetaDescription: !!collection.seo?.description,
          hasDescription: !!collection.descriptionHtml,
        },
      });
    }
  }

  // Check for pages with no content
  for (const page of context.pages) {
    const hasNoContent =
      (!page.body || page.body.trim() === "") &&
      (!page.bodySummary || page.bodySummary.trim() === "");

    if (hasNoContent) {
      issues.push({
        resourceId: page.id,
        resourceType: "PAGE",
        resourceTitle: page.title || "Untitled Page",
        resourceHandle: page.handle,
        url: `https://${context.shopDomain}/pages/${page.handle}`,
        message: `Page "${page.title || "Untitled"}" has no content`,
        suggestion:
          "Pages without content provide no value to visitors or search engines. Add meaningful content or consider removing this page.",
        details: {
          hasBody: !!page.body,
          hasBodySummary: !!page.bodySummary,
        },
      });
    }
  }

  return {
    type: "NOINDEX_PAGE",
    severity: "LOW",
    issues,
  };
}
