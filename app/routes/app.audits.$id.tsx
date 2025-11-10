import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "~/db.server";
import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Badge } from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";

interface AuditData {
  id: string;
  url: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  score: number | null;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const auditId = params.id;

  if (!auditId) {
    throw new Response("Audit ID not provided", { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit || audit.storeId !== store.id) {
    throw new Response("Audit not found", { status: 404 });
  }

  return json({
    audit: {
      id: audit.id,
      url: audit.url,
      status: audit.status,
      progress: audit.progress || 0,
      createdAt: audit.createdAt.toISOString(),
      updatedAt: audit.updatedAt.toISOString(),
      criticalIssues: audit.criticalIssues || 0,
      highIssues: audit.highIssues || 0,
      mediumIssues: audit.mediumIssues || 0,
      lowIssues: audit.lowIssues || 0,
      score: audit.score || 0,
    } as AuditData,
  });
}

export default function AuditProgressPage() {
  const { audit: initialAudit } = useLoaderData<{ audit: AuditData }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditData>(initialAudit);

  // Simulate audit progress
  useEffect(() => {
    if (audit.status === "PENDING" || audit.status === "RUNNING") {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/app/audits/${audit.id}/api`);
          const data = await response.json();
          setAudit(data.audit);
        } catch (error) {
          console.error("Failed to fetch audit status:", error);
        }
      }, 2000); // Refresh every 2 seconds

      return () => clearInterval(interval);
    }
  }, [audit.id, audit.status]);

  const isComplete = audit.status === "COMPLETED" || audit.status === "FAILED";
  const totalIssues = audit.criticalIssues + audit.highIssues + audit.mediumIssues + audit.lowIssues;

  const getStatusColor = (status: string): "critical" | "warning" | "success" | "info" => {
    if (status === "COMPLETED") return "success";
    if (status === "FAILED") return "critical";
    if (status === "RUNNING") return "warning";
    return "info";
  };

  const getStatusText = (status: string): string => {
    if (status === "PENDING") return "Starting...";
    if (status === "RUNNING") return "Analyzing...";
    if (status === "COMPLETED") return "Complete";
    return "Failed";
  };

  return (
    <Page
      title="Audit Progress"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Status Card */}
            <Card>
              <BlockStack gap="400">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Audit Status
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {audit.url}
                    </Text>
                  </BlockStack>
                  <Badge tone={getStatusColor(audit.status)}>
                    {getStatusText(audit.status)}
                  </Badge>
                </div>

                {/* Progress Bar */}
                {!isComplete && (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Progress: {audit.progress}%
                    </Text>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: '#3b82f6',
                          width: `${audit.progress}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            {/* Results - Show when complete */}
            {isComplete && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Audit Results
                  </Text>

                  {/* Score */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Overall SEO Score
                    </Text>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {audit.score}/100
                    </Text>
                  </div>

                  {/* Issues Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                  }}>
                    <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', textAlign: 'center' }}>
                      <Text as="p" variant="bodySm">
                        Critical
                      </Text>
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {audit.criticalIssues}
                      </Text>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                      <Text as="p" variant="bodySm">
                        High
                      </Text>
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {audit.highIssues}
                      </Text>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', textAlign: 'center' }}>
                      <Text as="p" variant="bodySm">
                        Medium
                      </Text>
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {audit.mediumIssues}
                      </Text>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center' }}>
                      <Text as="p" variant="bodySm">
                        Low
                      </Text>
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {audit.lowIssues}
                      </Text>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
                    <Text as="p" variant="bodySm">
                      Total Issues Found: <strong>{totalIssues}</strong>
                    </Text>
                  </div>
                </BlockStack>
              </Card>
            )}

            {/* Loading Message */}
            {!isComplete && (
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="start" gap="300">
                    <CheckCircleIcon />
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        Audit in progress...
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        We're analyzing your website. This typically takes 30-60 seconds.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

            {/* Action Buttons */}
            <InlineStack gap="300">
              {isComplete && (
                <Button
                  variant="primary"
                  onClick={() => navigate("/app")}
                >
                  Back to Dashboard
                </Button>
              )}
              {!isComplete && (
                <Button
                  disabled
                >
                  Auditing...
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
