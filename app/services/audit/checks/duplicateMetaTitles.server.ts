// app/services/audit/checks/duplicateMetaTitles.server.ts
/**
 * SEO Check #2: Duplicate Meta Titles
 *
 * Identifies products and collections with identical meta titles.
 * Duplicate titles confuse search engines about which page to rank
 * and dilute your SEO efforts.
 *
 * Severity: HIGH
 * Why: Duplicates reduce search visibility and create keyword cannibalization
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkDuplicateMetaTitles(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Track meta titles and their associated resources
  const titleMap = new Map<
    string,
    Array<{
      type: "PRODUCT" | "COLLECTION";
      id: string;
      title: string;
      handle: string;
    }>
  >();

  // Collect all product meta titles
  for (const product of context.products) {
    const metaTitle = product.seo?.title?.trim();

    if (metaTitle) {
      const normalizedTitle = metaTitle.toLowerCase();

      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }

      titleMap.get(normalizedTitle)!.push({
        type: "PRODUCT",
        id: product.id,
        title: product.title,
        handle: product.handle,
      });
    }
  }

  // Collect all collection meta titles
  for (const collection of context.collections) {
    const metaTitle = collection.seo?.title?.trim();

    if (metaTitle) {
      const normalizedTitle = metaTitle.toLowerCase();

      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }

      titleMap.get(normalizedTitle)!.push({
        type: "COLLECTION",
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
      });
    }
  }

  // Find duplicates (titles used by 2+ resources)
  for (const [metaTitle, resources] of titleMap.entries()) {
    if (resources.length > 1) {
      // Create an issue for each resource with a duplicate title
      for (const resource of resources) {
        const duplicateWithTitles = resources
          .filter((r) => r.id !== resource.id)
          .map((r) => r.title);

        const urlPath =
          resource.type === "PRODUCT" ? "products" : "collections";

        issues.push({
          resourceId: resource.id,
          resourceType: resource.type,
          resourceTitle: resource.title,
          resourceHandle: resource.handle,
          url: `https://${context.shopDomain}/${urlPath}/${resource.handle}`,
          message: `${resource.type === "PRODUCT" ? "Product" : "Collection"} "${
            resource.title
          }" has a duplicate meta title: "${metaTitle}"`,
          suggestion: `This meta title is shared with ${resources.length - 1} other ${
            resources.length === 2 ? "resource" : "resources"
          }. Create a unique meta title that distinguishes this ${
            resource.type === "PRODUCT" ? "product" : "collection"
          }.`,
          details: {
            duplicateWith: duplicateWithTitles,
            duplicateCount: resources.length,
          },
        });
      }
    }
  }

  return {
    type: "DUPLICATE_META_TITLE",
    severity: "HIGH",
    issues,
  };
}
