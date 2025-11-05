// app/services/audit/checks/brokenLinks.server.ts
/**
 * SEO Check #5: Broken Internal Links
 *
 * Detects broken or invalid links in product and collection descriptions.
 * Broken links harm user experience, waste crawl budget, and can indicate
 * site quality issues to search engines.
 *
 * Severity: HIGH
 * Why: Broken links damage user experience and SEO trust signals
 *
 * Note: For FREE tier, we check for common patterns that indicate broken links
 * (e.g., links to /products/deleted-item, obvious 404 patterns) without
 * making actual HTTP requests to validate each link.
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkBrokenLinks(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Regex patterns that indicate potentially broken links
  const suspiciousPatterns = [
    /\/products\/\d+$/, // Old Shopify numeric product URLs
    /\/collections\/\d+$/, // Old numeric collection URLs
    /\/(test|sample|demo|deleted|removed|old)-/i, // Test/deleted items
    /localhost/i, // Development URLs
    /127\.0\.0\.1/i, // Local development
    /staging\./i, // Staging environment links
    /\.test\//i, // Test domain
  ];

  // Check product descriptions for broken links
  for (const product of context.products) {
    if (!product.descriptionHtml) continue;

    const links = extractLinks(product.descriptionHtml);

    for (const link of links) {
      const isSuspicious = suspiciousPatterns.some((pattern) =>
        pattern.test(link.href)
      );

      if (isSuspicious) {
        issues.push({
          resourceId: product.id,
          resourceType: "PRODUCT",
          resourceTitle: product.title,
          resourceHandle: product.handle,
          url: `https://${context.shopDomain}/products/${product.handle}`,
          message: `Product "${product.title}" contains a potentially broken link`,
          suggestion:
            "Review and update the link in your product description. Broken links harm user experience and SEO. Consider removing or replacing it with a valid URL.",
          details: {
            linkUrl: link.href,
            linkText: link.text,
          },
        });
      }
    }
  }

  // Check collection descriptions for broken links
  for (const collection of context.collections) {
    if (!collection.descriptionHtml) continue;

    const links = extractLinks(collection.descriptionHtml);

    for (const link of links) {
      const isSuspicious = suspiciousPatterns.some((pattern) =>
        pattern.test(link.href)
      );

      if (isSuspicious) {
        issues.push({
          resourceId: collection.id,
          resourceType: "COLLECTION",
          resourceTitle: collection.title,
          resourceHandle: collection.handle,
          url: `https://${context.shopDomain}/collections/${collection.handle}`,
          message: `Collection "${collection.title}" contains a potentially broken link`,
          suggestion:
            "Verify the link in your collection description and update or remove it if it's no longer valid.",
          details: {
            linkUrl: link.href,
            linkText: link.text,
          },
        });
      }
    }
  }

  return {
    type: "BROKEN_LINK",
    severity: "HIGH",
    issues,
  };
}

/**
 * Extract all links from HTML content
 * Returns array of { href, text } objects
 */
function extractLinks(html: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];

  // Simple regex to extract <a> tags with href attributes
  // This is a basic implementation; for production, consider using a proper HTML parser
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, "").trim(); // Strip HTML tags from link text

    links.push({ href, text });
  }

  return links;
}
