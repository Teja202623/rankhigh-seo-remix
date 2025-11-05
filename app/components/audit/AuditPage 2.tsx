import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Badge,
  DataTable,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
} from '@shopify/polaris';
import type { AuditRun, SEOIssue } from '~/types';

// TODO: Refactor to use Remix loader/action instead of React Query
export default function AuditPage() {
  const [selectedAudit, setSelectedAudit] = useState<string | null>(null);

  // Stub data - replace with Remix loader
  const auditsLoading = false;
  const issuesLoading = false;
  const audits: AuditRun[] = [];
  const issues: SEOIssue[] = [];
  const latestAudit = audits[0];

  const issueRows = issues.map((issue) => [
    <Badge
      tone={
        issue.severity === 'critical'
          ? 'critical'
          : issue.severity === 'high'
          ? 'warning'
          : issue.severity === 'medium'
          ? 'attention'
          : 'info'
      }
    >
      {issue.severity}
    </Badge>,
    issue.title,
    issue.description,
    issue.page?.handle || '-',
    issue.canAutoFix ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>,
  ]);

  return (
    <Page
      title="SEO Audits"
      primaryAction={{
        content: 'Run New Audit',
        onAction: () => console.log('TODO: Implement with Remix action'),
      }}
      backAction={{ onAction: () => window.history.back() }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Latest Audit Summary */}
            {latestAudit && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Latest Audit Results
                  </Text>
                  <InlineStack gap="400" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Status
                          </Text>
                          <Badge
                            tone={
                              latestAudit.status === 'COMPLETED'
                                ? 'success'
                                : latestAudit.status === 'RUNNING'
                                ? 'info'
                                : 'attention'
                            }
                          >
                            {latestAudit.status}
                          </Badge>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Critical
                          </Text>
                          <Text as="p" variant="headingLg">
                            {latestAudit.criticalIssues}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            High
                          </Text>
                          <Text as="p" variant="headingLg">
                            {latestAudit.highIssues}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Medium
                          </Text>
                          <Text as="p" variant="headingLg">
                            {latestAudit.mediumIssues}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

            {/* Issues Table */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  SEO Issues
                </Text>
                {issuesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Spinner size="large" />
                  </div>
                ) : issues.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Severity', 'Issue', 'Description', 'Page', 'Auto-Fix']}
                    rows={issueRows}
                  />
                ) : (
                  <Text as="p" tone="subdued">
                    No issues found. Great job!
                  </Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
