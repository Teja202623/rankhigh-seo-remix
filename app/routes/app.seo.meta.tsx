// app/routes/app.seo.meta.tsx
/**
 * SEO Meta Title/Description Editor Route
 *
 * Full-featured product meta tag management interface with:
 * - Product list with current meta tags
 * - Inline editing capability
 * - SERP preview for each product
 * - Bulk selection and editing (max 10 for FREE tier)
 * - Template application
 * - FREE tier enforcement
 * - Search and filter functionality
 *
 * Technical Stack:
 * - Remix loader/action pattern
 * - Shopify Admin GraphQL API
 * - Polaris 13+ components
 * - TypeScript strict typing
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  IndexTable,
  Badge,
  Banner,
  EmptyState,
  Spinner,
  Modal,
  Box,
  Pagination,
  useIndexResourceState,
  Toast,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getStore } from "~/services/store.server";
import {
  fetchProducts,
  fetchShopInfo,
  updateProductSeo,
  bulkUpdateProductSeo,
} from "~/services/shopify.server";
import type {
  ShopifyProduct,
  ProductWithDraft,
  MetaTemplate,
  ProductsLoaderData,
  UpdateProductResponse,
} from "~/types/seo";
import { DEFAULT_TEMPLATES, FREE_TIER_LIMITS, SERP_LIMITS } from "~/types/seo";
import { SERPPreview } from "~/components/seo/SERPPreview";
import { MetaTemplates } from "~/components/seo/MetaTemplates";

type MetaFieldValidationStatus = "valid" | "empty" | "too_short" | "too_long";

interface MetaFieldValidation {
  isValid: boolean;
  status: MetaFieldValidationStatus;
  message?: string;
  length: number;
}

const TITLE_LIMITS = SERP_LIMITS.title;
const DESCRIPTION_LIMITS = SERP_LIMITS.description;

function validateMetaField(
  value: string,
  limits: { minChars: number; maxChars: number },
  fieldLabel: "Title" | "Description"
): MetaFieldValidation {
  const trimmed = value.trim();
  const length = trimmed.length;

  if (length === 0) {
    return {
      isValid: false,
      status: "empty",
      message: `${fieldLabel} is required`,
      length,
    };
  }

  if (length < limits.minChars) {
    return {
      isValid: false,
      status: "too_short",
      message: `${fieldLabel} is too short (min ${limits.minChars} characters)`,
      length,
    };
  }

  if (length > limits.maxChars) {
    return {
      isValid: false,
      status: "too_long",
      message: `${fieldLabel} exceeds ${limits.maxChars} characters`,
      length,
    };
  }

  return {
    isValid: true,
    status: "valid",
    length,
  };
}

function getMetaDraftValues(product: ProductWithDraft) {
  return {
    title: product.draft?.title ?? product.seo.title ?? product.title ?? "",
    description: product.draft?.description ?? product.seo.description ?? "",
  };
}

/**
 * Loader: Fetch products and store data
 *
 * Responsibilities:
 * - Authenticate Shopify session
 * - Get store information and plan
 * - Fetch products with pagination
 * - Calculate tier limits and usage
 * - Return data for UI rendering
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  // Get URL parameters for pagination and filtering
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const query = url.searchParams.get("query");

  try {
    // Fetch store data
    const store = await getStore(session.shop);

    if (!store) {
      throw new Error("Store not found");
    }

    // Fetch shop info for template variables
    const shopInfo = await fetchShopInfo(admin);

    // Fetch products
    const productsResult = await fetchProducts(admin, {
      limit: 20,
      cursor: cursor || undefined,
      query: query || undefined,
    });

    // Calculate tier limits based on plan
    const limits = {
      maxProducts:
        store.plan === "FREE"
          ? FREE_TIER_LIMITS.maxProducts
          : store.plan === "BASIC"
            ? 200
            : -1, // Unlimited for PRO
      maxBulkEdit:
        store.plan === "FREE"
          ? FREE_TIER_LIMITS.maxBulkEdit
          : store.plan === "BASIC"
            ? 50
            : 200,
      currentUsage: 0, // TODO: Calculate from database
    };

    // Transform products to include draft state
    const products = productsResult.edges.map((edge) => edge.node);

    const data: ProductsLoaderData = {
      products,
      pageInfo: productsResult.pageInfo,
      totalCount: products.length, // Note: GraphQL doesn't return total count easily
      store: {
        id: store.id,
        plan: store.plan,
        shopUrl: store.shopUrl,
      },
      limits,
      templates: DEFAULT_TEMPLATES,
    };

    return json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Loader error:", error);
    throw new Response("Failed to load products", {
      status: 500,
      statusText:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Action: Handle product updates
 *
 * Supports:
 * - Single product update
 * - Bulk product update
 * - Template application
 *
 * Returns success/error status and updated counts
 */
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    if (action === "updateSingle") {
      // Update single product
      const productId = formData.get("productId") as string;
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;

      const result = await updateProductSeo(admin, productId, {
        title,
        description,
      });

      if (!result.success) {
        return json<UpdateProductResponse>(
          {
            success: false,
            updatedCount: 0,
            errors: [{ productId, message: result.error || "Update failed" }],
          },
          { status: 400 }
        );
      }

      return json<UpdateProductResponse>({
        success: true,
        updatedCount: 1,
      });
    } else if (action === "updateBulk") {
      // Update multiple products
      const updatesJson = formData.get("updates") as string;
      const updates = JSON.parse(updatesJson);

      const result = await bulkUpdateProductSeo(admin, updates);

      return json<UpdateProductResponse>({
        success: result.success,
        updatedCount: result.updatedCount,
        errors: result.errors,
      });
    }

    return json<UpdateProductResponse>(
      {
        success: false,
        updatedCount: 0,
        errors: [{ productId: "", message: "Invalid action" }],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Action error:", error);
    return json<UpdateProductResponse>(
      {
        success: false,
        updatedCount: 0,
        errors: [
          {
            productId: "",
            message:
              error instanceof Error ? error.message : "Update failed",
          },
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * Main component
 */
export default function SeoMetaEditor() {
  const loaderData = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  // Local state
  const [products, setProducts] = useState<ProductWithDraft[]>(
    loaderData.products
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [bulkModalActive, setBulkModalActive] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(
    null
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const isLoading = navigation.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (!actionData || actionData.success) return;
    const errorMessage =
      actionData.errors?.[0]?.message || "Failed to update meta tags. Please try again.";
    setToastMessage(errorMessage);
    setShowToast(true);
  }, [actionData]);
  // Index table resource state for bulk selection
  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products as unknown as { [key: string]: unknown }[]);

  /**
   * Update local draft for a product
   */
  const updateProductDraft = useCallback(
    (productId: string, field: "title" | "description", value: string) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              draft: {
                title:
                  field === "title"
                    ? value
                    : p.draft?.title || p.seo.title || "",
                description:
                  field === "description"
                    ? value
                    : p.draft?.description || p.seo.description || "",
              },
              isDirty: true,
            };
          }
          return p;
        })
      );
    },
    []
  );

  /**
   * Save single product
   */
  const saveProduct = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !product.draft) return;

      const draftValues = getMetaDraftValues(product);
      const titleValidation = validateMetaField(draftValues.title, TITLE_LIMITS, "Title");
      const descriptionValidation = validateMetaField(
        draftValues.description,
        DESCRIPTION_LIMITS,
        "Description"
      );

      if (!titleValidation.isValid || !descriptionValidation.isValid) {
        setToastMessage(titleValidation.message || descriptionValidation.message || "Fix validation errors before saving.");
        setShowToast(true);
        return;
      }

      const formData = new FormData();
      formData.append("action", "updateSingle");
      formData.append("productId", productId);
      formData.append("title", draftValues.title);
      formData.append("description", draftValues.description);

      submit(formData, { method: "post" });

      setToastMessage("Product meta tags updated successfully");
      setShowToast(true);
      setEditingProductId(null);
    },
    [products, submit]
  );

  /**
   * Cancel editing for a product
   */
  const cancelEdit = useCallback((productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, draft: undefined, isDirty: false, isEditing: false }
          : p
      )
    );
    setEditingProductId(null);
  }, []);

  /**
   * Start editing a product
   */
  const startEdit = useCallback((productId: string) => {
    setEditingProductId(productId);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            isEditing: true,
            draft: {
              title: p.seo.title || p.title,
              description: p.seo.description || "",
            },
          };
        }
        return p;
      })
    );
  }, []);

  /**
   * Apply template to selected products
   */
  const applyTemplateToBulk = useCallback(() => {
    if (!selectedTemplate || selectedResources.length === 0) return;

    // Check tier limits
    if (selectedResources.length > loaderData.limits.maxBulkEdit) {
      setToastMessage(
        `FREE tier limit: Maximum ${loaderData.limits.maxBulkEdit} products at once. Please upgrade.`
      );
      setShowToast(true);
      return;
    }

    // Build updates array
    const updates = selectedResources.map((productId) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;

      // Apply template (simplified - you'd use the actual template function)
      const title = selectedTemplate.titleTemplate
        .replace("{product_title}", product.title)
        .replace("{store_name}", loaderData.store.shopUrl.split(".")[0])
        .replace("{vendor}", product.vendor || "")
        .replace("{product_type}", product.productType || "");

      const description = selectedTemplate.descriptionTemplate
        .replace("{product_title}", product.title)
        .replace("{store_name}", loaderData.store.shopUrl.split(".")[0])
        .replace("{vendor}", product.vendor || "")
        .replace("{product_type}", product.productType || "")
        .replace(
          "{description}",
          product.description?.slice(0, 100) || ""
        );

      return {
        id: productId,
        seo: {
          title: title.slice(0, TITLE_LIMITS.maxChars),
          description: description.slice(0, DESCRIPTION_LIMITS.maxChars),
        },
      };
    }).filter(Boolean);

    // Submit bulk update
    const formData = new FormData();
    formData.append("action", "updateBulk");
    formData.append("updates", JSON.stringify(updates));

    submit(formData, { method: "post" });

    setBulkModalActive(false);
    setToastMessage(`Updating ${updates.length} products...`);
    setShowToast(true);
  }, [selectedTemplate, selectedResources, products, loaderData, submit]);

  /**
   * Get status badge for meta completeness
   */
  const getMetaStatusBadge = (product: ShopifyProduct) => {
    const hasTitle = Boolean(product.seo.title);
    const hasDescription = Boolean(product.seo.description);

    if (hasTitle && hasDescription) {
      return <Badge tone="success">Complete</Badge>;
    } else if (hasTitle || hasDescription) {
      return <Badge tone="warning">Partial</Badge>;
    } else {
      return <Badge tone="critical">Missing</Badge>;
    }
  };

  // Row markup for IndexTable
  const rowMarkup = products.map((product, index) => {
    const isEditing = editingProductId === product.id;
    const draftValues = getMetaDraftValues(product);
    const titleValidation = validateMetaField(draftValues.title, TITLE_LIMITS, "Title");
    const descriptionValidation = validateMetaField(
      draftValues.description,
      DESCRIPTION_LIMITS,
      "Description"
    );
    const canSaveProduct = Boolean(
      product.isDirty && titleValidation.isValid && descriptionValidation.isValid && !isSubmitting
    );

    return (
      <IndexTable.Row
        id={product.id}
        key={product.id}
        selected={selectedResources.includes(product.id)}
        position={index}
      >
        {/* Product */}
        <IndexTable.Cell>
          <InlineStack gap="300" blockAlign="center">
            {product.featuredImage && (
              <img
                src={product.featuredImage.url}
                alt={product.title}
                style={{
                  width: "40px",
                  height: "40px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            )}
            <BlockStack gap="100">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {product.title}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                {product.vendor && `${product.vendor} • `}
                {product.productType || "No type"}
              </Text>
            </BlockStack>
          </InlineStack>
        </IndexTable.Cell>

        {/* Meta Title */}
        <IndexTable.Cell>
          {isEditing ? (
            <TextField
              label="Meta title"
              labelHidden
              value={draftValues.title}
              onChange={(value) => updateProductDraft(product.id, "title", value)}
              autoComplete="off"
              placeholder="Enter meta title..."
              error={titleValidation.isValid ? undefined : titleValidation.message}
              helpText={`${titleValidation.length}/${TITLE_LIMITS.maxChars} characters`}
            />
          ) : (
            <BlockStack gap="100">
              <Text as="span" variant="bodyMd">
                {product.seo.title || product.title}
              </Text>
              {!product.seo.title && (
                <Text as="span" variant="bodySm" tone="subdued">
                  Using product title
                </Text>
              )}
              {!titleValidation.isValid && (
                <Text as="span" variant="bodySm" tone="critical">
                  {titleValidation.message}
                </Text>
              )}
            </BlockStack>
          )}
        </IndexTable.Cell>

        {/* Meta Description */}
        <IndexTable.Cell>
          {isEditing ? (
            <TextField
              label="Meta description"
              labelHidden
              value={draftValues.description}
              onChange={(value) =>
                updateProductDraft(product.id, "description", value)
              }
              autoComplete="off"
              placeholder="Enter meta description..."
              multiline={2}
              error={
                descriptionValidation.isValid ? undefined : descriptionValidation.message
              }
              helpText={`${descriptionValidation.length}/${DESCRIPTION_LIMITS.maxChars} characters`}
            />
          ) : (
            <BlockStack gap="100">
              <Text
                as="span"
                variant="bodyMd"
                tone={product.seo.description ? "base" : "subdued"}
              >
                {product.seo.description || "No meta description set"}
              </Text>
              {!descriptionValidation.isValid && (
                <Text as="span" variant="bodySm" tone="critical">
                  {descriptionValidation.message}
                </Text>
              )}
            </BlockStack>
          )}
        </IndexTable.Cell>

        {/* Status */}
        <IndexTable.Cell>{getMetaStatusBadge(product)}</IndexTable.Cell>

        {/* Actions */}
        <IndexTable.Cell>
          <InlineStack gap="200">
            {isEditing ? (
              <>
                <Button
                  size="slim"
                  variant="primary"
                  onClick={() => saveProduct(product.id)}
                  loading={isSubmitting}
                  disabled={!canSaveProduct}
                >
                  Save
                </Button>
                <Button size="slim" onClick={() => cancelEdit(product.id)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="slim"
                  onClick={() => startEdit(product.id)}
                  disabled={isSubmitting}
                >
                  Edit
                </Button>
                <Button
                  size="slim"
                  onClick={() => setPreviewProductId(product.id)}
                >
                  Preview
                </Button>
              </>
            )}
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  // Current preview product + derived drafts for SERP preview
  const previewProduct = products.find((p) => p.id === previewProductId);
  const previewTitle =
    previewProduct?.draft?.title ||
    previewProduct?.seo.title ||
    previewProduct?.title ||
    "";
  const previewDescription =
    previewProduct?.draft?.description ||
    previewProduct?.seo.description ||
    previewProduct?.description ||
    "";
  const previewUrl = previewProduct?.onlineStoreUrl || "";

  return (
    <Frame>
      <Page
        title="Meta Title & Description Editor"
        subtitle="Optimize product meta tags for search engines"
        primaryAction={{
          content: "Bulk Edit Selected",
          onAction: () => {
            if (selectedResources.length === 0) {
              setToastMessage("Please select products to edit");
              setShowToast(true);
              return;
            }
            if (
              selectedResources.length > loaderData.limits.maxBulkEdit
            ) {
              setToastMessage(
                `${loaderData.store.plan} tier limit: Maximum ${loaderData.limits.maxBulkEdit} products. Selected: ${selectedResources.length}`
              );
              setShowToast(true);
              return;
            }
            setBulkModalActive(true);
          },
          disabled: selectedResources.length === 0 || isSubmitting,
        }}
        backAction={{ url: "/app" }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Tier Limit Banner */}
              {loaderData.store.plan === "FREE" && (
                <Banner
                  title="FREE Plan Limits"
                  tone="info"
                  action={{
                    content: "Upgrade",
                    url: "/app/settings/billing",
                  }}
                >
                  <Text as="p" variant="bodyMd">
                    • Edit up to {loaderData.limits.maxProducts} products total
                    <br />
                    • Bulk edit maximum {loaderData.limits.maxBulkEdit}{" "}
                    products at once
                    <br />• Upgrade to BASIC for 200 products or PRO for
                    unlimited
                  </Text>
                </Banner>
              )}

              {/* Search */}
              <Card>
                <BlockStack gap="300">
                  <TextField
                    label="Search products"
                    labelHidden
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by product title, vendor, or type..."
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Found {products.length} products •{" "}
                    {selectedResources.length} selected
                  </Text>
                </BlockStack>
              </Card>

              {/* Products Table */}
              <Card padding="0">
                {isLoading ? (
                  <Box padding="800">
                    <InlineStack align="center" blockAlign="center">
                      <Spinner size="large" />
                    </InlineStack>
                  </Box>
                ) : products.length === 0 ? (
                  <EmptyState
                    heading="No products found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <Text as="p" variant="bodyMd">
                      Try adjusting your search or filters.
                    </Text>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={products.length}
                    selectedItemsCount={
                      allResourcesSelected ? "All" : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      { title: "Product" },
                      { title: "Meta Title" },
                      { title: "Meta Description" },
                      { title: "Status" },
                      { title: "Actions" },
                    ]}
                    selectable
                  >
                    {rowMarkup}
                  </IndexTable>
                )}
              </Card>

              {/* Pagination */}
              {(loaderData.pageInfo.hasNextPage ||
                loaderData.pageInfo.hasPreviousPage) && (
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={loaderData.pageInfo.hasPreviousPage}
                    onPrevious={() => {
                      // Navigate with cursor
                    }}
                    hasNext={loaderData.pageInfo.hasNextPage}
                    onNext={() => {
                      // Navigate with cursor
                    }}
                  />
                </InlineStack>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Bulk Edit Modal */}
        <Modal
          open={bulkModalActive}
          onClose={() => setBulkModalActive(false)}
          title="Bulk Edit Meta Tags"
          primaryAction={{
            content: `Apply to ${selectedResources.length} Products`,
            onAction: applyTemplateToBulk,
            disabled: !selectedTemplate,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setBulkModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Select a template to apply to {selectedResources.length}{" "}
                selected product{selectedResources.length !== 1 ? "s" : ""}.
              </Text>

              {/* Template Selector */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Choose Template
                  </Text>
                  {DEFAULT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      style={{ cursor: "pointer" }}
                    >
                      <Box
                        padding="300"
                        background={
                          selectedTemplate?.id === template.id
                            ? "bg-surface-selected"
                            : "bg-surface"
                        }
                        borderRadius="200"
                      >
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {template.name}
                          </Text>
                          {template.isDefault && (
                            <Badge tone="info">Default</Badge>
                          )}
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {template.description}
                        </Text>
                      </BlockStack>
                    </Box>
                    </div>
                  ))}
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* SERP Preview Modal */}
        <Modal
          open={previewProductId !== null}
          onClose={() => setPreviewProductId(null)}
          title={`SERP Preview: ${previewProduct?.title}`}
        >
          <Modal.Section>
            {previewProduct && (
              <SERPPreview
                title={previewTitle}
                description={previewDescription}
                url={previewUrl}
                mode="desktop"
                showAnalysis
              />
            )}
          </Modal.Section>
        </Modal>

        {/* Success Toast */}
        {showToast && (
          <Toast
            content={toastMessage}
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
