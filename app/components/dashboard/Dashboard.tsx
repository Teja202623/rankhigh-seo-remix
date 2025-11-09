import { Page, Layout, Card, Text, Button, InlineStack, BlockStack, Tabs } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import SEOScoreCircle from '~/components/common/SEOScoreCircle';
import SEOScoreBreakdown from '~/components/common/SEOScoreBreakdown';
import QuickWinsSection, { generateQuickWins } from './QuickWinsSection';
import SEOHealthVisualization from './SEOHealthVisualization';
import PerformanceDashboard from './PerformanceDashboard';
import { AuditStatsWidget } from './AuditStatsWidget';
import { UsageStatsWidget } from './UsageStatsWidget';
import { calculateSEOScore, getScoreLabel, getImprovementSuggestions } from '~/utils/seoScore';
import { useMemo, useState, useCallback } from 'react';
import type { UsageStatus } from '~/services/usage.server';

interface DashboardProps {
  latestAudit?: any;
  usageStatus?: UsageStatus;
  isLoading?: boolean;
}

export default function Dashboard({
  latestAudit = null,
  usageStatus,
  isLoading = false
}: DashboardProps) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

  // Calculate SEO Score
  const seoScoreData = useMemo(() => {
    if (!latestAudit) {
      return {
        overallScore: 0,
        categories: [],
        label: 'No Data',
        suggestions: []
      };
    }

    const metrics = {
      criticalIssues: latestAudit.criticalIssues || 0,
      highIssues: latestAudit.highIssues || 0,
      mediumIssues: latestAudit.mediumIssues || 0,
      lowIssues: latestAudit.lowIssues || 0,
      totalPages: latestAudit.totalUrls || 0,
      pagesWithIssues: latestAudit.completed || 0,
      hasSSL: true, // TODO: Get from actual data
      hasRobotsTxt: true, // TODO: Get from actual data
      hasSitemap: true, // TODO: Get from actual data
    };

    const scoreResult = calculateSEOScore(metrics);
    const label = getScoreLabel(scoreResult.overallScore);
    const suggestions = getImprovementSuggestions(scoreResult.categories);

    return {
      ...scoreResult,
      label,
      suggestions
    };
  }, [latestAudit]);

  const tabs = [
    {
      id: 'overview',
      content: 'Overview',
      panelID: 'overview-panel',
    },
    {
      id: 'health',
      content: 'SEO Health',
      panelID: 'health-panel',
    },
    {
      id: 'performance',
      content: 'Performance',
      panelID: 'performance-panel',
    },
  ];

  return (
    <Page
      title="Dashboard"
      primaryAction={{
        content: 'Run New Audit',
        onAction: () => navigate('/audits'),
      }}
      secondaryActions={[
        { content: 'View Pages', onAction: () => navigate('/pages') },
        { content: 'Settings', onAction: () => navigate('/settings') },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
              <div style={{ padding: '16px' }}>
                {selectedTab === 0 && (
                  <BlockStack gap="500">
            {/* Usage Stats Widget - Compact Mode */}
            {usageStatus && (
              <UsageStatsWidget status={usageStatus} compact={true} />
            )}

            {/* Audit Stats Widget - Replaces old audit section */}
            <AuditStatsWidget audit={latestAudit} isLoading={isLoading} />

            {/* SEO Score Card */}
            {latestAudit && (
              <Card>
                <InlineStack gap="600" wrap={false}>
                  <div style={{ padding: '20px' }}>
                    <SEOScoreCircle
                      score={seoScoreData.overallScore}
                      size={140}
                      showLabel={true}
                      label={seoScoreData.label}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <BlockStack gap="300">
                      <Text as="h2" variant="headingLg">
                        Your SEO Health Score
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Based on {latestAudit.totalUrls} pages analyzed with {
                          (latestAudit.criticalIssues || 0) +
                          (latestAudit.highIssues || 0) +
                          (latestAudit.mediumIssues || 0) +
                          (latestAudit.lowIssues || 0)
                        } total issues found
                      </Text>
                      {seoScoreData.suggestions.length > 0 && (
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            Top Recommendations:
                          </Text>
                          <ul style={{ marginLeft: '20px' }}>
                            {seoScoreData.suggestions.map((suggestion, idx) => (
                              <li key={idx}>
                                <Text as="span" variant="bodySm">
                                  {suggestion}
                                </Text>
                              </li>
                            ))}
                          </ul>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </div>
                </InlineStack>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Issue Summary
                </Text>
                {latestAudit ? (
                  <InlineStack gap="400" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Critical Issues
                          </Text>
                          <Text as="p" variant="heading2xl">
                            {latestAudit.criticalIssues || 0}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            High Priority
                          </Text>
                          <Text as="p" variant="heading2xl">
                            {latestAudit.highIssues || 0}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Medium Issues
                          </Text>
                          <Text as="p" variant="heading2xl">
                            {latestAudit.mediumIssues || 0}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Pages Scanned
                          </Text>
                          <Text as="p" variant="heading2xl">
                            {latestAudit.totalUrls || 0}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </InlineStack>
                ) : (
                  <Text as="p" tone="subdued">
                    No audits yet. Run your first audit to see SEO insights.
                  </Text>
                )}
              </BlockStack>
            </Card>

            {/* Quick Actions */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <InlineStack gap="300">
                  <Button onClick={() => navigate('/audits')}>Run SEO Audit</Button>
                  <Button onClick={() => navigate('/pages')}>Manage Meta Tags</Button>
                  <Button onClick={() => navigate('/settings')}>Connect Google Search Console</Button>
                </InlineStack>
              </BlockStack>
            </Card>


            {/* Quick Wins */}
            {latestAudit && (
              <QuickWinsSection
                wins={generateQuickWins(latestAudit)}
                onAction={(winId) => {
                  // Handle quick win actions
                  if (winId === 'fix-critical' || winId === 'add-meta-descriptions') {
                    navigate('/audits');
                  } else if (winId === 'optimize-titles' || winId === 'add-alt-tags') {
                    navigate('/pages');
                  } else {
                    navigate('/settings');
                  }
                }}
              />
            )}

            {/* Score Breakdown */}
            {latestAudit && seoScoreData.categories.length > 0 && (
              <SEOScoreBreakdown categories={seoScoreData.categories} />
            )}
                  </BlockStack>
                )}

                {selectedTab === 1 && <SEOHealthVisualization />}

                {selectedTab === 2 && <PerformanceDashboard />}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
