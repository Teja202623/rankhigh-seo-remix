import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Banner,
  Text,
  InlineStack,
  Badge,
  List,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getStore } from "~/services/store.server";
import prisma from "~/db.server";

/**
 * GTM/GA4 Setup Helper Route (Tasks 63-67)
 *
 * Features:
 * - Save GTM Container ID
 * - Save GA4 Property ID
 * - Setup instructions
 * - Verification status
 * - Integration guide
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const store = await getStore(session.shop);

  if (!store) {
    throw new Error("Store not found");
  }

  return json({
    gtmId: store.gtmId || "",
    ga4Id: store.ga4Id || "",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const store = await getStore(session.shop);

  if (!store) {
    throw new Error("Store not found");
  }

  const formData = await request.formData();
  const gtmId = formData.get("gtmId") as string;
  const ga4Id = formData.get("ga4Id") as string;

  // Validate GTM ID format (GTM-XXXXXXX)
  if (gtmId && !gtmId.match(/^GTM-[A-Z0-9]+$/i)) {
    return json({
      success: false,
      error: "Invalid GTM Container ID format. Should be GTM-XXXXXXX",
    });
  }

  // Validate GA4 ID format (G-XXXXXXXXXX)
  if (ga4Id && !ga4Id.match(/^G-[A-Z0-9]+$/i)) {
    return json({
      success: false,
      error: "Invalid GA4 Measurement ID format. Should be G-XXXXXXXXXX",
    });
  }

  // Update store
  await prisma.store.update({
    where: { id: store.id },
    data: {
      gtmId: gtmId || null,
      ga4Id: ga4Id || null,
    },
  });

  return json({
    success: true,
    message: "Tracking IDs saved successfully!",
  });
}

export default function GTMSetup() {
  const { gtmId, ga4Id } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const hasGTM = Boolean(gtmId);
  const hasGA4 = Boolean(ga4Id);

  return (
    <Page
      title="Analytics Setup"
      subtitle="Configure Google Tag Manager and Google Analytics 4"
      backAction={{ url: "/app" }}
    >
      <Layout>
        {/* Success/Error Messages */}
        {actionData?.success && 'message' in actionData && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => {}}>
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        {actionData && 'error' in actionData && (
          <Layout.Section>
            <Banner tone="critical">{actionData.error}</Banner>
          </Layout.Section>
        )}

        {/* Status Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Integration Status
              </Text>

              <InlineStack gap="300">
                <Badge tone={hasGTM ? "success" : "attention"}>
                  {`GTM: ${hasGTM ? "Connected" : "Not Connected"}`}
                </Badge>
                <Badge tone={hasGA4 ? "success" : "attention"}>
                  {`GA4: ${hasGA4 ? "Connected" : "Not Connected"}`}
                </Badge>
              </InlineStack>

              {!hasGTM && !hasGA4 && (
                <Banner tone="info">
                  <Text variant="bodyMd" as="p">
                    Set up Google Tag Manager and GA4 to track visitor behavior, conversions, and SEO performance.
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Configuration Form */}
        <Layout.Section>
          <Form method="post">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Tracking Configuration
                </Text>

                <TextField
                  label="Google Tag Manager Container ID"
                  name="gtmId"
                  value={gtmId}
                  onChange={() => {}}
                  placeholder="GTM-XXXXXXX"
                  helpText="Found in your GTM account (format: GTM-XXXXXXX)"
                  autoComplete="off"
                />

                <TextField
                  label="Google Analytics 4 Measurement ID"
                  name="ga4Id"
                  value={ga4Id}
                  onChange={() => {}}
                  placeholder="G-XXXXXXXXXX"
                  helpText="Found in your GA4 property settings (format: G-XXXXXXXXXX)"
                  autoComplete="off"
                />

                <InlineStack gap="300">
                  <Button submit variant="primary" loading={isSubmitting}>
                    Save Configuration
                  </Button>
                  {(hasGTM || hasGA4) && (
                    <Button
                      url="/app"
                    >
                      Back to Dashboard
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>

        {/* Setup Instructions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Setup Instructions
              </Text>

              <Divider />

              {/* GTM Instructions */}
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  1. Google Tag Manager Setup
                </Text>
                <List type="number">
                  <List.Item>
                    Go to{" "}
                    <a
                      href="https://tagmanager.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0070F3", textDecoration: "underline" }}
                    >
                      Google Tag Manager
                    </a>
                  </List.Item>
                  <List.Item>Create a new container or select an existing one</List.Item>
                  <List.Item>
                    Copy your Container ID (format: GTM-XXXXXXX) from the top right
                  </List.Item>
                  <List.Item>Paste it into the field above and save</List.Item>
                  <List.Item>
                    Add the GTM code snippet to your Shopify theme (in theme.liquid, before
                    closing head tag)
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              {/* GA4 Instructions */}
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  2. Google Analytics 4 Setup
                </Text>
                <List type="number">
                  <List.Item>
                    Go to{" "}
                    <a
                      href="https://analytics.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0070F3", textDecoration: "underline" }}
                    >
                      Google Analytics
                    </a>
                  </List.Item>
                  <List.Item>Create a GA4 property or select an existing one</List.Item>
                  <List.Item>
                    Go to Admin → Data Streams → Web stream
                  </List.Item>
                  <List.Item>
                    Copy your Measurement ID (format: G-XXXXXXXXXX)
                  </List.Item>
                  <List.Item>Paste it into the field above and save</List.Item>
                  <List.Item>
                    Add GA4 as a tag in GTM, or add the gtag.js code directly to your theme
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              {/* Benefits */}
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  Why Set This Up?
                </Text>
                <List>
                  <List.Item>
                    <strong>Track SEO Performance:</strong> See which keywords and pages drive traffic
                  </List.Item>
                  <List.Item>
                    <strong>Measure Conversions:</strong> Track sales and revenue from organic search
                  </List.Item>
                  <List.Item>
                    <strong>Understand User Behavior:</strong> See how visitors navigate your site
                  </List.Item>
                  <List.Item>
                    <strong>Optimize Marketing:</strong> Make data-driven decisions to improve ROI
                  </List.Item>
                </List>
              </BlockStack>

              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    💡 Pro Tip
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Use GTM to manage all your tracking codes in one place. You can add GA4, Facebook
                    Pixel, and other tags without editing your theme code.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* FREE Tier Note */}
        <Layout.Section>
          <Banner tone="info">
            <Text variant="bodyMd" as="p">
              <strong>FREE Tier:</strong> This feature stores your tracking IDs for reference. For
              automated tracking setup, upgrade to a paid plan.
            </Text>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
