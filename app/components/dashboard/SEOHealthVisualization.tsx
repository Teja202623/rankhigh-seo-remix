import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
  Button,
  Select,
} from '@shopify/polaris';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface SEOHealthScore {
  overall: number;
  categories: {
    technical: number;
    content: number;
    onPage: number;
    offPage: number;
    userExperience: number;
  };
  timestamp: string;
}

export interface HealthTrend {
  date: string;
  score: number;
}

export interface HealthIssue {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: number;
  fixed: boolean;
}

interface SEOHealthVisualizationProps {
  currentHealth?: SEOHealthScore;
  trendData?: HealthTrend[];
  issues?: HealthIssue[];
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  onChangeTimeframe?: (timeframe: string) => void;
}

const DEFAULT_HEALTH: SEOHealthScore = {
  overall: 87,
  categories: {
    technical: 92,
    content: 85,
    onPage: 88,
    offPage: 78,
    userExperience: 91,
  },
  timestamp: new Date().toISOString(),
};

const DEFAULT_TREND: HealthTrend[] = [
  { date: '2025-10-03', score: 82 },
  { date: '2025-10-10', score: 83 },
  { date: '2025-10-17', score: 84 },
  { date: '2025-10-24', score: 85 },
  { date: '2025-10-31', score: 86 },
  { date: '2025-11-03', score: 87 },
];

const DEFAULT_ISSUES: HealthIssue[] = [
  {
    category: 'technical',
    severity: 'critical',
    title: '3 pages with slow load times',
    description: 'Core Web Vitals showing poor performance on mobile',
    impact: -5,
    fixed: false,
  },
  {
    category: 'content',
    severity: 'warning',
    title: '12 pages with thin content',
    description: 'Pages have less than 300 words of content',
    impact: -3,
    fixed: false,
  },
  {
    category: 'onPage',
    severity: 'warning',
    title: '8 pages missing meta descriptions',
    description: 'Important pages without optimized meta descriptions',
    impact: -2,
    fixed: false,
  },
  {
    category: 'offPage',
    severity: 'critical',
    title: '15 broken backlinks detected',
    description: 'External sites linking to 404 pages',
    impact: -4,
    fixed: false,
  },
  {
    category: 'userExperience',
    severity: 'info',
    title: '2 pages with high bounce rate',
    description: 'Users leaving quickly, may need content improvement',
    impact: -1,
    fixed: false,
  },
];

