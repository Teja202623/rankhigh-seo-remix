// app/services/audit/checks/mixedContent.server.ts
/**
 * SEO Check #6: Non-HTTPS Links (Mixed Content)
 *
 * Detects HTTP (non-secure) links in product/collection descriptions and images.
 * Mixed content triggers browser warnings, harms user trust, and can impact rankings.
 * Modern browsers may block insecure content entirely.
 *
 * Severity: MEDIUM
 * Why: Security warnings damage trust and user experience
 */

import type { CheckContext, CheckResult, SEOIssueData } from "~/types/audit";

export async function checkMixedContent(
  context: CheckContext
): Promise<CheckResult> {
  const issues: SEOIssueData[] = [];

  // Check product descriptions for HTTP links
  for (const product of context.products) {
    if (product.descriptionHtml) {
      const httpLinks = findHttpLinks(product.descriptionHtml);

      if (httpLinks.length > 0) {
        for (const link of httpLinks) {
          issues.push({
            resourceId: product.id,
            resourceType: "PRODUCT",
            resourceTitle: product.title,
            resourceHandle: product.handle,
            url: `https://${context.shopDomain}/products/${product.handle}`,
            message: `Product "${product.title}" contains non-HTTPS link in description`,
            suggestion:
              'Update the link to use HTTPS instead of HTTP. Modern browsers may block insecure content and show security warnings. Replace "http://" with "https://".',
            details: {
              linkUrl: link.href,
              linkText: link.text,
            },
          });
        }
      }
    }

    // Check product images for HTTP URLs
    const images = product.images?.edges || [];
    for (const imageEdge of images) {
      const image = imageEdge.node;

      if (image.url.startsWith("http://")) {
        issues.push({
          resourceId: product.id,
          resourceType: "PRODUCT",
          resourceTitle: product.title,
          resourceHandle: product.handle,
          url: `https://${context.shopDomain}/products/${product.handle}`,
          message: `Product "${product.title}" has an image with non-HTTPS URL`,
          suggestion:
            "Replace or re-upload the image using a secure HTTPS URL. Insecure images may be blocked by browsers.",
          details: {
            imageId: image.id,
            imageUrl: image.url,
          },
        });
      }
    }
  }

  // Check collection descriptions for HTTP links
  for (const collection of context.collections) {
    if (collection.descriptionHtml) {
      const httpLinks = findHttpLinks(collection.descriptionHtml);

      if (httpLinks.length > 0) {
        for (const link of httpLinks) {
          issues.push({
            resourceId: collection.id,
            resourceType: "COLLECTION",
            resourceTitle: collection.title,
            resourceHandle: collection.handle,
            url: `https://${context.shopDomain}/collections/${collection.handle}`,
            message: `Collection "${collection.title}" contains non-HTTPS link in description`,
            suggestion:
              "Update the link to HTTPS to avoid security warnings and ensure all resources load properly.",
            details: {
              linkUrl: link.href,
              linkText: link.text,
            },
          });
        }
      }
    }
  }

  return {
    type: "MIXED_CONTENT",
    severity: "MEDIUM",
    issues,
  };
}

/**
 * Find all HTTP (non-HTTPS) links in HTML content
 * Returns array of { href, text } objects
 */
function findHttpLinks(html: string): Array<{ href: string; text: string }> {
  const httpLinks: Array<{ href: string; text: string }> = [];

  // Regex to extract <a> tags with HTTP (not HTTPS) href attributes
  const linkRegex = /<a\s+[^>]*href=["'](http:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, "").trim(); // Strip HTML tags

    httpLinks.push({ href, text });
  }

  // Also check for HTTP URLs in src attributes (images, scripts, etc.)
  const srcRegex = /<[^>]+src=["'](http:\/\/[^"']+)["'][^>]*>/gi;

  while ((match = srcRegex.exec(html)) !== null) {
    const href = match[1];
    httpLinks.push({ href, text: "(embedded resource)" });
  }

  return httpLinks;
}
