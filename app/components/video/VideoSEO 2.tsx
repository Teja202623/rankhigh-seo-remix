import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Button,
  Badge,
  DataTable,
  Tabs,
  Checkbox,
  Icon,
} from '@shopify/polaris';
import {
  PlayIcon,
  ViewIcon,
  PlusIcon,
  DeleteIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  uploadDate: string;
  duration: string; // ISO 8601 duration (e.g., "PT5M30S")
  category?: string;
  tags?: string[];
  transcript?: string;
  embedUrl?: string;
}

export interface VideoSEOConfig {
  enableVideoSchema: boolean;
  autoGenerateTranscripts: boolean;
  addVideoSitemap: boolean;
  optimizeThumbnails: boolean;
  includeUploadDate: boolean;
  includeDuration: boolean;
  includeViewCount: boolean;
  requireDescription: boolean;
  minDescriptionLength: number;
}

export interface VideoPerformance {
  videoId: string;
  views: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  watchTime: string;
}

interface VideoSEOProps {
  videos?: VideoMetadata[];
  config?: VideoSEOConfig;
  performance?: VideoPerformance[];
  onSaveVideo?: (video: VideoMetadata) => void;
  onDeleteVideo?: (id: string) => void;
  onUpdateConfig?: (config: VideoSEOConfig) => void;
  onGenerateTranscript?: (videoId: string) => void;
  onOptimizeThumbnail?: (videoId: string) => void;
}

const DEFAULT_CONFIG: VideoSEOConfig = {
  enableVideoSchema: true,
  autoGenerateTranscripts: false,
  addVideoSitemap: true,
  optimizeThumbnails: true,
  includeUploadDate: true,
  includeDuration: true,
  includeViewCount: false,
  requireDescription: true,
  minDescriptionLength: 100,
};

