// app/routes/app.seo.audit.history.tsx
/**
 * SEO Audit History Page
 *
 * Displays historical audit data with:
 * - Last 30 days of audits (FREE tier limit)
 * - Audit status, score, and issue counts
 * - Trend visualization
 * - Compare audits functionality
 * - Click to view detailed results
 */

import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  IndexTable,
  EmptyState,
  BlockStack,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ====================
// LOADER
// ====================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get store
  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    return json({ audits: [], chartData: null });
  }

  // Get audits from last 30 days (FREE tier limit)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const audits = await prisma.audit.findMany({
    where: {
      storeId: store.id,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Prepare chart data (score over time)
  const completedAudits = audits
    .filter((a: any) => a.status === "COMPLETED" && a.overallScore !== null)
    .reverse(); // Chronological order for chart

  const chartData = {
    labels: completedAudits.map((a: any) =>
      new Date(a.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "SEO Score",
        data: completedAudits.map((a: any) => a.overallScore as number),
        borderColor: "rgb(0, 128, 96)",
        backgroundColor: "rgba(0, 128, 96, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Calculate audit duration
  const auditsWithDuration = audits.map((audit: any) => {
    let duration = null;

    if (audit.startedAt && audit.completedAt) {
      const durationMs =
        audit.completedAt.getTime() - audit.startedAt.getTime();
      duration = Math.round(durationMs / 1000); // Convert to seconds
    }

    return {
      ...audit,
      duration,
    };
  });

  return json({
    audits: auditsWithDuration,
    chartData: completedAudits.length > 0 ? chartData : null,
  });
};

// ====================
// COMPONENT
// ====================

export default function AuditHistoryPage() {
  const { audits, chartData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge tone="success">Completed</Badge>;
      case "RUNNING":
        return <Badge tone="info">Running</Badge>;
      case "PENDING":
        return <Badge tone="attention">Pending</Badge>;
      case "FAILED":
        return <Badge tone="critical">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Score color
  const getScoreColor = (score: number | null): "success" | "critical" | "subdued" => {
    if (!score) return "subdued";
    if (score >= 80) return "success";
    return "critical";
  };

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "SEO Score Trend (Last 30 Days)",
        font: {
          size: 16,
          weight: 600,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}`,
        },
      },
    },
  };

  // ====================
  // RENDER
  // ====================

  return (
    <Page
      title="Audit History"
      subtitle="View past SEO audits and track your progress"
      backAction={{ content: "Back", onAction: () => navigate("/app/seo/audit") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Trend Chart */}
            {chartData && chartData.labels.length > 0 && (
              <Card>
                <Box padding="400">
                  <div style={{ height: "300px" }}>
                    <Line data={chartData as any} options={chartOptions} />
                  </div>
                </Box>
              </Card>
            )}

            {/* History Table */}
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "audit", plural: "audits" }}
                itemCount={audits.length}
                headings={[
                  { title: "Date" },
                  { title: "Status" },
                  { title: "Score" },
                  { title: "Issues Found" },
                  { title: "Duration" },
                  { title: "Breakdown" },
                ]}
                selectable={false}
              >
                {audits.map((audit: any, index: number) => {
                  const totalIssues =
                    audit.criticalIssues +
                    audit.highIssues +
                    audit.mediumIssues +
                    audit.lowIssues;

                  return (
                    <IndexTable.Row
                      id={audit.id}
                      key={audit.id}
                      position={index}
                      onClick={() => {
                        if (audit.status === "COMPLETED") {
                          navigate(`/app/seo/audit?auditId=${audit.id}`);
                        }
                      }}
                    >
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {new Date(audit.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        <br />
                        <Text as="span" variant="bodySm" tone="subdued">
                          {new Date(audit.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        {getStatusBadge(audit.status)}
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        {audit.overallScore !== null ? (
                          <Text
                            as="span"
                            variant="headingMd"
                            tone={getScoreColor(audit.overallScore)}
                          >
                            {audit.overallScore}/100
                          </Text>
                        ) : (
                          <Text as="span" variant="bodyMd" tone="subdued">
                            —
                          </Text>
                        )}
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        {audit.status === "COMPLETED" ? (
                          <Text as="span" variant="bodyMd">
                            {totalIssues}
                          </Text>
                        ) : (
                          <Text as="span" variant="bodyMd" tone="subdued">
                            —
                          </Text>
                        )}
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {formatDuration(audit.duration)}
                        </Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        {audit.status === "COMPLETED" ? (
                          <InlineStack gap="200">
                            {audit.criticalIssues > 0 && (
                              <Badge tone="critical">{`Critical: ${audit.criticalIssues}`}</Badge>
                            )}
                            {audit.highIssues > 0 && (
                              <Badge>{`High: ${audit.highIssues}`}</Badge>
                            )}
                            {audit.mediumIssues > 0 && (
                              <Badge>{`Medium: ${audit.mediumIssues}`}</Badge>
                            )}
                            {audit.lowIssues > 0 && (
                              <Badge>{`Low: ${audit.lowIssues}`}</Badge>
                            )}
                            {totalIssues === 0 && (
                              <Badge tone="success">No issues</Badge>
                            )}
                          </InlineStack>
                        ) : (
                          <Text as="span" variant="bodyMd" tone="subdued">
                            —
                          </Text>
                        )}
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>

              {audits.length === 0 && (
                <Box padding="600">
                  <EmptyState
                    heading="No audit history"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Run your first audit to start tracking your SEO progress
                      over time.
                    </p>
                  </EmptyState>
                </Box>
              )}
            </Card>

            {/* FREE Tier Notice */}
            {audits.length > 0 && (
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    FREE Tier Limits
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    History is limited to the last 30 days on the FREE plan.
                    Upgrade to PRO for unlimited history and advanced analytics.
                  </Text>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
