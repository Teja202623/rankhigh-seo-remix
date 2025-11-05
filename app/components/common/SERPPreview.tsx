import { Card, Text, BlockStack, Tabs, Badge, InlineStack } from '@shopify/polaris';
import { useState } from 'react';

export interface SERPPreviewData {
  title: string;
  description: string;
  url: string;
  siteName?: string;
  image?: string;
  author?: string;
  publishedDate?: string;
}

interface SERPPreviewProps {
  data: SERPPreviewData;
}

export default function SERPPreview({ data }: SERPPreviewProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    {
      id: 'google-desktop',
      content: 'Google Desktop',
      panelID: 'google-desktop-panel',
    },
    {
      id: 'google-mobile',
      content: 'Google Mobile',
      panelID: 'google-mobile-panel',
    },
    {
      id: 'facebook',
      content: 'Facebook',
      panelID: 'facebook-panel',
    },
    {
      id: 'twitter',
      content: 'Twitter',
      panelID: 'twitter-panel',
    },
  ];

  // Character count helpers
  const titleLength = data.title?.length || 0;
  const descLength = data.description?.length || 0;
  const titleMaxGoogle = 60;
  const descMaxGoogle = 160;

  const getTitleTone = () => {
    if (titleLength === 0) return 'critical';
    if (titleLength > titleMaxGoogle) return 'warning';
    if (titleLength < 30) return 'attention';
    return 'success';
  };

  const getDescTone = () => {
    if (descLength === 0) return 'critical';
    if (descLength > descMaxGoogle) return 'warning';
    if (descLength < 70) return 'attention';
    return 'success';
  };

  // Truncate text for display
  const truncate = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            SERP Preview
          </Text>
          <InlineStack gap="200">
            <Badge tone={getTitleTone()}>
              {`Title: ${titleLength}/${titleMaxGoogle}`}
            </Badge>
            <Badge tone={getDescTone()}>
              {`Description: ${descLength}/${descMaxGoogle}`}
            </Badge>
          </InlineStack>
        </InlineStack>

        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Google Desktop */}
            {selectedTab === 0 && (
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontFamily: 'arial, sans-serif',
                }}
              >
                <div style={{ maxWidth: '600px' }}>
                  {/* URL breadcrumb */}
                  <div style={{ marginBottom: '4px' }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <span style={{ color: '#5f6368', fontSize: '14px' }}>
                        {data.url || 'https://example.com/page'}
                      </span>
                    </Text>
                  </div>
                  {/* Title */}
                  <div style={{ marginBottom: '4px' }}>
                    <span
                      style={{
                        color: '#1a0dab',
                        fontSize: '20px',
                        fontWeight: '400',
                        cursor: 'pointer',
                        lineHeight: '1.3',
                      }}
                    >
                      {truncate(data.title || 'Your Page Title', titleMaxGoogle)}
                    </span>
                  </div>
                  {/* Description */}
                  <div>
                    <span style={{ color: '#4d5156', fontSize: '14px', lineHeight: '1.58' }}>
                      {data.publishedDate && (
                        <span style={{ marginRight: '8px', color: '#70757a' }}>
                          {new Date(data.publishedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          —{' '}
                        </span>
                      )}
                      {truncate(
                        data.description || 'Your meta description will appear here...',
                        descMaxGoogle
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Google Mobile */}
            {selectedTab === 1 && (
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontFamily: 'arial, sans-serif',
                  maxWidth: '375px',
                }}
              >
                {/* URL */}
                <div style={{ marginBottom: '2px' }}>
                  <span style={{ color: '#5f6368', fontSize: '12px' }}>
                    {data.url || 'https://example.com/page'}
                  </span>
                </div>
                {/* Title */}
                <div style={{ marginBottom: '4px' }}>
                  <span
                    style={{
                      color: '#1a0dab',
                      fontSize: '18px',
                      fontWeight: '400',
                      lineHeight: '1.3',
                      display: 'block',
                    }}
                  >
                    {truncate(data.title || 'Your Page Title', titleMaxGoogle)}
                  </span>
                </div>
                {/* Description */}
                <div>
                  <span style={{ color: '#4d5156', fontSize: '13px', lineHeight: '1.4' }}>
                    {truncate(
                      data.description || 'Your meta description will appear here...',
                      descMaxGoogle
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Facebook */}
            {selectedTab === 2 && (
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #dadde1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  maxWidth: '500px',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                }}
              >
                {/* Image */}
                {data.image ? (
                  <div
                    style={{
                      width: '100%',
                      height: '260px',
                      backgroundColor: '#f0f2f5',
                      backgroundImage: `url(${data.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '260px',
                      backgroundColor: '#f0f2f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text as="span" variant="bodySm" tone="subdued">
                      No image provided
                    </Text>
                  </div>
                )}
                {/* Content */}
                <div style={{ padding: '12px' }}>
                  {/* URL */}
                  <div style={{ marginBottom: '5px' }}>
                    <span
                      style={{
                        color: '#606770',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {data.url?.replace(/^https?:\/\//, '').split('/')[0] || 'EXAMPLE.COM'}
                    </span>
                  </div>
                  {/* Title */}
                  <div style={{ marginBottom: '5px' }}>
                    <span
                      style={{
                        color: '#1d2129',
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '20px',
                        display: 'block',
                      }}
                    >
                      {truncate(data.title || 'Your Page Title', 100)}
                    </span>
                  </div>
                  {/* Description */}
                  <div>
                    <span
                      style={{
                        color: '#606770',
                        fontSize: '14px',
                        lineHeight: '20px',
                      }}
                    >
                      {truncate(data.description || 'Your description...', 200)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Twitter */}
            {selectedTab === 3 && (
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #cfd9de',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  maxWidth: '500px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                }}
              >
                {/* Image */}
                {data.image ? (
                  <div
                    style={{
                      width: '100%',
                      height: '260px',
                      backgroundColor: '#f7f9f9',
                      backgroundImage: `url(${data.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '260px',
                      backgroundColor: '#f7f9f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text as="span" variant="bodySm" tone="subdued">
                      No image provided
                    </Text>
                  </div>
                )}
                {/* Content */}
                <div style={{ padding: '12px' }}>
                  {/* Title */}
                  <div style={{ marginBottom: '2px' }}>
                    <span
                      style={{
                        color: '#0f1419',
                        fontSize: '15px',
                        fontWeight: '700',
                        lineHeight: '20px',
                        display: 'block',
                      }}
                    >
                      {truncate(data.title || 'Your Page Title', 70)}
                    </span>
                  </div>
                  {/* Description */}
                  <div style={{ marginBottom: '2px' }}>
                    <span
                      style={{
                        color: '#536471',
                        fontSize: '15px',
                        lineHeight: '20px',
                      }}
                    >
                      {truncate(data.description || 'Your description...', 200)}
                    </span>
                  </div>
                  {/* URL */}
                  <div>
                    <span
                      style={{
                        color: '#536471',
                        fontSize: '15px',
                      }}
                    >
                      {data.url?.replace(/^https?:\/\//, '') || 'example.com'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </BlockStack>
    </Card>
  );
}
