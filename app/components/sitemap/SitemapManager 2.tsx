import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  DataTable,
  Tabs,
  Checkbox,
  Select,
  TextField,
  Icon,
} from '@shopify/polaris';
import {
  FileIcon,
  RefreshIcon,
  ViewIcon,
  ArrowDownIcon,
  CheckIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface SitemapConfig {
  enabled: boolean;
  autoGenerate: boolean;
  includeImages: boolean;
  includeVideos: boolean;
  frequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  excludePatterns: string[];
}

export interface SitemapType {
  id: string;
  name: string;
  type: 'xml' | 'html' | 'rss' | 'news' | 'video' | 'image';
  url: string;
  config: SitemapConfig;
  lastGenerated?: string;
  urlCount: number;
  fileSize: string;
  status: 'active' | 'generating' | 'error';
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  images?: number;
  videos?: number;
}

interface SitemapManagerProps {
  sitemaps?: SitemapType[];
  urls?: SitemapUrl[];
  onGenerateSitemap?: (sitemapId: string) => void;
  onUpdateConfig?: (sitemapId: string, config: Partial<SitemapConfig>) => void;
  onToggleSitemap?: (sitemapId: string) => void;
  onDownloadSitemap?: (sitemapId: string) => void;
  onViewSitemap?: (sitemapId: string) => void;
  onSubmitToGoogle?: (sitemapId: string) => void;
}

const DEFAULT_SITEMAPS: SitemapType[] = [
  {
    id: 'main',
    name: 'Main XML Sitemap',
    type: 'xml',
    url: '/sitemap.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: true,
      includeVideos: false,
      frequency: 'daily',
      priority: 0.8,
      excludePatterns: [],
    },
  },
  {
    id: 'products',
    name: 'Products Sitemap',
    type: 'xml',
    url: '/sitemap-products.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: true,
      includeVideos: false,
      frequency: 'daily',
      priority: 1.0,
      excludePatterns: [],
    },
  },
  {
    id: 'collections',
    name: 'Collections Sitemap',
    type: 'xml',
    url: '/sitemap-collections.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: true,
      includeVideos: false,
      frequency: 'weekly',
      priority: 0.7,
      excludePatterns: [],
    },
  },
  {
    id: 'pages',
    name: 'Pages Sitemap',
    type: 'xml',
    url: '/sitemap-pages.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: false,
      includeVideos: false,
      frequency: 'monthly',
      priority: 0.6,
      excludePatterns: [],
    },
  },
  {
    id: 'blog',
    name: 'Blog Posts Sitemap',
    type: 'xml',
    url: '/sitemap-blog.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: true,
      includeVideos: false,
      frequency: 'weekly',
      priority: 0.8,
      excludePatterns: [],
    },
  },
  {
    id: 'image',
    name: 'Image Sitemap',
    type: 'image',
    url: '/sitemap-images.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: false,
      autoGenerate: true,
      includeImages: true,
      includeVideos: false,
      frequency: 'weekly',
      priority: 0.5,
      excludePatterns: [],
    },
  },
  {
    id: 'video',
    name: 'Video Sitemap',
    type: 'video',
    url: '/sitemap-videos.xml',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: false,
      autoGenerate: true,
      includeImages: false,
      includeVideos: true,
      frequency: 'weekly',
      priority: 0.7,
      excludePatterns: [],
    },
  },
  {
    id: 'html',
    name: 'HTML Sitemap',
    type: 'html',
    url: '/sitemap',
    urlCount: 0,
    fileSize: '0 KB',
    status: 'active',
    config: {
      enabled: true,
      autoGenerate: true,
      includeImages: false,
      includeVideos: false,
      frequency: 'daily',
      priority: 0.5,
      excludePatterns: [],
    },
  },
];

