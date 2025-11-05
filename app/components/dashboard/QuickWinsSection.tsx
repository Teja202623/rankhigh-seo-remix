import { Card, Text, BlockStack, Button, Badge, InlineStack, Icon } from '@shopify/polaris';
import { CheckCircleIcon, AlertTriangleIcon } from '@shopify/polaris-icons';

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  action?: () => void;
  actionLabel?: string;
  isCompleted?: boolean;
}

interface QuickWinsSectionProps {
  wins: QuickWin[];
  onAction?: (winId: string) => void;
}

export default function QuickWinsSection({ wins, onAction }: QuickWinsSectionProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return undefined;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'attention';
      case 'hard':
        return 'warning';
      default:
        return undefined;
    }
  };

  // Sort by impact (high first) then by effort (easy first)
  const sortedWins = [...wins].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { easy: 0, medium: 1, hard: 2 };

    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return effortOrder[a.effort] - effortOrder[b.effort];
  });

  const activeWins = sortedWins.filter(w => !w.isCompleted);
  const completedWins = sortedWins.filter(w => w.isCompleted);

  if (wins.length === 0) {
    return (
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Quick Wins
          </Text>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Icon source={CheckCircleIcon} tone="success" />
            </div>
            <Text as="p" variant="headingMd" fontWeight="semibold">
              Great job! No quick wins needed
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Your SEO is in good shape. Keep monitoring for new opportunities.
            </Text>
          </div>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Quick Wins
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              High-impact improvements you can make right now
            </Text>
          </div>
          {completedWins.length > 0 && (
            <Badge tone="success">
              {`${completedWins.length} completed`}
            </Badge>
          )}
        </InlineStack>

        {activeWins.length > 0 && (
          <BlockStack gap="300">
            {activeWins.map((win) => (
              <div
                key={win.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                <InlineStack align="space-between" blockAlign="start" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          {win.title}
                        </Text>
                        <Badge tone={getImpactColor(win.impact)}>
                          {`${win.impact} impact`}
                        </Badge>
                        <Badge tone={getEffortColor(win.effort)}>
                          {win.effort}
                        </Badge>
                      </InlineStack>

                      <Text as="p" variant="bodyMd">
                        {win.description}
                      </Text>

                      <Text as="p" variant="bodySm" tone="subdued">
                        Estimated time: {win.estimatedTime}
                      </Text>
                    </BlockStack>
                  </div>

                  {(win.action || onAction) && (
                    <div style={{ marginLeft: '16px' }}>
                      <Button
                        onClick={() => {
                          if (win.action) {
                            win.action();
                          } else if (onAction) {
                            onAction(win.id);
                          }
                        }}
                      >
                        {win.actionLabel || 'Fix Now'}
                      </Button>
                    </div>
                  )}
                </InlineStack>
              </div>
            ))}
          </BlockStack>
        )}

        {completedWins.length > 0 && (
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm" tone="subdued">
              Completed ({completedWins.length})
            </Text>
            <BlockStack gap="200">
              {completedWins.map((win) => (
                <div
                  key={win.id}
                  style={{
                    padding: '12px',
                    border: '1px solid #d4f7dc',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                  }}
                >
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckCircleIcon} tone="success" />
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {win.title}
                    </Text>
                  </InlineStack>
                </div>
              ))}
            </BlockStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Generate quick wins from audit data
 */
export function generateQuickWins(auditData: any): QuickWin[] {
  const wins: QuickWin[] = [];

  if (!auditData) return wins;

  // Critical issues = high impact, easy fixes
  if (auditData.criticalIssues > 0) {
    wins.push({
      id: 'fix-critical',
      title: `Fix ${auditData.criticalIssues} Critical Issue${auditData.criticalIssues > 1 ? 's' : ''}`,
      description: 'Critical issues can severely impact your SEO. These should be addressed immediately.',
      impact: 'high',
      effort: 'medium',
      estimatedTime: `${auditData.criticalIssues * 5} minutes`,
      actionLabel: 'View Issues',
    });
  }

  // Missing meta descriptions
  if (auditData.highIssues > 3) {
    wins.push({
      id: 'add-meta-descriptions',
      title: 'Add Missing Meta Descriptions',
      description: 'Pages without meta descriptions miss out on search traffic. Add them to improve click-through rates.',
      impact: 'high',
      effort: 'easy',
      estimatedTime: '15 minutes',
      actionLabel: 'Add Now',
    });
  }

  // Medium issues
  if (auditData.mediumIssues > 5) {
    wins.push({
      id: 'optimize-titles',
      title: 'Optimize Page Titles',
      description: 'Improve your page titles for better search visibility and click-through rates.',
      impact: 'medium',
      effort: 'easy',
      estimatedTime: '20 minutes',
      actionLabel: 'Optimize',
    });
  }

  // Low hanging fruit - ALT tags
  wins.push({
    id: 'add-alt-tags',
    title: 'Add Image ALT Tags',
    description: 'Images without ALT tags hurt accessibility and SEO. Quick win for better rankings.',
    impact: 'medium',
    effort: 'easy',
    estimatedTime: '10 minutes',
    actionLabel: 'Add ALT Tags',
  });

  // Site speed
  wins.push({
    id: 'improve-speed',
    title: 'Improve Page Load Speed',
    description: 'Faster pages rank better and convert more visitors. Compress images and optimize code.',
    impact: 'high',
    effort: 'medium',
    estimatedTime: '30 minutes',
    actionLabel: 'View Tips',
  });

  return wins.slice(0, 5); // Return top 5 quick wins
}
