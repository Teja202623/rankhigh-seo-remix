// app/routes/app.integrations.gsc.tsx
// Google Search Console Integration Dashboard (Task 56)

import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Banner,
  Badge,
  EmptyState,
  Spinner,
  Box,
  Divider,
} from "@shopify/polaris";
import { ExternalIcon, RefreshIcon } from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { GSCMetrics } from "~/components/gsc/GSCMetrics";
import { generateAuthUrl, disconnectGSC } from "~/services/gsc/gscAuth.server";
import { fetchAggregatedMetrics as getGSCMetrics } from "~/services/gsc/gscMetrics.server";
import { fetchTopQueries as getTopQueries } from "~/services/gsc/gscQueries.server";
import { fetchTopPages as getTopPages } from "~/services/gsc/gscPages.server";
import type {
  GSCConnectionStatus,
  GSCMetrics as GSCMetricsType,
  GSCQueryData,
  GSCPageData,
} from "~/types/gsc";

interface LoaderData {
  connectionStatus: GSCConnectionStatus;
  metrics: GSCMetricsType | null;
  topQueries: GSCQueryData[];
  topPages: GSCPageData[];
  authUrl?: string;
}

interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Loader: Fetch GSC connection status and data
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    // Get store from database
    const store = await prisma.store.findUnique({
      where: { shopUrl: session.shop },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Check connection status
    const connectionStatus: GSCConnectionStatus = {
      connected: store.gscConnected,
      propertyUrl: store.gscPropertyUrl,
      lastSync: store.gscLastSync,
      hasValidToken: Boolean(store.gscAccessToken && store.gscTokenExpiry && store.gscTokenExpiry > new Date()),
    };

    // If not connected, return early with auth URL
    if (!connectionStatus.connected) {
      const { url } = await generateAuthUrl(store.id);
      return json<LoaderData>({
        connectionStatus,
        metrics: null,
        topQueries: [],
        topPages: [],
        authUrl: url,
      });
    }

    // If connected, fetch data
    let metrics: GSCMetricsType | null = null;
    let topQueries: GSCQueryData[] = [];
    let topPages: GSCPageData[] = [];

    try {
      // Fetch all data in parallel
      [metrics, topQueries, topPages] = await Promise.all([
        getGSCMetrics(store.id),
        getTopQueries(store.id),
        getTopPages(store.id),
      ]);
    } catch (error) {
      console.error("Error fetching GSC data:", error);
      // Continue with null data - will show error in UI
    }

    return json<LoaderData>({
      connectionStatus,
      metrics,
      topQueries,
      topPages,
    });
  } catch (error) {
    console.error("GSC loader error:", error);
    return json<LoaderData>(
      {
        connectionStatus: {
          connected: false,
          propertyUrl: null,
          lastSync: null,
          hasValidToken: false,
        },
        metrics: null,
        topQueries: [],
        topPages: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Action: Handle disconnect and refresh actions
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    const store = await prisma.store.findUnique({
      where: { shopUrl: session.shop },
    });

    if (!store) {
      return json<ActionData>(
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    if (action === "disconnect") {
      await disconnectGSC(store.id);
      return json<ActionData>({
        success: true,
        message: "Disconnected from Google Search Console successfully",
      });
    }

    if (action === "refresh") {
      // Refresh data by refetching
      // The loader will handle fetching fresh data
      return json<ActionData>({
        success: true,
        message: "Data refreshed successfully",
      });
    }

    return json<ActionData>(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GSC action error:", error);
    return json<ActionData>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Google Search Console Dashboard Page
 */
export default function GSCIntegrationPage() {
  const loaderData = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isLoading = navigation.state !== "idle";
  const { connectionStatus, metrics, topQueries, topPages, authUrl } = loaderData;

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    if (confirm("Are you sure you want to disconnect from Google Search Console?")) {
      const formData = new FormData();
      formData.append("action", "disconnect");
      submit(formData, { method: "post" });
    }
  }, [submit]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "refresh");
    submit(formData, { method: "post", replace: true });
  }, [submit]);

  // Not Connected State
  if (!connectionStatus.connected) {
    return (
      <Page
        title="Google Search Console"
        subtitle="Connect your Google Search Console account to track search performance"
        backAction={{ content: "Dashboard", url: "/app" }}
      >
        <Layout>
          {actionData?.error && (
            <Layout.Section>
              <Banner tone="critical" title="Error">
                {actionData.error}
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <EmptyState
                  heading="Connect to Google Search Console"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <BlockStack gap="300">
                    <Text as="p">
                      Google Search Console helps you monitor and analyze your site's search
                      performance. Connect your account to:
                    </Text>
                    <Box as="ul" paddingInlineStart="400">
                      <li>View top search queries driving traffic to your store</li>
                      <li>Track click-through rates and average positions</li>
                      <li>Identify top-performing pages in search results</li>
                      <li>Monitor impressions and clicks over time</li>
                    </Box>
                    <Banner tone="info">
                      <Text as="p">
                        <strong>FREE Tier:</strong> Last 28 days of data, top 3 queries and pages
                      </Text>
                    </Banner>
                    {authUrl && (
                      <Button
                        variant="primary"
                        url={authUrl}
                        external
                        loading={isLoading}
                      >
                        Connect Google Search Console
                      </Button>
                    )}
                  </BlockStack>
                </EmptyState>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Setup Instructions
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <Text as="p" fontWeight="semibold">
                    Before connecting, make sure:
                  </Text>
                  <Box paddingInlineStart="400">
                    <ol>
                      <li>Your store is verified in Google Search Console</li>
                      <li>You have owner or full user access to the property</li>
                      <li>Your GSC account has at least 28 days of data</li>
                    </ol>
                  </Box>
                  <InlineStack gap="300">
                    <Button
                      url="https://search.google.com/search-console"
                      target="_blank"
                      icon={ExternalIcon}
                    >
                      Open Google Search Console
                    </Button>
                    <Button
                      url="https://support.google.com/webmasters/answer/9008080"
                      target="_blank"
                      icon={ExternalIcon}
                      variant="plain"
                    >
                      Verification Guide
                    </Button>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Connected State
  return (
    <Page
      title="Google Search Console"
      subtitle={connectionStatus.propertyUrl || "Connected"}
      backAction={{ content: "Dashboard", url: "/app" }}
      secondaryActions={[
        {
          content: "Refresh Data",
          icon: RefreshIcon,
          onAction: handleRefresh,
          loading: isLoading,
        },
        {
          content: "Disconnect",
          destructive: true,
          onAction: handleDisconnect,
        },
      ]}
    >
      <Layout>
        {actionData?.message && (
          <Layout.Section>
            <Banner
              tone={actionData.success ? "success" : "critical"}
              title={actionData.success ? "Success" : "Error"}
              onDismiss={() => {}}
            >
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Error">
              {actionData.error}
            </Banner>
          </Layout.Section>
        )}

        {/* Connection Info Banner */}
        <Layout.Section>
          <Banner tone="success">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="p" fontWeight="semibold">
                  Connected to Google Search Console
                </Text>
                {connectionStatus.lastSync && (
                  <Text as="p" tone="subdued">
                    Last synced: {new Date(connectionStatus.lastSync).toLocaleString()}
                  </Text>
                )}
              </BlockStack>
              <Badge tone="success">Active</Badge>
            </InlineStack>
          </Banner>
        </Layout.Section>

        {/* Metrics Display */}
        {metrics && topQueries && topPages ? (
          <Layout.Section>
            <GSCMetrics
              metrics={metrics}
              topQueries={topQueries}
              topPages={topPages}
              lastSync={connectionStatus.lastSync ? new Date(connectionStatus.lastSync) : null}
              propertyUrl={connectionStatus.propertyUrl || ""}
            />
          </Layout.Section>
        ) : (
          <Layout.Section>
            {isLoading ? (
              <Card>
                <Box padding="600">
                  <InlineStack align="center" blockAlign="center" gap="300">
                    <Spinner size="small" />
                    <Text as="p">Loading search performance data...</Text>
                  </InlineStack>
                </Box>
              </Card>
            ) : (
              <Banner tone="warning">
                <Text as="p">
                  No data available. This could mean your store doesn't have search traffic yet,
                  or there was an error fetching data. Try refreshing or check your Google Search
                  Console account.
                </Text>
              </Banner>
            )}
          </Layout.Section>
        )}

        {/* Info Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                About This Data
              </Text>
              <Divider />
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Badge tone="info">FREE Tier</Badge>
                  <Text as="p">
                    Showing data from the last 28 days with top 3 queries and pages
                  </Text>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Data is refreshed every 24 hours. Click "Refresh Data" to fetch the latest
                  information from Google Search Console.
                </Text>
                <Button
                  url="https://search.google.com/search-console"
                  target="_blank"
                  icon={ExternalIcon}
                  variant="plain"
                >
                  View Full Data in GSC
                </Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
