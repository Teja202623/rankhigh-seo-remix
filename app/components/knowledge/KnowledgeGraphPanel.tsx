import {
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  InlineStack,
  Badge,
  Icon,
  Banner,
  Select,
  DataTable,
} from '@shopify/polaris';
import { AlertTriangleIcon, ImageIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { sanitizeUrl, validateEmail } from '~/utils/validation';

export interface SocialProfile {
  platform: string;
  url: string;
}

export interface ContactPoint {
  telephone: string;
  contactType: string;
  areaServed?: string;
  availableLanguage?: string;
}

export interface AddressData {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface OrganizationData {
  type: 'Organization' | 'Person' | 'LocalBusiness' | 'Corporation';
  name: string;
  alternateName?: string;
  description: string;
  url: string;
  logo: string;
  foundingDate?: string;
  founders?: string[];
  email?: string;
  telephone?: string;
  address?: AddressData;
  socialProfiles: SocialProfile[];
  contactPoints: ContactPoint[];
}

export interface KnowledgeGraphConfig {
  organization: OrganizationData;
  verified: boolean;
  lastUpdated?: string;
}

interface KnowledgeGraphPanelProps {
  config?: KnowledgeGraphConfig;
  onSave?: (config: KnowledgeGraphConfig) => void;
}

const DEFAULT_CONFIG: KnowledgeGraphConfig = {
  organization: {
    type: 'Organization',
    name: '',
    alternateName: '',
    description: '',
    url: '',
    logo: '',
    foundingDate: '',
    founders: [],
    email: '',
    telephone: '',
    address: {
      streetAddress: '',
      addressLocality: '',
      addressRegion: '',
      postalCode: '',
      addressCountry: '',
    },
    socialProfiles: [],
    contactPoints: [],
  },
  verified: false,
};

const ENTITY_TYPE_OPTIONS = [
  { label: 'Organization', value: 'Organization' },
  { label: 'Person', value: 'Person' },
  { label: 'Local Business', value: 'LocalBusiness' },
  { label: 'Corporation', value: 'Corporation' },
];

const SOCIAL_PLATFORMS = [
  'Facebook',
  'Twitter',
  'LinkedIn',
  'Instagram',
  'YouTube',
  'Pinterest',
  'TikTok',
  'GitHub',
  'Crunchbase',
  'Wikipedia',
];

const CONTACT_TYPES = [
  { label: 'Customer Service', value: 'customer service' },
  { label: 'Technical Support', value: 'technical support' },
  { label: 'Sales', value: 'sales' },
  { label: 'Billing', value: 'billing' },
  { label: 'General', value: 'general' },
];

/**
 * Knowledge Graph Panel Component
 * Manages organization schema and knowledge graph optimization
 */
export default function KnowledgeGraphPanel({ config, onSave }: KnowledgeGraphPanelProps) {
  const [localConfig, setLocalConfig] = useState<KnowledgeGraphConfig>(config || DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [newSocialPlatform, setNewSocialPlatform] = useState('Facebook');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactType, setNewContactType] = useState('customer service');

  /**
   * Validates the configuration before saving
   */
  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    if (!localConfig.organization.name.trim()) {
      errors.name = 'Organization name is required';
    }

    if (!localConfig.organization.description.trim()) {
      errors.description = 'Description is required';
    } else if (localConfig.organization.description.length > 500) {
      errors.description = 'Description should be 500 characters or less';
    }

    if (!localConfig.organization.url.trim()) {
      errors.url = 'Website URL is required';
    } else if (!sanitizeUrl(localConfig.organization.url)) {
      errors.url = 'Invalid website URL';
    }

    if (!localConfig.organization.logo.trim()) {
      errors.logo = 'Logo URL is required';
    } else if (!sanitizeUrl(localConfig.organization.logo)) {
      errors.logo = 'Invalid logo URL';
    }

    if (localConfig.organization.email && !validateEmail(localConfig.organization.email)) {
      errors.email = 'Invalid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Updates organization data
   */
  const updateOrganization = (field: string, value: string | string[]) => {
    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        [field]: value,
      },
    });

    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  /**
   * Updates address data
   */
  const updateAddress = (field: keyof AddressData, value: string) => {
    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        address: {
          ...(localConfig.organization.address || {
            streetAddress: '',
            addressLocality: '',
            addressRegion: '',
            postalCode: '',
            addressCountry: '',
          }),
          [field]: value,
        },
      },
    });
  };

  /**
   * Adds a social profile
   */
  const handleAddSocialProfile = () => {
    if (!newSocialUrl.trim()) return;

    const sanitized = sanitizeUrl(newSocialUrl);
    if (!sanitized) {
      alert('Invalid URL');
      return;
    }

    const newProfile: SocialProfile = {
      platform: newSocialPlatform,
      url: sanitized,
    };

    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        socialProfiles: [...localConfig.organization.socialProfiles, newProfile],
      },
    });

    setNewSocialUrl('');
  };

  /**
   * Removes a social profile
   */
  const handleRemoveSocialProfile = (index: number) => {
    const updatedProfiles = localConfig.organization.socialProfiles.filter((_, i) => i !== index);
    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        socialProfiles: updatedProfiles,
      },
    });
  };

  /**
   * Adds a contact point
   */
  const handleAddContactPoint = () => {
    if (!newContactPhone.trim()) return;

    const newContact: ContactPoint = {
      telephone: newContactPhone,
      contactType: newContactType,
    };

    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        contactPoints: [...localConfig.organization.contactPoints, newContact],
      },
    });

    setNewContactPhone('');
  };

  /**
   * Removes a contact point
   */
  const handleRemoveContactPoint = (index: number) => {
    const updatedContacts = localConfig.organization.contactPoints.filter((_, i) => i !== index);
    setLocalConfig({
      ...localConfig,
      organization: {
        ...localConfig.organization,
        contactPoints: updatedContacts,
      },
    });
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

      const updatedConfig = {
        ...localConfig,
        lastUpdated: new Date().toISOString(),
      };

      if (onSave) {
        onSave(updatedConfig);
      }

      setLocalConfig(updatedConfig);
      setSuccessMessage('Knowledge graph configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Generates structured data schema
   */
  const generateSchema = (): string => {
    const org = localConfig.organization;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': org.type,
      name: org.name,
      url: org.url,
      logo: org.logo,
      description: org.description,
    };

    if (org.alternateName) schema.alternateName = org.alternateName;
    if (org.foundingDate) schema.foundingDate = org.foundingDate;
    if (org.email) schema.email = org.email;
    if (org.telephone) schema.telephone = org.telephone;

    if (org.founders && org.founders.length > 0) {
      schema.founder = org.founders.map((name) => ({
        '@type': 'Person',
        name,
      }));
    }

    if (org.address && org.address.streetAddress) {
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: org.address.streetAddress,
        addressLocality: org.address.addressLocality,
        addressRegion: org.address.addressRegion,
        postalCode: org.address.postalCode,
        addressCountry: org.address.addressCountry,
      };
    }

    if (org.socialProfiles.length > 0) {
      schema.sameAs = org.socialProfiles.map((profile) => profile.url);
    }

    if (org.contactPoints.length > 0) {
      schema.contactPoint = org.contactPoints.map((contact) => ({
        '@type': 'ContactPoint',
        telephone: contact.telephone,
        contactType: contact.contactType,
        ...(contact.areaServed && { areaServed: contact.areaServed }),
        ...(contact.availableLanguage && { availableLanguage: contact.availableLanguage }),
      }));
    }

    return JSON.stringify(schema, null, 2);
  };

  // Social profiles table rows
  const socialProfileRows = localConfig.organization.socialProfiles.map((profile, index) => [
    profile.platform,
    profile.url,
    <Button key={`social-delete-${index}`} size="slim" tone="critical" onClick={() => handleRemoveSocialProfile(index)}>
      Remove
    </Button>,
  ]);

  // Contact points table rows
  const contactPointRows = localConfig.organization.contactPoints.map((contact, index) => [
    contact.contactType,
    contact.telephone,
    <Button key={`contact-delete-${index}`} size="slim" tone="critical" onClick={() => handleRemoveContactPoint(index)}>
      Remove
    </Button>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Header Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Knowledge Graph Panel
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Configure organization schema for Google Knowledge Graph and rich results
              </Text>
            </div>
            <InlineStack gap="200">
              {localConfig.verified && <Badge tone="success">Verified</Badge>}
              <Badge tone="info">Entity Data</Badge>
            </InlineStack>
          </InlineStack>

          {successMessage && (
            <Banner tone="success" onDismiss={() => setSuccessMessage('')}>
              {successMessage}
            </Banner>
          )}
        </BlockStack>
      </Card>

      {/* Basic Information */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Basic Information
          </Text>

          <Select
            label="Entity Type"
            options={ENTITY_TYPE_OPTIONS}
            value={localConfig.organization.type}
            onChange={(value) => updateOrganization('type', value)}
            helpText="The type of entity this represents"
          />

          <TextField
            label="Organization Name"
            value={localConfig.organization.name}
            onChange={(value) => updateOrganization('name', value)}
            autoComplete="off"
            placeholder="Acme Corporation"
            error={validationErrors.name}
            requiredIndicator
          />

          <TextField
            label="Alternate Name (Optional)"
            value={localConfig.organization.alternateName || ''}
            onChange={(value) => updateOrganization('alternateName', value)}
            autoComplete="off"
            placeholder="Acme Corp, ACME"
            helpText="Other names your organization is known by"
          />

          <TextField
            label="Description"
            value={localConfig.organization.description}
            onChange={(value) => updateOrganization('description', value)}
            autoComplete="off"
            placeholder="A brief description of your organization"
            multiline={3}
            error={validationErrors.description}
            helpText={`${localConfig.organization.description.length}/500 characters`}
            requiredIndicator
          />

          <TextField
            label="Website URL"
            value={localConfig.organization.url}
            onChange={(value) => updateOrganization('url', value)}
            autoComplete="off"
            placeholder="https://example.com"
            error={validationErrors.url}
            requiredIndicator
          />

          <TextField
            label="Logo URL"
            value={localConfig.organization.logo}
            onChange={(value) => updateOrganization('logo', value)}
            autoComplete="off"
            placeholder="https://example.com/logo.png"
            error={validationErrors.logo}
            helpText="Square logo recommended (minimum 112x112px, max 10MB)"
            prefix={<Icon source={ImageIcon} />}
            requiredIndicator
          />

          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Founding Date (Optional)"
                type="date"
                value={localConfig.organization.foundingDate || ''}
                onChange={(value) => updateOrganization('foundingDate', value)}
                autoComplete="off"
                helpText="When the organization was founded"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Founders (Optional)"
                value={localConfig.organization.founders?.join(', ') || ''}
                onChange={(value) =>
                  updateOrganization(
                    'founders',
                    value.split(',').map((f) => f.trim()).filter(Boolean)
                  )
                }
                autoComplete="off"
                placeholder="John Doe, Jane Smith"
                helpText="Comma-separated list"
              />
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Contact Information */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Contact Information
          </Text>

          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Email (Optional)"
                value={localConfig.organization.email || ''}
                onChange={(value) => updateOrganization('email', value)}
                autoComplete="off"
                type="email"
                placeholder="contact@example.com"
                error={validationErrors.email}
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Phone (Optional)"
                value={localConfig.organization.telephone || ''}
                onChange={(value) => updateOrganization('telephone', value)}
                autoComplete="off"
                type="tel"
                placeholder="+1-555-123-4567"
              />
            </div>
          </InlineStack>

          <Text as="p" variant="bodySm" fontWeight="semibold">
            Address (Optional)
          </Text>

          <TextField
            label="Street Address"
            value={localConfig.organization.address?.streetAddress || ''}
            onChange={(value) => updateAddress('streetAddress', value)}
            autoComplete="off"
            placeholder="123 Main Street"
          />

          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 2 }}>
              <TextField
                label="City"
                value={localConfig.organization.address?.addressLocality || ''}
                onChange={(value) => updateAddress('addressLocality', value)}
                autoComplete="off"
                placeholder="San Francisco"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="State/Region"
                value={localConfig.organization.address?.addressRegion || ''}
                onChange={(value) => updateAddress('addressRegion', value)}
                autoComplete="off"
                placeholder="CA"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Postal Code"
                value={localConfig.organization.address?.postalCode || ''}
                onChange={(value) => updateAddress('postalCode', value)}
                autoComplete="off"
                placeholder="94102"
              />
            </div>
          </InlineStack>

          <TextField
            label="Country"
            value={localConfig.organization.address?.addressCountry || ''}
            onChange={(value) => updateAddress('addressCountry', value)}
            autoComplete="off"
            placeholder="US"
            helpText="Two-letter country code (e.g., US, GB, CA)"
          />
        </BlockStack>
      </Card>

      {/* Social Profiles */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Social Profiles (SameAs Links)
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Add links to your verified social media profiles to strengthen your knowledge graph entity
          </Text>

          {localConfig.organization.socialProfiles.length > 0 && (
            <DataTable
              columnContentTypes={['text', 'text', 'text']}
              headings={['Platform', 'URL', 'Actions']}
              rows={socialProfileRows}
            />
          )}

          <InlineStack gap="200" wrap={false}>
            <div style={{ flex: 1 }}>
              <Select
                label="Platform"
                options={SOCIAL_PLATFORMS.map((p) => ({ label: p, value: p }))}
                value={newSocialPlatform}
                onChange={setNewSocialPlatform}
              />
            </div>
            <div style={{ flex: 2 }}>
              <TextField
                label="Profile URL"
                value={newSocialUrl}
                onChange={setNewSocialUrl}
                autoComplete="off"
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div style={{ flex: 0, paddingTop: '26px' }}>
              <Button onClick={handleAddSocialProfile}>Add Profile</Button>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Contact Points */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Contact Points
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Add structured contact information for different departments
          </Text>

          {localConfig.organization.contactPoints.length > 0 && (
            <DataTable
              columnContentTypes={['text', 'text', 'text']}
              headings={['Contact Type', 'Phone', 'Actions']}
              rows={contactPointRows}
            />
          )}

          <InlineStack gap="200" wrap={false}>
            <div style={{ flex: 1 }}>
              <Select
                label="Contact Type"
                options={CONTACT_TYPES}
                value={newContactType}
                onChange={setNewContactType}
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="Phone Number"
                value={newContactPhone}
                onChange={setNewContactPhone}
                autoComplete="off"
                type="tel"
                placeholder="+1-555-123-4567"
              />
            </div>
            <div style={{ flex: 0, paddingTop: '26px' }}>
              <Button onClick={handleAddContactPoint}>Add Contact</Button>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Preview & Schema */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Knowledge Graph Preview
            </Text>
            <Button onClick={() => setShowSchema(!showSchema)}>
              {showSchema ? 'Hide' : 'Show'} Schema
            </Button>
          </InlineStack>

          {/* Visual Preview */}
          <div
            style={{
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            }}
          >
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="start">
                {localConfig.organization.logo && (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <img
                      src={localConfig.organization.logo}
                      alt={localConfig.organization.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {localConfig.organization.name || 'Organization Name'}
                  </Text>
                  {localConfig.organization.alternateName && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Also known as: {localConfig.organization.alternateName}
                    </Text>
                  )}
                </div>
              </InlineStack>

              <Text as="p" variant="bodyMd">
                {localConfig.organization.description || 'Organization description will appear here'}
              </Text>

              {localConfig.organization.socialProfiles.length > 0 && (
                <div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Profiles:
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <InlineStack gap="200" wrap>
                      {localConfig.organization.socialProfiles.map((profile, idx) => (
                        <Badge key={idx}>{profile.platform}</Badge>
                      ))}
                    </InlineStack>
                  </div>
                </div>
              )}
            </BlockStack>
          </div>

          {/* Schema Code */}
          {showSchema && (
            <div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Generated Schema.org JSON-LD
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
                  {generateSchema()}
                </pre>
              </div>
            </div>
          )}

          {/* Save Button */}
          <InlineStack gap="200">
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Save Configuration
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="400">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={AlertTriangleIcon} tone="warning" />
            <Text as="h3" variant="headingSm">
              Knowledge Graph Best Practices
            </Text>
          </InlineStack>

          <div style={{ marginLeft: '8px' }}>
            <BlockStack gap="200">
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Entity Verification
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Claim your Google Business Profile to verify your entity
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Ensure NAP (Name, Address, Phone) consistency across all platforms
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Verify social media profiles and add them to your schema
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Create a Wikipedia page if you meet the notability criteria
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Schema Implementation
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Place schema markup on your homepage for maximum visibility
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Use high-quality logo (minimum 112x112px, square format)
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Include all available SameAs links to strengthen entity signals
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Test your schema with Google's Rich Results Test tool
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Entity Building
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Build brand mentions and citations across authoritative websites
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Get featured in industry publications and news sites
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Create profiles on platforms like Crunchbase, LinkedIn Company Page
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Earn quality backlinks from reputable sources
                    </Text>
                  </li>
                </ul>
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Monitoring & Optimization
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>
                    <Text as="span" variant="bodySm">
                      Search for your brand name to check if knowledge panel appears
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Monitor and respond to suggested edits in Google Knowledge Panel
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Keep information updated across all platforms
                    </Text>
                  </li>
                  <li>
                    <Text as="span" variant="bodySm">
                      Track brand mentions and entity associations
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
