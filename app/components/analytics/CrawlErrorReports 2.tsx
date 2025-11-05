import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  DataTable,
  Tabs,
  Icon,
  Select,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  RefreshIcon,
  CheckIcon,
  BugIcon,
  MobileIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface CrawlError {
  id: string;
  url: string;
  errorType: 'not_found' | 'server_error' | 'soft_404' | 'access_denied' | 'redirect' | 'other';
  httpStatus: number;
  firstDetected: string;
  lastCrawled: string;
  platform: 'desktop' | 'mobile' | 'smartphone';
}

export interface IndexingIssue {
  id: string;
  url: string;
  status: 'excluded' | 'error' | 'valid' | 'warning';
  reason: string;
  lastCrawled?: string;
  coverage: 'submitted' | 'discovered' | 'not_submitted';
}

export interface MobileUsabilityIssue {
  id: string;
  url: string;
  issueType: string;
  severity: 'error' | 'warning';
  affectedPages: number;
  lastDetected: string;
}

export interface SitemapIssue {
  id: string;
  sitemapUrl: string;
  issueType: string;
  affectedUrls: number;
  lastChecked: string;
}

interface CrawlErrorReportsProps {
  crawlErrors?: CrawlError[];
  indexingIssues?: IndexingIssue[];
  mobileUsabilityIssues?: MobileUsabilityIssue[];
  sitemapIssues?: SitemapIssue[];
  onRefresh?: () => void;
  onFixError?: (errorId: string) => void;
  onValidateFix?: (issueId: string) => void;
  onRequestIndexing?: (url: string) => void;
}

