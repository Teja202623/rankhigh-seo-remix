import { json, type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigate, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { canPerformAction, incrementUsage } from "~/services/usage.server";
import prisma from "~/db.server";
import { Page, Layout, Card, BlockStack, Text, TextField, Button, Banner, InlineStack } from "@shopify/polaris";
import { useState } from "react";

interface LoaderData {
  storeId: string;
  quotaStatus: {
    remaining: number;
    limit: number;
    used: number;
  };
}

interface ActionData {
  error?: string;
  success?: boolean;
  auditId?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  // Get current audit quota
  const usageTracking = await prisma.usageTracking.findUnique({
    where: { storeId: store.id },
  });

  const used = usageTracking?.auditRunsToday || 0;
  const limit = 10;
  const remaining = Math.max(0, limit - used);

  return json<LoaderData>({
    storeId: store.id,
    quotaStatus: {
      remaining,
      limit,
      used,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const url = formData.get("url") as string;

  if (!url) {
    return json<ActionData>(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return json<ActionData>(
      { error: "Invalid URL format" },
      { status: 400 }
    );
  }

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  // Check quota
  const canAudit = await canPerformAction(store.id, "auditRuns", 1);
  
  if (!canAudit.allowed) {
    return json<ActionData>(
      {
        error: `You've reached your daily audit limit (${canAudit.limit} per day). Your quota resets at midnight UTC.`,
      },
      { status: 429 }
    );
  }

  // Create audit record
  const audit = await prisma.audit.create({
    data: {
      storeId: store.id,
      url,
      status: "PENDING",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Increment usage
  await incrementUsage(store.id, "auditRuns", 1);

  // Redirect to progress page
  return redirect(`/app/audits/${audit.id}`);
}

export default function AuditsPage() {
  const { storeId, quotaStatus } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quotaPercentage = (quotaStatus.used / quotaStatus.limit) * 100;
  const canRunAudit = quotaStatus.remaining > 0;

  return (
    <Page
      title="Run SEO Audit"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Quota Status */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Your Audit Quota
                </Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Audits remaining today
                    </Text>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {quotaStatus.remaining} / {quotaStatus.limit}
                    </Text>
                  </BlockStack>
                  <div style={{ width: '200px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: quotaPercentage >= 80 ? '#ef4444' : quotaPercentage >= 50 ? '#f59e0b' : '#10b981',
                        width: `${quotaPercentage}%`,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </BlockStack>
            </Card>

            {/* Error Banner */}
            {actionData?.error && (
              <Banner tone="critical">
                <Text as="p">{actionData.error}</Text>
              </Banner>
            )}

            {/* Audit Form */}
            <Card>
              <Form method="post">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Start New Audit
                  </Text>

                  {!canRunAudit && (
                    <Banner tone="warning">
                      <Text as="p">
                        You've reached your daily audit limit. Quotas reset at midnight UTC. Upgrade to PRO for unlimited audits.
                      </Text>
                    </Banner>
                  )}

                  <TextField
                    name="url"
                    label="Website URL"
                    placeholder="https://example.com"
                    value={url}
                    onChange={setUrl}
                    disabled={!canRunAudit}
                    helpText="Enter the full URL of the page to audit"
                    autoComplete="off"
                  />

                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      submit
                      disabled={!canRunAudit || !url}
                      loading={isSubmitting}
                    >
                      Run Audit
                    </Button>
                    <Button
                      onClick={() => navigate("/app")}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Form>
            </Card>

            {/* Info Card */}
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  What gets audited?
                </Text>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm">
                    ✓ SEO metadata (title, description, keywords)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Technical SEO (SSL, robots.txt, sitemap)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Performance metrics (page speed, mobile-friendliness)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Content quality (headings, links, structure)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Accessibility (alt tags, ARIA labels)
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
