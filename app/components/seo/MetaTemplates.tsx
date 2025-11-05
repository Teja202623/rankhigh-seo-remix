// app/components/seo/MetaTemplates.tsx
/**
 * Meta Templates Component
 *
 * Provides template selection and variable insertion for meta tags.
 * Features:
 * - Pre-built template library
 * - Custom template creation
 * - Variable picker with examples
 * - Live preview of template output
 * - Template application to products
 *
 * Usage:
 * ```tsx
 * <MetaTemplates
 *   product={product}
 *   onApplyTemplate={(title, description) => {
 *     // Apply template to product
 *   }}
 * />
 * ```
 */

import { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Select,
  TextField,
  Badge,
  Box,
  Popover,
  ActionList,
  Banner,
} from "@shopify/polaris";
import type { ShopifyProduct, MetaTemplate } from "~/types/seo";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "~/types/seo";

interface MetaTemplatesProps {
  product: ShopifyProduct;
  storeName?: string;
  onApplyTemplate: (title: string, description: string) => void;
  disabled?: boolean;
}

/**
 * Apply template variables to a template string
 *
 * Replaces placeholders like {product_title} with actual values
 *
 * Example:
 * applyTemplateVariables(
 *   "{product_title} | {store_name}",
 *   product,
 *   "MyStore"
 * )
 * // Returns: "Wireless Headphones | MyStore"
 */