export default function CrawlErrorReports({
  crawlErrors = [],
  indexingIssues = [],
  mobileUsabilityIssues = [],
  sitemapIssues = [],
  onRefresh,
  onFixError,
  onValidateFix,
  onRequestIndexing,
}: CrawlErrorReportsProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [errorTypeFilter, setErrorTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const tabs = [
    { id: 'crawl', content: `Crawl Errors (${crawlErrors.length})`, panelID: 'crawl-panel' },
    { id: 'indexing', content: `Indexing (${indexingIssues.length})`, panelID: 'indexing-panel' },
    { id: 'mobile', content: `Mobile Usability (${mobileUsabilityIssues.length})`, panelID: 'mobile-panel' },
    { id: 'sitemap', content: `Sitemap (${sitemapIssues.length})`, panelID: 'sitemap-panel' },
  ];

  // Calculate statistics
  const criticalErrors = crawlErrors.filter((e) => e.errorType === 'not_found' || e.errorType === 'server_error').length;
  const excludedPages = indexingIssues.filter((i) => i.status === 'excluded').length;
  const validPages = indexingIssues.filter((i) => i.status === 'valid').length;
  const mobileErrors = mobileUsabilityIssues.filter((i) => i.severity === 'error').length;

  // Filter crawl errors
  const filteredCrawlErrors = crawlErrors.filter((error) => {
    if (errorTypeFilter !== 'all' && error.errorType !== errorTypeFilter) {
      return false;
    }
    return true;
  });

  // Filter indexing issues
  const filteredIndexingIssues = indexingIssues.filter((issue) => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getErrorTypeBadge = (type: string) => {
    switch (type) {
      case 'not_found':
        return <Badge tone="critical">404 Not Found</Badge>;
      case 'server_error':
        return <Badge tone="critical">Server Error</Badge>;
      case 'soft_404':
        return <Badge tone="warning">Soft 404</Badge>;
      case 'access_denied':
        return <Badge tone="warning">Access Denied</Badge>;
      case 'redirect':
        return <Badge tone="info">Redirect</Badge>;
      default:
        return <Badge>Other</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge tone="success">Valid</Badge>;
      case 'excluded':
        return <Badge tone="warning">Excluded</Badge>;
      case 'error':
        return <Badge tone="critical">Error</Badge>;
      case 'warning':
        return <Badge tone="attention">Warning</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Crawl errors table
  const crawlErrorRows = filteredCrawlErrors.map((error) => [
    <div style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {error.url}
      </Text>
    </div>,
    getErrorTypeBadge(error.errorType),
    <Badge tone="critical">{`HTTP ${error.httpStatus}`}</Badge>,
    <Badge tone="info">{error.platform}</Badge>,
    new Date(error.firstDetected).toLocaleDateString(),
    new Date(error.lastCrawled).toLocaleDateString(),
    onFixError && (
      <Button size="slim" onClick={() => onFixError(error.id)}>
        Fix
      </Button>
    ),
  ]);

  // Indexing issues table
  const indexingIssueRows = filteredIndexingIssues.map((issue) => [
    <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {issue.url}
      </Text>
    </div>,
    getStatusBadge(issue.status),
    <div style={{ maxWidth: '250px' }}>
      <Text as="span" variant="bodySm">
        {issue.reason}
      </Text>
    </div>,
    <Badge>{issue.coverage}</Badge>,
    issue.lastCrawled ? new Date(issue.lastCrawled).toLocaleDateString() : '-',
    <InlineStack gap="100">
      {onRequestIndexing && issue.status === 'excluded' && (
        <Button size="slim" onClick={() => onRequestIndexing(issue.url)}>
          Request Indexing
        </Button>
      )}
      {onValidateFix && (
        <Button size="slim" onClick={() => onValidateFix(issue.id)}>
          Validate Fix
        </Button>
      )}
    </InlineStack>,
  ]);

  // Mobile usability issues table
  const mobileIssueRows = mobileUsabilityIssues.map((issue) => [
    issue.issueType,
    <Badge tone={issue.severity === 'error' ? 'critical' : 'warning'}>
      {issue.severity}
    </Badge>,
    issue.affectedPages.toLocaleString(),
    new Date(issue.lastDetected).toLocaleDateString(),
    onValidateFix && (
      <Button size="slim" onClick={() => onValidateFix(issue.id)}>
        View Details
      </Button>
    ),
  ]);

  // Sitemap issues table
  const sitemapIssueRows = sitemapIssues.map((issue) => [
    <a href={issue.sitemapUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a0dab' }}>
      {issue.sitemapUrl}
    </a>,
    issue.issueType,
    issue.affectedUrls.toLocaleString(),
    new Date(issue.lastChecked).toLocaleDateString(),
    <Button size="slim">View Sitemap</Button>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Crawl & Indexing Reports
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Monitor crawl errors, indexing issues, and technical problems from Google Search Console
            </Text>
          </div>
          {onRefresh && (
            <Button icon={RefreshIcon} onClick={onRefresh}>
              Refresh Data
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Statistics */}
      <InlineStack gap="400" wrap>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={AlertTriangleIcon} tone="critical" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Critical Errors
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {criticalErrors}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={CheckIcon} tone="success" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Valid Pages
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {validPages}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={BugIcon} tone="warning" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Excluded Pages
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {excludedPages}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={MobileIcon} tone="critical" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Mobile Errors
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {mobileErrors}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Crawl Errors Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Crawl Errors
                  </Text>
                  <div style={{ width: '200px' }}>
                    <Select
                      label=""
                      labelHidden
                      options={[
                        { label: 'All Errors', value: 'all' },
                        { label: '404 Not Found', value: 'not_found' },
                        { label: 'Server Errors', value: 'server_error' },
                        { label: 'Soft 404', value: 'soft_404' },
                        { label: 'Access Denied', value: 'access_denied' },
                        { label: 'Redirects', value: 'redirect' },
                      ]}
                      value={errorTypeFilter}
                      onChange={setErrorTypeFilter}
                    />
                  </div>
                </InlineStack>

                {filteredCrawlErrors.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['URL', 'Error Type', 'HTTP Status', 'Platform', 'First Detected', 'Last Crawled', 'Action']}
                    rows={crawlErrorRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={CheckIcon} tone="success" />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No crawl errors!
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Google can successfully crawl all your pages
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Indexing Issues Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Indexing Status
                  </Text>
                  <div style={{ width: '200px' }}>
                    <Select
                      label=""
                      labelHidden
                      options={[
                        { label: 'All Pages', value: 'all' },
                        { label: 'Valid', value: 'valid' },
                        { label: 'Excluded', value: 'excluded' },
                        { label: 'Errors', value: 'error' },
                        { label: 'Warnings', value: 'warning' },
                      ]}
                      value={statusFilter}
                      onChange={setStatusFilter}
                    />
                  </div>
                </InlineStack>

                {filteredIndexingIssues.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['URL', 'Status', 'Reason', 'Coverage', 'Last Crawled', 'Actions']}
                    rows={indexingIssueRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No indexing issues found
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Mobile Usability Tab */}
            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Mobile Usability Issues
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Problems affecting mobile user experience
                </Text>

                {mobileUsabilityIssues.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                    headings={['Issue Type', 'Severity', 'Affected Pages', 'Last Detected', 'Actions']}
                    rows={mobileIssueRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={MobileIcon} tone="success" />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No mobile usability issues!
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Your site is mobile-friendly
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Sitemap Issues Tab */}
            {selectedTab === 3 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Sitemap Issues
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Problems detected in your XML sitemaps
                </Text>

                {sitemapIssues.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                    headings={['Sitemap URL', 'Issue Type', 'Affected URLs', 'Last Checked', 'Actions']}
                    rows={sitemapIssueRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={CheckIcon} tone="success" />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No sitemap issues!
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      All sitemaps are properly formatted and accessible
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Common Issues Guide */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Common Issues & Fixes
          </Text>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <BlockStack gap="200">
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  404 Not Found
                </Text>
                <Text as="p" variant="bodySm">
                  • Create a 301 redirect to the correct page
                  <br />• Update internal links pointing to this URL
                  <br />• Remove URL from sitemap if intentionally deleted
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  Excluded by robots.txt
                </Text>
                <Text as="p" variant="bodySm">
                  • Check your robots.txt file
                  <br />• Remove disallow directive if page should be crawled
                  <br />• Use "Request Indexing" after fixing
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  Soft 404
                </Text>
                <Text as="p" variant="bodySm">
                  • Return proper 404 status code for missing pages
                  <br />• Add substantial content if page should exist
                  <br />• Set up proper 404 page template
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  Mobile Usability
                </Text>
                <Text as="p" variant="bodySm">
                  • Ensure text is readable without zooming
                  <br />• Make clickable elements appropriately sized
                  <br />• Avoid horizontal scrolling
                  <br />• Use responsive design
                </Text>
              </div>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>

      {/* Integration Note */}
      {crawlErrors.length === 0 && indexingIssues.length === 0 && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              Connect Google Search Console
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              To see crawl errors and indexing data, connect your Google Search Console account.
              This will give you insights into how Google crawls and indexes your site.
            </Text>
            <InlineStack>
              <Button variant="primary">Connect Google Search Console</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
