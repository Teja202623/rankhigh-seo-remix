// app/components/seo/ImageAltEditor.tsx
/**
 * Image ALT Text Editor Component
 *
 * Displays product images in a grid with inline ALT text editing.
 * Features:
 * - Thumbnail grid view of all product images
 * - Inline ALT text editing for each image
 * - Visual indicators for missing ALT text
 * - Character count and SEO guidance
 * - Bulk template application
 *
 * Usage:
 * ```tsx
 * <ImageAltEditor
 *   product={product}
 *   images={product.images.edges.map(e => e.node)}
 *   onUpdateAlt={(imageId, altText) => {...}}
 *   onApplyTemplate={(template) => {...}}
 * />
 * ```
 */

import { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Badge,
  Box,
  Thumbnail,
  Divider,
} from "@shopify/polaris";
import type { ProductImage } from "~/types/seo";

interface ImageAltEditorProps {
  productTitle: string;
  images: ProductImage[];
  onUpdateAlt: (imageId: string, altText: string) => void;
  onSaveImage?: (imageId: string, altText: string) => void;
  disabled?: boolean;
}

export function ImageAltEditor({
  productTitle,
  images,
  onUpdateAlt,
  onSaveImage,
  disabled = false,
}: ImageAltEditorProps) {
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [draftAltTexts, setDraftAltTexts] = useState<Record<string, string>>(
    {}
  );

  /**
   * Start editing an image's ALT text
   */
  const startEdit = (image: ProductImage) => {
    setEditingImageId(image.id);
    setDraftAltTexts({
      ...draftAltTexts,
      [image.id]: image.altText || "",
    });
  };

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setEditingImageId(null);
  };

  /**
   * Update draft ALT text
   */
  const updateDraft = (imageId: string, value: string) => {
    setDraftAltTexts({
      ...draftAltTexts,
      [imageId]: value,
    });
  };

  /**
   * Get badge for ALT text status
   */
  const getAltBadge = (image: ProductImage) => {
    if (!image.altText || image.altText.trim() === "") {
      return <Badge tone="critical">Missing</Badge>;
    } else if (image.altText.length < 20) {
      return <Badge tone="warning">Too Short</Badge>;
    } else if (image.altText.length > 125) {
      return <Badge tone="warning">Too Long</Badge>;
    } else {
      return <Badge tone="success">Good</Badge>;
    }
  };

  if (images.length === 0) {
    return (
      <Card>
        <BlockStack gap="300">
          <Text as="p" variant="bodyMd" tone="subdued">
            No images found for this product.
          </Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm" fontWeight="semibold">
            Product Images ({images.length})
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            {images.filter((img) => img.altText && img.altText.trim() !== "").length} of{" "}
            {images.length} with ALT text
          </Text>
        </InlineStack>

        <Divider />

        {/* Images Grid */}
        <BlockStack gap="400">
          {images.map((image, index) => {
            const isEditing = editingImageId === image.id;
            const currentDraft = draftAltTexts[image.id] || image.altText || "";

            return (
              <div key={image.id}>
                <Card>
                  <BlockStack gap="300">
                    {/* Image Header */}
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={image.src}
                          alt={image.altText || `Image ${index + 1}`}
                          size="large"
                        />
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            Image {index + 1}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {image.width && image.height
                              ? `${image.width} x ${image.height}px`
                              : "Size unknown"}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      {getAltBadge(image)}
                    </InlineStack>

                    {/* ALT Text Editor */}
                    {isEditing ? (
                      <BlockStack gap="300">
                        <TextField
                          label="ALT Text"
                          value={currentDraft}
                          onChange={(value) => updateDraft(image.id, value)}
                          autoComplete="off"
                          disabled={disabled}
                          multiline={2}
                          helpText={`${currentDraft.length} characters. Recommended: 20-125 characters.`}
                          placeholder={`Describe what's in image ${index + 1}...`}
                        />
                        <InlineStack gap="200">
                          <Button
                            variant="primary"
                            onClick={() => {
                              const altText = currentDraft;
                              onUpdateAlt(image.id, altText);
                              onSaveImage?.(image.id, altText);
                              setEditingImageId(null);
                            }}
                            disabled={disabled}
                            size="slim"
                          >
                            Save
                          </Button>
                          <Button onClick={cancelEdit} size="slim">
                            Cancel
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    ) : (
                      <BlockStack gap="200">
                        {image.altText ? (
                          <Box
                            padding="300"
                            background="bg-surface"
                            borderRadius="200"
                          >
                            <BlockStack gap="100">
                              <Text as="p" variant="bodySm" tone="subdued">
                                ALT Text:
                              </Text>
                              <Text as="p" variant="bodyMd">
                                {image.altText}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {image.altText.length} characters
                              </Text>
                            </BlockStack>
                          </Box>
                        ) : (
                          <Box
                            padding="300"
                            background="bg-surface-critical"
                            borderRadius="200"
                          >
                            <Text as="p" variant="bodyMd" tone="critical">
                              No ALT text set for this image
                            </Text>
                          </Box>
                        )}
                        <InlineStack gap="200">
                          <Button
                            onClick={() => startEdit(image)}
                            disabled={disabled}
                            size="slim"
                          >
                            {image.altText ? "Edit" : "Add ALT Text"}
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              </div>
            );
          })}
        </BlockStack>

        {/* Summary */}
        <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              SEO Tip
            </Text>
            <Text as="p" variant="bodySm">
              ALT text helps search engines understand your images and improves
              accessibility. Describe what's in each image naturally, including
              relevant product keywords.
            </Text>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
