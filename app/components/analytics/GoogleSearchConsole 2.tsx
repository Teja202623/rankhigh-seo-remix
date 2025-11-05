import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Select,
  DataTable,
  Badge,
  Icon,
  Banner,
} from '@shopify/polaris';
import { CheckCircleIcon, AlertTriangleIcon, ExternalIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCData {
  isConnected: boolean;
  propertyUrl?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: GSCMetrics;
  previousMetrics?: GSCMetrics;
  chartData: {
    dates: string[];
    clicks: number[];
    impressions: number[];
    ctr: number[];
    position: number[];
  };
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

interface GoogleSearchConsoleProps {
  data?: GSCData;
  onConnect?: () => void;
  onRefresh?: () => void;
  onDateRangeChange?: (range: string) => void;
}

export default function GoogleSearchConsole({
  data,
  onConnect,
  onRefresh,
  onDateRangeChange,
}: GoogleSearchConsoleProps) {
  const [dateRange, setDateRange] = useState('last28days');
  const [metricView, setMetricView] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');

  if (!data?.isConnected) {
    return (
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Google Search Console
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Connect to see performance metrics
              </Text>
            </div>
            <Icon source={AlertTriangleIcon} tone="warning" />
          </InlineStack>

          <Banner tone="info">
            Connect your Google Search Console to view impressions, clicks, CTR, and position data.
          </Banner>

          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <BlockStack gap="300">
              <Text as="p" variant="headingMd">
                Connect Google Search Console
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Get insights into how your site performs in Google Search
              </Text>
              <div>
                {onConnect && (
                  <Button variant="primary" onClick={onConnect} icon={ExternalIcon}>
                    Connect GSC
                  </Button>
                )}
              </div>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>
    );
  }

  // Calculate changes
  const getChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const clicksChange = getChange(data.metrics.clicks, data.previousMetrics?.clicks);
  const impressionsChange = getChange(data.metrics.impressions, data.previousMetrics?.impressions);
  const ctrChange = getChange(data.metrics.ctr, data.previousMetrics?.ctr);
  const positionChange = data.previousMetrics
    ? data.metrics.position - data.previousMetrics.position
    : null;

  // Chart configuration
  const chartData = {
    labels: data.chartData.dates,
    datasets: [
      {
        label: metricView === 'clicks' ? 'Clicks' : metricView === 'impressions' ? 'Impressions' : metricView === 'ctr' ? 'CTR (%)' : 'Position',
        data: data.chartData[metricView],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        reverse: metricView === 'position',
      },
    },
  };

  // Table data
  const queryRows = data.topQueries.map((q) => [
    q.query,
    q.clicks.toLocaleString(),
    q.impressions.toLocaleString(),
    (q.ctr * 100).toFixed(2) + '%',
    q.position.toFixed(1),
  ]);

  const pageRows = data.topPages.map((p) => [
    <a href={p.page} target="_blank" rel="noopener noreferrer" style={{ color: '#1a0dab' }}>
      {p.page.length > 60 ? p.page.substring(0, 60) + '...' : p.page}
    </a>,
    p.clicks.toLocaleString(),
    p.impressions.toLocaleString(),
    (p.ctr * 100).toFixed(2) + '%',
    p.position.toFixed(1),
  ]);

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (onDateRangeChange) {
      onDateRangeChange(value);
    }
  };

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Google Search Console
              </Text>
              <Icon source={CheckCircleIcon} tone="success" />
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              {data.propertyUrl}
            </Text>
          </div>
          <InlineStack gap="200">
            <Select
              label=""
              labelHidden
              options={[
                { label: 'Last 7 days', value: 'last7days' },
                { label: 'Last 28 days', value: 'last28days' },
                { label: 'Last 3 months', value: 'last3months' },
                { label: 'Last 6 months', value: 'last6months' },
                { label: 'Last 12 months', value: 'last12months' },
              ]}
              value={dateRange}
              onChange={handleDateRangeChange}
            />
            {onRefresh && <Button onClick={onRefresh}>Refresh</Button>}
          </InlineStack>
        </InlineStack>
      </Card>

      {/* Metrics Cards */}
      <InlineStack gap="400" wrap={false}>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Clicks
              </Text>
              <Text as="p" variant="heading2xl">
                {data.metrics.clicks.toLocaleString()}
              </Text>
              {clicksChange !== null && (
                <Badge tone={clicksChange >= 0 ? 'success' : 'critical'}>
                  {`${clicksChange >= 0 ? '+' : ''}${clicksChange.toFixed(1)}%`}
                </Badge>
              )}
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Impressions
              </Text>
              <Text as="p" variant="heading2xl">
                {data.metrics.impressions.toLocaleString()}
              </Text>
              {impressionsChange !== null && (
                <Badge tone={impressionsChange >= 0 ? 'success' : 'critical'}>
                  {`${impressionsChange >= 0 ? '+' : ''}${impressionsChange.toFixed(1)}%`}
                </Badge>
              )}
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average CTR
              </Text>
              <Text as="p" variant="heading2xl">
                {(data.metrics.ctr * 100).toFixed(2)}%
              </Text>
              {ctrChange !== null && (
                <Badge tone={ctrChange >= 0 ? 'success' : 'critical'}>
                  {`${ctrChange >= 0 ? '+' : ''}${ctrChange.toFixed(1)}%`}
                </Badge>
              )}
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average Position
              </Text>
              <Text as="p" variant="heading2xl">
                #{data.metrics.position.toFixed(1)}
              </Text>
              {positionChange !== null && (
                <Badge tone={positionChange <= 0 ? 'success' : 'critical'}>
                  {`${positionChange > 0 ? '+' : ''}${positionChange.toFixed(1)}`}
                </Badge>
              )}
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Chart */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Performance Trend
            </Text>
            <Select
              label=""
              labelHidden
              options={[
                { label: 'Clicks', value: 'clicks' },
                { label: 'Impressions', value: 'impressions' },
                { label: 'CTR', value: 'ctr' },
                { label: 'Position', value: 'position' },
              ]}
              value={metricView}
              onChange={(value) => setMetricView(value as any)}
            />
          </InlineStack>
          <div style={{ height: '300px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </BlockStack>
      </Card>

      {/* Top Queries */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Top Search Queries
          </Text>
          {data.topQueries.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric']}
              headings={['Query', 'Clicks', 'Impressions', 'CTR', 'Position']}
              rows={queryRows}
            />
          ) : (
            <Text as="p" variant="bodyMd" tone="subdued">
              No query data available for this period
            </Text>
          )}
        </BlockStack>
      </Card>

      {/* Top Pages */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Top Pages
          </Text>
          {data.topPages.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric']}
              headings={['Page', 'Clicks', 'Impressions', 'CTR', 'Position']}
              rows={pageRows}
            />
          ) : (
            <Text as="p" variant="bodyMd" tone="subdued">
              No page data available for this period
            </Text>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
