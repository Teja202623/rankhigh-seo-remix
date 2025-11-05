// app/components/seo/SERPPreview.tsx
/**
 * SERP Preview Component
 *
 * Shows a realistic preview of how meta tags will appear in Google search results.
 * Features:
 * - Desktop and mobile preview modes
 * - Character counter with optimal range highlighting
 * - Pixel width calculator (approximate SERP rendering)
 * - Real-time preview updates as user types
 * - Visual feedback for optimal/suboptimal lengths
 *
 * Usage:
 * ```tsx
 * <SERPPreview
 *   title="Product Title | Store Name"
 *   description="This is the meta description..."
 *   url="https://store.com/products/product-handle"
 *   mode="desktop"
 * />
 * ```
 */

import { Card, BlockStack, InlineStack, Text, Badge, Box } from "@shopify/polaris";
import type { MetaAnalysis } from "~/types/seo";
import { SERP_LIMITS, CHAR_WIDTHS } from "~/types/seo";

interface SERPPreviewProps {
  title: string;
  description: string;
  url?: string;
  mode?: "desktop" | "mobile";
  showAnalysis?: boolean;
}

/**
 * Calculate approximate pixel width of text in Google's SERP font
 *
 * Google uses a custom font in search results. This function approximates
 * the pixel width based on character types.
 *
 * Note: This is an approximation. Actual rendering may vary by 5-10%.
 */
function calculatePixelWidth(text: string): number {
  let width = 0;

  for (const char of text) {
    if (/[A-Z]/.test(char)) {
      width += CHAR_WIDTHS.uppercase;
    } else if (/[a-z]/.test(char)) {
      width += CHAR_WIDTHS.lowercase;
    } else if (/[0-9]/.test(char)) {
      width += CHAR_WIDTHS.number;
    } else if (char === " ") {
      width += CHAR_WIDTHS.space;
    } else if (/[.,!?;:]/.test(char)) {
      width += CHAR_WIDTHS.punctuation;
    } else {
      width += CHAR_WIDTHS.special;
    }
  }

  return width;
}

/**
 * Analyze meta tag quality
 * Returns character count, pixel width, and status
 */
function analyzeMetaTags(title: string, description: string): MetaAnalysis {
  const titleLength = title.length;
  const titlePixelWidth = calculatePixelWidth(title);
  const descLength = description.length;
  const descPixelWidth = calculatePixelWidth(description);

  // Determine title status
  let titleStatus: "too_short" | "optimal" | "too_long";
  if (titleLength < SERP_LIMITS.title.minChars) {
    titleStatus = "too_short";
  } else if (
    titleLength >= SERP_LIMITS.title.minChars &&
    titleLength <= SERP_LIMITS.title.maxChars
  ) {
    titleStatus = "optimal";
  } else {
    titleStatus = "too_long";
  }

  // Determine description status
  let descStatus: "too_short" | "optimal" | "too_long";
  if (descLength < SERP_LIMITS.description.minChars) {
    descStatus = "too_short";
  } else if (
    descLength >= SERP_LIMITS.description.minChars &&
    descLength <= SERP_LIMITS.description.maxChars
  ) {
    descStatus = "optimal";
  } else {
    descStatus = "too_long";
  }

  // Calculate truncated versions if too long
  const titleTruncated =
    titlePixelWidth > SERP_LIMITS.title.maxPixels
      ? truncateToPixelWidth(title, SERP_LIMITS.title.maxPixels)
      : undefined;

  const descTruncated =
    descPixelWidth > SERP_LIMITS.description.maxPixels
      ? truncateToPixelWidth(description, SERP_LIMITS.description.maxPixels)
      : undefined;

  return {
    title: {
      length: titleLength,
      pixelWidth: titlePixelWidth,
      status: titleStatus,
      truncated: titleTruncated,
    },
    description: {
      length: descLength,
      pixelWidth: descPixelWidth,
      status: descStatus,
      truncated: descTruncated,
    },
  };
}

/**
 * Truncate text to fit within pixel width
 * Adds ellipsis (...) when truncating
 */
function truncateToPixelWidth(text: string, maxPixels: number): string {
  let currentWidth = 0;
  let truncatedText = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = calculatePixelWidth(char);

    if (currentWidth + charWidth > maxPixels - 20) {
      // Reserve space for ellipsis
      return truncatedText + "...";
    }

    truncatedText += char;
    currentWidth += charWidth;
  }

  return text;
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/**
 * Get status badge for character count
 */
function getStatusBadge(
  status: "too_short" | "optimal" | "too_long"
): { tone: "success" | "warning" | "critical"; label: string } {
  switch (status) {
    case "optimal":
      return { tone: "success", label: "Optimal" };
    case "too_short":
      return { tone: "warning", label: "Too Short" };
    case "too_long":
      return { tone: "critical", label: "Too Long" };
  }
}

