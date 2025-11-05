import {
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  InlineStack,
  Badge,
  Icon,
  Select,
  Checkbox,
  Banner,
  DataTable,
} from '@shopify/polaris';
import { AlertTriangleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface RSSFeedConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  language: string;
  itemCount: number;
  fullContent: boolean;
  includeFeaturedImage: boolean;
  includeAuthor: boolean;
  categories: string[];
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  feedUrl: string;
  type: 'blog' | 'products' | 'news' | 'podcast' | 'custom';
  enabled: boolean;
}

export interface PodcastConfig {
  author: string;
  email: string;
  category: string;
  subcategory?: string;
  explicit: boolean;
  copyright: string;
  imageUrl: string;
}

interface RSSFeedOptimizationProps {
  feeds?: RSSFeedConfig[];
  onSave?: (feeds: RSSFeedConfig[]) => void;
  onTestFeed?: (feedId: string) => void;
}

const DEFAULT_FEED: RSSFeedConfig = {
  id: 'feed-1',
  name: 'Main Blog Feed',
  title: '',
  description: '',
  language: 'en-US',
  itemCount: 10,
  fullContent: false,
  includeFeaturedImage: true,
  includeAuthor: true,
  categories: [],
  updateFrequency: 'daily',
  feedUrl: '/feeds/blog.xml',
  type: 'blog',
  enabled: true,
};

const LANGUAGE_OPTIONS = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Japanese', value: 'ja' },
];

const UPDATE_FREQUENCY_OPTIONS = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

const FEED_TYPE_OPTIONS = [
  { label: 'Blog Posts', value: 'blog' },
  { label: 'Products', value: 'products' },
  { label: 'News', value: 'news' },
  { label: 'Podcast', value: 'podcast' },
  { label: 'Custom', value: 'custom' },
];

/**
 * RSS Feed Optimization Component
 * Manages RSS feed configuration for SEO and syndication
 */
