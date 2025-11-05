// app/routes/app.integrations.gsc.select-property.tsx
// Google Search Console Property Selection UI (Task 51)

import { useState, useCallback } from "react";
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
  Select,
  Banner,
  InlineStack,
  Badge,
  EmptyState,
  Spinner,
  Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getProperties, selectProperty } from "~/services/gsc/gscAuth.server";
import type { GSCProperty } from "~/types/gsc";

interface LoaderData {
  properties: GSCProperty[];
  hasToken: boolean;
}

interface ActionData {
  success?: boolean;
  error?: string;
}

/**
 * Loader: Fetch available GSC properties
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const store = await prisma.store.findUnique({
      where: { shopUrl: session.shop },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Check if user has access token
    if (!store.gscAccessToken) {
      return redirect("/app/integrations/gsc?error=not_authenticated");
    }

    // Fetch properties from GSC API
    const properties = await getProperties(store.id);

    return json<LoaderData>({
      properties,
      hasToken: true,
    });
  } catch (error) {
    console.error("Property fetch error:", error);
    return json<LoaderData>(
      {
        properties: [],
        hasToken: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Action: Save selected property
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const propertyUrl = formData.get("propertyUrl") as string;

  try {
    if (!propertyUrl) {
      return json<ActionData>(
        { success: false, error: "Please select a property" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { shopUrl: session.shop },
    });

    if (!store) {
      return json<ActionData>(
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    // Save selected property
    await selectProperty(store.id, propertyUrl);

    // Redirect to GSC dashboard
    return redirect("/app/integrations/gsc");
  } catch (error) {
    console.error("Property selection error:", error);
    return json<ActionData>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save property",
      },
      { status: 500 }
    );
  }
}

/**
 * Property Selection Page
 */
export default function GSCSelectPropertyPage() {
  const loaderData = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedProperty, setSelectedProperty] = useState("");
  const isLoading = navigation.state !== "idle";

  const { properties } = loaderData;

  // Handle property selection
  const handleSubmit = useCallback(() => {
    if (!selectedProperty) {
      return;
    }

    const formData = new FormData();
    formData.append("propertyUrl", selectedProperty);
    submit(formData, { method: "post" });
  }, [selectedProperty, submit]);

  // No properties found
  if (properties.length === 0 && !isLoading) {
    return (
      <Page
        title="Select Property"
        subtitle="Choose which Google Search Console property to track"
        backAction={{ content: "Back", url: "/app/integrations/gsc" }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="No Properties Found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <BlockStack gap="300">
                  <Text as="p">
                    We couldn't find any properties in your Google Search Console account.
                  </Text>
                  <Text as="p">
                    Make sure your store's domain is verified in Google Search Console and you have
                    owner or full user access.
                  </Text>
                  <InlineStack gap="300">
                    <Button
                      url="https://search.google.com/search-console"
                      target="_blank"
                      external
                    >
                      Open Google Search Console
                    </Button>
                    <Button url="/app/integrations/gsc">Try Again</Button>
                  </InlineStack>
                </BlockStack>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Property selection form
  const propertyOptions = [
    { label: "Select a property", value: "" },
    ...properties.map((prop) => ({
      label: `${prop.siteUrl} (${prop.permissionLevel})`,
      value: prop.siteUrl,
    })),
  ];

  return (
    <Page
      title="Select Property"
      subtitle="Choose which Google Search Console property to track"
      backAction={{ content: "Back", url: "/app/integrations/gsc" }}
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
              <Text as="p">
                Select the property that matches your store's domain. This will be used to fetch
                search performance data.
              </Text>

              <Banner tone="info">
                <Text as="p">
                  <strong>Recommended:</strong> Choose a property with "siteOwner" or
                  "siteFullUser" permission for the best experience.
                </Text>
              </Banner>

              {isLoading ? (
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center" gap="300">
                    <Spinner size="small" />
                    <Text as="p">Loading properties...</Text>
                  </InlineStack>
                </Box>
              ) : (
                <>
                  <Select
                    label="Google Search Console Property"
                    options={propertyOptions}
                    value={selectedProperty}
                    onChange={setSelectedProperty}
                    disabled={isLoading}
                    helpText="Select the property that matches your store's domain"
                  />

                  <InlineStack align="end">
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!selectedProperty || isLoading}
                      loading={isLoading}
                    >
                      Continue
                    </Button>
                  </InlineStack>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Properties List */}
        {properties.length > 0 && !isLoading && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Available Properties ({properties.length})
                </Text>
                <BlockStack gap="200">
                  {properties.map((prop) => (
                    <Box
                      key={prop.siteUrl}
                      padding="300"
                      background={selectedProperty === prop.siteUrl ? "bg-surface-selected" : "bg-surface"}
                      borderRadius="200"
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="p" fontWeight="semibold">
                            {prop.siteUrl}
                          </Text>
                          <Text as="p" tone="subdued">
                            Permission: {prop.permissionLevel}
                          </Text>
                        </BlockStack>
                        <Badge
                          tone={
                            prop.permissionLevel === "siteOwner"
                              ? "success"
                              : prop.permissionLevel === "siteFullUser"
                              ? "info"
                              : "attention"
                          }
                        >
                          {prop.permissionLevel}
                        </Badge>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
