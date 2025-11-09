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

import { useEffect, useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Box,
  Button,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
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
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(mode ?? "desktop");

  useEffect(() => {
    setPreviewMode(mode ?? "desktop");
  }, [mode]);

  // Provide defaults for empty values
  const displayTitle = title || "Your Product Title Here";
  const displayDescription = description || "Your product description will appear here...";
  const analysis = analyzeMetaTags(displayTitle, displayDescription);
  const titleBadge = getStatusBadge(analysis.title.status);
  const descriptionBadge = getStatusBadge(analysis.description.status);
  const titleProgress = Math.min(
    100,
    Math.round((analysis.title.pixelWidth / SERP_LIMITS.title.maxPixels) * 100)
  );
  const descriptionProgress = Math.min(
    100,
    Math.round(
      (analysis.description.pixelWidth / SERP_LIMITS.description.maxPixels) * 100
    )
  );
  const titleProgressTone = analysis.title.status === "optimal" ? "success" : "critical";
  const descriptionProgressTone =
    analysis.description.status === "optimal" ? "success" : "critical";

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
            <InlineStack gap="200">
              <Button
                size="slim"
                pressed={previewMode === "desktop"}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </Button>
              <Button
                size="slim"
                pressed={previewMode === "mobile"}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </Button>
            </InlineStack>
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
                variant={previewMode === "desktop" ? "headingLg" : "headingMd"}
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
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              Optimization Insights
            </Text>

            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Meta Title
                </Text>
                <Badge tone={titleBadge.tone}>{titleBadge.label}</Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                {analysis.title.length} characters • {analysis.title.pixelWidth}px of ~
                {SERP_LIMITS.title.maxPixels}px
              </Text>
              <ProgressBar
                      progress={titleProgress}
                      size="small"
                      tone={titleProgressTone}
              />
              <Text as="p" variant="bodySm" tone="subdued">
                Aim for {SERP_LIMITS.title.minChars}–
                {SERP_LIMITS.title.maxChars} characters to stay fully visible.
              </Text>
            </BlockStack>

            <Divider />

            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Meta Description
                </Text>
                <Badge tone={descriptionBadge.tone}>{descriptionBadge.label}</Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                {analysis.description.length} characters • {analysis.description.pixelWidth}px of ~
                {SERP_LIMITS.description.maxPixels}px
              </Text>
              <ProgressBar
                      progress={descriptionProgress}
                      size="small"
                      tone={descriptionProgressTone}
              />
              <Text as="p" variant="bodySm" tone="subdued">
                Keep descriptions between {SERP_LIMITS.description.minChars}–
                {SERP_LIMITS.description.maxChars} characters for best results.
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