export default function VideoSEO({
  videos = [],
  config: initialConfig = DEFAULT_CONFIG,
  performance = [],
  onSaveVideo,
  onDeleteVideo,
  onUpdateConfig,
  onGenerateTranscript,
  onOptimizeThumbnail,
}: VideoSEOProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<VideoSEOConfig>(initialConfig);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [newVideo, setNewVideo] = useState<Partial<VideoMetadata>>({
    title: '',
    description: '',
    thumbnailUrl: '',
    contentUrl: '',
    duration: '',
    tags: [],
  });

  const tabs = [
    { id: 'videos', content: `Videos (${videos.length})`, panelID: 'videos-panel' },
    { id: 'performance', content: 'Performance', panelID: 'performance-panel' },
    { id: 'settings', content: 'Settings', panelID: 'settings-panel' },
  ];

  const totalViews = performance.reduce((sum, p) => sum + p.views, 0);
  const avgCTR = performance.length > 0
    ? (performance.reduce((sum, p) => sum + p.ctr, 0) / performance.length).toFixed(2)
    : '0.00';
  const videosWithSchema = videos.filter((v) => config.enableVideoSchema).length;

  const handleAddVideo = () => {
    if (newVideo.title && newVideo.contentUrl && onSaveVideo) {
      onSaveVideo({
        ...newVideo,
        id: Date.now().toString(),
        uploadDate: new Date().toISOString(),
      } as VideoMetadata);
      setNewVideo({
        title: '',
        description: '',
        thumbnailUrl: '',
        contentUrl: '',
        duration: '',
        tags: [],
      });
      setIsAddingVideo(false);
    }
  };

  const handleSaveConfig = () => {
    if (onUpdateConfig) {
      onUpdateConfig(config);
    }
  };

  const parseDuration = (duration: string): string => {
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    const hours = match[1] ? `${match[1]}h ` : '';
    const minutes = match[2] ? `${match[2]}m ` : '';
    const seconds = match[3] ? `${match[3]}s` : '';
    return `${hours}${minutes}${seconds}`.trim();
  };

  // Generate VideoObject schema
  const generateVideoSchema = (video: VideoMetadata) => {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      contentUrl: video.contentUrl,
    };

    if (config.includeUploadDate) {
      schema.uploadDate = video.uploadDate;
    }

    if (config.includeDuration && video.duration) {
      schema.duration = video.duration;
    }

    if (video.embedUrl) {
      schema.embedUrl = video.embedUrl;
    }

    if (video.transcript) {
      schema.transcript = {
        '@type': 'WebPageElement',
        text: video.transcript,
      };
    }

    return schema;
  };

  // Videos table
  const videoRows = videos.map((video) => [
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
        />
      ) : (
        <div
          style={{
            width: '80px',
            height: '45px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon source={PlayIcon} tone="subdued" />
        </div>
      )}
      <div>
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {video.title}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {video.description?.substring(0, 60)}...
        </Text>
      </div>
    </div>,
    video.duration ? parseDuration(video.duration) : '-',
    new Date(video.uploadDate).toLocaleDateString(),
    video.tags && video.tags.length > 0 ? (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {video.tags.slice(0, 3).map((tag, i) => (
          <Badge key={i}>{tag}</Badge>
        ))}
        {video.tags.length > 3 && <Badge>{`+${video.tags.length - 3}`}</Badge>}
      </div>
    ) : (
      '-'
    ),
    video.transcript ? (
      <Badge tone="success">Yes</Badge>
    ) : (
      <Badge>No</Badge>
    ),
    <InlineStack gap="100">
      <Button size="slim" icon={ViewIcon}>
        View
      </Button>
      {onGenerateTranscript && !video.transcript && (
        <Button size="slim" onClick={() => onGenerateTranscript(video.id)}>
          Generate Transcript
        </Button>
      )}
      {onDeleteVideo && (
        <Button size="slim" tone="critical" icon={DeleteIcon} onClick={() => onDeleteVideo(video.id)} />
      )}
    </InlineStack>,
  ]);

  // Performance table
  const performanceRows = performance.map((perf) => {
    const video = videos.find((v) => v.id === perf.videoId);
    return [
      video?.title || perf.videoId,
      perf.views.toLocaleString(),
      perf.impressions.toLocaleString(),
      `${perf.ctr.toFixed(2)}%`,
      perf.avgPosition.toFixed(1),
      perf.watchTime,
    ];
  });

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Video SEO
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Optimize your videos for search engines
            </Text>
          </div>
          {!isAddingVideo && onSaveVideo && (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsAddingVideo(true)}>
              Add Video
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Statistics */}
      <InlineStack gap="400" wrap>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={PlayIcon} tone="info" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Videos
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {videos.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={PlayIcon} tone="success" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Views
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {totalViews.toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average CTR
              </Text>
              <Text as="p" variant="heading2xl">
                {avgCTR}%
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                With Schema
              </Text>
              <Text as="p" variant="heading2xl">
                {videosWithSchema}/{videos.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Add Video Form */}
      {isAddingVideo && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Add New Video
            </Text>

            <TextField
              label="Video Title"
              value={newVideo.title || ''}
              onChange={(value) => setNewVideo({ ...newVideo, title: value })}
              autoComplete="off"
              requiredIndicator
            />

            <TextField
              label="Description"
              value={newVideo.description || ''}
              onChange={(value) => setNewVideo({ ...newVideo, description: value })}
              multiline={3}
              autoComplete="off"
              requiredIndicator
              helpText={`Minimum ${config.minDescriptionLength} characters recommended`}
            />

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Video URL"
                  type="url"
                  value={newVideo.contentUrl || ''}
                  onChange={(value) => setNewVideo({ ...newVideo, contentUrl: value })}
                  autoComplete="off"
                  requiredIndicator
                  placeholder="https://example.com/video.mp4"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Thumbnail URL"
                  type="url"
                  value={newVideo.thumbnailUrl || ''}
                  onChange={(value) => setNewVideo({ ...newVideo, thumbnailUrl: value })}
                  autoComplete="off"
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>
            </InlineStack>

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Duration (ISO 8601)"
                  value={newVideo.duration || ''}
                  onChange={(value) => setNewVideo({ ...newVideo, duration: value })}
                  autoComplete="off"
                  placeholder="PT5M30S"
                  helpText="e.g., PT5M30S for 5 minutes 30 seconds"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Category"
                  value={newVideo.category || ''}
                  onChange={(value) => setNewVideo({ ...newVideo, category: value })}
                  autoComplete="off"
                  placeholder="Tutorial, Review, etc."
                />
              </div>
            </InlineStack>

            <TextField
              label="Tags (comma-separated)"
              value={newVideo.tags?.join(', ') || ''}
              onChange={(value) =>
                setNewVideo({
                  ...newVideo,
                  tags: value.split(',').map((t) => t.trim()).filter(Boolean),
                })
              }
              autoComplete="off"
              placeholder="seo, tutorial, marketing"
            />

            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsAddingVideo(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleAddVideo}
                disabled={!newVideo.title || !newVideo.contentUrl}
              >
                Add Video
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Videos Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                {videos.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Video', 'Duration', 'Upload Date', 'Tags', 'Transcript', 'Actions']}
                    rows={videoRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={PlayIcon} />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No videos yet
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Add your first video to start optimizing for search
                    </Text>
                    {!isAddingVideo && onSaveVideo && (
                      <div style={{ marginTop: '16px' }}>
                        <Button variant="primary" onClick={() => setIsAddingVideo(true)}>
                          Add Your First Video
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </BlockStack>
            )}

            {/* Performance Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Video Performance
                </Text>

                {performance.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'numeric', 'text', 'text', 'text']}
                    headings={['Video', 'Views', 'Impressions', 'CTR', 'Avg Position', 'Watch Time']}
                    rows={performanceRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No performance data available yet
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Settings Tab */}
            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Video SEO Settings
                </Text>

                <Checkbox
                  label="Enable VideoObject schema markup"
                  checked={config.enableVideoSchema}
                  onChange={(value) => setConfig({ ...config, enableVideoSchema: value })}
                  helpText="Adds structured data to help search engines understand your videos"
                />

                <Checkbox
                  label="Add videos to video sitemap"
                  checked={config.addVideoSitemap}
                  onChange={(value) => setConfig({ ...config, addVideoSitemap: value })}
                  helpText="Creates a separate sitemap for video content"
                />

                <Checkbox
                  label="Auto-generate transcripts (requires API)"
                  checked={config.autoGenerateTranscripts}
                  onChange={(value) => setConfig({ ...config, autoGenerateTranscripts: value })}
                  helpText="Automatically generate transcripts for better accessibility and SEO"
                />

                <Checkbox
                  label="Optimize thumbnail images"
                  checked={config.optimizeThumbnails}
                  onChange={(value) => setConfig({ ...config, optimizeThumbnails: value })}
                  helpText="Compress and resize thumbnails for faster loading"
                />

                <Checkbox
                  label="Include upload date in schema"
                  checked={config.includeUploadDate}
                  onChange={(value) => setConfig({ ...config, includeUploadDate: value })}
                />

                <Checkbox
                  label="Include duration in schema"
                  checked={config.includeDuration}
                  onChange={(value) => setConfig({ ...config, includeDuration: value })}
                />

                <Checkbox
                  label="Include view count in schema"
                  checked={config.includeViewCount}
                  onChange={(value) => setConfig({ ...config, includeViewCount: value })}
                />

                <Checkbox
                  label="Require video description"
                  checked={config.requireDescription}
                  onChange={(value) => setConfig({ ...config, requireDescription: value })}
                />

                {config.requireDescription && (
                  <TextField
                    label="Minimum description length"
                    type="number"
                    value={config.minDescriptionLength.toString()}
                    onChange={(value) =>
                      setConfig({ ...config, minDescriptionLength: parseInt(value, 10) || 100 })
                    }
                    autoComplete="off"
                    suffix="characters"
                  />
                )}

                <InlineStack align="end">
                  <Button variant="primary" onClick={handleSaveConfig}>
                    Save Settings
                  </Button>
                </InlineStack>

                {/* Schema Preview */}
                {videos.length > 0 && (
                  <div>
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      VideoObject Schema Preview
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
                        maxHeight: '300px',
                      }}
                    >
                      <pre>{JSON.stringify(generateVideoSchema(videos[0]), null, 2)}</pre>
                    </div>
                  </div>
                )}
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Video SEO Best Practices
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
                  <strong>Descriptive titles</strong> - Include target keywords naturally
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Detailed descriptions</strong> - Write at least 200 characters
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Custom thumbnails</strong> - Use high-quality, relevant images
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Video transcripts</strong> - Improve accessibility and SEO
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Schema markup</strong> - Help Google show rich results
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Video sitemap</strong> - Submit to Google Search Console
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
