import { Card, Text, BlockStack, DataTable, Badge, Button, InlineStack, TextField, Icon } from '@shopify/polaris';
import { ImageIcon, AlertTriangleIcon, CheckCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface ImageIssue {
  id: string;
  src: string;
  alt: string;
  page: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  issues: string[];
  suggestedAlt?: string;
}

interface ImageSEOPanelProps {
  images: ImageIssue[];
  onUpdateAlt?: (imageId: string, newAlt: string) => void;
  onBulkOptimize?: (imageIds: string[]) => void;
}

export default function ImageSEOPanel({ images, onUpdateAlt, onBulkOptimize }: ImageSEOPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIssueBadges = (issues: string[]) => {
    return issues.map((issue, idx) => (
      <Badge key={idx} tone={issue.includes('Missing') ? 'critical' : 'warning'}>
        {issue}
      </Badge>
    ));
  };

  const handleStartEdit = (image: ImageIssue) => {
    setEditingId(image.id);
    setEditAlt(image.alt || image.suggestedAlt || '');
  };

  const handleSaveAlt = (imageId: string) => {
    if (onUpdateAlt && editAlt.trim()) {
      onUpdateAlt(imageId, editAlt);
      setEditingId(null);
      setEditAlt('');
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  };

  // Calculate statistics
  const missingAlt = images.filter((img) => !img.alt || img.alt.trim() === '').length;
  const oversized = images.filter((img) => img.fileSize > 200 * 1024).length;
  const totalIssues = images.reduce((sum, img) => sum + img.issues.length, 0);

  const rows = images.map((image) => [
    <div style={{ width: '60px', height: '60px', overflow: 'hidden', borderRadius: '4px' }}>
      <img
        src={image.src}
        alt={image.alt || 'No alt text'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%23ddd" width="60" height="60"/%3E%3C/svg%3E';
        }}
      />
    </div>,
    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {editingId === image.id ? (
        <TextField
          label="ALT Text"
          labelHidden
          value={editAlt}
          onChange={setEditAlt}
          autoComplete="off"
          placeholder="Enter ALT text..."
        />
      ) : (
        <Text as="span" variant="bodySm">
          {image.alt || <span style={{ color: '#ef4444' }}>Missing ALT</span>}
        </Text>
      )}
    </div>,
    formatFileSize(image.fileSize),
    `${image.dimensions.width}×${image.dimensions.height}`,
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{getIssueBadges(image.issues)}</div>,
    image.page,
    <InlineStack gap="200">
      {editingId === image.id ? (
        <>
          <Button size="slim" onClick={() => handleSaveAlt(image.id)}>
            Save
          </Button>
          <Button size="slim" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button size="slim" onClick={() => handleStartEdit(image)}>
            Edit ALT
          </Button>
          {image.suggestedAlt && (
            <Button
              size="slim"
              onClick={() => onUpdateAlt && onUpdateAlt(image.id, image.suggestedAlt!)}
            >
              Use AI Suggestion
            </Button>
          )}
        </>
      )}
    </InlineStack>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Statistics */}
      <InlineStack gap="400" wrap={false}>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Images
              </Text>
              <Text as="p" variant="heading2xl">
                {images.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Missing ALT Tags
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: missingAlt > 0 ? '#ef4444' : '#10b981' }}>{missingAlt}</span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Oversized Images
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: oversized > 0 ? '#f59e0b' : '#10b981' }}>{oversized}</span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Issues
              </Text>
              <Text as="p" variant="heading2xl">
                {totalIssues}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Main Table */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Image SEO Analysis
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Optimize images for better performance and SEO
              </Text>
            </div>
            {selectedImages.length > 0 && onBulkOptimize && (
              <Button onClick={() => onBulkOptimize(selectedImages)}>
                Optimize {`${selectedImages.length} Selected`}
              </Button>
            )}
          </InlineStack>

          {images.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
              headings={['Preview', 'ALT Text', 'Size', 'Dimensions', 'Issues', 'Page', 'Actions']}
              rows={rows}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Icon source={CheckCircleIcon} tone="success" />
              </div>
              <Text as="p" variant="headingMd" fontWeight="semibold">
                No image issues found!
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                All your images have proper ALT tags and optimization.
              </Text>
            </div>
          )}

          {/* Recommendations */}
          {images.length > 0 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
              }}
            >
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={AlertTriangleIcon} tone="warning" />
                  <Text as="h3" variant="headingSm">
                    Optimization Tips
                  </Text>
                </InlineStack>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Keep image file sizes under 200KB for optimal page speed
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use descriptive ALT text that explains what's in the image
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Consider using WebP format for better compression
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include your focus keyword in 1-2 image ALT tags per page
                    </Text>
                  </li>
                </ul>
              </BlockStack>
            </div>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
