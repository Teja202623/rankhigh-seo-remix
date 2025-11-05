import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Badge,
  Icon,
  Button,
} from '@shopify/polaris';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartVerticalIcon,
  RefreshIcon,
  CalendarIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  category: 'traffic' | 'rankings' | 'technical' | 'engagement';
  unit?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface PerformanceGoal {
  metric: string;
  target: number;
  current: number;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'off_track';
}

interface PerformanceDashboardProps {
  metrics?: PerformanceMetric[];
  chartData?: Record<string, ChartDataPoint[]>;
  goals?: PerformanceGoal[];
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onRefresh?: () => void;
  onChangeDateRange?: (range: string) => void;
}

const DEFAULT_METRICS: PerformanceMetric[] = [
  {
    name: 'Organic Traffic',
    value: 12547,
    previousValue: 10234,
    change: 2313,
    changePercent: 22.6,
    trend: 'up',
    category: 'traffic',
    unit: 'visits',
  },
  {
    name: 'Avg. Position',
    value: 8.2,
    previousValue: 12.5,
    change: -4.3,
    changePercent: -34.4,
    trend: 'up',
    category: 'rankings',
  },
  {
    name: 'Keywords in Top 10',
    value: 156,
    previousValue: 142,
    change: 14,
    changePercent: 9.9,
    trend: 'up',
    category: 'rankings',
  },
  {
    name: 'SEO Score',
    value: 87,
    previousValue: 82,
    change: 5,
    changePercent: 6.1,
    trend: 'up',
    category: 'technical',
  },
  {
    name: 'Page Speed (Mobile)',
    value: 92,
    previousValue: 85,
    change: 7,
    changePercent: 8.2,
    trend: 'up',
    category: 'technical',
  },
  {
    name: 'Avg. Session Duration',
    value: 185,
    previousValue: 172,
    change: 13,
    changePercent: 7.6,
    trend: 'up',
    category: 'engagement',
    unit: 'seconds',
  },
  {
    name: 'Bounce Rate',
    value: 42.3,
    previousValue: 48.7,
    change: -6.4,
    changePercent: -13.1,
    trend: 'up',
    category: 'engagement',
    unit: '%',
  },
  {
    name: 'Indexed Pages',
    value: 1247,
    previousValue: 1189,
    change: 58,
    changePercent: 4.9,
    trend: 'up',
    category: 'technical',
  },
  {
    name: 'Backlinks',
    value: 3842,
    previousValue: 3621,
    change: 221,
    changePercent: 6.1,
    trend: 'up',
    category: 'rankings',
  },
  {
    name: 'Click-Through Rate',
    value: 5.8,
    previousValue: 5.2,
    change: 0.6,
    changePercent: 11.5,
    trend: 'up',
    category: 'traffic',
    unit: '%',
  },
];

const DEFAULT_GOALS: PerformanceGoal[] = [
  {
    metric: 'Organic Traffic',
    target: 15000,
    current: 12547,
    deadline: '2025-12-31',
    status: 'on_track',
  },
  {
    metric: 'Keywords in Top 10',
    target: 200,
    current: 156,
    deadline: '2025-12-31',
    status: 'on_track',
  },
  {
    metric: 'SEO Score',
    target: 95,
    current: 87,
    deadline: '2025-12-31',
    status: 'at_risk',
  },
];