export default function RSSFeedOptimization({ feeds, onSave, onTestFeed }: RSSFeedOptimizationProps) {
  const [localFeeds, setLocalFeeds] = useState<RSSFeedConfig[]>(feeds || [DEFAULT_FEED]);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const currentFeed = localFeeds[selectedFeedIndex] || DEFAULT_FEED;

  /**
   * Validates the current feed configuration
   */
  const validateFeed = (): boolean => {
    const errors: Record<string, string> = {};

    if (!currentFeed.name.trim()) {
      errors.name = 'Feed name is required';
    }

    if (!currentFeed.title.trim()) {
      errors.title = 'Feed title is required';
    } else if (currentFeed.title.length > 100) {
      errors.title = 'Title should be 100 characters or less';
    }

    if (!currentFeed.description.trim()) {
      errors.description = 'Feed description is required';
    } else if (currentFeed.description.length > 500) {
      errors.description = 'Description should be 500 characters or less';
    }

    if (!currentFeed.feedUrl.trim()) {
      errors.feedUrl = 'Feed URL is required';
    }

    if (currentFeed.itemCount < 1 || currentFeed.itemCount > 50) {
      errors.itemCount = 'Item count must be between 1 and 50';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Updates the current feed configuration
   */
  const updateFeed = (field: keyof RSSFeedConfig, value: string | number | boolean | string[]) => {
    const updatedFeeds = [...localFeeds];
    updatedFeeds[selectedFeedIndex] = {
      ...currentFeed,
      [field]: value,
    };
    setLocalFeeds(updatedFeeds);

    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  /**
   * Handles saving the configuration
   */
  const handleSave = async () => {
    if (!validateFeed()) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');

    try {
      // Simulate async save operation
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onSave) {
        onSave(localFeeds);
      }

      setSuccessMessage('RSS feed configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Adds a new feed
   */
  const handleAddFeed = () => {
    const newFeed: RSSFeedConfig = {
      ...DEFAULT_FEED,
      id: `feed-${Date.now()}`,
      name: `Feed ${localFeeds.length + 1}`,
    };
    setLocalFeeds([...localFeeds, newFeed]);
    setSelectedFeedIndex(localFeeds.length);
  };

  /**
   * Removes the current feed
   */
  const handleRemoveFeed = () => {
    if (localFeeds.length === 1) {
      return; // Don't remove the last feed
    }
    const updatedFeeds = localFeeds.filter((_, index) => index !== selectedFeedIndex);
    setLocalFeeds(updatedFeeds);
    setSelectedFeedIndex(Math.max(0, selectedFeedIndex - 1));
  };

  /**
   * Generates RSS feed XML preview
   */
  const generateFeedXML = (): string => {
    const escape = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(currentFeed.title)}</title>
    <description>${escape(currentFeed.description)}</description>
    <link>https://example.com/</link>
    <language>${currentFeed.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://example.com${currentFeed.feedUrl}" rel="self" type="application/rss+xml" />

    <!-- Sample Item -->
    <item>
      <title>Sample Post Title</title>
      <description>${currentFeed.fullContent ? 'Full post content would appear here...' : 'Post excerpt would appear here...'}</description>
      <link>https://example.com/blog/sample-post</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <guid>https://example.com/blog/sample-post</guid>
      ${currentFeed.includeAuthor ? '<author>author@example.com (Author Name)</author>' : ''}
      ${currentFeed.includeFeaturedImage ? '<enclosure url="https://example.com/images/featured.jpg" type="image/jpeg" />' : ''}
      ${currentFeed.categories.length > 0 ? currentFeed.categories.map((cat) => `<category>${escape(cat)}</category>`).join('\n      ') : ''}
    </item>

  </channel>
</rss>`;
  };

  /**
   * Tests the feed URL
   */
  const handleTestFeed = () => {
    if (onTestFeed) {
      onTestFeed(currentFeed.id);
    }
  };

  // Generate feed list for table
  const feedRows = localFeeds.map((feed, index) => {
    const statusBadge = feed.enabled ? 'Active' : 'Inactive';
    const typeLabel = feed.type.charAt(0).toUpperCase() + feed.type.slice(1);
    const frequencyLabel = feed.updateFrequency.charAt(0).toUpperCase() + feed.updateFrequency.slice(1);

    return [
      feed.name,
      statusBadge,
      typeLabel,
      feed.feedUrl,
      feed.itemCount.toString(),
      frequencyLabel,
      <Button key={`edit-${index}`} size="slim" onClick={() => setSelectedFeedIndex(index)}>
        Edit
      </Button>,
    ];
  });

  return (
    <BlockStack gap="400">
      {/* Header Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                RSS Feed Optimization
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Configure and optimize RSS feeds for content syndication and SEO
              </Text>
            </div>
            <Badge tone="info">RSS/XML</Badge>
          </InlineStack>

          {successMessage && (
            <Banner tone="success" onDismiss={() => setSuccessMessage('')}>
              {successMessage}
            </Banner>
          )}
        </BlockStack>
      </Card>

      {/* Feed List */}
      {localFeeds.length > 1 && (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm">
                Configured Feeds
              </Text>
              <Button onClick={handleAddFeed}>Add New Feed</Button>
            </InlineStack>

            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
              headings={['Name', 'Status', 'Type', 'URL', 'Items', 'Frequency', 'Actions']}
              rows={feedRows}
            />
          </BlockStack>
        </Card>
      )}

      {/* Feed Configuration */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Feed Configuration: {currentFeed.name}
            </Text>
            {localFeeds.length === 1 && <Button onClick={handleAddFeed}>Add Another Feed</Button>}
          </InlineStack>

          <TextField
            label="Feed Name"
            value={currentFeed.name}
            onChange={(value) => updateFeed('name', value)}
            autoComplete="off"
            placeholder="Main Blog Feed"
            error={validationErrors.name}
            helpText="Internal name for this feed (not visible in the feed)"
            requiredIndicator
          />

          <Select
            label="Feed Type"
            options={FEED_TYPE_OPTIONS}
            value={currentFeed.type}
            onChange={(value) => updateFeed('type', value)}
            helpText="The type of content this feed will contain"
          />

          <TextField
            label="Feed Title"
            value={currentFeed.title}
            onChange={(value) => updateFeed('title', value)}
            autoComplete="off"
            placeholder="My Awesome Blog"
            error={validationErrors.title}
            helpText={`${currentFeed.title.length}/100 characters - Appears in feed readers`}
            requiredIndicator
          />

          <TextField
            label="Feed Description"
            value={currentFeed.description}
            onChange={(value) => updateFeed('description', value)}
            autoComplete="off"
            placeholder="A blog about web development and SEO"
            multiline={3}
            error={validationErrors.description}
            helpText={`${currentFeed.description.length}/500 characters - Describes your feed content`}
            requiredIndicator
          />

          <TextField
            label="Feed URL Path"
            value={currentFeed.feedUrl}
            onChange={(value) => updateFeed('feedUrl', value)}
            autoComplete="off"
            placeholder="/feeds/blog.xml"
            error={validationErrors.feedUrl}
            helpText="The URL path where this feed will be accessible"
            requiredIndicator
          />

          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <Select
                label="Language"
                options={LANGUAGE_OPTIONS}
                value={currentFeed.language}
                onChange={(value) => updateFeed('language', value)}
                helpText="Primary language of the feed"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Item Count"
                type="number"
                value={currentFeed.itemCount.toString()}
                onChange={(value) => updateFeed('itemCount', parseInt(value) || 10)}
                autoComplete="off"
                error={validationErrors.itemCount}
                helpText="Number of items to include (1-50)"
              />
            </div>
          </InlineStack>

          <Select
            label="Update Frequency"
            options={UPDATE_FREQUENCY_OPTIONS}
            value={currentFeed.updateFrequency}
            onChange={(value) => updateFeed('updateFrequency', value)}
            helpText="How often the feed should be updated"
          />

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Content Options
            </Text>

            <Checkbox
              label="Include full content"
              checked={currentFeed.fullContent}
              onChange={(value) => updateFeed('fullContent', value)}
              helpText="If unchecked, only excerpts will be included"
            />

            <Checkbox
              label="Include featured images"
              checked={currentFeed.includeFeaturedImage}
              onChange={(value) => updateFeed('includeFeaturedImage', value)}
              helpText="Add featured images to feed items"
            />

            <Checkbox
              label="Include author information"
              checked={currentFeed.includeAuthor}
              onChange={(value) => updateFeed('includeAuthor', value)}
              helpText="Display author name and email in feed items"
            />

            <Checkbox
              label="Enable this feed"
              checked={currentFeed.enabled}
              onChange={(value) => updateFeed('enabled', value)}
              helpText="Make this feed publicly accessible"
            />
          </BlockStack>

          <TextField
            label="Category Filter (optional)"
            value={currentFeed.categories.join(', ')}
            onChange={(value) =>
              updateFeed(
                'categories',
                value.split(',').map((c) => c.trim()).filter(Boolean)
              )
            }
            autoComplete="off"
            placeholder="SEO, Marketing, Technology"
            helpText="Comma-separated list of categories to include"
          />

          {/* Actions */}
          <InlineStack gap="200">
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Save Feed
            </Button>
            <Button onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Hide' : 'Show'} XML Preview
            </Button>
            <Button onClick={handleTestFeed}>Test Feed</Button>
            {localFeeds.length > 1 && (
              <Button tone="critical" onClick={handleRemoveFeed}>
                Remove Feed
              </Button>
            )}
          </InlineStack>

          {/* XML Preview */}
          {showPreview && (
            <div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Feed XML Preview
              </Text>
              <div
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '400px',
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
                  {generateFeedXML()}
                </pre>
              </div>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Best Practices Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={AlertTriangleIcon} tone="warning" />
            <Text as="h3" variant="headingSm">
              RSS Feed Best Practices
            </Text>
          </InlineStack>

          <div style={{ marginLeft: '8px' }}>
            <BlockStack gap="200">
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Feed Optimization
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use descriptive titles and descriptions that include relevant keywords
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Keep item count between 10-25 for optimal performance
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include full content for better syndication and user experience
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Add featured images to increase engagement
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use proper category tags to help readers find relevant content
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Technical Requirements
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Ensure feeds are valid XML (test with validators)
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Set proper Content-Type header: application/rss+xml or application/xml
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include atom:link with rel="self" for feed discovery
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Update lastBuildDate with each feed generation
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use absolute URLs for all links and images
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Distribution & Discovery
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Add feed link to your site header with proper rel="alternate" tag
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Submit feeds to aggregators like Feedly, Feedburner, Apple Podcasts (for podcast feeds)
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Display an RSS icon with link on your website
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Monitor feed analytics to track subscriber engagement
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Consider creating separate feeds for different content types
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  SEO Benefits
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      RSS feeds help search engines discover new content faster
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Syndicated content increases your reach and backlink opportunities
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Proper feed structure helps with content indexing
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include canonical URLs to prevent duplicate content issues
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
