/**
 * UsageStatsWidget Component
 *
 * Displays user's current usage vs FREE tier limits
 * - Usage bars for each feature
 * - Remaining quota
 * - Warnings when at 80%+
 * - Upgrade prompts
 *
 * Used in Dashboard and Settings pages
 */

import { Card, BlockStack, Text, Button, Banner } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { UsageBar } from "~/components/UsageBar";
import type { UsageStatus } from "~/services/usage.server";

interface UsageStatsWidgetProps {
  status: UsageStatus;
  compact?: boolean;
}

/**
 * Shows a compact view of usage (only features at 80%+)
 * or full view (all features)
 */
export function UsageStatsWidget({ status, compact = false }: UsageStatsWidgetProps) {
  const navigate = useNavigate();

  // Features to display
  const features = [
    { key: "auditRuns" as const, label: "SEO Audits", icon: "🔍" },
    { key: "bulkEdits" as const, label: "Bulk Edits", icon: "✏️" },
    { key: "metaUpdates" as const, label: "Meta Updates", icon: "🏷️" },
    { key: "altUpdates" as const, label: "ALT Text Updates", icon: "🖼️" },
    { key: "gscApiCalls" as const, label: "GSC API Calls", icon: "📊" },
    { key: "sitemapGenerations" as const, label: "Sitemap Generations", icon: "🗺️" },
  ];

  // Filter features based on compact mode
  const displayedFeatures = compact
    ? features.filter(f => status[f.key].percentage >= 80)
    : features;

  // Check if any feature is at warning level
  const hasWarnings = features.some(f => status[f.key].percentage >= 80);

  if (displayedFeatures.length === 0 && compact) {
    return null; // Don't show if compact and no warnings
  }

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Your FREE Tier Quota
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            You have {features.filter(f => status[f.key].remaining > 0).length} features with remaining quota today
          </Text>
        </BlockStack>

        {/* Warning Banner */}
        {hasWarnings && (
          <Banner tone="warning">
            <Text as="p" variant="bodyMd">
              You're approaching your daily quota limits. Consider upgrading to PRO for unlimited features.
            </Text>
          </Banner>
        )}

        {/* Feature Usage Bars */}
        <BlockStack gap="300">
          {displayedFeatures.map(feature => (
            <div key={feature.key}>
              <BlockStack gap="150">
                <Text as="p" variant="bodySm" fontWeight="bold">
                  {feature.icon} {feature.label}
                </Text>
                <UsageBar
                  label={feature.label}
                  used={status[feature.key].used}
                  limit={status[feature.key].limit}
                  showPercentage={true}
                  showRemaining={true}
                />
              </BlockStack>
            </div>
          ))}
        </BlockStack>

        {/* Upgrade Button */}
        {hasWarnings && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/upgrade")}
          >
            Upgrade to PRO for Unlimited
          </Button>
        )}

        {!compact && (
          <Text as="p" variant="bodySm" tone="subdued">
            Quotas reset daily at midnight UTC. Upgrade to PRO for unlimited features.
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
