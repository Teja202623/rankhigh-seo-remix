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

import { Card, BlockStack, Text, Button, Banner } from "@shopify/polaris";
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
  let bgColor = '#d1fae5'; // Light green background
  if (percentage >= 80) {
    color = '#ef4444'; // Red - 80%+
    bgColor = '#fee2e2'; // Light red background
  } else if (percentage >= 50) {
    color = '#f59e0b'; // Yellow - 50-80%
    bgColor = '#fef3c7'; // Light yellow background
  }
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      {/* Dial */}
      <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 16px', backgroundColor: bgColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="140" height="140" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="7"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            transform="rotate(-90 70 70)"
          />
        </svg>
        
        {/* Center text */}
        <div style={{ position: 'absolute', textAlign: 'center', zIndex: 1 }}>
          <Text as="p" variant="heading2xl" fontWeight="bold">
            {percentage.toFixed(0)}%
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            {used}/{limit}
          </Text>
        </div>
      </div>
      
      {/* Label */}
      <div style={{ marginBottom: '8px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text as="p" variant="bodySm" fontWeight="bold">
          {icon} {label}
        </Text>
      </div>
      
      {/* Remaining */}
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
            <div style={{ textAlign: 'center', padding: '16px 24px', backgroundColor: '#f3f4f6', borderRadius: '8px', minWidth: '120px' }}>
              <Text as="p" variant="bodySm" tone="subdued">
                Overall Usage
              </Text>
              <Text as="p" variant="heading2xl" fontWeight="bold">
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

        {/* Feature Quota Dials - 3 per row */}
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Feature Quotas
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {displayedFeatures.map(feature => (
              <div key={feature.key} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
