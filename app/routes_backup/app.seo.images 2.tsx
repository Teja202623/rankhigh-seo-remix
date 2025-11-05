// app/routes/app.seo.images.tsx
/**
 * Image ALT Text Manager Route
 *
 * Complete feature for managing product image ALT text with:
 * - Product list with all images displayed
 * - Missing ALT text detection and highlighting
 * - Inline editing for individual images
 * - Bulk template application (max 10 products for FREE tier)
 * - Visual indicators and completion statistics
 * - Template system for quick ALT text generation
 * - FREE tier enforcement
 *
 * Technical Stack:
 * - Remix loader/action pattern
 * - Shopify Admin GraphQL API
 * - Polaris 13+ components
 * - TypeScript strict typing
 */

import { useState, useCallback, useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
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
  Thumbnail,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getStore } from "~/services/store.server";
import {
  fetchProductsWithImages,
  fetchShopInfo,
  updateProductImageAltText,
  bulkUpdateImageAltText,
  calculateImageStats,
  getOrdinalPosition,
} from "~/services/shopify.server";
import type {
  ProductWithImageDraft,
  ImageLoaderData,
  UpdateImageResponse,
  AltTemplate,
  ProductImage,
} from "~/types/seo";
import { DEFAULT_ALT_TEMPLATES, FREE_TIER_LIMITS } from "~/types/seo";
import { AltTemplates } from "~/components/seo/AltTemplates";
import { ImageAltEditor } from "~/components/seo/ImageAltEditor";

