import {
  Card,
  Text,
  BlockStack,
  DataTable,
  Button,
  InlineStack,
  Badge,
  Icon,
  Banner,
} from '@shopify/polaris';
import { LinkIcon, AlertTriangleIcon, CheckCircleIcon } from '@shopify/polaris-icons';

export interface OrphanedPage {
  id: string;
  url: string;
  title: string;
  type: string;
  lastModified: string;
}

export interface LinkOpportunity {
  id: string;
  sourcePage: string;
  targetPage: string;
  anchorText: string;
  context: string;
  relevanceScore: number;
  reason: string;
}

export interface InternalLinkStats {
  totalPages: number;
  orphanedPages: number;
  averageLinksPerPage: number;
  pagesWithFewLinks: number;
}

interface InternalLinkingSuggestionsProps {
  stats: InternalLinkStats;
  orphanedPages: OrphanedPage[];
  linkOpportunities: LinkOpportunity[];
  onApplyLink?: (opportunityId: string) => void;
  onRefresh?: () => void;
}

export default function InternalLinkingSuggestions({
  stats,
  orphanedPages,
  linkOpportunities,
  onApplyLink,
  onRefresh,
}: InternalLinkingSuggestionsProps) {
  const getRelevanceBadge = (score: number) => {
    if (score >= 80) return <Badge tone="success">High</Badge>;
    if (score >= 60) return <Badge tone="warning">Medium</Badge>;
    return <Badge tone="attention">Low</Badge>;
  };

  // Orphaned Pages Table
  const orphanedRows = orphanedPages.map((page) => [
    <div style={{ maxWidth: '250px' }}>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {page.title}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {page.url}
      </Text>
    </div>,
    <Badge>{page.type}</Badge>,
    new Date(page.lastModified).toLocaleDateString(),
    <Badge tone="critical">0 Internal Links</Badge>,
  ]);

  // Link Opportunities Table
  const opportunityRows = linkOpportunities.map((opp) => [
    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodySm">
        {opp.sourcePage}
      </Text>
    </div>,
    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodySm">
        {opp.targetPage}
      </Text>
    </div>,
    <div style={{ maxWidth: '150px' }}>
      <Text as="span" variant="bodySm" fontWeight="semibold">
        "{opp.anchorText}"
      </Text>
    </div>,
    getRelevanceBadge(opp.relevanceScore),
    <div style={{ maxWidth: '250px' }}>
      <Text as="span" variant="bodySm" tone="subdued">
        ...{opp.context}...
      </Text>
    </div>,
    onApplyLink && (
      <Button size="slim" onClick={() => onApplyLink(opp.id)}>
        Apply
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
                Total Pages
              </Text>
              <Text as="p" variant="heading2xl">
                {stats.totalPages}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Orphaned Pages
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: stats.orphanedPages > 0 ? '#ef4444' : '#10b981' }}>
                  {stats.orphanedPages}
                </span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Avg. Links/Page
              </Text>
              <Text as="p" variant="heading2xl">
                {stats.averageLinksPerPage.toFixed(1)}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Under-Linked Pages
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: stats.pagesWithFewLinks > 0 ? '#f59e0b' : '#10b981' }}>
                  {stats.pagesWithFewLinks}
                </span>
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Orphaned Pages */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <InlineStack gap="200" blockAlign="center">
                <Icon source={AlertTriangleIcon} tone="critical" />
                <Text as="h2" variant="headingMd">
                  Orphaned Pages
                </Text>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Pages with no internal links pointing to them
              </Text>
            </div>
            {onRefresh && <Button onClick={onRefresh}>Refresh Analysis</Button>}
          </InlineStack>

          {orphanedPages.length > 0 ? (
            <>
              <Banner tone="critical">
                {orphanedPages.length} page{orphanedPages.length !== 1 ? 's have' : ' has'} no
                internal links. These pages are hard for search engines to discover.
              </Banner>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['Page', 'Type', 'Last Modified', 'Status']}
                rows={orphanedRows}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Icon source={CheckCircleIcon} tone="success" />
              <Text as="p" variant="headingMd" fontWeight="semibold">
                No orphaned pages!
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                All your pages have internal links.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Link Opportunities */}
      <Card>
        <BlockStack gap="400">
          <div>
            <InlineStack gap="200" blockAlign="center">
              <Icon source={LinkIcon} tone="info" />
              <Text as="h2" variant="headingMd">
                Link Opportunities
              </Text>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              AI-powered suggestions for contextual internal links
            </Text>
          </div>

          {linkOpportunities.length > 0 ? (
            <>
              <Banner tone="info">
                We found {linkOpportunities.length} opportunities to improve your internal linking
                structure.
              </Banner>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['From Page', 'To Page', 'Anchor Text', 'Relevance', 'Context', 'Actions']}
                rows={opportunityRows}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Text as="p" variant="bodyMd" tone="subdued">
                No link opportunities found. Your internal linking structure is well-optimized!
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Internal Linking Best Practices
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
                  <strong>Use descriptive anchor text:</strong> Avoid generic "click here" links
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Link to relevant content:</strong> Only link when it adds value
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Distribute link equity:</strong> Link from high-authority pages to newer content
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Avoid over-linking:</strong> 2-5 internal links per 1000 words is ideal
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Create topic clusters:</strong> Group related content with internal links
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Update old content:</strong> Add links to newer related pages
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