export function SERPPreview({
  title,
  description,
  url = "https://example.com/products/example",
  mode = "desktop",
  showAnalysis = true,
}: SERPPreviewProps) {
  // Provide defaults for empty values
  const displayTitle = title || "Your Product Title Here";
  const displayDescription = description || "Your product description will appear here...";
  const analysis = analyzeMetaTags(displayTitle, displayDescription);

  const domain = extractDomain(url);

  // Visual display (truncated if needed)
  const displayTitleTruncated = analysis.title.truncated || displayTitle;
  const displayDescTruncated = analysis.description.truncated || displayDescription;

  return (
    <BlockStack gap="400">
      {/* Preview Card */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              Google Search Preview
            </Text>
            <Badge tone={mode === "desktop" ? "info" : "success"}>
              {mode === "desktop" ? "Desktop" : "Mobile"}
            </Badge>
          </InlineStack>

          {/* SERP Result Preview */}
          <Box
            padding="400"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <BlockStack gap="200">
              {/* URL/Breadcrumb */}
              <InlineStack gap="100" blockAlign="center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="#5f6368"
                  />
                </svg>
                <Text as="p" variant="bodySm" tone="subdued">
                  {domain}
                </Text>
              </InlineStack>

              {/* Title (Blue, clickable-looking) */}
              <Text
                as="h2"
                variant={mode === "desktop" ? "headingLg" : "headingMd"}
                fontWeight="regular"
              >
                <span
                  style={{
                    color: "#1a0dab",
                    cursor: "pointer",
                    wordBreak: "break-word",
                  }}
                >
                  {displayTitleTruncated}
                </span>
              </Text>

              {/* Description */}
              <Text as="p" variant="bodyMd" tone="subdued">
                <span style={{ wordBreak: "break-word" }}>
                  {displayDescTruncated}
                </span>
              </Text>
            </BlockStack>
          </Box>

          {/* Truncation Warning */}
          {(analysis.title.truncated || analysis.description.truncated) && (
            <Box
              padding="300"
              background="bg-surface-caution"
              borderRadius="200"
            >
              <InlineStack gap="200" blockAlign="center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"
                    fill="#b98900"
                  />
                </svg>
                <Text as="p" variant="bodySm" tone="caution">
                  {analysis.title.truncated &&
                    "Title will be truncated in search results. "}
                  {analysis.description.truncated &&
                    "Description will be truncated in search results."}
                </Text>
              </InlineStack>
            </Box>
          )}
        </BlockStack>
      </Card>

      {/* Character Analysis */}
      {showAnalysis && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              Character Analysis
            </Text>

            {/* Title Analysis */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Title
                </Text>
                <Badge {...getStatusBadge(analysis.title.status)}>
                  {getStatusBadge(analysis.title.status).label}
                </Badge>
              </InlineStack>

              <InlineStack gap="400" wrap={false}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Characters
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {analysis.title.length} / {SERP_LIMITS.title.maxChars}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Pixels (approx.)
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {analysis.title.pixelWidth} / {SERP_LIMITS.title.maxPixels}
                  </Text>
                </BlockStack>
              </InlineStack>

              {/* Progress bar */}
              <Box>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: "#e1e3e5",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min((analysis.title.length / SERP_LIMITS.title.maxChars) * 100, 100)}%`,
                      height: "100%",
                      backgroundColor:
                        analysis.title.status === "optimal"
                          ? "#008060"
                          : analysis.title.status === "too_short"
                            ? "#ffb84d"
                            : "#d72c0d",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </Box>

              <Text as="p" variant="bodySm" tone="subdued">
                Optimal: {SERP_LIMITS.title.minChars}-
                {SERP_LIMITS.title.maxChars} characters
              </Text>
            </BlockStack>

            {/* Description Analysis */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Description
                </Text>
                <Badge {...getStatusBadge(analysis.description.status)}>
                  {getStatusBadge(analysis.description.status).label}
                </Badge>
              </InlineStack>

              <InlineStack gap="400" wrap={false}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Characters
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {analysis.description.length} /{" "}
                    {SERP_LIMITS.description.maxChars}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Pixels (approx.)
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {analysis.description.pixelWidth} /{" "}
                    {SERP_LIMITS.description.maxPixels}
                  </Text>
                </BlockStack>
              </InlineStack>

              {/* Progress bar */}
              <Box>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: "#e1e3e5",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min((analysis.description.length / SERP_LIMITS.description.maxChars) * 100, 100)}%`,
                      height: "100%",
                      backgroundColor:
                        analysis.description.status === "optimal"
                          ? "#008060"
                          : analysis.description.status === "too_short"
                            ? "#ffb84d"
                            : "#d72c0d",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </Box>

              <Text as="p" variant="bodySm" tone="subdued">
                Optimal: {SERP_LIMITS.description.minChars}-
                {SERP_LIMITS.description.maxChars} characters
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