export default function PerformanceDashboard({
  metrics = DEFAULT_METRICS,
  goals = DEFAULT_GOALS,
  dateRange: initialDateRange = 'month',
  onRefresh,
  onChangeDateRange,
}: PerformanceDashboardProps) {
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleDateRangeChange = (value: string) => {
    setDateRange(value as any);
    if (onChangeDateRange) {
      onChangeDateRange(value);
    }
  };

  // Filter metrics by category
  const filteredMetrics =
    selectedCategory === 'all'
      ? metrics
      : metrics.filter((m) => m.category === selectedCategory);

  // Group metrics by category
  const metricsByCategory = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  const formatValue = (value: number, unit?: string): string => {
    if (unit === 'seconds') {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? ArrowUpIcon : ArrowDownIcon;
  };

  const getTrendTone = (trend: string, change: number) => {
    if (trend === 'stable') return 'info';
    // For metrics where lower is better (bounce rate, avg position)
    if (change < 0 && trend === 'up') return 'success';
    if (change > 0 && trend === 'up') return 'success';
    return 'critical';
  };

  const getGoalStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge tone="success">On Track</Badge>;
      case 'at_risk':
        return <Badge tone="warning">At Risk</Badge>;
      case 'off_track':
        return <Badge tone="critical">Off Track</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateGoalProgress = (goal: PerformanceGoal): number => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const categoryLabels: Record<string, string> = {
    traffic: 'Traffic',
    rankings: 'Rankings',
    technical: 'Technical SEO',
    engagement: 'Engagement',
  };

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Performance Dashboard
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Track your SEO performance metrics over time
            </Text>
          </div>
          <InlineStack gap="200">
            <div style={{ width: '150px' }}>
              <Select
                label=""
                labelHidden
                options={[
                  { label: 'Last 7 Days', value: 'week' },
                  { label: 'Last 30 Days', value: 'month' },
                  { label: 'Last 90 Days', value: 'quarter' },
                  { label: 'Last Year', value: 'year' },
                ]}
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
            {onRefresh && (
              <Button icon={RefreshIcon} onClick={onRefresh}>
                Refresh
              </Button>
            )}
          </InlineStack>
        </InlineStack>
      </Card>

      {/* Category Filter */}
      <Card>
        <InlineStack gap="200" wrap>
          <Button
            pressed={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          >
            All Metrics
          </Button>
          {Object.keys(metricsByCategory).map((category) => (
            <Button
              key={category}
              pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category]}
            </Button>
          ))}
        </InlineStack>
      </Card>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredMetrics.map((metric) => (
          <Card key={metric.name}>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="start">
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {metric.name}
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {formatValue(metric.value, metric.unit)}
                  </Text>
                </div>
                <Icon
                  source={getTrendIcon(metric.trend)}
                  tone={getTrendTone(metric.trend, metric.change)}
                />
              </InlineStack>

              <div
                style={{
                  padding: '8px',
                  backgroundColor: metric.changePercent > 0 ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '4px',
                }}
              >
                <InlineStack gap="200" blockAlign="center">
                  <Text
                    as="span"
                    variant="bodySm"
                    fontWeight="semibold"
                    tone={metric.changePercent > 0 ? 'success' : 'critical'}
                  >
                    {metric.changePercent > 0 ? '+' : ''}
                    {metric.changePercent.toFixed(1)}%
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    vs. previous period
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  {metric.change > 0 ? '+' : ''}
                  {formatValue(Math.abs(metric.change), metric.unit)} change
                </Text>
              </div>

              {/* Mini trend chart placeholder */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon source={ChartVerticalIcon} tone="subdued" />
                <Text as="span" variant="bodySm" tone="subdued">
                  Trend chart
                </Text>
              </div>
            </BlockStack>
          </Card>
        ))}
      </div>

      {/* Goals Section */}
      {goals.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">
                Performance Goals
              </Text>
              <Icon source={CalendarIcon} tone="subdued" />
            </InlineStack>

            <BlockStack gap="300">
              {goals.map((goal, index) => {
                const progress = calculateGoalProgress(goal);
                return (
                  <div key={index}>
                    <InlineStack align="space-between" blockAlign="center">
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {goal.metric}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Target: {goal.target.toLocaleString()} by{' '}
                          {new Date(goal.deadline).toLocaleDateString()}
                        </Text>
                      </div>
                      {getGoalStatusBadge(goal.status)}
                    </InlineStack>

                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor:
                              goal.status === 'on_track'
                                ? '#10b981'
                                : goal.status === 'at_risk'
                                ? '#f59e0b'
                                : '#ef4444',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="span" variant="bodySm" tone="subdued">
                          {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                        </Text>
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          {progress.toFixed(1)}%
                        </Text>
                      </InlineStack>
                    </div>
                  </div>
                );
              })}
            </BlockStack>
          </BlockStack>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Performance Summary
          </Text>

          <InlineStack gap="400" wrap>
            <div style={{ flex: 1 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Metrics Improving
                </Text>
                <Text as="p" variant="heading2xl">
                  <span style={{ color: '#10b981' }}>
                    {metrics.filter((m) => m.trend === 'up').length}
                  </span>
                  /{metrics.length}
                </Text>
              </BlockStack>
            </div>
            <div style={{ flex: 1 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Avg. Improvement
                </Text>
                <Text as="p" variant="heading2xl">
                  <span style={{ color: '#10b981' }}>
                    +
                    {(
                      metrics
                        .filter((m) => m.trend === 'up')
                        .reduce((sum, m) => sum + m.changePercent, 0) /
                      metrics.filter((m) => m.trend === 'up').length
                    ).toFixed(1)}
                    %
                  </span>
                </Text>
              </BlockStack>
            </div>
            <div style={{ flex: 1 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  Goals On Track
                </Text>
                <Text as="p" variant="heading2xl">
                  {goals.filter((g) => g.status === 'on_track').length}/{goals.length}
                </Text>
              </BlockStack>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Performance Insights */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Key Insights
          </Text>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <ul style={{ marginLeft: '20px' }}>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Organic traffic is up 22.6%</strong> - Your SEO efforts are paying off
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Average position improved significantly</strong> - 34% improvement in rankings
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>14 new keywords in top 10</strong> - Continue optimizing for these terms
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Page speed improvements</strong> - 8% faster loading times on mobile
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Bounce rate decreased</strong> - Users are finding your content more relevant
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