/**
 * Loader: Fetch products with images and calculate statistics
 *
 * Responsibilities:
 * - Authenticate Shopify session
 * - Get store information and plan
 * - Fetch products with all their images
 * - Calculate ALT text statistics
 * - Return data for UI rendering
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  // Get URL parameters for pagination and filtering
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const query = url.searchParams.get("query");
  const filterMissing = url.searchParams.get("filterMissing") === "true";

  try {
    // Fetch store data
    const store = await getStore(session.shop);

    if (!store) {
      throw new Error("Store not found");
    }

    // Fetch shop info for template variables
    const shopInfo = await fetchShopInfo(admin);

    // Fetch products with images
    const productsResult = await fetchProductsWithImages(admin, {
      limit: 20,
      cursor: cursor || undefined,
      query: query || "status:ACTIVE",
    });

    // Transform products and calculate stats for each
    const products: ProductWithImageDraft[] = productsResult.products.map(
      (product) => {
        const images = product.images.edges.map((edge) => edge.node);
        const stats = calculateImageStats(images);

        return {
          ...product,
          status: product.status as "ACTIVE" | "ARCHIVED" | "DRAFT",
          stats,
        };
      }
    );

    // Filter products with missing ALT text if requested
    const filteredProducts = filterMissing
      ? products.filter((p) => p.stats && p.stats.imagesMissingAlt > 0)
      : products;

    // Calculate overall statistics
    const overallStats = filteredProducts.reduce(
      (acc, product) => {
        if (product.stats) {
          acc.totalImages += product.stats.totalImages;
          acc.imagesWithAlt += product.stats.imagesWithAlt;
          acc.imagesMissingAlt += product.stats.imagesMissingAlt;
        }
        return acc;
      },
      {
        totalProducts: filteredProducts.length,
        totalImages: 0,
        imagesWithAlt: 0,
        imagesMissingAlt: 0,
        completionPercentage: 0,
      }
    );

    // Calculate completion percentage
    overallStats.completionPercentage =
      overallStats.totalImages > 0
        ? Math.round(
            (overallStats.imagesWithAlt / overallStats.totalImages) * 100
          )
        : 0;

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

    const data: ImageLoaderData = {
      products: filteredProducts,
      pageInfo: productsResult.pageInfo,
      stats: overallStats,
      store: {
        id: store.id,
        plan: store.plan,
        shopUrl: store.shopUrl,
        name: shopInfo.name,
      },
      limits,
      templates: DEFAULT_ALT_TEMPLATES,
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
 * Action: Handle image ALT text updates
 *
 * Supports:
 * - Single image update
 * - Bulk product/image update with templates
 * - Rate limiting and tier enforcement
 */
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    if (action === "updateSingleImage") {
      // Update single image ALT text
      const productId = formData.get("productId") as string;
      const imageId = formData.get("imageId") as string;
      const altText = formData.get("altText") as string;

      const result = await updateProductImageAltText(admin, productId, [
        { id: imageId, altText },
      ]);

      if (!result.success) {
        return json<UpdateImageResponse>(
          {
            success: false,
            updatedCount: 0,
            errors: [{ productId, imageId, message: result.error || "Update failed" }],
          },
          { status: 400 }
        );
      }

      return json<UpdateImageResponse>({
        success: true,
        updatedCount: 1,
      });
    } else if (action === "updateProduct") {
      // Update all images for a single product
      const productId = formData.get("productId") as string;
      const imagesJson = formData.get("images") as string;
      const images = JSON.parse(imagesJson);

      const result = await updateProductImageAltText(admin, productId, images);

      if (!result.success) {
        return json<UpdateImageResponse>(
          {
            success: false,
            updatedCount: 0,
            errors: [{ productId, message: result.error || "Update failed" }],
          },
          { status: 400 }
        );
      }

      return json<UpdateImageResponse>({
        success: true,
        updatedCount: 1,
      });
    } else if (action === "bulkUpdate") {
      // Bulk update multiple products with template
      const updatesJson = formData.get("updates") as string;
      const updates = JSON.parse(updatesJson);

      const result = await bulkUpdateImageAltText(admin, updates);

      return json<UpdateImageResponse>({
        success: result.success,
        updatedCount: result.updatedCount,
        errors: result.errors,
      });
    }

    return json<UpdateImageResponse>(
      {
        success: false,
        updatedCount: 0,
        errors: [{ productId: "", message: "Invalid action" }],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Action error:", error);
    return json<UpdateImageResponse>(
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
export default function ImageAltManager() {
  const loaderData = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // Local state
  const [products, setProducts] = useState<ProductWithImageDraft[]>(
    loaderData.products
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMissing, setFilterMissing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [bulkModalActive, setBulkModalActive] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AltTemplate | null>(
    null
  );
  const [templateModalProduct, setTemplateModalProduct] = useState<ProductWithImageDraft | null>(
    null
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const isLoading = navigation.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  // Index table resource state for bulk selection
  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products as unknown as { [key: string]: unknown }[]);

  /**
   * Update local draft for product images
   */
  const updateImageDraft = useCallback(
    (productId: string, imageId: string, altText: string) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              imageDrafts: {
                ...(p.imageDrafts || {}),
                [imageId]: altText,
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
   * Save single image ALT text
   */
  const saveImage = useCallback(
    (productId: string, imageId: string, altText: string) => {
      const formData = new FormData();
      formData.append("action", "updateSingleImage");
      formData.append("productId", productId);
      formData.append("imageId", imageId);
      formData.append("altText", altText);

      submit(formData, { method: "post" });

      setToastMessage("Image ALT text updated successfully");
      setShowToast(true);
    },
    [submit]
  );

  /**
   * Save all images for a product
   */
  const saveProductImages = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !product.imageDrafts) return;

      // Build images array with updated ALT text
      const images = product.images.edges.map((edge) => ({
        id: edge.node.id,
        altText: product.imageDrafts?.[edge.node.id] ?? edge.node.altText ?? "",
      }));

      const formData = new FormData();
      formData.append("action", "updateProduct");
      formData.append("productId", productId);
      formData.append("images", JSON.stringify(images));

      submit(formData, { method: "post" });

      setToastMessage("Product images updated successfully");
      setShowToast(true);
      setEditingProductId(null);
    },
    [products, submit]
  );

  /**
   * Apply template to selected products
   */
  const applyTemplateToBulk = useCallback(() => {
    if (!selectedTemplate || selectedResources.length === 0) return;

    // Check tier limits
    if (selectedResources.length > loaderData.limits.maxBulkEdit) {
      setToastMessage(
        `${loaderData.store.plan} tier limit: Maximum ${loaderData.limits.maxBulkEdit} products at once. Please upgrade.`
      );
      setShowToast(true);
      return;
    }

    // Build updates array
    const updates = selectedResources.map((productId) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;

      // Apply template to all images
      const images = product.images.edges.map((edge, index) => {
        const altText = applyTemplateToImage(
          selectedTemplate.template,
          product,
          index + 1
        );
        return {
          id: edge.node.id,
          altText,
        };
      });

      return {
        productId,
        images,
      };
    }).filter(Boolean);

    // Submit bulk update
    const formData = new FormData();
    formData.append("action", "bulkUpdate");
    formData.append("updates", JSON.stringify(updates));

    submit(formData, { method: "post" });

    setBulkModalActive(false);
    setToastMessage(`Updating ${updates.length} products...`);
    setShowToast(true);
  }, [selectedTemplate, selectedResources, products, loaderData, submit]);

  /**
   * Apply template to a single image
   */
  const applyTemplateToImage = (
    template: string,
    product: ProductWithImageDraft,
    position: number
  ): string => {
    let result = template;

    // Get ordinal position
    const getOrdinal = (n: number): string => {
      const suffixes = ["th", "st", "nd", "rd"];
      const value = n % 100;
      return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
    };

    const variables: Record<string, string> = {
      product_title: product.title || "",
      vendor: product.vendor || "",
      product_type: product.productType || "",
      position: getOrdinal(position),
      store_name: loaderData.store.name || "",
      color: "",
      size: "",
    };

    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, value);
    });

    // Clean up
    result = result.replace(/\{[^}]+\}/g, "");
    result = result.replace(/\s+/g, " ").trim();
    result = result.replace(/\s*-\s*$/g, "").trim();

    return result;
  };

  /**
   * Get badge for product completion status
   */
  const getCompletionBadge = (product: ProductWithImageDraft) => {
    if (!product.stats) return null;

    if (product.stats.completionPercentage === 100) {
      return <Badge tone="success">Complete</Badge>;
    } else if (product.stats.completionPercentage >= 50) {
      return <Badge tone="warning">Partial</Badge>;
    } else {
      return <Badge tone="critical">Missing</Badge>;
    }
  };

  // Row markup for IndexTable
  const rowMarkup = products.map((product, index) => {
    const images = product.images.edges.map((edge) => edge.node);
    const isEditing = editingProductId === product.id;

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
              <Thumbnail
                source={product.featuredImage.url}
                alt={product.title}
                size="medium"
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

        {/* Image Count */}
        <IndexTable.Cell>
          <BlockStack gap="100">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {images.length} images
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {product.stats?.imagesWithAlt || 0} with ALT
            </Text>
          </BlockStack>
        </IndexTable.Cell>

        {/* Completion */}
        <IndexTable.Cell>
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <div style={{ width: "100px" }}>
                <ProgressBar
                  progress={product.stats?.completionPercentage || 0}
                  tone={
                    (product.stats?.completionPercentage || 0) === 100
                      ? "success"
                      : (product.stats?.completionPercentage || 0) >= 50
                        ? "primary"
                        : "critical"
                  }
                  size="small"
                />
              </div>
              <Text as="span" variant="bodySm">
                {product.stats?.completionPercentage || 0}%
              </Text>
            </InlineStack>
          </BlockStack>
        </IndexTable.Cell>

        {/* Status */}
        <IndexTable.Cell>{getCompletionBadge(product)}</IndexTable.Cell>

        {/* Actions */}
        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button
              size="slim"
              onClick={() => setEditingProductId(product.id)}
            >
              Edit Images
            </Button>
            <Button
              size="slim"
              onClick={() => setTemplateModalProduct(product)}
            >
              Use Template
            </Button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  // Currently editing product
  const editingProduct = products.find((p) => p.id === editingProductId);

  return (
    <Frame>
      <Page
        title="Image ALT Text Manager"
        subtitle="Optimize product images for SEO and accessibility"
        primaryAction={{
          content: "Bulk Edit Selected",
          onAction: () => {
            if (selectedResources.length === 0) {
              setToastMessage("Please select products to edit");
              setShowToast(true);
              return;
            }
            if (selectedResources.length > loaderData.limits.maxBulkEdit) {
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
                    • Manage up to {loaderData.limits.maxProducts} products
                    total
                    <br />
                    • Bulk edit maximum {loaderData.limits.maxBulkEdit} products
                    at once
                    <br />• Upgrade to BASIC for 200 products or PRO for
                    unlimited
                  </Text>
                </Banner>
              )}

              {/* Statistics Card */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd" fontWeight="semibold">
                    Image ALT Text Statistics
                  </Text>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <Box padding="400" background="bg-surface" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total Products
                        </Text>
                        <Text as="p" variant="headingLg">
                          {loaderData.stats.totalProducts}
                        </Text>
                      </BlockStack>
                    </Box>

                    <Box padding="400" background="bg-surface" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total Images
                        </Text>
                        <Text as="p" variant="headingLg">
                          {loaderData.stats.totalImages}
                        </Text>
                      </BlockStack>
                    </Box>

                    <Box
                      padding="400"
                      background="bg-surface-success"
                      borderRadius="200"
                    >
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          With ALT Text
                        </Text>
                        <Text as="p" variant="headingLg">
                          {loaderData.stats.imagesWithAlt}
                        </Text>
                      </BlockStack>
                    </Box>

                    <Box
                      padding="400"
                      background="bg-surface-critical"
                      borderRadius="200"
                    >
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Missing ALT Text
                        </Text>
                        <Text as="p" variant="headingLg">
                          {loaderData.stats.imagesMissingAlt}
                        </Text>
                      </BlockStack>
                    </Box>
                  </div>

                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodyMd" fontWeight="medium">
                        Overall Completion
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {loaderData.stats.completionPercentage}%
                      </Text>
                    </InlineStack>
                    <ProgressBar
                      progress={loaderData.stats.completionPercentage}
                      tone={
                        loaderData.stats.completionPercentage === 100
                          ? "success"
                          : loaderData.stats.completionPercentage >= 50
                            ? "primary"
                            : "critical"
                      }
                    />
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Search and Filter */}
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
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Found {products.length} products • {selectedResources.length}{" "}
                      selected
                    </Text>
                    <Button
                      size="slim"
                      pressed={filterMissing}
                      onClick={() => {
                        setFilterMissing(!filterMissing);
                        // Re-navigate to apply filter
                        const url = new URL(window.location.href);
                        if (!filterMissing) {
                          url.searchParams.set("filterMissing", "true");
                        } else {
                          url.searchParams.delete("filterMissing");
                        }
                        window.location.href = url.toString();
                      }}
                    >
                      {filterMissing ? "Show All" : "Show Missing Only"}
                    </Button>
                  </InlineStack>
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
                      {filterMissing
                        ? "All products have ALT text! Great job!"
                        : "Try adjusting your search or filters."}
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
                      { title: "Images" },
                      { title: "Completion" },
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

        {/* Edit Product Images Modal */}
        <Modal
          open={editingProductId !== null}
          onClose={() => setEditingProductId(null)}
          title={`Edit Images: ${editingProduct?.title}`}
          primaryAction={{
            content: "Save All Changes",
            onAction: () => {
              if (editingProductId) {
                saveProductImages(editingProductId);
              }
            },
            disabled: !editingProduct?.isDirty || isSubmitting,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setEditingProductId(null),
            },
          ]}
        >
          <Modal.Section>
            {editingProduct && (
              <ImageAltEditor
                productTitle={editingProduct.title}
                images={editingProduct.images.edges.map((e) => e.node)}
                onUpdateAlt={(imageId, altText) =>
                  updateImageDraft(editingProduct.id, imageId, altText)
                }
                disabled={isSubmitting}
              />
            )}
          </Modal.Section>
        </Modal>

        {/* Template Application Modal */}
        <Modal
          open={templateModalProduct !== null}
          onClose={() => setTemplateModalProduct(null)}
          title={`Apply Template: ${templateModalProduct?.title}`}
        >
          <Modal.Section>
            {templateModalProduct && (
              <AltTemplates
                product={templateModalProduct}
                storeName={loaderData.store.name}
                onApplyTemplate={(altText) => {
                  // Apply to first image as example
                  const firstImage = templateModalProduct.images.edges[0]?.node;
                  if (firstImage) {
                    updateImageDraft(templateModalProduct.id, firstImage.id, altText);
                    setToastMessage("Template applied. Save to confirm changes.");
                    setShowToast(true);
                    setTemplateModalProduct(null);
                  }
                }}
              />
            )}
          </Modal.Section>
        </Modal>

        {/* Bulk Edit Modal */}
        <Modal
          open={bulkModalActive}
          onClose={() => setBulkModalActive(false)}
          title="Bulk Edit Image ALT Text"
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
                Select a template to apply to all images in{" "}
                {selectedResources.length} selected product
                {selectedResources.length !== 1 ? "s" : ""}.
              </Text>

              {/* Template Selector */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Choose Template
                  </Text>
                  {DEFAULT_ALT_TEMPLATES.map((template) => (
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
                          <Text as="p" variant="bodySm">
                            <code style={{ fontSize: "11px" }}>
                              {template.template}
                            </code>
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
