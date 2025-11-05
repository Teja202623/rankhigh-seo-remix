import {
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  InlineStack,
  Badge,
  Icon,
  Tabs,
  Banner,
  Select,
} from '@shopify/polaris';
import { ImageIcon, AlertTriangleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { sanitizeUrl } from '~/utils/validation';

export interface OpenGraphConfig {
  title: string;
  description: string;
  image: string;
  type: string;
  url: string;
  siteName?: string;
  locale?: string;
}

export interface TwitterCardConfig {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  title: string;
  description: string;
  image: string;
  site?: string;
  creator?: string;
}

export interface SocialMediaConfig {
  openGraph: OpenGraphConfig;
  twitter: TwitterCardConfig;
  useTemplates: boolean;
  defaultImage?: string;
}

interface SocialMediaIntegrationProps {
  config?: SocialMediaConfig;
  onSave?: (config: SocialMediaConfig) => void;
}

const DEFAULT_CONFIG: SocialMediaConfig = {
  openGraph: {
    title: '',
    description: '',
    image: '',
    type: 'website',
    url: '',
    siteName: '',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '',
    description: '',
    image: '',
    site: '',
    creator: '',
  },
  useTemplates: true,
  defaultImage: '',
};

const OG_TYPE_OPTIONS = [
  { label: 'Website', value: 'website' },
  { label: 'Article', value: 'article' },
  { label: 'Product', value: 'product' },
  { label: 'Video', value: 'video' },
  { label: 'Music', value: 'music' },
];

const TWITTER_CARD_OPTIONS = [
  { label: 'Summary', value: 'summary' },
  { label: 'Summary with Large Image', value: 'summary_large_image' },
];

/**
 * Social Media Integration Component
 * Manages Open Graph and Twitter Card meta tags for social media sharing
 */
export default function SocialMediaIntegration({ config, onSave }: SocialMediaIntegrationProps) {
  const [localConfig, setLocalConfig] = useState<SocialMediaConfig>(config || DEFAULT_CONFIG);
  const [selectedTab, setSelectedTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Validates the configuration before saving
   */
  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate Open Graph
    if (!localConfig.openGraph.title.trim()) {
      errors.ogTitle = 'Title is required';
    } else if (localConfig.openGraph.title.length > 60) {
      errors.ogTitle = 'Title should be 60 characters or less';
    }

    if (!localConfig.openGraph.description.trim()) {
      errors.ogDescription = 'Description is required';
    } else if (localConfig.openGraph.description.length > 160) {
      errors.ogDescription = 'Description should be 160 characters or less';
    }

    if (localConfig.openGraph.image && !sanitizeUrl(localConfig.openGraph.image)) {
      errors.ogImage = 'Invalid image URL';
    }

    if (localConfig.openGraph.url && !sanitizeUrl(localConfig.openGraph.url)) {
      errors.ogUrl = 'Invalid URL';
    }

    // Validate Twitter
    if (!localConfig.twitter.title.trim()) {
      errors.twitterTitle = 'Title is required';
    } else if (localConfig.twitter.title.length > 70) {
      errors.twitterTitle = 'Title should be 70 characters or less';
    }

    if (!localConfig.twitter.description.trim()) {
      errors.twitterDescription = 'Description is required';
    } else if (localConfig.twitter.description.length > 200) {
      errors.twitterDescription = 'Description should be 200 characters or less';
    }

    if (localConfig.twitter.image && !sanitizeUrl(localConfig.twitter.image)) {
      errors.twitterImage = 'Invalid image URL';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles saving the configuration
   */
  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');

    try {
      // Simulate async save operation
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onSave) {
        onSave(localConfig);
      }

      setSuccessMessage('Social media configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Updates Open Graph configuration
   */
  const updateOpenGraph = (field: keyof OpenGraphConfig, value: string) => {
    setLocalConfig({
      ...localConfig,
      openGraph: {
        ...localConfig.openGraph,
        [field]: value,
      },
    });
    // Clear validation error for this field
    if (validationErrors[`og${field.charAt(0).toUpperCase()}${field.slice(1)}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`og${field.charAt(0).toUpperCase()}${field.slice(1)}`];
      setValidationErrors(newErrors);
    }
  };

  /**
   * Updates Twitter Card configuration
   */
  const updateTwitter = (field: keyof TwitterCardConfig, value: string) => {
    setLocalConfig({
      ...localConfig,
      twitter: {
        ...localConfig.twitter,
        [field]: value,
      },
    });
    // Clear validation error for this field
    if (validationErrors[`twitter${field.charAt(0).toUpperCase()}${field.slice(1)}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`twitter${field.charAt(0).toUpperCase()}${field.slice(1)}`];
      setValidationErrors(newErrors);
    }
  };

  /**
   * Generates meta tags preview
   */
  const generateMetaTags = (): string => {
    const tags: string[] = [];

    // Open Graph tags
    tags.push(`<meta property="og:title" content="${localConfig.openGraph.title}" />`);
    tags.push(`<meta property="og:description" content="${localConfig.openGraph.description}" />`);
    tags.push(`<meta property="og:type" content="${localConfig.openGraph.type}" />`);
    if (localConfig.openGraph.image) {
      tags.push(`<meta property="og:image" content="${localConfig.openGraph.image}" />`);
    }
    if (localConfig.openGraph.url) {
      tags.push(`<meta property="og:url" content="${localConfig.openGraph.url}" />`);
    }
    if (localConfig.openGraph.siteName) {
      tags.push(`<meta property="og:site_name" content="${localConfig.openGraph.siteName}" />`);
    }
    if (localConfig.openGraph.locale) {
      tags.push(`<meta property="og:locale" content="${localConfig.openGraph.locale}" />`);
    }

    // Twitter tags
    tags.push(`<meta name="twitter:card" content="${localConfig.twitter.card}" />`);
    tags.push(`<meta name="twitter:title" content="${localConfig.twitter.title}" />`);
    tags.push(`<meta name="twitter:description" content="${localConfig.twitter.description}" />`);
    if (localConfig.twitter.image) {
      tags.push(`<meta name="twitter:image" content="${localConfig.twitter.image}" />`);
    }
    if (localConfig.twitter.site) {
      tags.push(`<meta name="twitter:site" content="@${localConfig.twitter.site.replace('@', '')}" />`);
    }
    if (localConfig.twitter.creator) {
      tags.push(`<meta name="twitter:creator" content="@${localConfig.twitter.creator.replace('@', '')}" />`);
    }

    return tags.join('\n');
  };

  const tabs = [
    {
      id: 'open-graph',
      content: 'Open Graph (Facebook)',
      panelID: 'open-graph-panel',
    },
    {
      id: 'twitter',
      content: 'Twitter Card',
      panelID: 'twitter-panel',
    },
    {
      id: 'preview',
      content: 'Preview & Code',
      panelID: 'preview-panel',
    },
  ];

  return (
    <BlockStack gap="400">
      {/* Header Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Social Media Integration
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Configure Open Graph and Twitter Card meta tags for optimal social sharing
              </Text>
            </div>
            <Badge tone="info">Social SEO</Badge>
          </InlineStack>

          {successMessage && (
            <Banner tone="success" onDismiss={() => setSuccessMessage('')}>
              {successMessage}
            </Banner>
          )}
        </BlockStack>
      </Card>

      {/* Main Configuration */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ padding: '16px 0' }}>
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm">
                  Open Graph Configuration
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  These tags control how your content appears when shared on Facebook, LinkedIn, and other social
                  platforms
                </Text>

                <TextField
                  label="Title"
                  value={localConfig.openGraph.title}
                  onChange={(value) => updateOpenGraph('title', value)}
                  autoComplete="off"
                  placeholder="Your Page Title"
                  error={validationErrors.ogTitle}
                  helpText={`${localConfig.openGraph.title.length}/60 characters (recommended)`}
                  requiredIndicator
                />

                <TextField
                  label="Description"
                  value={localConfig.openGraph.description}
                  onChange={(value) => updateOpenGraph('description', value)}
                  autoComplete="off"
                  placeholder="A compelling description of your page"
                  multiline={3}
                  error={validationErrors.ogDescription}
                  helpText={`${localConfig.openGraph.description.length}/160 characters (recommended)`}
                  requiredIndicator
                />

                <TextField
                  label="Image URL"
                  value={localConfig.openGraph.image}
                  onChange={(value) => updateOpenGraph('image', value)}
                  autoComplete="off"
                  placeholder="https://example.com/image.jpg"
                  error={validationErrors.ogImage}
                  helpText="Recommended: 1200x630px (1.91:1 ratio), JPG or PNG, max 8MB"
                  prefix={<Icon source={ImageIcon} />}
                />

                <Select
                  label="Content Type"
                  options={OG_TYPE_OPTIONS}
                  value={localConfig.openGraph.type}
                  onChange={(value) => updateOpenGraph('type', value)}
                  helpText="The type of content being shared"
                />

                <TextField
                  label="Canonical URL"
                  value={localConfig.openGraph.url}
                  onChange={(value) => updateOpenGraph('url', value)}
                  autoComplete="off"
                  placeholder="https://example.com/page"
                  error={validationErrors.ogUrl}
                  helpText="The canonical URL of your page"
                />

                <TextField
                  label="Site Name"
                  value={localConfig.openGraph.siteName || ''}
                  onChange={(value) => updateOpenGraph('siteName', value)}
                  autoComplete="off"
                  placeholder="Your Site Name"
                  helpText="Optional: Your website name"
                />

                <TextField
                  label="Locale"
                  value={localConfig.openGraph.locale || ''}
                  onChange={(value) => updateOpenGraph('locale', value)}
                  autoComplete="off"
                  placeholder="en_US"
                  helpText="Optional: Language and region (e.g., en_US, fr_FR)"
                />
              </BlockStack>
            )}

            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm">
                  Twitter Card Configuration
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  These tags control how your content appears when shared on Twitter/X
                </Text>

                <Select
                  label="Card Type"
                  options={TWITTER_CARD_OPTIONS}
                  value={localConfig.twitter.card}
                  onChange={(value) => updateTwitter('card', value as TwitterCardConfig['card'])}
                  helpText="Choose how your content is displayed on Twitter"
                />

                <TextField
                  label="Title"
                  value={localConfig.twitter.title}
                  onChange={(value) => updateTwitter('title', value)}
                  autoComplete="off"
                  placeholder="Your Twitter Title"
                  error={validationErrors.twitterTitle}
                  helpText={`${localConfig.twitter.title.length}/70 characters (recommended)`}
                  requiredIndicator
                />

                <TextField
                  label="Description"
                  value={localConfig.twitter.description}
                  onChange={(value) => updateTwitter('description', value)}
                  autoComplete="off"
                  placeholder="A compelling description for Twitter"
                  multiline={3}
                  error={validationErrors.twitterDescription}
                  helpText={`${localConfig.twitter.description.length}/200 characters (recommended)`}
                  requiredIndicator
                />

                <TextField
                  label="Image URL"
                  value={localConfig.twitter.image}
                  onChange={(value) => updateTwitter('image', value)}
                  autoComplete="off"
                  placeholder="https://example.com/twitter-image.jpg"
                  error={validationErrors.twitterImage}
                  helpText="Recommended: 1200x628px for large image, 120x120px for summary, JPG/PNG/WEBP, max 5MB"
                  prefix={<Icon source={ImageIcon} />}
                />

                <TextField
                  label="Site Handle"
                  value={localConfig.twitter.site || ''}
                  onChange={(value) => updateTwitter('site', value)}
                  autoComplete="off"
                  placeholder="yourbrand"
                  helpText="Optional: Your Twitter/X username (without @)"
                />

                <TextField
                  label="Creator Handle"
                  value={localConfig.twitter.creator || ''}
                  onChange={(value) => updateTwitter('creator', value)}
                  autoComplete="off"
                  placeholder="authorname"
                  helpText="Optional: Content creator's Twitter/X username (without @)"
                />
              </BlockStack>
            )}

            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm">
                  Social Preview
                </Text>

                {/* Facebook Preview */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Facebook/LinkedIn Preview
                  </Text>
                  <div
                    style={{
                      marginTop: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxWidth: '500px',
                    }}
                  >
                    {localConfig.openGraph.image && (
                      <div style={{ backgroundColor: '#f3f4f6', height: '250px', display: 'flex' }}>
                        <img
                          src={localConfig.openGraph.image}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '12px', backgroundColor: '#f9fafb' }}>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {localConfig.openGraph.siteName || 'example.com'}
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {localConfig.openGraph.title || 'Your page title will appear here'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {localConfig.openGraph.description || 'Your description will appear here'}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Twitter/X Preview
                  </Text>
                  <div
                    style={{
                      marginTop: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      maxWidth: '500px',
                    }}
                  >
                    {localConfig.twitter.image && (
                      <div
                        style={{
                          backgroundColor: '#f3f4f6',
                          height: localConfig.twitter.card === 'summary' ? '120px' : '250px',
                          display: 'flex',
                        }}
                      >
                        <img
                          src={localConfig.twitter.image}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '12px', backgroundColor: '#ffffff' }}>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {localConfig.twitter.title || 'Your Twitter title will appear here'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {localConfig.twitter.description || 'Your Twitter description will appear here'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {localConfig.twitter.site ? `@${localConfig.twitter.site.replace('@', '')}` : 'twitter.com'}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Meta Tags Code */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Generated Meta Tags
                  </Text>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '16px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      overflow: 'auto',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        color: '#e2e8f0',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {generateMetaTags()}
                    </pre>
                  </div>
                </div>
              </BlockStack>
            )}
          </div>
        </Tabs>

        <div style={{ marginTop: '16px' }}>
          <InlineStack gap="200">
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Save Configuration
            </Button>
          </InlineStack>
        </div>
      </Card>

      {/* Best Practices Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={AlertTriangleIcon} tone="warning" />
            <Text as="h3" variant="headingSm">
              Social Media Best Practices
            </Text>
          </InlineStack>

          <div style={{ marginLeft: '8px' }}>
            <BlockStack gap="200">
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Image Requirements
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      <strong>Facebook/LinkedIn:</strong> 1200x630px (1.91:1 ratio), max 8MB
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      <strong>Twitter Summary:</strong> 120x120px minimum (1:1 ratio), max 5MB
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      <strong>Twitter Large:</strong> 1200x628px (1.91:1 ratio), max 5MB
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use JPG, PNG, or WEBP formats for best compatibility
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Content Guidelines
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Keep titles concise and attention-grabbing (40-60 characters)
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Write compelling descriptions that encourage clicks (120-160 characters)
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include your brand name in the title or site name field
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use high-quality, relevant images that represent your content
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Testing & Validation
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Test with Facebook Sharing Debugger: developers.facebook.com/tools/debug
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Test with Twitter Card Validator: cards-dev.twitter.com/validator
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Clear social media caches when updating images or metadata
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Monitor social sharing analytics to optimize engagement
                    </Text>
                  </li>
                </ul>
              </div>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
