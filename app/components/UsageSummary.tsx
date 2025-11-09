// app/components/UsageSummary.tsx
/**
 * Usage Summary Component
 *
 * Displays a complete overview of all FREE tier usage quotas.
 * Shows usage bars for each feature.
 *
 * Usage:
 * ```tsx
 * const status = await getUsageStatus(storeId);
 * <UsageSummary status={status} />
 * ```
 */

import { Card, Box, Text, Divider } from "@shopify/polaris";
import { UsageBar } from "./UsageBar";
import type { UsageStatus } from "~/services/usage.server";

interface UsageSummaryProps {
  status: UsageStatus;
  compact?: boolean; // Show only high-usage items if true
}

export function UsageSummary({ status, compact = false }: UsageSummaryProps) {
  // Define all items with proper typing
  const allItems = [
    { label: "SEO Audits", key: "auditRuns" as const },
    { label: "Bulk Edits", key: "bulkEdits" as const },
    { label: "Meta Updates", key: "metaUpdates" as const },
    { label: "ALT Text Updates", key: "altUpdates" as const },
    { label: "GSC API Calls", key: "gscApiCalls" as const },
    { label: "Sitemap Generations", key: "sitemapGenerations" as const },
  ];

  // Filter to only show items at warning threshold (80%+) if compact
  const itemsToShow = compact
    ? allItems.filter((item) => status[item.key].percentage >= 80)
    : allItems;

  // If compact and no items at warning, return null
  if (compact && itemsToShow.length === 0) {
    return null;
  }

  return (
    <Card>
      <Box padding="400">
        <Text as="h2" variant="headingSm" fontWeight="semibold">
          Usage Summary
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {compact ? "Features at or above 80% usage" : "Daily quotas for FREE tier"}
        </Text>

        <Box paddingBlockStart="400">
          {itemsToShow.map((item, index) => (
            <Box key={item.key} paddingBlockEnd={index < itemsToShow.length - 1 ? "400" : undefined}>
              <UsageBar
                label={item.label}
                used={status[item.key].used}
                limit={status[item.key].limit}
                showPercentage
                showRemaining
              />
              {index < itemsToShow.length - 1 && (
                <Box paddingBlockStart="400">
                  <Divider />
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {compact && itemsToShow.length > 0 && (
          <Box paddingBlockStart="400">
            <Text as="p" variant="bodySm" tone="critical">
              Consider upgrading to PRO for unlimited access.
            </Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}