export default function SEOHealthVisualization({
  currentHealth = DEFAULT_HEALTH,
  trendData = DEFAULT_TREND,
  issues = DEFAULT_ISSUES,
  timeframe: initialTimeframe = 'month',
  onChangeTimeframe,
}: SEOHealthVisualizationProps) {
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as 'week' | 'month' | 'quarter' | 'year');
    if (onChangeTimeframe) {
      onChangeTimeframe(value);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 75) return '#3b82f6'; // blue
    if (score >= 60) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangleIcon;
      case 'warning':
        return AlertTriangleIcon;
      case 'info':
        return InfoIcon;
      default:
        return InfoIcon;
    }
  };

  const getSeverityTone = (severity: string): 'critical' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  // Calculate trend
  const previousScore = trendData[trendData.length - 2]?.score || currentHealth.overall;
  const scoreChange = currentHealth.overall - previousScore;
  const scoreChangePercent = previousScore !== 0
    ? ((scoreChange / previousScore) * 100).toFixed(1)
    : '0.0';

  // Calculate potential score if all issues fixed
  const totalImpact = issues.filter((i) => !i.fixed).reduce((sum, i) => sum + Math.abs(i.impact), 0);
  const potentialScore = Math.min(currentHealth.overall + totalImpact, 100);

  const categoryLabels: Record<string, string> = {
    technical: 'Technical SEO',
    content: 'Content Quality',
    onPage: 'On-Page SEO',
    offPage: 'Off-Page SEO',
    userExperience: 'User Experience',
  };

  const criticalIssues = issues.filter((i) => i.severity === 'critical' && !i.fixed).length;
  const warningIssues = issues.filter((i) => i.severity === 'warning' && !i.fixed).length;

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              SEO Health Score
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Track your overall SEO health and improvements over time
            </Text>
          </div>
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
              value={timeframe}
              onChange={handleTimeframeChange}
            />
          </div>
        </InlineStack>
      </Card>

      {/* Main Score Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" wrap={false}>
            {/* Score Circle */}
            <div style={{ flex: '0 0 auto' }}>
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  border: `12px solid ${getScoreColor(currentHealth.overall)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Text as="p" variant="heading3xl" fontWeight="bold">
                  {currentHealth.overall}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  / 100
                </Text>
                <Badge tone={currentHealth.overall >= 90 ? 'success' : currentHealth.overall >= 60 ? 'attention' : 'critical'}>
                  {getScoreLabel(currentHealth.overall)}
                </Badge>
              </div>
            </div>

            {/* Score Details */}
            <div style={{ flex: 1, paddingLeft: '32px' }}>
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={scoreChange >= 0 ? ArrowUpIcon : ArrowDownIcon} tone={scoreChange >= 0 ? 'success' : 'critical'} />
                  <Text as="p" variant="bodyMd">
                    <span style={{ color: scoreChange >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {scoreChange >= 0 ? '+' : ''}
                      {scoreChange} points
                    </span>{' '}
                    ({scoreChange >= 0 ? '+' : ''}
                    {scoreChangePercent}%) from previous period
                  </Text>
                </InlineStack>

                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Potential Score: {potentialScore}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Fix all issues to gain +{totalImpact} points
                  </Text>
                </div>

                <InlineStack gap="300">
                  {criticalIssues > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '6px',
                      }}
                    >
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        {criticalIssues} Critical Issues
                      </Text>
                    </div>
                  )}
                  {warningIssues > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '6px',
                      }}
                    >
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        {warningIssues} Warnings
                      </Text>
                    </div>
                  )}
                  {criticalIssues === 0 && warningIssues === 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#d1fae5',
                        borderRadius: '6px',
                      }}
                    >
                      <InlineStack gap="100" blockAlign="center">
                        <Icon source={CheckCircleIcon} tone="success" />
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          No Critical Issues
                        </Text>
                      </InlineStack>
                    </div>
                  )}
                </InlineStack>
              </BlockStack>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Trend Chart */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Score Trend
          </Text>

          {/* Simple trend visualization */}
          <div style={{ position: 'relative', height: '200px', padding: '20px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '100%',
                gap: '8px',
              }}
            >
              {trendData.map((point, index) => {
                const height = (point.score / 100) * 100;
                const isLast = index === trendData.length - 1;
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        backgroundColor: isLast ? getScoreColor(point.score) : '#e5e7eb',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        transition: 'height 0.3s ease, background-color 0.3s ease',
                      }}
                    >
                      {isLast && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontWeight: 'bold',
                            fontSize: '14px',
                          }}
                        >
                          {point.score}
                        </div>
                      )}
                    </div>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        </BlockStack>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Category Scores
          </Text>

          <BlockStack gap="300">
            {Object.entries(currentHealth.categories).map(([category, score]) => (
              <div key={category}>
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodyMd">
                    {categoryLabels[category]}
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {score}/100
                  </Text>
                </InlineStack>
                <div
                  style={{
                    marginTop: '8px',
                    height: '8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: '100%',
                      backgroundColor: getScoreColor(score),
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Issues List */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Active Issues
            </Text>
            <Badge tone="attention">{`${issues.filter((i) => !i.fixed).length} Issues`}</Badge>
          </InlineStack>

          <BlockStack gap="300">
            {issues.filter((i) => !i.fixed).map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <InlineStack align="space-between" blockAlign="start" wrap={false}>
                  <InlineStack gap="200" blockAlign="start">
                    <Icon source={getSeverityIcon(issue.severity)} tone={getSeverityTone(issue.severity)} />
                    <div>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {issue.title}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {issue.description}
                      </Text>
                      <div style={{ marginTop: '8px' }}>
                        <Badge tone={getSeverityTone(issue.severity)}>{issue.severity.toUpperCase()}</Badge>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {' '}
                          • Impact: {issue.impact} points
                        </Text>
                      </div>
                    </div>
                  </InlineStack>
                  <Button size="slim">Fix</Button>
                </InlineStack>
              </div>
            ))}

            {issues.filter((i) => !i.fixed).length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Icon source={CheckCircleIcon} tone="success" />
                <Text as="p" variant="headingMd" fontWeight="semibold">
                  All issues resolved!
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Your SEO health is in great shape
                </Text>
              </div>
            )}
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Recommendations */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Recommendations
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
                  Focus on fixing <strong>critical issues</strong> first for maximum impact
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  Improve <strong>off-page SEO</strong> - it's your lowest scoring category
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  Monitor your score weekly to catch issues early
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  Set a goal to reach <strong>90+ score</strong> within the next quarter
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
