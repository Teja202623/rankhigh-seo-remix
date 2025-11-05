import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  DataTable,
  Badge,
  Icon,
  ProgressBar,
  Tabs,
} from '@shopify/polaris';
import { PlusIcon, DeleteIcon, RefreshIcon, SearchIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface Competitor {
  id: string;
  domain: string;
  name: string;
  addedAt: string;
}

export interface CompetitorMetrics {
  domain: string;
  domainAuthority: number;
  organicKeywords: number;
  organicTraffic: number;
  backlinks: number;
  referringDomains: number;
  topKeywords: string[];
}

export interface KeywordOverlap {
  keyword: string;
  yourPosition: number;
  competitorPosition: number;
  searchVolume: number;
  difficulty: number;
  opportunity: 'high' | 'medium' | 'low';
}

export interface ContentGap {
  topic: string;
  competitorUrl: string;
  estimatedTraffic: number;
  keywords: number;
  relevanceScore: number;
}

interface CompetitorAnalysisProps {
  competitors: Competitor[];
  yourMetrics?: CompetitorMetrics;
  competitorMetrics?: CompetitorMetrics[];
  keywordOverlaps?: KeywordOverlap[];
  contentGaps?: ContentGap[];
  onAddCompetitor?: (domain: string) => void;
  onRemoveCompetitor?: (id: string) => void;
  onRefreshAnalysis?: () => void;
}

export default function CompetitorAnalysis({
  competitors,
  yourMetrics,
  competitorMetrics = [],
  keywordOverlaps = [],
  contentGaps = [],
  onAddCompetitor,
  onRemoveCompetitor,
  onRefreshAnalysis,
}: CompetitorAnalysisProps) {
  const [newCompetitor, setNewCompetitor] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  const handleAddCompetitor = () => {
    if (newCompetitor && onAddCompetitor) {
      onAddCompetitor(newCompetitor);
      setNewCompetitor('');
    }
  };

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'keywords', content: 'Keyword Overlap', panelID: 'keywords-panel' },
    { id: 'content', content: 'Content Gaps', panelID: 'content-panel' },
  ];

  // Competitor comparison table
  const comparisonRows = competitorMetrics.map((comp) => {
    const yourDA = yourMetrics?.domainAuthority || 0;
    const daComparison = comp.domainAuthority > yourDA ? 'higher' : 'lower';

    return [
      comp.domain,
      <InlineStack gap="200" blockAlign="center">
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {comp.domainAuthority}
        </Text>
        {yourMetrics && (
          <Badge tone={daComparison === 'higher' ? 'critical' : 'success'}>
            {`${daComparison === 'higher' ? '↑' : '↓'} vs yours (${yourDA})`}
          </Badge>
        )}
      </InlineStack>,
      comp.organicKeywords.toLocaleString(),
      comp.organicTraffic.toLocaleString() + '/mo',
      comp.backlinks.toLocaleString(),
      comp.referringDomains.toLocaleString(),
    ];
  });

  // Keyword overlap table
  const keywordRows = keywordOverlaps.map((kw) => [
    kw.keyword,
    <Badge tone={kw.yourPosition <= 10 ? 'success' : kw.yourPosition <= 30 ? 'warning' : 'critical'}>
      {`#${kw.yourPosition}`}
    </Badge>,
    <Badge tone={kw.competitorPosition <= 10 ? 'critical' : kw.competitorPosition <= 30 ? 'warning' : 'success'}>
      {`#${kw.competitorPosition}`}
    </Badge>,
    kw.searchVolume.toLocaleString(),
    <Badge tone={kw.difficulty >= 70 ? 'critical' : kw.difficulty >= 40 ? 'warning' : 'success'}>
      {kw.difficulty.toString()}
    </Badge>,
    <Badge tone={kw.opportunity === 'high' ? 'success' : kw.opportunity === 'medium' ? 'warning' : 'info'}>
      {kw.opportunity}
    </Badge>,
  ]);

  // Content gap table
  const contentGapRows = contentGaps.map((gap) => [
    gap.topic,
    <a href={gap.competitorUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a0dab' }}>
      {gap.competitorUrl.length > 50 ? gap.competitorUrl.substring(0, 50) + '...' : gap.competitorUrl}
    </a>,
    gap.estimatedTraffic.toLocaleString() + '/mo',
    gap.keywords.toLocaleString(),
    <div style={{ width: '100px' }}>
      <ProgressBar progress={gap.relevanceScore} size="small" tone="success" />
    </div>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Competitor Analysis
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Track and analyze your competitors' SEO performance
            </Text>
          </div>
          {onRefreshAnalysis && (
            <Button icon={RefreshIcon} onClick={onRefreshAnalysis}>
              Refresh Data
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Add Competitor */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Add Competitor
          </Text>
          <InlineStack gap="200" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label=""
                labelHidden
                value={newCompetitor}
                onChange={setNewCompetitor}
                placeholder="competitor.com"
                prefix={<Icon source={SearchIcon} />}
                autoComplete="off"
              />
            </div>
            {onAddCompetitor && (
              <Button variant="primary" icon={PlusIcon} onClick={handleAddCompetitor}>
                Add
              </Button>
            )}
          </InlineStack>

          {/* Current Competitors */}
          {competitors.length > 0 && (
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                Tracking {competitors.length} Competitor{competitors.length !== 1 ? 's' : ''}
              </Text>
              <InlineStack gap="200" wrap>
                {competitors.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Text as="span" variant="bodySm">
                      {comp.domain}
                    </Text>
                    {onRemoveCompetitor && (
                      <button
                        onClick={() => onRemoveCompetitor(comp.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                        }}
                      >
                        <Icon source={DeleteIcon} tone="critical" />
                      </button>
                    )}
                  </div>
                ))}
              </InlineStack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Your Metrics */}
      {yourMetrics && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              Your Website: {yourMetrics.domain}
            </Text>
            <InlineStack gap="400" wrap>
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Domain Authority
                </Text>
                <Text as="p" variant="heading2xl">
                  {yourMetrics.domainAuthority}
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Organic Keywords
                </Text>
                <Text as="p" variant="heading2xl">
                  {yourMetrics.organicKeywords.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Organic Traffic
                </Text>
                <Text as="p" variant="heading2xl">
                  {yourMetrics.organicTraffic.toLocaleString()}/mo
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Backlinks
                </Text>
                <Text as="p" variant="heading2xl">
                  {yourMetrics.backlinks.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Referring Domains
                </Text>
                <Text as="p" variant="heading2xl">
                  {yourMetrics.referringDomains.toLocaleString()}
                </Text>
              </div>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Overview Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Competitor Comparison
                </Text>
                {competitorMetrics.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'numeric', 'numeric']}
                    headings={[
                      'Domain',
                      'Domain Authority',
                      'Keywords',
                      'Traffic',
                      'Backlinks',
                      'Ref. Domains',
                    ]}
                    rows={comparisonRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Add competitors above to see comparison data
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Keyword Overlap Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Keyword Overlap Analysis
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Keywords where both you and your competitors rank
                </Text>
                {keywordOverlaps.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text']}
                    headings={[
                      'Keyword',
                      'Your Position',
                      'Competitor Position',
                      'Volume',
                      'Difficulty',
                      'Opportunity',
                    ]}
                    rows={keywordRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No keyword overlap data available
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Content Gaps Tab */}
            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Content Gap Analysis
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Topics your competitors rank for but you don't
                </Text>
                {contentGaps.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'numeric', 'text']}
                    headings={['Topic', 'Competitor URL', 'Est. Traffic', 'Keywords', 'Relevance']}
                    rows={contentGapRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No content gap data available
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Insights */}
      {(keywordOverlaps.length > 0 || contentGaps.length > 0) && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              Key Insights
            </Text>
            <ul style={{ marginLeft: '20px' }}>
              {keywordOverlaps.filter((kw) => kw.opportunity === 'high').length > 0 && (
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>
                      {keywordOverlaps.filter((kw) => kw.opportunity === 'high').length} high-opportunity
                      keywords
                    </strong>{' '}
                    where you can outrank competitors
                  </Text>
                </li>
              )}
              {contentGaps.length > 0 && (
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>{contentGaps.length} content gaps</strong> identified where competitors have
                    content you don't
                  </Text>
                </li>
              )}
              {competitorMetrics.length > 0 && yourMetrics && (
                <li>
                  <Text as="span" variant="bodySm">
                    Your domain authority ({yourMetrics.domainAuthority}) is{' '}
                    {competitorMetrics.filter((c) => c.domainAuthority < yourMetrics.domainAuthority).length >
                    competitorMetrics.length / 2
                      ? 'higher'
                      : 'lower'}{' '}
                    than most competitors
                  </Text>
                </li>
              )}
            </ul>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
