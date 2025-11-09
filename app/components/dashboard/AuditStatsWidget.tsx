/**
 * AuditStatsWidget Component
 *
 * Displays key statistics from the latest SEO audit
 * - SEO score with trend
 * - Critical issues count
 * - Pages analyzed
 * - Last audit date
 *
 * Used in Dashboard and can be embedded in other pages
 */

import { Card, BlockStack, InlineStack, Text, Badge, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export interface AuditData {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt?: string;
  totalUrls: number;
  completed: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  score?: number;
  previousScore?: number;
}

interface AuditStatsWidgetProps {
  audit: AuditData | null;
  isLoading?: boolean;
  onRunAudit?: () => void;
}

export function AuditStatsWidget({ audit, isLoading = false, onRunAudit }: AuditStatsWidgetProps) {
  const navigate = useNavigate();

  if (!audit) {
    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Latest Audit
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            No audits yet. Run your first audit to get SEO insights and identify improvement opportunities.
          </Text>
          <Button
            variant="primary"
            onClick={onRunAudit || (() => navigate("/audits"))}
          >
            Run SEO Audit
          </Button>
        </BlockStack>
      </Card>
    );
  }

  const totalIssues =
    (audit.criticalIssues || 0) +
    (audit.highIssues || 0) +
    (audit.mediumIssues || 0) +
    (audit.lowIssues || 0);

  const isInProgress = audit.status === "RUNNING" || audit.status === "PENDING";
  const isFailed = audit.status === "FAILED";
  const isCompleted = audit.status === "COMPLETED";

  const completedDate = audit.completedAt
    ? new Date(audit.completedAt).toLocaleDateString()
    : new Date(audit.createdAt).toLocaleDateString();

  // Calculate score trend
  const scoreImprovement =
    audit.score && audit.previousScore
      ? audit.score - audit.previousScore
      : null;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Latest Audit
          </Text>
          <Badge
            tone={
              isCompleted ? "success" : isInProgress ? "info" : isFailed ? "critical" : "warning"
            }
          >
            {audit.status}
          </Badge>
        </InlineStack>

        {isInProgress && (
          <Text as="p" variant="bodySm" tone="subdued">
            Audit in progress... {audit.completed} / {audit.totalUrls} pages analyzed
          </Text>
        )}

        {isFailed && (
          <Text as="p" variant="bodySm" tone="critical">
            Audit failed. Please try running again.
          </Text>
        )}

        {isCompleted && (
          <BlockStack gap="300">
            {/* Stats Grid */}
            <InlineStack gap="400" wrap={false}>
              {/* Critical Issues */}
              <div style={{ flex: 1 }}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Critical Issues
                  </Text>
                  <Text as="p" variant="heading2xl" tone={audit.criticalIssues > 0 ? "critical" : undefined}>
                    {audit.criticalIssues}
                  </Text>
                </BlockStack>
              </div>

              {/* High Issues */}
              <div style={{ flex: 1 }}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    High Issues
                  </Text>
                  <Text as="p" variant="heading2xl" tone={audit.highIssues > 0 ? "caution" : undefined}>
                    {audit.highIssues}
                  </Text>
                </BlockStack>
              </div>

              {/* Pages Analyzed */}
              <div style={{ flex: 1 }}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Pages Analyzed
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {audit.totalUrls}
                  </Text>
                </BlockStack>
              </div>

              {/* Total Issues */}
              <div style={{ flex: 1 }}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Total Issues
                  </Text>
                  <Text
                    as="p"
                    variant="heading2xl"
                    tone={totalIssues > 0 ? "critical" : undefined}
                  >
                    {totalIssues}
                  </Text>
                </BlockStack>
              </div>
            </InlineStack>

            {/* Score and Trend */}
            {audit.score !== undefined && (
              <Card background="bg-surface-secondary">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm" fontWeight="bold">
                      SEO Score
                    </Text>
                    {scoreImprovement !== null && (
                      <Text
                        as="p"
                        variant="bodySm"
                        tone={scoreImprovement > 0 ? "success" : scoreImprovement < 0 ? "critical" : undefined}
                      >
                        {scoreImprovement > 0 ? "+" : ""}{scoreImprovement} points
                      </Text>
                    )}
                  </InlineStack>
                  <Text as="p" variant="heading2xl">
                    {audit.score}/100
                  </Text>
                </BlockStack>
              </Card>
            )}

            {/* Metadata */}
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Completed: {completedDate}
              </Text>
            </BlockStack>

            {/* Action Buttons */}
            <InlineStack gap="200">
              <Button onClick={() => navigate("/audits")}>
                View Detailed Report
              </Button>
              {onRunAudit ? (
                <Button variant="primary" onClick={onRunAudit}>
                  Run New Audit
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => navigate("/audits")}
                >
                  Run New Audit
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
