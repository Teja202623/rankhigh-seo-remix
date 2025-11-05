import { Card, Text, BlockStack, DataTable, Badge, Button, InlineStack, Icon, TextField } from '@shopify/polaris';
import { CaretUpIcon, CaretDownIcon, MinusIcon, PlusIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface TrackedKeyword {
  id: string;
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  change: number;
  searchVolume: number;
  difficulty: number;
  targetUrl: string;
  lastChecked: string;
}

interface KeywordTrackingDashboardProps {
  keywords: TrackedKeyword[];
  onAddKeyword?: (keyword: string, url: string) => void;
  onRemoveKeyword?: (id: string) => void;
  onRefresh?: () => void;
}

export default function KeywordTrackingDashboard({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  onRefresh,
}: KeywordTrackingDashboardProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const getRankChangeBadge = (change: number) => {
    if (change > 0) {
      return (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={CaretUpIcon} tone="success" />
          <Badge tone="success">{`+${change}`}</Badge>
        </InlineStack>
      );
    } else if (change < 0) {
      return (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={CaretDownIcon} tone="critical" />
          <Badge tone="critical">{change.toString()}</Badge>
        </InlineStack>
      );
    } else {
      return (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={MinusIcon} />
          <Badge>No change</Badge>
        </InlineStack>
      );
    }
  };

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty >= 70) return <Badge tone="critical">Hard</Badge>;
    if (difficulty >= 40) return <Badge tone="warning">Medium</Badge>;
    return <Badge tone="success">Easy</Badge>;
  };

  const rows = keywords.map((kw) => [
    kw.keyword,
    <Badge tone={kw.currentPosition <= 10 ? 'success' : kw.currentPosition <= 30 ? 'warning' : 'critical'}>
      {`#${kw.currentPosition}`}
    </Badge>,
    getRankChangeBadge(kw.change),
    kw.searchVolume.toLocaleString(),
    getDifficultyBadge(kw.difficulty),
    <a href={kw.targetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a0dab' }}>
      {kw.targetUrl.length > 40 ? kw.targetUrl.substring(0, 40) + '...' : kw.targetUrl}
    </a>,
    new Date(kw.lastChecked).toLocaleDateString(),
    onRemoveKeyword && (
      <Button size="slim" tone="critical" onClick={() => onRemoveKeyword(kw.id)}>
        Remove
      </Button>
    ),
  ]);

  const handleAddKeyword = () => {
    if (newKeyword && targetUrl && onAddKeyword) {
      onAddKeyword(newKeyword, targetUrl);
      setNewKeyword('');
      setTargetUrl('');
      setShowAddForm(false);
    }
  };

  // Calculate statistics
  const avgPosition = keywords.length > 0
    ? keywords.reduce((sum, kw) => sum + kw.currentPosition, 0) / keywords.length
    : 0;
  const topTen = keywords.filter(kw => kw.currentPosition <= 10).length;
  const improving = keywords.filter(kw => kw.change > 0).length;
  const declining = keywords.filter(kw => kw.change < 0).length;

  return (
    <BlockStack gap="400">
      {/* Statistics Cards */}
      <InlineStack gap="400" wrap={false}>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Keywords
              </Text>
              <Text as="p" variant="heading2xl">
                {keywords.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Top 10 Rankings
              </Text>
              <Text as="p" variant="heading2xl">
                {topTen}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Avg. Position
              </Text>
              <Text as="p" variant="heading2xl">
                #{avgPosition.toFixed(1)}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Improving / Declining
              </Text>
              <InlineStack gap="200">
                <Text as="span" variant="headingLg">
                  <span style={{ color: '#10b981' }}>↑{improving}</span>
                </Text>
                <Text as="span" variant="headingLg">
                  <span style={{ color: '#ef4444' }}>↓{declining}</span>
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Keyword Table */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Tracked Keywords
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Monitor your keyword rankings over time
              </Text>
            </div>
            <InlineStack gap="200">
              {onRefresh && (
                <Button onClick={onRefresh}>
                  Refresh Rankings
                </Button>
              )}
              {onAddKeyword && (
                <Button
                  variant="primary"
                  icon={PlusIcon}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  Add Keyword
                </Button>
              )}
            </InlineStack>
          </InlineStack>

          {showAddForm && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Add New Keyword
                </Text>
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Keyword"
                      value={newKeyword}
                      onChange={setNewKeyword}
                      placeholder="e.g., shopify seo"
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Target URL"
                      value={targetUrl}
                      onChange={setTargetUrl}
                      placeholder="https://yourstore.com/page"
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>
                <InlineStack gap="200">
                  <Button variant="primary" onClick={handleAddKeyword}>
                    Add Keyword
                  </Button>
                  <Button onClick={() => setShowAddForm(false)}>Cancel</Button>
                </InlineStack>
              </BlockStack>
            </div>
          )}

          {keywords.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text', 'text', 'text']}
              headings={[
                'Keyword',
                'Position',
                'Change',
                'Volume',
                'Difficulty',
                'Target URL',
                'Last Checked',
                'Actions',
              ]}
              rows={rows}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Text as="p" variant="bodyMd" tone="subdued">
                No keywords tracked yet. Add your first keyword to start tracking rankings.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
