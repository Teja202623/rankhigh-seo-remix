// app/services/audit/checks/missingAltText.server.ts
/**
 * SEO Check #4: Missing ALT Text
 *
 * Identifies product images without ALT text attributes.
 * ALT text is crucial for accessibility and image SEO, helping search engines
 * understand image content and improving rankings in image search.
 *
 * Severity: MEDIUM
 * Why: Affects accessibility, image SEO, and user experience
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkMissingAltText(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Check all product images for missing ALT text
  for (const product of context.products) {
    const images = product.images?.edges || [];

    if (images.length === 0) {
      // Product has no images - this might be a separate issue
      // but we'll skip it here as it's not an ALT text issue
      continue;
    }

    // Check each image for ALT text
    for (const imageEdge of images) {
      const image = imageEdge.node;
      const hasAltText = image.altText && image.altText.trim() !== "";

      if (!hasAltText) {
        issues.push({
          resourceId: product.id,
          resourceType: "PRODUCT",
          resourceTitle: product.title,
          resourceHandle: product.handle,
          url: `https://${context.shopDomain}/products/${product.handle}`,
          message: `Product "${product.title}" has an image without ALT text`,
          suggestion:
            "Add descriptive ALT text that explains what's in the image. Include product name and key features. This helps visually impaired users and improves image SEO.",
          details: {
            imageId: image.id,
            imageUrl: image.url,
          },
        });
      }
    }
  }

  // Group issues by product to avoid clutter
  // If a product has multiple images missing ALT text, combine them
  const groupedIssues = new Map<string, SEOIssueData>();

  for (const issue of issues) {
    const key = issue.resourceId;

    if (!groupedIssues.has(key)) {
      groupedIssues.set(key, issue);
    } else {
      // Update the existing issue to reflect multiple images
      const existing = groupedIssues.get(key)!;
      const currentCount = existing.details?.imageCount || 1;
      existing.details = {
        ...existing.details,
        imageCount: currentCount + 1,
      };
      existing.message = `Product "${issue.resourceTitle}" has ${
        currentCount + 1
      } images without ALT text`;
    }
  }

  return {
    type: "MISSING_ALT_TEXT",
    severity: "MEDIUM",
    issues: Array.from(groupedIssues.values()),
  };
}