export default function SitemapManager({
  sitemaps = DEFAULT_SITEMAPS,
  urls = [],
  onGenerateSitemap,
  onUpdateConfig,
  onToggleSitemap,
  onDownloadSitemap,
  onViewSitemap,
  onSubmitToGoogle,
}: SitemapManagerProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [editingSitemap, setEditingSitemap] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<SitemapConfig | null>(null);

  const tabs = [
    { id: 'overview', content: 'Sitemaps Overview', panelID: 'overview-panel' },
    { id: 'urls', content: `URLs (${urls.length})`, panelID: 'urls-panel' },
    { id: 'settings', content: 'Settings', panelID: 'settings-panel' },
  ];

  const activeSitemaps = sitemaps.filter((s) => s.config.enabled);
  const totalUrls = sitemaps.reduce((sum, s) => sum + s.urlCount, 0);
  const lastGenerated = sitemaps
    .filter((s) => s.lastGenerated)
    .sort((a, b) => new Date(b.lastGenerated!).getTime() - new Date(a.lastGenerated!).getTime())[0];

  const handleEditConfig = (sitemapId: string) => {
    const sitemap = sitemaps.find((s) => s.id === sitemapId);
    if (sitemap) {
      setEditingSitemap(sitemapId);
      setEditConfig(sitemap.config);
    }
  };

  const handleSaveConfig = () => {
    if (editingSitemap && editConfig && onUpdateConfig) {
      onUpdateConfig(editingSitemap, editConfig);
      setEditingSitemap(null);
      setEditConfig(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSitemap(null);
    setEditConfig(null);
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { tone: any; label: string }> = {
      xml: { tone: 'success', label: 'XML' },
      html: { tone: 'info', label: 'HTML' },
      rss: { tone: 'attention', label: 'RSS' },
      news: { tone: 'warning', label: 'News' },
      video: { tone: 'magic', label: 'Video' },
      image: { tone: 'magic', label: 'Image' },
    };
    const badge = badges[type] || { tone: 'info', label: type.toUpperCase() };
    return <Badge tone={badge.tone}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'generating':
        return <Badge tone="attention">Generating...</Badge>;
      case 'error':
        return <Badge tone="critical">Error</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Sitemaps table
  const sitemapRows = sitemaps.map((sitemap) => [
    <div>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {sitemap.name}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {sitemap.url}
      </Text>
    </div>,
    getTypeBadge(sitemap.type),
    getStatusBadge(sitemap.status),
    sitemap.urlCount.toLocaleString(),
    sitemap.fileSize,
    sitemap.lastGenerated ? new Date(sitemap.lastGenerated).toLocaleDateString() : '-',
    <InlineStack gap="100">
      {sitemap.config.enabled ? (
        <Badge tone="success">Enabled</Badge>
      ) : (
        <Badge>Disabled</Badge>
      )}
    </InlineStack>,
    <InlineStack gap="100">
      {onViewSitemap && (
        <Button size="slim" icon={ViewIcon} onClick={() => onViewSitemap(sitemap.id)} />
      )}
      {onDownloadSitemap && (
        <Button size="slim" icon={ArrowDownIcon} onClick={() => onDownloadSitemap(sitemap.id)} />
      )}
      {onGenerateSitemap && (
        <Button size="slim" onClick={() => onGenerateSitemap(sitemap.id)}>
          Generate
        </Button>
      )}
      <Button size="slim" onClick={() => handleEditConfig(sitemap.id)}>
        Configure
      </Button>
    </InlineStack>,
  ]);

  // URLs table
  const urlRows = urls.slice(0, 50).map((url) => [
    <div style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodySm">
        {url.loc}
      </Text>
    </div>,
    url.lastmod ? new Date(url.lastmod).toLocaleDateString() : '-',
    url.changefreq || '-',
    url.priority?.toFixed(1) || '-',
    url.images ? `${url.images} images` : '-',
    url.videos ? `${url.videos} videos` : '-',
  ]);

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Sitemap Manager
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Generate and manage XML, HTML, and specialized sitemaps
            </Text>
          </div>
          {onGenerateSitemap && (
            <Button variant="primary" icon={RefreshIcon} onClick={() => onGenerateSitemap('all')}>
              Regenerate All
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Statistics */}
      <InlineStack gap="400" wrap>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Active Sitemaps
              </Text>
              <Text as="p" variant="heading2xl">
                {activeSitemaps.length}/{sitemaps.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total URLs
              </Text>
              <Text as="p" variant="heading2xl">
                {totalUrls.toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Last Generated
              </Text>
              <Text as="p" variant="heading2xl">
                {lastGenerated?.lastGenerated
                  ? new Date(lastGenerated.lastGenerated).toLocaleDateString()
                  : 'Never'}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Edit Configuration Modal */}
      {editingSitemap && editConfig && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Configure {sitemaps.find((s) => s.id === editingSitemap)?.name}
            </Text>

            <Checkbox
              label="Enable this sitemap"
              checked={editConfig.enabled}
              onChange={(value) => setEditConfig({ ...editConfig, enabled: value })}
            />

            <Checkbox
              label="Auto-generate when content changes"
              checked={editConfig.autoGenerate}
              onChange={(value) => setEditConfig({ ...editConfig, autoGenerate: value })}
            />

            <Checkbox
              label="Include image data"
              checked={editConfig.includeImages}
              onChange={(value) => setEditConfig({ ...editConfig, includeImages: value })}
            />

            <Checkbox
              label="Include video data"
              checked={editConfig.includeVideos}
              onChange={(value) => setEditConfig({ ...editConfig, includeVideos: value })}
            />

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Change Frequency"
                  options={[
                    { label: 'Always', value: 'always' },
                    { label: 'Hourly', value: 'hourly' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Yearly', value: 'yearly' },
                    { label: 'Never', value: 'never' },
                  ]}
                  value={editConfig.frequency}
                  onChange={(value: any) => setEditConfig({ ...editConfig, frequency: value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Priority (0.0 - 1.0)"
                  type="number"
                  value={editConfig.priority.toString()}
                  onChange={(value) =>
                    setEditConfig({ ...editConfig, priority: parseFloat(value) || 0.5 })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                  autoComplete="off"
                />
              </div>
            </InlineStack>

            <TextField
              label="Exclude URL Patterns (one per line)"
              value={editConfig.excludePatterns.join('\n')}
              onChange={(value) =>
                setEditConfig({ ...editConfig, excludePatterns: value.split('\n').filter(Boolean) })
              }
              multiline={3}
              placeholder="/admin/*&#10;/account/*&#10;/cart"
              autoComplete="off"
              helpText="Patterns to exclude from this sitemap"
            />

            <InlineStack align="end" gap="200">
              <Button onClick={handleCancelEdit}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveConfig}>
                Save Configuration
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Overview Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Sitemap Files
                </Text>

                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text', 'text', 'text']}
                  headings={['Sitemap', 'Type', 'Status', 'URLs', 'Size', 'Last Generated', 'State', 'Actions']}
                  rows={sitemapRows}
                />

                {onSubmitToGoogle && (
                  <InlineStack align="end">
                    <Button onClick={() => onSubmitToGoogle('all')}>
                      Submit All to Google Search Console
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            )}

            {/* URLs Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Sitemap URLs
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Showing first 50 of {urls.length} URLs
                </Text>

                {urls.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['URL', 'Last Modified', 'Change Frequency', 'Priority', 'Images', 'Videos']}
                    rows={urlRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No URLs in sitemap. Generate sitemaps to see URLs.
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Settings Tab */}
            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Global Sitemap Settings
                </Text>

                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                  }}
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      Sitemap Index Location
                    </Text>
                    <Text as="p" variant="bodySm">
                      Main sitemap index: <code>/sitemap.xml</code>
                    </Text>
                    <Text as="p" variant="bodySm">
                      HTML sitemap: <code>/sitemap</code>
                    </Text>
                  </BlockStack>
                </div>

                <Text as="h4" variant="headingSm">
                  Robots.txt Configuration
                </Text>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                >
                  <pre>
{`User-agent: *
Sitemap: https://yourstore.com/sitemap.xml
Sitemap: https://yourstore.com/sitemap-products.xml
Sitemap: https://yourstore.com/sitemap-collections.xml
Sitemap: https://yourstore.com/sitemap-pages.xml
Sitemap: https://yourstore.com/sitemap-blog.xml`}
                  </pre>
                </div>
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Sitemap Best Practices
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
                  <strong>Split by type</strong> - Use separate sitemaps for products, pages, blog posts
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>50,000 URL limit</strong> - Split large sitemaps into multiple files
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Update regularly</strong> - Regenerate when content changes
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Submit to GSC</strong> - Let Google know about your sitemaps
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Include images/videos</strong> - Help them get indexed in image/video search
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Use priority wisely</strong> - Don't set everything to 1.0
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
