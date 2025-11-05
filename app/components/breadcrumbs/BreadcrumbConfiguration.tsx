import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  TextField,
  Checkbox,
  Button,
  Badge,
  Divider,
  Icon,
} from '@shopify/polaris';
import { HomeIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface BreadcrumbConfig {
  enabled: boolean;
  separator: string;
  showHome: boolean;
  homeLabel: string;
  addStructuredData: boolean;
  hideOnHomepage: boolean;
  prefixBlogCategory: boolean;
  prefixProductCategory: boolean;
  maxItems: number;
  customCss?: string;
}

export interface BreadcrumbPreview {
  path: string;
  items: Array<{ label: string; url: string }>;
}

interface BreadcrumbConfigurationProps {
  config: BreadcrumbConfig;
  previewPath?: string;
  onSave?: (config: BreadcrumbConfig) => void;
  onTest?: (path: string) => BreadcrumbPreview;
}

const SEPARATOR_OPTIONS = [
  { label: '/ (Slash)', value: '/' },
  { label: '> (Greater Than)', value: '>' },
  { label: '» (Double Right)', value: '»' },
  { label: '· (Dot)', value: '·' },
  { label: '→ (Arrow)', value: '→' },
  { label: '| (Pipe)', value: '|' },
  { label: 'Custom', value: 'custom' },
];

export default function BreadcrumbConfiguration({
  config: initialConfig,
  previewPath = '/collections/mens-clothing/products/blue-shirt',
  onSave,
  onTest,
}: BreadcrumbConfigurationProps) {
  const [config, setConfig] = useState<BreadcrumbConfig>(initialConfig);
  const [customSeparator, setCustomSeparator] = useState('');
  const [testPath, setTestPath] = useState(previewPath);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateConfig = (updates: Partial<BreadcrumbConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(config);
      setHasUnsavedChanges(false);
    }
  };

  // Generate preview breadcrumbs
  const generatePreview = (): BreadcrumbPreview => {
    if (onTest) {
      return onTest(testPath);
    }

    // Default preview generation
    const parts = testPath.split('/').filter((p) => p);
    const items: Array<{ label: string; url: string }> = [];

    if (config.showHome) {
      items.push({ label: config.homeLabel, url: '/' });
    }

    let currentPath = '';
    parts.forEach((part, index) => {
      currentPath += `/${part}`;
      const label = part
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (index < config.maxItems - 1 || config.maxItems === 0) {
        items.push({ label, url: currentPath });
      }
    });

    return { path: testPath, items };
  };

  const preview = generatePreview();
  const separator = config.separator === 'custom' ? customSeparator : config.separator;

  // Generate structured data JSON-LD
  const generateStructuredData = () => {
    const baseUrl = 'https://yourstore.myshopify.com';
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: preview.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `${baseUrl}${item.url}`,
      })),
    };
  };

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Breadcrumb Configuration
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Configure breadcrumb navigation for better SEO and user experience
            </Text>
          </div>
          {hasUnsavedChanges && (
            <Badge tone="warning">Unsaved Changes</Badge>
          )}
        </InlineStack>
      </Card>

      {/* Main Settings */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            General Settings
          </Text>

          <Checkbox
            label="Enable breadcrumbs"
            checked={config.enabled}
            onChange={(value) => updateConfig({ enabled: value })}
            helpText="Show breadcrumb navigation on your store"
          />

          {config.enabled && (
            <>
              <Divider />

              <InlineStack gap="400" wrap={false}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Separator"
                    options={SEPARATOR_OPTIONS}
                    value={config.separator}
                    onChange={(value) => updateConfig({ separator: value })}
                  />
                </div>
                {config.separator === 'custom' && (
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Custom Separator"
                      value={customSeparator}
                      onChange={setCustomSeparator}
                      placeholder="Enter custom separator"
                      autoComplete="off"
                    />
                  </div>
                )}
              </InlineStack>

              <Checkbox
                label="Show home link"
                checked={config.showHome}
                onChange={(value) => updateConfig({ showHome: value })}
                helpText="Include homepage as first breadcrumb item"
              />

              {config.showHome && (
                <TextField
                  label="Home Label"
                  value={config.homeLabel}
                  onChange={(value) => updateConfig({ homeLabel: value })}
                  placeholder="Home"
                  autoComplete="off"
                />
              )}

              <TextField
                label="Maximum Items"
                type="number"
                value={config.maxItems.toString()}
                onChange={(value) => updateConfig({ maxItems: parseInt(value) || 0 })}
                helpText="Maximum number of breadcrumb items to show (0 = unlimited)"
                autoComplete="off"
              />
            </>
          )}
        </BlockStack>
      </Card>

      {/* Advanced Settings */}
      {config.enabled && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Advanced Settings
            </Text>

            <Checkbox
              label="Add structured data (Schema.org)"
              checked={config.addStructuredData}
              onChange={(value) => updateConfig({ addStructuredData: value })}
              helpText="Add BreadcrumbList schema markup for better search visibility"
            />

            <Checkbox
              label="Hide on homepage"
              checked={config.hideOnHomepage}
              onChange={(value) => updateConfig({ hideOnHomepage: value })}
              helpText="Don't show breadcrumbs on the homepage"
            />

            <Checkbox
              label="Prefix blog posts with category"
              checked={config.prefixBlogCategory}
              onChange={(value) => updateConfig({ prefixBlogCategory: value })}
              helpText="Show blog category in breadcrumbs (e.g., Home > Blog > Category > Post)"
            />

            <Checkbox
              label="Prefix products with category"
              checked={config.prefixProductCategory}
              onChange={(value) => updateConfig({ prefixProductCategory: value })}
              helpText="Show product category in breadcrumbs"
            />

            <TextField
              label="Custom CSS (Optional)"
              value={config.customCss || ''}
              onChange={(value) => updateConfig({ customCss: value })}
              placeholder=".breadcrumb { font-size: 14px; }"
              multiline={3}
              autoComplete="off"
              helpText="Add custom CSS to style your breadcrumbs"
            />
          </BlockStack>
        </Card>
      )}

      {/* Preview */}
      {config.enabled && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Preview
            </Text>

            <TextField
              label="Test Path"
              value={testPath}
              onChange={setTestPath}
              placeholder="/collections/mens-clothing/products/blue-shirt"
              autoComplete="off"
              helpText="Enter a URL path to preview breadcrumbs"
            />

            {/* Breadcrumb Preview */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <InlineStack gap="200" blockAlign="center" wrap={false}>
                {preview.items.map((item, index) => (
                  <InlineStack key={index} gap="200" blockAlign="center" wrap={false}>
                    {index === 0 && config.showHome && (
                      <Icon source={HomeIcon} tone="subdued" />
                    )}
                    <Text
                      as="span"
                      variant="bodySm"
                      tone={index === preview.items.length - 1 ? 'base' : 'subdued'}
                      fontWeight={index === preview.items.length - 1 ? 'semibold' : 'regular'}
                    >
                      {item.label}
                    </Text>
                    {index < preview.items.length - 1 && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        {separator}
                      </Text>
                    )}
                  </InlineStack>
                ))}
              </InlineStack>
            </div>

            <Text as="p" variant="bodySm" tone="subdued">
              Path: {preview.path}
            </Text>
          </BlockStack>
        </Card>
      )}

      {/* Structured Data Preview */}
      {config.enabled && config.addStructuredData && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Structured Data Preview
            </Text>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#f1f5f9',
                overflow: 'auto',
              }}
            >
              <pre>{JSON.stringify(generateStructuredData(), null, 2)}</pre>
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              This JSON-LD will be added to your pages for enhanced search visibility
            </Text>
          </BlockStack>
        </Card>
      )}

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Breadcrumb Best Practices
          </Text>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <ul style={{ marginLeft: '20px' }}>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Always include structured data</strong> - Helps Google show breadcrumbs in search results
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Keep it simple</strong> - Use clear, concise labels
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Match URL structure</strong> - Breadcrumbs should reflect your site hierarchy
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Start with homepage</strong> - Always begin with your site's root
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Don't link the last item</strong> - Current page shouldn't be clickable
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>

      {/* Save Button */}
      <InlineStack align="end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
        >
          Save Configuration
        </Button>
      </InlineStack>
    </BlockStack>
  );
}
