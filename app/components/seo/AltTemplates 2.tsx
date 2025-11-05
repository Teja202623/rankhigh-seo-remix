// app/components/seo/AltTemplates.tsx
/**
 * ALT Text Templates Component
 *
 * Provides template selection and variable insertion for image ALT text.
 * Features:
 * - Pre-built ALT text template library optimized for SEO
 * - Custom template creation with variable picker
 * - Position-aware templates (1st image, 2nd image, etc.)
 * - Live preview of template output
 * - Template application to images
 *
 * Usage:
 * ```tsx
 * <AltTemplates
 *   product={product}
 *   imagePosition={1}
 *   currentAltText="Existing alt text"
 *   onApplyTemplate={(altText) => {
 *     // Apply template to image
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
import type { ProductWithImages, AltTemplate } from "~/types/seo";
import { DEFAULT_ALT_TEMPLATES, ALT_TEMPLATE_VARIABLES } from "~/types/seo";

interface AltTemplatesProps {
  product: ProductWithImages;
  imagePosition?: number; // 1-indexed position of image
  currentAltText?: string;
  storeName?: string;
  onApplyTemplate: (altText: string) => void;
  disabled?: boolean;
}

/**
 * Apply template variables to an ALT text template string
 *
 * Replaces placeholders like {product_title}, {position} with actual values
 *
 * Example:
 * applyAltTemplateVariables(
 *   "{product_title} - {position} view",
 *   product,
 *   2,
 *   "MyStore"
 * )
 * // Returns: "Wireless Headphones - 2nd view"
 */
function applyAltTemplateVariables(
  template: string,
  product: ProductWithImages,
  position: number = 1,
  storeName: string = "Your Store"
): string {
  let result = template;

  // Convert position to ordinal (1st, 2nd, 3rd, etc.)
  const getOrdinal = (n: number): string => {
    const suffixes = ["th", "st", "nd", "rd"];
    const value = n % 100;
    return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  };

  // Variable mapping
  const variables: Record<string, string> = {
    product_title: product.title || "",
    vendor: product.vendor || "",
    product_type: product.productType || "",
    position: getOrdinal(position),
    store_name: storeName,
    // Note: color and size would come from variant data if available
    color: "",
    size: "",
  };

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  });

  // Clean up any remaining unreplaced variables and extra spaces
  result = result.replace(/\{[^}]+\}/g, "");
  result = result.replace(/\s+/g, " ").trim();
  // Remove trailing dashes or hyphens with no text after them
  result = result.replace(/\s*-\s*$/g, "").trim();

  return result;
}

