// app/components/UpgradePrompt.tsx
/**
 * Upgrade Prompt Component
 *
 * Displays when a user reaches 80% of their FREE tier quota.
 * Shows warning at 80%, critical error at 100%.
 *
 * Usage:
 * ```tsx
 * <UpgradePrompt
 *   feature="audits"
 *   used={8}
 *   limit={10}
 *   resetAt={new Date(Date.now() + 12*60*60*1000)}
 * />
 * ```
 */

import { Banner, Button, Box, Text } from "@shopify/polaris";
import type { ComponentProps } from "react";

interface UpgradePromptProps {
  feature:
    | "audits"
    | "bulk-edits"
    | "meta-updates"
    | "alt-updates"
    | "gsc-calls"
    | "sitemaps";
  used: number;
  limit: number;
  resetAt?: Date;
}

/**
 * Human-readable feature names
 */
const FEATURE_NAMES: Record<UpgradePromptProps["feature"], string> = {
  audits: "SEO Audits",
  "bulk-edits": "Bulk Edits",
  "meta-updates": "Meta Updates",
  "alt-updates": "ALT Text Updates",
  "gsc-calls": "Google Search Console API Calls",
  sitemaps: "Sitemap Generations",
};

/**
 * Feature descriptions for upgrade prompt
 */
const FEATURE_DESCRIPTIONS: Record<UpgradePromptProps["feature"], string> = {
  audits: "Run comprehensive SEO audits on your store",
  "bulk-edits": "Update multiple items at once",
  "meta-updates": "Edit meta titles and descriptions in bulk",
  "alt-updates": "Add alt text to images",
  "gsc-calls": "Sync data from Google Search Console",
  sitemaps: "Generate and update XML sitemaps",
};

export function UpgradePrompt({
  feature,
  used,
  limit,
  resetAt,
}: UpgradePromptProps) {
  const percentage = Math.round((used / limit) * 100);
  const isWarning = percentage >= 80 && percentage < 100;
  const isLimitReached = used >= limit;

  // Don't show if under 80%
  if (percentage < 80) {
    return null;
  }

  const featureName = FEATURE_NAMES[feature];
  const tone: ComponentProps<typeof Banner>["tone"] = isLimitReached
    ? "critical"
    : "warning";

  const title = isLimitReached
    ? `${featureName} limit reached`
    : `Approaching ${featureName.toLowerCase()} limit`;

  const description = isLimitReached
    ? `You've used all ${limit} ${featureName.toLowerCase()} for today. Upgrade to PRO to continue.`
    : `You've used ${used} of ${limit} ${featureName.toLowerCase()} for today. Upgrade to PRO for unlimited access.`;

  return (
    <Box paddingBlockEnd="400">
      <Banner tone={tone} title={title}>
        <Box paddingBlockStart="200">
          <Text as="p" variant="bodyMd" tone="subdued">
            {description}
          </Text>
          {resetAt && (
            <Text as="p" variant="bodySm" tone="subdued">
              Resets tomorrow at {resetAt.toLocaleTimeString()}
            </Text>
          )}
        </Box>
        <Box paddingBlockStart="300">
          <Button url="/upgrade" variant={isLimitReached ? "primary" : "secondary"}>
            {isLimitReached ? "Upgrade Now" : "Upgrade to PRO"}
          </Button>
        </Box>
      </Banner>
    </Box>
  );
}
