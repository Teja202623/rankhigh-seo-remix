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
  Icon,
  Checkbox,
} from '@shopify/polaris';
import {
  LocationIcon,
  ClockIcon,
  StarIcon,
  PhoneIcon,
  EmailIcon,
  RefreshIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface BusinessInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
}

export interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  type: 'city' | 'zipcode' | 'radius';
  value: string;
}

export interface Citation {
  id: string;
  platform: string;
  url: string;
  status: 'verified' | 'pending' | 'inconsistent';
  napMatch: boolean;
  lastChecked: string;
}

export interface Review {
  id: string;
  platform: string;
  rating: number;
  author: string;
  text: string;
  date: string;
  responded: boolean;
}

interface LocalSEOProps {
  businessInfo?: BusinessInfo;
  businessHours?: BusinessHours[];
  serviceAreas?: ServiceArea[];
  citations?: Citation[];
  reviews?: Review[];
  onSaveBusinessInfo?: (info: BusinessInfo) => void;
  onSaveBusinessHours?: (hours: BusinessHours[]) => void;
  onAddServiceArea?: (area: Omit<ServiceArea, 'id'>) => void;
  onRemoveServiceArea?: (id: string) => void;
  onRefreshCitations?: () => void;
  onRespondToReview?: (reviewId: string) => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS: BusinessHours[] = DAYS_OF_WEEK.map((day) => ({
  day,
  isOpen: !['Saturday', 'Sunday'].includes(day),
  openTime: '09:00',
  closeTime: '17:00',
}));

export default function LocalSEO({
  businessInfo: initialBusinessInfo,
  businessHours: initialBusinessHours = DEFAULT_HOURS,
  serviceAreas = [],
  citations = [],
  reviews = [],
  onSaveBusinessInfo,
  onSaveBusinessHours,
  onAddServiceArea,
  onRemoveServiceArea,
  onRefreshCitations,
  onRespondToReview,
}: LocalSEOProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(
    initialBusinessInfo || {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      phone: '',
      email: '',
      website: '',
    }
  );
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(initialBusinessHours);
  const [newServiceArea, setNewServiceArea] = useState<Omit<ServiceArea, 'id'>>({ name: '', type: 'city', value: '' });

  const tabs = [
    { id: 'info', content: 'Business Info', panelID: 'info-panel' },
    { id: 'hours', content: 'Business Hours', panelID: 'hours-panel' },
    { id: 'service', content: `Service Areas (${serviceAreas.length})`, panelID: 'service-panel' },
    { id: 'citations', content: `Citations (${citations.length})`, panelID: 'citations-panel' },
    { id: 'reviews', content: `Reviews (${reviews.length})`, panelID: 'reviews-panel' },
  ];

  // Calculate statistics
  const verifiedCitations = citations.filter((c) => c.status === 'verified').length;
  const inconsistentCitations = citations.filter((c) => c.status === 'inconsistent').length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const respondedReviews = reviews.filter((r) => r.responded).length;

  const handleSaveBusinessInfo = () => {
    if (onSaveBusinessInfo) {
      onSaveBusinessInfo(businessInfo);
    }
  };

  const handleSaveBusinessHours = () => {
    if (onSaveBusinessHours) {
      onSaveBusinessHours(businessHours);
    }
  };

  const handleAddServiceArea = () => {
    if (newServiceArea.name && newServiceArea.value && onAddServiceArea) {
      onAddServiceArea(newServiceArea);
      setNewServiceArea({ name: '', type: 'city', value: '' });
    }
  };

  const updateBusinessHours = (index: number, updates: Partial<BusinessHours>) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], ...updates };
    setBusinessHours(updated);
  };

  // Citations table
  const citationRows = citations.map((citation) => [
    citation.platform,
    <a href={citation.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a0dab' }}>
      {citation.url.length > 40 ? citation.url.substring(0, 40) + '...' : citation.url}
    </a>,
    <Badge tone={citation.status === 'verified' ? 'success' : citation.status === 'inconsistent' ? 'critical' : 'warning'}>
      {citation.status}
    </Badge>,
    <Badge tone={citation.napMatch ? 'success' : 'critical'}>
      {citation.napMatch ? 'Match' : 'Mismatch'}
    </Badge>,
    new Date(citation.lastChecked).toLocaleDateString(),
  ]);

  // Reviews table
  const reviewRows = reviews.map((review) => [
    <div style={{ maxWidth: '120px' }}>
      <Text as="p" variant="bodySm" fontWeight="semibold">
        {review.platform}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {review.author}
      </Text>
    </div>,
    <InlineStack gap="100">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          source={StarIcon}
          tone={i < review.rating ? 'warning' : 'subdued'}
        />
      ))}
    </InlineStack>,
    <div style={{ maxWidth: '300px' }}>
      <Text as="span" variant="bodySm">
        {review.text.length > 100 ? review.text.substring(0, 100) + '...' : review.text}
      </Text>
    </div>,
    new Date(review.date).toLocaleDateString(),
    review.responded ? (
      <Badge tone="success">Responded</Badge>
    ) : (
      onRespondToReview && (
        <Button size="slim" onClick={() => onRespondToReview(review.id)}>
          Respond
        </Button>
      )
    ),
  ]);

  // Generate Local Business schema
  const generateLocalBusinessSchema = () => {
    const openingHours = businessHours
      .filter((h) => h.isOpen)
      .map((h) => `${h.day.substring(0, 2)} ${h.openTime}-${h.closeTime}`);

    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: businessInfo.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: businessInfo.address,
        addressLocality: businessInfo.city,
        addressRegion: businessInfo.state,
        postalCode: businessInfo.zipCode,
        addressCountry: businessInfo.country,
      },
      telephone: businessInfo.phone,
      email: businessInfo.email,
      url: businessInfo.website,
      openingHoursSpecification: businessHours
        .filter((h) => h.isOpen)
        .map((h) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: h.day,
          opens: h.openTime,
          closes: h.closeTime,
        })),
      ...(reviews.length > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avgRating,
          reviewCount: reviews.length,
        },
      }),
    };
  };

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Local SEO
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Optimize your business for local search results
            </Text>
          </div>
        </InlineStack>
      </Card>

      {/* Statistics */}
      <InlineStack gap="400" wrap>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Verified Citations
              </Text>
              <Text as="p" variant="heading2xl">
                {verifiedCitations}/{citations.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average Rating
              </Text>
              <Text as="p" variant="heading2xl">
                {avgRating} <Icon source={StarIcon} tone="warning" />
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Reviews
              </Text>
              <Text as="p" variant="heading2xl">
                {reviews.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Response Rate
              </Text>
              <Text as="p" variant="heading2xl">
                {reviews.length > 0 ? Math.round((respondedReviews / reviews.length) * 100) : 0}%
              </Text>
            </BlockStack>
          </Card>
        </div>
        {inconsistentCitations > 0 && (
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="critical">
                  NAP Inconsistencies
                </Text>
                <Text as="p" variant="heading2xl">
                  {inconsistentCitations}
                </Text>
              </BlockStack>
            </Card>
          </div>
        )}
      </InlineStack>

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Business Info Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Business Information (NAP)
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Ensure your Name, Address, and Phone are consistent across all platforms
                </Text>

                <TextField
                  label="Business Name"
                  value={businessInfo.name}
                  onChange={(value) => setBusinessInfo({ ...businessInfo, name: value })}
                  autoComplete="organization"
                />

                <TextField
                  label="Street Address"
                  value={businessInfo.address}
                  onChange={(value) => setBusinessInfo({ ...businessInfo, address: value })}
                  autoComplete="street-address"
                />

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="City"
                      value={businessInfo.city}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, city: value })}
                      autoComplete="address-level2"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="State/Province"
                      value={businessInfo.state}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, state: value })}
                      autoComplete="address-level1"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="ZIP/Postal Code"
                      value={businessInfo.zipCode}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, zipCode: value })}
                      autoComplete="postal-code"
                    />
                  </div>
                </InlineStack>

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Country"
                      options={[
                        { label: 'United States', value: 'US' },
                        { label: 'Canada', value: 'CA' },
                        { label: 'United Kingdom', value: 'GB' },
                        { label: 'Australia', value: 'AU' },
                      ]}
                      value={businessInfo.country}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, country: value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Phone Number"
                      value={businessInfo.phone}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, phone: value })}
                      autoComplete="tel"
                      prefix={<Icon source={PhoneIcon} />}
                    />
                  </div>
                </InlineStack>

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Email"
                      type="email"
                      value={businessInfo.email}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, email: value })}
                      autoComplete="email"
                      prefix={<Icon source={EmailIcon} />}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Website"
                      type="url"
                      value={businessInfo.website}
                      onChange={(value) => setBusinessInfo({ ...businessInfo, website: value })}
                      autoComplete="url"
                    />
                  </div>
                </InlineStack>

                <InlineStack align="end">
                  <Button variant="primary" onClick={handleSaveBusinessInfo}>
                    Save Business Info
                  </Button>
                </InlineStack>
              </BlockStack>
            )}

            {/* Business Hours Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Business Hours
                </Text>

                {businessHours.map((hours, index) => (
                  <InlineStack key={hours.day} gap="300" wrap={false} blockAlign="center">
                    <div style={{ width: '120px' }}>
                      <Checkbox
                        label={hours.day}
                        checked={hours.isOpen}
                        onChange={(value) => updateBusinessHours(index, { isOpen: value })}
                      />
                    </div>
                    {hours.isOpen && (
                      <>
                        <TextField
                          label=""
                          labelHidden
                          type="time"
                          value={hours.openTime}
                          onChange={(value) => updateBusinessHours(index, { openTime: value })}
                          autoComplete="off"
                        />
                        <Text as="span" variant="bodySm">
                          to
                        </Text>
                        <TextField
                          label=""
                          labelHidden
                          type="time"
                          value={hours.closeTime}
                          onChange={(value) => updateBusinessHours(index, { closeTime: value })}
                          autoComplete="off"
                        />
                      </>
                    )}
                    {!hours.isOpen && (
                      <Badge tone="info">Closed</Badge>
                    )}
                  </InlineStack>
                ))}

                <InlineStack align="end">
                  <Button variant="primary" onClick={handleSaveBusinessHours}>
                    Save Business Hours
                  </Button>
                </InlineStack>
              </BlockStack>
            )}

            {/* Service Areas Tab */}
            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Service Areas
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Define the geographic areas where you provide services
                </Text>

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Area Name"
                      value={newServiceArea.name}
                      onChange={(value) => setNewServiceArea({ ...newServiceArea, name: value })}
                      placeholder="Downtown Manhattan"
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ width: '150px' }}>
                    <Select
                      label="Type"
                      options={[
                        { label: 'City', value: 'city' },
                        { label: 'ZIP Code', value: 'zipcode' },
                        { label: 'Radius (miles)', value: 'radius' },
                      ]}
                      value={newServiceArea.type}
                      onChange={(value) => setNewServiceArea({ ...newServiceArea, type: value as 'city' | 'zipcode' | 'radius' })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Value"
                      value={newServiceArea.value}
                      onChange={(value) => setNewServiceArea({ ...newServiceArea, value })}
                      placeholder={newServiceArea.type === 'radius' ? '25' : '10001'}
                      autoComplete="off"
                    />
                  </div>
                  {onAddServiceArea && (
                    <Button onClick={handleAddServiceArea}>Add Area</Button>
                  )}
                </InlineStack>

                {serviceAreas.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {serviceAreas.map((area) => (
                      <div
                        key={area.id}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Icon source={LocationIcon} tone="subdued" />
                        <Text as="span" variant="bodySm">
                          {area.name} ({area.value})
                        </Text>
                        {onRemoveServiceArea && (
                          <button
                            onClick={() => onRemoveServiceArea(area.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No service areas added yet
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Citations Tab */}
            {selectedTab === 3 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Local Citations
                  </Text>
                  {onRefreshCitations && (
                    <Button icon={RefreshIcon} onClick={onRefreshCitations}>
                      Refresh
                    </Button>
                  )}
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  Track your business listings across the web
                </Text>

                {citations.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Platform', 'URL', 'Status', 'NAP Match', 'Last Checked']}
                    rows={citationRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No citations found. Click refresh to scan for listings.
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}

            {/* Reviews Tab */}
            {selectedTab === 4 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Customer Reviews
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Monitor and respond to reviews across platforms
                </Text>

                {reviews.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Source', 'Rating', 'Review', 'Date', 'Response']}
                    rows={reviewRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Icon source={StarIcon} tone="warning" />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No reviews yet
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Connect your Google Business Profile to import reviews
                    </Text>
                  </div>
                )}
              </BlockStack>
            )}
          </div>
        </Tabs>
      </Card>

      {/* Local Business Schema */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Local Business Schema Preview
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
            <pre>{JSON.stringify(generateLocalBusinessSchema(), null, 2)}</pre>
          </div>
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Local SEO Best Practices
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
                  <strong>NAP Consistency</strong> - Keep your business info identical everywhere
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Google Business Profile</strong> - Claim and verify your listing
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Respond to Reviews</strong> - Reply to all reviews, especially negative ones
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Build Citations</strong> - List your business on reputable directories
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Local Keywords</strong> - Include city/region names in your content
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Schema Markup</strong> - Add LocalBusiness structured data to your site
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
