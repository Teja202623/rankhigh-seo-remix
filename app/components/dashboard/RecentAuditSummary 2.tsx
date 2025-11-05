// app/components/dashboard/RecentAuditSummary.tsx
// Recent Audit Summary (Task 60)

import { Card, BlockStack, Text, Badge, Button, InlineStack, EmptyState } from "@shopify/polaris";

interface AuditSummaryData {
  id: string;
  score: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  completedAt: Date;
  urlsScanned: number;
}

interface RecentAuditSummaryProps {
  audit: AuditSummaryData | null;
}

export function RecentAuditSummary({ audit }: RecentAuditSummaryProps) {
  const getScoreTone = (score: number): "critical" | "warning" | "success" => {
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "critical";
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!audit) {
    return (
      <Card>
        <EmptyState
          heading="No audit available"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text variant="bodyMd" as="p" tone="subdued">
            Run your first SEO audit to see results here
          </Text>
          <div style={{ marginTop: "16px" }}>
            <Button url="/app/seo/audit" variant="primary">
              Run Audit Now
            </Button>
          </div>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header with score */}
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">
            Latest Audit
          </Text>
          <Badge tone={getScoreTone(audit.score)} size="large">
            {`${audit.score}/100`}
          </Badge>
        </InlineStack>

        {/* Audit metadata */}
        <Text variant="bodyMd" as="p" tone="subdued">
          Scanned {audit.urlsScanned} page{audit.urlsScanned !== 1 ? "s" : ""} •{" "}
          {formatDate(audit.completedAt)}
        </Text>

        {/* Issue counts */}
        {audit.totalIssues > 0 ? (
          <BlockStack gap="200">
            <Text variant="bodySm" as="p" tone="subdued">
              Issues found:
            </Text>
            <InlineStack gap="200" wrap>
              {audit.criticalCount > 0 && (
                <Badge tone="critical">
                  {`${audit.criticalCount} Critical`}
                </Badge>
              )}
              {audit.highCount > 0 && (
                <Badge tone="warning">
                  {`${audit.highCount} High`}
                </Badge>
              )}
              {audit.mediumCount > 0 && (
                <Badge tone="attention">
                  {`${audit.mediumCount} Medium`}
                </Badge>
              )}
              {audit.lowCount > 0 && (
                <Badge>
                  {`${audit.lowCount} Low`}
                </Badge>
              )}
            </InlineStack>
          </BlockStack>
        ) : (
          <Badge tone="success" size="large">
            No issues found!
          </Badge>
        )}

        {/* Action buttons */}
        <InlineStack gap="300">
          <Button url="/app/seo/audit" variant="primary">
            View Full Report
          </Button>
          <Button url="/app/seo/audit/history">
            View History
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
