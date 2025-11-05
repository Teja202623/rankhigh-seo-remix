// app/components/gsc/GSCMetrics.tsx
// GSC metrics dashboard component (Task 54)

import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  Icon,
  Box,
  Divider,
} from "@shopify/polaris";
import {
  SearchIcon,
  ViewIcon,
  TargetIcon,
  ChartVerticalIcon,
} from "@shopify/polaris-icons";
import type { GSCMetrics, GSCQueryData, GSCPageData } from "~/types/gsc";

interface GSCMetricsProps {
  metrics: GSCMetrics;
  topQueries: GSCQueryData[];
  topPages: GSCPageData[];
  lastSync: Date | null;
  propertyUrl: string;
}

/**
 * GSC Metrics Dashboard Component
 * Displays GSC performance metrics, top queries, and top pages
 */
export function GSCMetrics({
  metrics,
  topQueries,
  topPages,
  lastSync,
  propertyUrl,
}: GSCMetricsProps) {
  return (
    <BlockStack gap="400">
      {/* Header with Free Tier Badge */}
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Search Console Performance
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            {propertyUrl}
          </Text>
        </BlockStack>
        <InlineStack gap="200">
          <Badge tone="info">FREE Tier</Badge>
          <Badge tone="success">Last 28 days</Badge>
        </InlineStack>
      </InlineStack>

      {/* Last Sync Info */}
      {lastSync && (
        <Text as="p" variant="bodySm" tone="subdued">
          Last synced: {formatLastSync(lastSync)}
        </Text>
      )}

      {/* Key Metrics Cards */}
      <InlineStack gap="400" wrap={false}>
        <MetricCard
          title="Total Clicks"
          value={formatNumber(metrics.totalClicks)}
          icon={SearchIcon}
          tone="success"
        />
        <MetricCard
          title="Total Impressions"
          value={formatNumber(metrics.totalImpressions)}
          icon={ViewIcon}
          tone="info"
        />
        <MetricCard
          title="Average CTR"
          value={formatPercentage(metrics.averageCtr)}
          icon={TargetIcon}
          tone="warning"
        />
        <MetricCard
          title="Average Position"
          value={formatPosition(metrics.averagePosition)}
          icon={ChartVerticalIcon}
          tone="magic"
        />
      </InlineStack>

      <Divider />

      {/* Top Queries Section */}
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            Top 3 Queries
          </Text>
          <Badge tone="info">Top performers by clicks</Badge>
        </InlineStack>

        {topQueries.length > 0 ? (
          <Card>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
              headings={[
                "Query",
                "Clicks",
                "Impressions",
                "CTR",
                "Avg Position",
              ]}
              rows={topQueries.map((query) => [
                query.query,
                formatNumber(query.clicks),
                formatNumber(query.impressions),
                formatPercentage(query.ctr),
                formatPosition(query.position),
              ])}
            />
          </Card>
        ) : (
          <Card>
            <Box padding="400">
              <Text as="p" tone="subdued" alignment="center">
                No query data available for the last 28 days
              </Text>
            </Box>
          </Card>
        )}
      </BlockStack>

      <Divider />

      {/* Top Pages Section */}
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            Top 3 Pages
          </Text>
          <Badge tone="info">Top performers by clicks</Badge>
        </InlineStack>

        {topPages.length > 0 ? (
          <Card>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
              headings={[
                "Page URL",
                "Clicks",
                "Impressions",
                "CTR",
                "Avg Position",
              ]}
              rows={topPages.map((page) => [
                truncateUrl(page.pageUrl),
                formatNumber(page.clicks),
                formatNumber(page.impressions),
                formatPercentage(page.ctr),
                formatPosition(page.position),
              ])}
            />
          </Card>
        ) : (
          <Card>
            <Box padding="400">
              <Text as="p" tone="subdued" alignment="center">
                No page data available for the last 28 days
              </Text>
            </Box>
          </Card>
        )}
      </BlockStack>

      {/* FREE Tier Notice */}
      <Card background="bg-surface-secondary">
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" fontWeight="semibold">
            FREE Tier Limitations
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            You're on the FREE tier, which shows the last 28 days of data with top 3
            queries and pages. Data refreshes every 24 hours. Upgrade to PRO for
            historical trends, unlimited queries/pages, and real-time updates.
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

/**
 * Metric Card Component
 * Displays a single metric with icon
 */
interface MetricCardProps {
  title: string;
  value: string;
  icon: typeof SearchIcon;
  tone: "success" | "info" | "warning" | "magic";
}

function MetricCard({ title, value, icon, tone }: MetricCardProps) {
  return (
    <Box width="100%">
      <Card>
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={icon} tone={tone} />
            <Text as="p" variant="bodySm" tone="subdued">
              {title}
            </Text>
          </InlineStack>
          <Text as="p" variant="headingLg" fontWeight="bold">
            {value}
          </Text>
        </BlockStack>
      </Card>
    </Box>
  );
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format percentage
 */
function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(2)}%`;
}

/**
 * Format position
 */
function formatPosition(num: number): string {
  return num.toFixed(1);
}

/**
 * Format last sync timestamp
 */
function formatLastSync(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Truncate long URLs for display
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;

  // Remove protocol
  let display = url.replace(/^https?:\/\//, "");

  if (display.length <= maxLength) return display;

  // Truncate in the middle
  const start = display.substring(0, maxLength / 2 - 2);
  const end = display.substring(display.length - maxLength / 2 + 2);
  return `${start}...${end}`;
}
