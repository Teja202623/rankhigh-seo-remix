// app/routes/app.seo.sitemap.tsx

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit, Form } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  ProgressBar,
  Badge,
  TextField,
  Checkbox,
  Collapsible,
  List,
  Divider,
  Box,
  SkeletonBodyText,
  Icon,
  Tooltip,
  InlineGrid,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  ExportIcon,
  RefreshIcon,
  InfoIcon,
} from "@shopify/polaris-icons";
import {
  validateAndGenerateSitemap,
  calculateSitemapStatistics,
  sitemapToXml,
} from "~/services/sitemap/sitemapGenerator.server";
import {
  validateSitemap,
  getValidationSummary,
} from "~/services/sitemap/sitemapValidator.server";
import { formatFileSize } from "~/utils/format";
import {
  dbToExclusionRules,
  parseCustomExclusions,
  validateRegexPattern,
} from "~/services/sitemap/exclusionRules.server";
import type { ExclusionRules } from "~/types/sitemap";

/**
 * FREE tier sitemap URL limit
 */
const FREE_TIER_LIMIT = 200;

/**
 * Loader function - fetches store settings and cached sitemap
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  // Fetch store from database
  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
    select: {
      id: true,
      plan: true,
      shopUrl: true,
      sitemapExcludePasswordProtected: true,
      sitemapExcludeOutOfStock: true,
      sitemapExcludeDraft: true,
      sitemapExcludeSearch: true,
      sitemapExcludeCart: true,
      sitemapExcludeCheckout: true,
      sitemapExcludeAccount: true,
      sitemapCustomExclusions: true,
      sitemapLastGenerated: true,
      sitemapUrlCount: true,
      sitemapXmlContent: true,
    },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  // Get exclusion rules
  const exclusionRules = dbToExclusionRules(store);

  // Determine max URLs based on plan
  const maxUrls = store.plan === "FREE" ? FREE_TIER_LIMIT : 50000;

  // Parse cached sitemap if available
  let sitemapStatistics = null;
  let cachedXml = store.sitemapXmlContent;

  if (cachedXml) {
    try {
      // Calculate statistics from cached sitemap
      const validation = validateSitemap(cachedXml, maxUrls);
      sitemapStatistics = {
        totalUrls: validation.statistics.totalUrls,
        fileSize: validation.statistics.fileSize,
        lastGenerated: store.sitemapLastGenerated,
      };
    } catch (error) {
      console.error("Error parsing cached sitemap:", error);
      cachedXml = null;
    }
  }

  return json({
    store: {
      id: store.id,
      plan: store.plan,
      shopUrl: store.shopUrl,
    },
    exclusionRules,
    sitemapStatistics,
    cachedXml,
    maxUrls,
  });
}

/**
 * Action function - handles sitemap generation, saving settings, and validation
 */
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  // Fetch store
  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  const maxUrls = store.plan === "FREE" ? FREE_TIER_LIMIT : 50000;

  try {
    switch (action) {
      case "generate": {
        // Get current exclusion rules from database
        const exclusionRules = dbToExclusionRules(store);

        // Generate sitemap
        const { sitemap, xml, validation } = await validateAndGenerateSitemap(admin, {
          shopDomain: store.shopUrl,
          exclusionRules,
          maxUrls,
        });

        // Calculate statistics
        const statistics = calculateSitemapStatistics(
          sitemap,
          new Date(),
          store.plan === "FREE" ? FREE_TIER_LIMIT : undefined
        );

        // Save to database
        await prisma.store.update({
          where: { id: store.id },
          data: {
            sitemapXmlContent: xml,
            sitemapLastGenerated: new Date(),
            sitemapUrlCount: sitemap.urlCount,
          },
        });

        return json({
          success: true,
          sitemap: xml,
          statistics,
          validation,
          message: `Successfully generated sitemap with ${sitemap.urlCount} URLs`,
        });
      }

      case "saveSettings": {
        // Parse form data for exclusion rules
        const excludePasswordProtected = formData.get("excludePasswordProtected") === "true";
        const excludeOutOfStock = formData.get("excludeOutOfStock") === "true";
        const excludeDraft = formData.get("excludeDraft") === "true";
        const excludeSearch = formData.get("excludeSearch") === "true";
        const excludeCart = formData.get("excludeCart") === "true";
        const excludeCheckout = formData.get("excludeCheckout") === "true";
        const excludeAccount = formData.get("excludeAccount") === "true";
        const customExclusionsStr = formData.get("customExclusions") as string || "";

        // Parse and validate custom exclusions
        const customExclusions = parseCustomExclusions(customExclusionsStr);
        const invalidPatterns: string[] = [];

        for (const pattern of customExclusions) {
          const validation = validateRegexPattern(pattern);
          if (!validation.valid) {
            invalidPatterns.push(pattern);
          }
        }

        if (invalidPatterns.length > 0) {
          return json({
            success: false,
            error: `Invalid regex patterns: ${invalidPatterns.join(", ")}`,
          });
        }

        // Update store settings
        await prisma.store.update({
          where: { id: store.id },
          data: {
            sitemapExcludePasswordProtected: excludePasswordProtected,
            sitemapExcludeOutOfStock: excludeOutOfStock,
            sitemapExcludeDraft: excludeDraft,
            sitemapExcludeSearch: excludeSearch,
            sitemapExcludeCart: excludeCart,
            sitemapExcludeCheckout: excludeCheckout,
            sitemapExcludeAccount: excludeAccount,
            sitemapCustomExclusions: JSON.stringify(customExclusions),
          },
        });

        return json({
          success: true,
          message: "Sitemap settings saved successfully",
        });
      }

      case "validate": {
        // Get cached sitemap
        if (!store.sitemapXmlContent) {
          return json({
            success: false,
            error: "No sitemap available. Please generate a sitemap first.",
          });
        }

        // Validate the cached sitemap
        const validation = validateSitemap(store.sitemapXmlContent, maxUrls);

        return json({
          success: true,
          validation,
          message: getValidationSummary(validation),
        });
      }

      case "download": {
        // Return cached sitemap for download
        if (!store.sitemapXmlContent) {
          return json({
            success: false,
            error: "No sitemap available. Please generate a sitemap first.",
          });
        }

        return new Response(store.sitemapXmlContent, {
          headers: {
            "Content-Type": "application/xml",
            "Content-Disposition": `attachment; filename="sitemap-${store.shopUrl}.xml"`,
          },
        });
      }

      default:
        return json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error("Sitemap action error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    });
  }
}

/**
 * Sitemap Management UI Component
 */
export default function SitemapPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isGenerating = navigation.state === "submitting" &&
    navigation.formData?.get("action") === "generate";
  const isSavingSettings = navigation.state === "submitting" &&
    navigation.formData?.get("action") === "saveSettings";
  const isValidating = navigation.state === "submitting" &&
    navigation.formData?.get("action") === "validate";

  // State for exclusion rules
  const [excludePasswordProtected, setExcludePasswordProtected] = useState(
    loaderData.exclusionRules.excludePasswordProtected
  );
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(
    loaderData.exclusionRules.excludeOutOfStock
  );
  const [excludeDraft, setExcludeDraft] = useState(
    loaderData.exclusionRules.excludeDraft
  );
  const [excludeSearch, setExcludeSearch] = useState(
    loaderData.exclusionRules.excludeSearch
  );
  const [excludeCart, setExcludeCart] = useState(
    loaderData.exclusionRules.excludeCart
  );
  const [excludeCheckout, setExcludeCheckout] = useState(
    loaderData.exclusionRules.excludeCheckout
  );
  const [excludeAccount, setExcludeAccount] = useState(
    loaderData.exclusionRules.excludeAccount
  );
  const [customExclusions, setCustomExclusions] = useState(
    loaderData.exclusionRules.customExclusions.join("\n")
  );

  // State for collapsibles
  const [xmlPreviewOpen, setXmlPreviewOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Handle save settings
  const handleSaveSettings = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "saveSettings");
    formData.append("excludePasswordProtected", excludePasswordProtected.toString());
    formData.append("excludeOutOfStock", excludeOutOfStock.toString());
    formData.append("excludeDraft", excludeDraft.toString());
    formData.append("excludeSearch", excludeSearch.toString());
    formData.append("excludeCart", excludeCart.toString());
    formData.append("excludeCheckout", excludeCheckout.toString());
    formData.append("excludeAccount", excludeAccount.toString());
    formData.append("customExclusions", customExclusions);
    submit(formData, { method: "post" });
  }, [
    submit,
    excludePasswordProtected,
    excludeOutOfStock,
    excludeDraft,
    excludeSearch,
    excludeCart,
    excludeCheckout,
    excludeAccount,
    customExclusions,
  ]);

  // Handle generate sitemap
  const handleGenerate = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "generate");
    submit(formData, { method: "post" });
  }, [submit]);

  // Handle validate sitemap
  const handleValidate = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "validate");
    submit(formData, { method: "post" });
  }, [submit]);

  // Handle download sitemap
  const handleDownload = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "download");
    submit(formData, { method: "post" });
  }, [submit]);

  // Calculate FREE tier usage percentage
  const freeTierPercentage = loaderData.sitemapStatistics
    ? Math.round((loaderData.sitemapStatistics.totalUrls / loaderData.maxUrls) * 100)
    : 0;

  return (
    <Page
      title="XML Sitemap"
      subtitle="Generate and manage your store's XML sitemap for search engines"
      primaryAction={{
        content: "Generate Sitemap",
        onAction: handleGenerate,
        loading: isGenerating,
        icon: RefreshIcon,
      }}
      secondaryActions={
        loaderData.cachedXml
          ? [
              {
                content: "Download",
                onAction: handleDownload,
                icon: ExportIcon,
              },
              {
                content: "Validate",
                onAction: handleValidate,
                loading: isValidating,
              },
            ]
          : []
      }
    >
      <Layout>
        {/* Success/Error Messages */}
        {actionData && (
          <Layout.Section>
            {actionData.success ? (
              <Banner
                title="Success"
                tone="success"
                onDismiss={() => {}}
              >
                <p>{actionData.message}</p>
              </Banner>
            ) : (
              <Banner
                title="Error"
                tone="critical"
                onDismiss={() => {}}
              >
                <p>{actionData.error}</p>
              </Banner>
            )}
          </Layout.Section>
        )}

        {/* FREE Tier Notice */}
        {loaderData.store.plan === "FREE" && (
          <Layout.Section>
            <Banner
              title="FREE Plan Limit"
              tone="info"
            >
              <p>
                Your FREE plan includes up to {loaderData.maxUrls} URLs in your sitemap.
                Upgrade to a paid plan for up to 50,000 URLs.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Statistics Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Sitemap Statistics
              </Text>

              {loaderData.sitemapStatistics ? (
                <InlineGrid columns={["oneThird", "oneThird", "oneThird"]} gap="400">
                  <Box>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Total URLs
                      </Text>
                      <Text as="p" variant="headingLg">
                        {loaderData.sitemapStatistics.totalUrls}
                      </Text>
                    </BlockStack>
                  </Box>

                  <Box>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        File Size
                      </Text>
                      <Text as="p" variant="headingLg">
                        {formatFileSize(loaderData.sitemapStatistics.fileSize)}
                      </Text>
                    </BlockStack>
                  </Box>

                  <Box>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Last Generated
                      </Text>
                      <Text as="p" variant="headingLg">
                        {loaderData.sitemapStatistics.lastGenerated
                          ? new Date(loaderData.sitemapStatistics.lastGenerated).toLocaleDateString()
                          : "Never"}
                      </Text>
                    </BlockStack>
                  </Box>
                </InlineGrid>
              ) : (
                <Banner tone="warning">
                  <p>No sitemap generated yet. Click "Generate Sitemap" to create one.</p>
                </Banner>
              )}

              {/* FREE Tier Usage Progress */}
              {loaderData.store.plan === "FREE" && loaderData.sitemapStatistics && (
                <Box>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd">
                        FREE Plan Usage
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {loaderData.sitemapStatistics.totalUrls} / {loaderData.maxUrls}
                      </Text>
                    </InlineStack>
                    <ProgressBar
                      progress={freeTierPercentage}
                      tone={freeTierPercentage >= 90 ? "critical" : "primary"}
                    />
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Exclusion Rules Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Exclusion Rules
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                Choose which pages and content types to exclude from your sitemap.
              </Text>

              <Divider />

              <BlockStack gap="300">
                <Checkbox
                  label="Exclude password-protected pages"
                  checked={excludePasswordProtected}
                  onChange={setExcludePasswordProtected}
                />

                <Checkbox
                  label="Exclude out-of-stock products"
                  checked={excludeOutOfStock}
                  onChange={setExcludeOutOfStock}
                  helpText="Products with zero inventory will be excluded"
                />

                <Checkbox
                  label="Exclude draft and archived products"
                  checked={excludeDraft}
                  onChange={setExcludeDraft}
                  helpText="Recommended for SEO best practices"
                />

                <Checkbox
                  label="Exclude search page (/search)"
                  checked={excludeSearch}
                  onChange={setExcludeSearch}
                  helpText="Recommended - search results should not be indexed"
                />

                <Checkbox
                  label="Exclude cart page (/cart)"
                  checked={excludeCart}
                  onChange={setExcludeCart}
                  helpText="Recommended - cart pages should not be indexed"
                />

                <Checkbox
                  label="Exclude checkout pages (/checkout/*)"
                  checked={excludeCheckout}
                  onChange={setExcludeCheckout}
                  helpText="Recommended - checkout pages should not be indexed"
                />

                <Checkbox
                  label="Exclude account pages (/account/*)"
                  checked={excludeAccount}
                  onChange={setExcludeAccount}
                  helpText="Recommended - customer account pages should not be indexed"
                />
              </BlockStack>

              <Divider />

              <TextField
                label="Custom URL exclusion patterns (regex)"
                value={customExclusions}
                onChange={setCustomExclusions}
                multiline={4}
                autoComplete="off"
                helpText="Enter regex patterns (one per line) to exclude specific URLs. Example: ^/collections/sale"
                placeholder="^/collections/sale&#10;^/pages/internal"
              />

              <InlineStack align="end">
                <Button
                  onClick={handleSaveSettings}
                  loading={isSavingSettings}
                  variant="primary"
                >
                  Save Exclusion Rules
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Validation Results */}
        {actionData?.validation && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Validation Results
                  </Text>
                  <Badge
                    tone={actionData.validation.valid ? "success" : "critical"}
                    icon={actionData.validation.valid ? CheckCircleIcon : AlertCircleIcon}
                  >
                    {actionData.validation.valid ? "Valid" : "Invalid"}
                  </Badge>
                </InlineStack>

                {/* Validation Summary */}
                <Box>
                  <Text as="p" variant="bodyMd">
                    {actionData.message}
                  </Text>
                </Box>

                {/* Errors */}
                {actionData.validation.errors.length > 0 && (
                  <Box>
                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm" tone="critical">
                        Errors ({actionData.validation.errors.length})
                      </Text>
                      <List type="bullet">
                        {actionData.validation.errors.slice(0, 10).map((error: any, index: number) => (
                          <List.Item key={index}>
                            {error.message}
                            {error.url && (
                              <Text as="span" tone="subdued">
                                {" "}
                                - {error.url}
                              </Text>
                            )}
                          </List.Item>
                        ))}
                      </List>
                      {actionData.validation.errors.length > 10 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          ... and {actionData.validation.errors.length - 10} more errors
                        </Text>
                      )}
                    </BlockStack>
                  </Box>
                )}

                {/* Warnings */}
                {actionData.validation.warnings.length > 0 && (
                  <Box>
                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">
                        Warnings ({actionData.validation.warnings.length})
                      </Text>
                      <List type="bullet">
                        {actionData.validation.warnings.slice(0, 10).map((warning: any, index: number) => (
                          <List.Item key={index}>
                            {warning.message}
                            {warning.url && (
                              <Text as="span" tone="subdued">
                                {" "}
                                - {warning.url}
                              </Text>
                            )}
                          </List.Item>
                        ))}
                      </List>
                      {actionData.validation.warnings.length > 10 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          ... and {actionData.validation.warnings.length - 10} more warnings
                        </Text>
                      )}
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* XML Preview */}
        {loaderData.cachedXml && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Button
                  onClick={() => setXmlPreviewOpen(!xmlPreviewOpen)}
                  ariaExpanded={xmlPreviewOpen}
                  disclosure={xmlPreviewOpen ? "up" : "down"}
                  fullWidth
                  textAlign="left"
                >
                  XML Preview
                </Button>

                <Collapsible
                  open={xmlPreviewOpen}
                  id="xml-preview-collapsible"
                  transition={{ duration: "500ms", timingFunction: "ease-in-out" }}
                >
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                  >
                    <pre
                      style={{
                        overflow: "auto",
                        maxHeight: "400px",
                        fontSize: "12px",
                        lineHeight: "1.5",
                      }}
                    >
                      <code>{loaderData.cachedXml.slice(0, 5000)}</code>
                      {loaderData.cachedXml.length > 5000 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          ... (truncated for display)
                        </Text>
                      )}
                    </pre>
                  </Box>
                </Collapsible>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Instructions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Button
                onClick={() => setInstructionsOpen(!instructionsOpen)}
                ariaExpanded={instructionsOpen}
                disclosure={instructionsOpen ? "up" : "down"}
                fullWidth
                textAlign="left"
                icon={InfoIcon}
              >
                How to Submit Your Sitemap to Google
              </Button>

              <Collapsible
                open={instructionsOpen}
                id="instructions-collapsible"
                transition={{ duration: "500ms", timingFunction: "ease-in-out" }}
              >
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    After generating your sitemap, follow these steps to submit it to Google
                    Search Console:
                  </Text>

                  <List type="number">
                    <List.Item>
                      Download your generated sitemap using the "Download" button above
                    </List.Item>
                    <List.Item>
                      Upload the sitemap.xml file to your store's root directory (or use your
                      theme's file upload feature)
                    </List.Item>
                    <List.Item>
                      Go to{" "}
                      <a
                        href="https://search.google.com/search-console"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Search Console
                      </a>
                    </List.Item>
                    <List.Item>
                      Select your property (website) from the left sidebar
                    </List.Item>
                    <List.Item>
                      Navigate to "Sitemaps" under the "Indexing" section
                    </List.Item>
                    <List.Item>
                      Enter your sitemap URL: <code>https://{loaderData.store.shopUrl}/sitemap.xml</code>
                    </List.Item>
                    <List.Item>Click "Submit"</List.Item>
                  </List>

                  <Banner tone="info">
                    <p>
                      <strong>Note:</strong> It may take a few days for Google to crawl and index
                      your sitemap. You can check the status in Google Search Console.
                    </p>
                  </Banner>

                  <Banner tone="info">
                    <p>
                      <strong>Tip:</strong> Regenerate your sitemap whenever you add new products,
                      collections, or pages to keep it up-to-date.
                    </p>
                  </Banner>
                </BlockStack>
              </Collapsible>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
