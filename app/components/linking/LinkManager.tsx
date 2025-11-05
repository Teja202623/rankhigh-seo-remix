import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Badge,
  Button,
  Select,
  TextField,
  Tabs,
  Icon,
} from '@shopify/polaris';
import { LinkIcon, ExternalIcon, SearchIcon, RefreshIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface PageLinkData {
  id: string;
  url: string;
  title: string;
  internalLinksCount: number;
  externalLinksCount: number;
  inboundLinksCount: number;
  linkDepth: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface LinkDetail {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  type: 'internal' | 'external' | 'nofollow';
  status: 'active' | 'broken';
}

export interface BrokenLink {
  id: string;
  url: string;
  sourcePages: string[];
  httpStatus: number;
  lastChecked: string;
}

interface LinkManagerProps {
  pages: PageLinkData[];
  brokenLinks: BrokenLink[];
  onRefreshAnalysis?: () => void;
  onViewPageLinks?: (pageId: string) => void;
  onFixBrokenLink?: (linkId: string) => void;
}

export default function LinkManager({
  pages,
  brokenLinks,
  onRefreshAnalysis,
  onViewPageLinks,
  onFixBrokenLink,
}: LinkManagerProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'broken', content: `Broken Links (${brokenLinks.length})`, panelID: 'broken-panel' },
  ];

  // Calculate statistics
  const totalInternalLinks = pages.reduce((sum, page) => sum + page.internalLinksCount, 0);
  const totalExternalLinks = pages.reduce((sum, page) => sum + page.externalLinksCount, 0);
  const avgLinksPerPage = pages.length > 0 ? (totalInternalLinks / pages.length).toFixed(1) : '0';
  const pagesWithIssues = pages.filter((p) => p.status !== 'healthy').length;

  // Filter pages
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      !searchQuery ||
      page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || page.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusTone = (status: string): 'success' | 'warning' | 'critical' => {
    if (status === 'healthy') return 'success';
    if (status === 'warning') return 'warning';
    return 'critical';
  };

  // Pages table
  const pageRows = filteredPages.map((page) => [
    <div style={{ maxWidth: '250px' }}>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {page.title}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {page.url}
      </Text>
    </div>,
    page.internalLinksCount,
    page.externalLinksCount,
    page.inboundLinksCount,
    page.linkDepth,
    <Badge tone={getStatusTone(page.status)}>
      {page.status === 'healthy'
        ? 'Healthy'
        : page.status === 'warning'
        ? 'Needs Attention'
        : 'Critical'}
    </Badge>,
    onViewPageLinks && (
      <Button size="slim" onClick={() => onViewPageLinks(page.id)}>
        View Links
      </Button>
    ),
  ]);

  // Broken links table
  const brokenLinkRows = brokenLinks.map((link) => [
    <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {link.url}
      </Text>
    </div>,
    <Badge tone="critical">{`HTTP ${link.httpStatus}`}</Badge>,
    link.sourcePages.length,
    <div style={{ maxWidth: '200px' }}>
      <Text as="span" variant="bodySm" tone="subdued">
        {link.sourcePages[0]}
        {link.sourcePages.length > 1 && ` +${link.sourcePages.length - 1} more`}
      </Text>
    </div>,
    new Date(link.lastChecked).toLocaleDateString(),
    onFixBrokenLink && (
      <Button size="slim" onClick={() => onFixBrokenLink(link.id)}>
        Fix
      </Button>
    ),
  ]);

  return (
    <BlockStack gap="400">
      {/* Statistics */}
      <InlineStack gap="400" wrap={false}>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Internal Links
              </Text>
              <Text as="p" variant="heading2xl">
                {totalInternalLinks.toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total External Links
              </Text>
              <Text as="p" variant="heading2xl">
                {totalExternalLinks.toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Avg Links/Page
              </Text>
              <Text as="p" variant="heading2xl">
                {avgLinksPerPage}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Broken Links
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: brokenLinks.length > 0 ? '#ef4444' : '#10b981' }}>
                  {brokenLinks.length}
                </span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Pages with Issues
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: pagesWithIssues > 0 ? '#f59e0b' : '#10b981' }}>
                  {pagesWithIssues}
                </span>
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Main Content */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Overview Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Link Analysis by Page
                  </Text>
                  {onRefreshAnalysis && (
                    <Button icon={RefreshIcon} onClick={onRefreshAnalysis}>
                      Refresh Analysis
                    </Button>
                  )}
                </InlineStack>

                {/* Filters */}
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Search"
                      labelHidden
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search pages..."
                      prefix={<Icon source={SearchIcon} />}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ width: '200px' }}>
                    <Select
                      label="Status"
                      labelHidden
                      options={[
                        { label: 'All Pages', value: 'all' },
                        { label: 'Healthy', value: 'healthy' },
                        { label: 'Warning', value: 'warning' },
                        { label: 'Critical', value: 'critical' },
                      ]}
                      value={filterStatus}
                      onChange={setFilterStatus}
                    />
                  </div>
                </InlineStack>

                {filteredPages.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric', 'text', 'text']}
                    headings={[
                      'Page',
                      'Internal',
                      'External',
                      'Inbound',
                      'Depth',
                      'Status',
                      'Actions',
                    ]}
                    rows={pageRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No pages match your search criteria
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Broken Links Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Broken Links Report
                </Text>
                {brokenLinks.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text']}
                    headings={['Broken URL', 'Status', 'Found On', 'Source Pages', 'Last Checked', 'Actions']}
                    rows={brokenLinkRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={LinkIcon} tone="success" />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No broken links found!
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      All your links are working correctly.
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Link Graph Visualization */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Link Structure Visualization
          </Text>
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '2px dashed #d1d5db',
            }}
          >
            <Icon source={LinkIcon} />
            <Text as="p" variant="bodyMd" tone="subdued">
              Interactive link graph visualization coming soon
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Will show visual representation of your internal linking structure
            </Text>
          </div>
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Link Building Best Practices
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
                  <strong>Internal Links:</strong> Aim for 2-5 per page pointing to related content
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Link Depth:</strong> Important pages should be ≤3 clicks from homepage
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Anchor Text:</strong> Use descriptive text that includes relevant keywords
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>External Links:</strong> Link to high-quality, authoritative sources
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Broken Links:</strong> Fix immediately - they hurt user experience and SEO
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Nofollow:</strong> Use for untrusted content, sponsored links, and user-generated content
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
