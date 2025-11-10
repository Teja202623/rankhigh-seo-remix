/**
 * UsageStatsWidget Component
 *
 * Displays user's current usage vs FREE tier limits with visual dials
 * - Circular progress dials for each feature
 * - Color-coded status (green/yellow/red)
 * - Remaining quota display
 * - Warnings when at 80%+
 *
 * Used in Dashboard and Settings pages
 */

import { Card, BlockStack, Text, Button, Banner, InlineStack, Grid } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import type { UsageStatus } from "~/services/usage.server";

interface UsageStatsWidgetProps {
  status: UsageStatus;
  compact?: boolean;
}

/**
 * Circular quota dial component
 */
function QuotaDial({ used, limit, label, icon }: { used: number; limit: number; label: string; icon: string }) {
  const percentage = (used / limit) * 100;
  const remaining = limit - used;
  
  // Determine color based on usage percentage
  let color = '#10b981'; // Green - 0-50%
  if (percentage >= 80) {
    color = '#ef4444'; // Red - 80%+
  } else if (percentage >= 50) {
    color = '#f59e0b'; // Yellow - 50-80%
  }
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ textAlign: 'center', padding: '16px' }}>
      <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 12px' }}>
        {/* Background circle */}
        <svg width="120" height="120" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            transform="rotate(-90 60 60)"
          />
        </svg>
        
        {/* Center text */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Text as="p" variant="headingMd" fontWeight="bold">
            {percentage.toFixed(0)}%
          </Text>
        </div>
      </div>
      
      {/* Label and icon */}
      <div style={{ marginBottom: '8px' }}>
        <Text as="p" variant="bodySm" fontWeight="bold">
          {icon} {label}
        </Text>
      </div>
      
      {/* Stats */}
      <Text as="p" variant="bodySm" tone="subdued">
        {used}/{limit} used
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {remaining} left
      </Text>
    </div>
  );
}

/**
 * Shows usage quota with visual dials
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
    ? features.filter(f => (status[f.key].used / status[f.key].limit) * 100 >= 80)
    : features;

  // Check if any feature is at warning level
  const hasWarnings = features.some(f => (status[f.key].used / status[f.key].limit) * 100 >= 80);

  if (displayedFeatures.length === 0 && compact) {
    return null; // Don't show if compact and no warnings
  }

  // Calculate total stats
  const totalUsed = features.reduce((sum, f) => sum + status[f.key].used, 0);
  const totalLimit = features.reduce((sum, f) => sum + status[f.key].limit, 0);
  const totalPercentage = (totalUsed / totalLimit) * 100;

  return (
    <Card>
      <BlockStack gap="500">
        {/* Header with overview */}
        <BlockStack gap="300">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Your FREE Tier Quota
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {features.filter(f => (status[f.key].limit - status[f.key].used) > 0).length} of {features.length} features with remaining quota today
              </Text>
            </BlockStack>
            
            {/* Overall quota display */}
            <div style={{ textAlign: 'center', padding: '12px 24px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <Text as="p" variant="bodySm" tone="subdued">
                Overall Usage
              </Text>
              <Text as="p" variant="headingLg" fontWeight="bold">
                {totalPercentage.toFixed(0)}%
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {totalUsed}/{totalLimit}
              </Text>
            </div>
          </div>
        </BlockStack>

        {/* Warning Banner */}
        {hasWarnings && (
          <Banner tone="warning">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                You're approaching your daily quota limits
              </Text>
              <Text as="p" variant="bodyMd">
                Consider upgrading to PRO for unlimited features.
              </Text>
            </BlockStack>
          </Banner>
        )}

        {/* Feature Quota Dials */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Feature Quotas
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            {displayedFeatures.map(feature => (
              <div key={feature.key} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <QuotaDial
                  used={status[feature.key].used}
                  limit={status[feature.key].limit}
                  label={feature.label}
                  icon={feature.icon}
                />
              </div>
            ))}
          </div>
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

        {/* Footer info */}
        {!compact && (
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              ✓ Quotas reset daily at midnight UTC
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              ✓ Upgrade to PRO for unlimited access to all features
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