export function AltTemplates({
  product,
  imagePosition = 1,
  currentAltText = "",
  storeName,
  onApplyTemplate,
  disabled = false,
}: AltTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEFAULT_ALT_TEMPLATES[0].id
  );
  const [customTemplate, setCustomTemplate] = useState("");
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [mode, setMode] = useState<"template" | "custom">("template");

  // Get current selected template
  const selectedTemplate = DEFAULT_ALT_TEMPLATES.find(
    (t) => t.id === selectedTemplateId
  );

  // Generate preview for selected template
  const previewAltText = selectedTemplate
    ? applyAltTemplateVariables(
        selectedTemplate.template,
        product,
        imagePosition,
        storeName
      )
    : "";

  // Generate preview for custom template
  const customPreviewAltText = customTemplate
    ? applyAltTemplateVariables(customTemplate, product, imagePosition, storeName)
    : "";

  /**
   * Insert variable into custom template
   */
  const insertVariable = (variableKey: string) => {
    const placeholder = `{${variableKey}}`;
    setCustomTemplate((prev) => prev + placeholder);
    setShowVariablePicker(false);
  };

  /**
   * Apply current template/custom value
   */
  const handleApply = () => {
    if (mode === "template" && selectedTemplate) {
      onApplyTemplate(previewAltText);
    } else {
      onApplyTemplate(customPreviewAltText);
    }
  };

  // Template options for Select component
  const templateOptions = DEFAULT_ALT_TEMPLATES.map((template) => ({
    label: template.name,
    value: template.id,
  }));

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm" fontWeight="semibold">
            ALT Text Templates
          </Text>
          <Badge tone="info">Quick Fill</Badge>
        </InlineStack>

        {/* Current ALT Text Display */}
        {currentAltText && (
          <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Current ALT Text:
              </Text>
              <Text as="p" variant="bodyMd">
                {currentAltText}
              </Text>
            </BlockStack>
          </Box>
        )}

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
              <Box padding="300" background="bg-surface" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    {selectedTemplate.description}
                  </Text>

                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Template:
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <code style={{ fontSize: "12px" }}>
                        {selectedTemplate.template}
                      </code>
                    </Text>
                  </BlockStack>

                  <BlockStack gap="100">
                    <Badge tone="info">{selectedTemplate.category}</Badge>
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
                  Preview for "{product.title}" (Image {imagePosition}):
                </Text>

                <Text as="p" variant="bodyMd">
                  {previewAltText || "No preview available"}
                </Text>

                <Text as="p" variant="bodySm" tone="subdued">
                  Length: {previewAltText.length} characters
                  {previewAltText.length > 125 && " (Consider shortening for optimal SEO)"}
                </Text>
              </BlockStack>
            </Box>
          </BlockStack>
        ) : (
          // Custom Template Mode
          <BlockStack gap="300">
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                Use variables like {"{product_title}"}, {"{vendor}"},{" "}
                {"{position}"} in your template. They'll be replaced with actual
                values.
              </Text>
            </Banner>

            {/* Custom Template Input */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  ALT Text Template
                </Text>
                <Popover
                  active={showVariablePicker}
                  activator={
                    <Button
                      onClick={() => setShowVariablePicker(!showVariablePicker)}
                      size="slim"
                      disclosure={showVariablePicker ? "up" : "down"}
                    >
                      Insert Variable
                    </Button>
                  }
                  onClose={() => setShowVariablePicker(false)}
                >
                  <ActionList
                    items={ALT_TEMPLATE_VARIABLES.map((variable) => ({
                      content: variable.label,
                      helpText: variable.description,
                      onAction: () => insertVariable(variable.key),
                    }))}
                  />
                </Popover>
              </InlineStack>

              <TextField
                label="ALT text template"
                labelHidden
                value={customTemplate}
                onChange={setCustomTemplate}
                placeholder="e.g., {product_title} by {vendor}"
                autoComplete="off"
                disabled={disabled}
                multiline={2}
              />
            </BlockStack>

            {/* Custom Preview */}
            {customTemplate && (
              <Box
                padding="300"
                background="bg-surface-success"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Preview for "{product.title}" (Image {imagePosition}):
                  </Text>

                  <Text as="p" variant="bodyMd">
                    {customPreviewAltText}
                  </Text>

                  <Text as="p" variant="bodySm" tone="subdued">
                    Length: {customPreviewAltText.length} characters
                    {customPreviewAltText.length > 125 && " (Consider shortening)"}
                  </Text>
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
              (mode === "template" && !previewAltText) ||
              (mode === "custom" && !customPreviewAltText)
            }
          >
            Apply Template
          </Button>
        </InlineStack>

        {/* Available Variables Reference */}
        <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Available Variables
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "8px",
              }}
            >
              {ALT_TEMPLATE_VARIABLES.map((variable) => (
                <Text key={variable.key} as="p" variant="bodySm" tone="subdued">
                  <code style={{ fontSize: "11px" }}>{`{${variable.key}}`}</code>
                  {" - "}
                  {variable.label}
                </Text>
              ))}
            </div>
          </BlockStack>
        </Box>

        {/* SEO Tips */}
        <Box padding="300" background="bg-surface-caution" borderRadius="200">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              ALT Text Best Practices
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm">
                • Keep it under 125 characters for optimal accessibility
              </Text>
              <Text as="p" variant="bodySm">
                • Describe what's in the image, not just the product name
              </Text>
              <Text as="p" variant="bodySm">
                • Avoid "image of" or "picture of" - it's implied
              </Text>
              <Text as="p" variant="bodySm">
                • Include relevant keywords naturally
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