function applyTemplateVariables(
  template: string,
  product: ShopifyProduct,
  storeName: string = "Your Store"
): string {
  let result = template;

  // Get product description (first 100 chars)
  const description = product.description
    ? product.description.replace(/<[^>]*>/g, "").slice(0, 100)
    : "";

  // Get price
  const price = product.priceRangeV2?.minVariantPrice
    ? `${product.priceRangeV2.minVariantPrice.currencyCode === "USD" ? "$" : ""}${parseFloat(product.priceRangeV2.minVariantPrice.amount).toFixed(2)}`
    : "";

  // Variable mapping
  const variables: Record<string, string> = {
    product_title: product.title || "",
    vendor: product.vendor || "",
    product_type: product.productType || "",
    price: price,
    store_name: storeName,
    description: description,
    collection: "", // TODO: Fetch primary collection if needed
  };

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  });

  // Clean up any remaining unreplaced variables
  result = result.replace(/\{[^}]+\}/g, "");

  // Clean up extra spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export function MetaTemplates({
  product,
  storeName,
  onApplyTemplate,
  disabled = false,
}: MetaTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEFAULT_TEMPLATES[0].id
  );
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [showVariablePicker, setShowVariablePicker] = useState<
    "title" | "description" | null
  >(null);
  const [mode, setMode] = useState<"template" | "custom">("template");

  // Get current selected template
  const selectedTemplate = DEFAULT_TEMPLATES.find(
    (t) => t.id === selectedTemplateId
  );

  // Generate preview for selected template
  const previewTitle = selectedTemplate
    ? applyTemplateVariables(
        selectedTemplate.titleTemplate,
        product,
        storeName
      )
    : "";

  const previewDescription = selectedTemplate
    ? applyTemplateVariables(
        selectedTemplate.descriptionTemplate,
        product,
        storeName
      )
    : "";

  /**
   * Insert variable into custom template
   */
  const insertVariable = (variable: string, field: "title" | "description") => {
    const placeholder = `{${variable}}`;

    if (field === "title") {
      setCustomTitle((prev) => prev + placeholder);
    } else {
      setCustomDescription((prev) => prev + placeholder);
    }

    setShowVariablePicker(null);
  };

  /**
   * Apply current template/custom values
   */
  const handleApply = () => {
    if (mode === "template" && selectedTemplate) {
      onApplyTemplate(previewTitle, previewDescription);
    } else {
      // Apply custom template
      const title = applyTemplateVariables(customTitle, product, storeName);
      const desc = applyTemplateVariables(
        customDescription,
        product,
        storeName
      );
      onApplyTemplate(title, desc);
    }
  };

  // Template options for Select component
  const templateOptions = DEFAULT_TEMPLATES.map((template) => ({
    label: template.name,
    value: template.id,
  }));

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm" fontWeight="semibold">
            Meta Tag Templates
          </Text>
          <Badge tone="info">Quick Fill</Badge>
        </InlineStack>

        {/* Mode Selector */}
        <InlineStack gap="200">
          <Button
            pressed={mode === "template"}
            onClick={() => setMode("template")}
            size="slim"
          >
            Use Template
          </Button>
          <Button
            pressed={mode === "custom"}
            onClick={() => setMode("custom")}
            size="slim"
          >
            Custom Template
          </Button>
        </InlineStack>

        {mode === "template" ? (
          // Pre-built Template Mode
          <BlockStack gap="300">
            <Select
              label="Choose a template"
              options={templateOptions}
              value={selectedTemplateId}
              onChange={(value) => setSelectedTemplateId(value)}
              disabled={disabled}
            />

            {selectedTemplate && (
              <Box
                padding="300"
                background="bg-surface"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    {selectedTemplate.description}
                  </Text>

                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Title Template:
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <code style={{ fontSize: "12px" }}>
                        {selectedTemplate.titleTemplate}
                      </code>
                    </Text>
                  </BlockStack>

                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Description Template:
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <code style={{ fontSize: "12px" }}>
                        {selectedTemplate.descriptionTemplate}
                      </code>
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            )}

            {/* Preview */}
            <Box
              padding="300"
              background="bg-surface-success"
              borderRadius="200"
            >
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  Preview for "{product.title}":
                </Text>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Title:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {previewTitle}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Description:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {previewDescription}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        ) : (
          // Custom Template Mode
          <BlockStack gap="300">
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                Use variables like {"{product_title}"}, {"{vendor}"},{" "}
                {"{store_name}"} in your templates. They'll be replaced with
                actual values.
              </Text>
            </Banner>

            {/* Custom Title Input */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Title Template
                </Text>
                <Popover
                  active={showVariablePicker === "title"}
                  activator={
                    <Button
                      onClick={() =>
                        setShowVariablePicker(
                          showVariablePicker === "title" ? null : "title"
                        )
                      }
                      size="slim"
                      disclosure={showVariablePicker === "title" ? "up" : "down"}
                    >
                      Insert Variable
                    </Button>
                  }
                  onClose={() => setShowVariablePicker(null)}
                >
                  <ActionList
                    items={TEMPLATE_VARIABLES.map((variable) => ({
                      content: variable.label,
                      helpText: variable.description,
                      onAction: () => insertVariable(variable.key, "title"),
                    }))}
                  />
                </Popover>
              </InlineStack>

              <TextField
                label="Title template"
                labelHidden
                value={customTitle}
                onChange={setCustomTitle}
                placeholder="e.g., {product_title} | {store_name}"
                autoComplete="off"
                disabled={disabled}
                multiline={2}
              />
            </BlockStack>

            {/* Custom Description Input */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  Description Template
                </Text>
                <Popover
                  active={showVariablePicker === "description"}
                  activator={
                    <Button
                      onClick={() =>
                        setShowVariablePicker(
                          showVariablePicker === "description"
                            ? null
                            : "description"
                        )
                      }
                      size="slim"
                      disclosure={
                        showVariablePicker === "description" ? "up" : "down"
                      }
                    >
                      Insert Variable
                    </Button>
                  }
                  onClose={() => setShowVariablePicker(null)}
                >
                  <ActionList
                    items={TEMPLATE_VARIABLES.map((variable) => ({
                      content: variable.label,
                      helpText: variable.description,
                      onAction: () =>
                        insertVariable(variable.key, "description"),
                    }))}
                  />
                </Popover>
              </InlineStack>

              <TextField
                label="Description template"
                labelHidden
                value={customDescription}
                onChange={setCustomDescription}
                placeholder="e.g., Shop {product_title} from {vendor}. {description}"
                autoComplete="off"
                disabled={disabled}
                multiline={3}
              />
            </BlockStack>

            {/* Custom Preview */}
            {(customTitle || customDescription) && (
              <Box
                padding="300"
                background="bg-surface-success"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Preview for "{product.title}":
                  </Text>

                  {customTitle && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Title:
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {applyTemplateVariables(customTitle, product, storeName)}
                      </Text>
                    </BlockStack>
                  )}

                  {customDescription && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Description:
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {applyTemplateVariables(
                          customDescription,
                          product,
                          storeName
                        )}
                      </Text>
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        )}

        {/* Apply Button */}
        <InlineStack align="end">
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={
              disabled ||
              (mode === "custom" && !customTitle && !customDescription)
            }
          >
            Apply Template
          </Button>
        </InlineStack>

        {/* Available Variables Reference */}
        <Box
          padding="300"
          background="bg-surface-tertiary"
          borderRadius="200"
        >
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Available Variables
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "8px",
              }}
            >
              {TEMPLATE_VARIABLES.map((variable) => (
                <Text key={variable.key} as="p" variant="bodySm" tone="subdued">
                  <code style={{ fontSize: "11px" }}>{`{${variable.key}}`}</code>
                  {" - "}
                  {variable.label}
                </Text>
              ))}
            </div>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
