import { Card, Text, BlockStack, Select, Button, TextField, InlineStack, Badge, Icon } from '@shopify/polaris';
import { CheckCircleIcon, CodeIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface SchemaTemplate {
  type: string;
  label: string;
  description: string;
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url' | 'select';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface SchemaManagerProps {
  onSave?: (schema: any) => void;
}

const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    type: 'Product',
    label: 'Product Schema',
    description: 'For e-commerce products with price, availability, and reviews',
    fields: [
      { name: 'name', label: 'Product Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'image', label: 'Image URL', type: 'url', required: true },
      { name: 'price', label: 'Price', type: 'number', required: true },
      { name: 'priceCurrency', label: 'Currency', type: 'text', placeholder: 'USD', required: true },
      {
        name: 'availability',
        label: 'Availability',
        type: 'select',
        options: ['InStock', 'OutOfStock', 'PreOrder', 'Discontinued'],
        required: true,
      },
      { name: 'brand', label: 'Brand', type: 'text' },
      { name: 'sku', label: 'SKU', type: 'text' },
      { name: 'aggregateRating', label: 'Rating Value', type: 'number', placeholder: '4.5' },
      { name: 'ratingCount', label: 'Review Count', type: 'number', placeholder: '89' },
    ],
  },
  {
    type: 'Article',
    label: 'Article Schema',
    description: 'For blog posts and articles',
    fields: [
      { name: 'headline', label: 'Headline', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'image', label: 'Image URL', type: 'url', required: true },
      { name: 'author', label: 'Author Name', type: 'text', required: true },
      { name: 'datePublished', label: 'Published Date', type: 'date', required: true },
      { name: 'dateModified', label: 'Modified Date', type: 'date' },
      { name: 'publisher', label: 'Publisher Name', type: 'text', required: true },
      { name: 'publisherLogo', label: 'Publisher Logo URL', type: 'url' },
    ],
  },
  {
    type: 'FAQPage',
    label: 'FAQ Schema',
    description: 'For frequently asked questions pages',
    fields: [
      { name: 'question1', label: 'Question 1', type: 'text', required: true },
      { name: 'answer1', label: 'Answer 1', type: 'text', required: true },
      { name: 'question2', label: 'Question 2', type: 'text' },
      { name: 'answer2', label: 'Answer 2', type: 'text' },
      { name: 'question3', label: 'Question 3', type: 'text' },
      { name: 'answer3', label: 'Answer 3', type: 'text' },
    ],
  },
  {
    type: 'LocalBusiness',
    label: 'Local Business Schema',
    description: 'For local businesses with location and contact info',
    fields: [
      { name: 'name', label: 'Business Name', type: 'text', required: true },
      { name: 'image', label: 'Image URL', type: 'url' },
      { name: 'telephone', label: 'Phone Number', type: 'text', required: true },
      { name: 'address', label: 'Street Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'state', label: 'State/Region', type: 'text', required: true },
      { name: 'postalCode', label: 'Postal Code', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'priceRange', label: 'Price Range', type: 'text', placeholder: '$$' },
      { name: 'openingHours', label: 'Opening Hours', type: 'text', placeholder: 'Mo-Fr 09:00-17:00' },
    ],
  },
  {
    type: 'Organization',
    label: 'Organization Schema',
    description: 'For company/organization information',
    fields: [
      { name: 'name', label: 'Organization Name', type: 'text', required: true },
      { name: 'url', label: 'Website URL', type: 'url', required: true },
      { name: 'logo', label: 'Logo URL', type: 'url', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'telephone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },
    ],
  },
  {
    type: 'Breadcrumb',
    label: 'Breadcrumb Schema',
    description: 'For breadcrumb navigation',
    fields: [
      { name: 'item1', label: 'Item 1 Name', type: 'text', required: true },
      { name: 'url1', label: 'Item 1 URL', type: 'url', required: true },
      { name: 'item2', label: 'Item 2 Name', type: 'text' },
      { name: 'url2', label: 'Item 2 URL', type: 'url' },
      { name: 'item3', label: 'Item 3 Name', type: 'text' },
      { name: 'url3', label: 'Item 3 URL', type: 'url' },
    ],
  },
];

export default function SchemaManager({ onSave }: SchemaManagerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('Product');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const currentTemplate = SCHEMA_TEMPLATES.find((t) => t.type === selectedTemplate);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const generateSchema = () => {
    if (!currentTemplate) return null;

    const schema: any = {
      '@context': 'https://schema.org',
      '@type': currentTemplate.type,
    };

    // Build schema based on template type
    currentTemplate.fields.forEach((field) => {
      const value = formData[field.name];
      if (value) {
        if (currentTemplate.type === 'FAQPage' && field.name.startsWith('question')) {
          // Special handling for FAQ
          const index = field.name.replace('question', '');
          const answer = formData[`answer${index}`];
          if (answer) {
            if (!schema.mainEntity) schema.mainEntity = [];
            schema.mainEntity.push({
              '@type': 'Question',
              name: value,
              acceptedAnswer: {
                '@type': 'Answer',
                text: answer,
              },
            });
          }
        } else if (currentTemplate.type === 'Breadcrumb' && field.name.startsWith('item')) {
          // Special handling for Breadcrumb
          const index = field.name.replace('item', '');
          const url = formData[`url${index}`];
          if (url) {
            if (!schema.itemListElement) schema.itemListElement = [];
            schema.itemListElement.push({
              '@type': 'ListItem',
              position: parseInt(index),
              name: value,
              item: url,
            });
          }
        } else if (field.name === 'aggregateRating') {
          // Special handling for ratings
          const ratingCount = formData.ratingCount;
          if (ratingCount) {
            schema.aggregateRating = {
              '@type': 'AggregateRating',
              ratingValue: value,
              reviewCount: ratingCount,
            };
          }
        } else if (field.name.includes('address') || field.name === 'city' || field.name === 'state') {
          // Special handling for address
          if (!schema.address) {
            schema.address = {
              '@type': 'PostalAddress',
            };
          }
          if (field.name === 'address') schema.address.streetAddress = value;
          if (field.name === 'city') schema.address.addressLocality = value;
          if (field.name === 'state') schema.address.addressRegion = value;
          if (field.name === 'postalCode') schema.address.postalCode = value;
          if (field.name === 'country') schema.address.addressCountry = value;
        } else if (field.name !== 'ratingCount') {
          schema[field.name] = value;
        }
      }
    });

    return schema;
  };

  const schemaJson = generateSchema();
  const schemaString = schemaJson ? JSON.stringify(schemaJson, null, 2) : '';

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Schema Markup Manager
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Add structured data to improve search results
            </Text>
          </div>
          <Badge tone="info">JSON-LD</Badge>
        </InlineStack>

        {/* Template Selector */}
        <Select
          label="Schema Type"
          options={SCHEMA_TEMPLATES.map((t) => ({ label: t.label, value: t.type }))}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
        />

        {currentTemplate && (
          <>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
              }}
            >
              <Text as="p" variant="bodySm">
                <strong>{currentTemplate.label}:</strong> {currentTemplate.description}
              </Text>
            </div>

            {/* Form Fields */}
            <BlockStack gap="300">
              {currentTemplate.fields.map((field) => {
                if (field.type === 'select') {
                  return (
                    <Select
                      key={field.name}
                      label={field.label + (field.required ? ' *' : '')}
                      options={field.options?.map((o) => ({ label: o, value: o })) || []}
                      value={formData[field.name] || ''}
                      onChange={(value) => handleFieldChange(field.name, value)}
                    />
                  );
                }
                return (
                  <TextField
                    key={field.name}
                    label={field.label + (field.required ? ' *' : '')}
                    value={formData[field.name] || ''}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    placeholder={field.placeholder}
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    autoComplete="off"
                  />
                );
              })}
            </BlockStack>

            {/* Actions */}
            <InlineStack gap="200">
              <Button variant="primary" onClick={() => onSave && onSave(schemaJson)} icon={CheckCircleIcon}>
                Save Schema
              </Button>
              <Button onClick={() => setShowPreview(!showPreview)} icon={CodeIcon}>
                {showPreview ? 'Hide' : 'Show'} JSON
              </Button>
            </InlineStack>

            {/* JSON Preview */}
            {showPreview && schemaString && (
              <div
                style={{
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
                  {schemaString}
                </pre>
              </div>
            )}
          </>
        )}
      </BlockStack>
    </Card>
  );
}
