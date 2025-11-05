// app/components/schema/SchemaPreview.tsx

import { useState } from 'react';
import {
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  Divider,
  Icon,
  Banner,
  List,
  Collapsible,
  Link
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  ClipboardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon
} from '@shopify/polaris-icons';
import type {
  ProductSchema,
  OrganizationSchema,
  BreadcrumbSchema,
  ValidationResult,
  SchemaType
} from '~/types/schema';

export interface SchemaPreviewProps {
  schema: ProductSchema | OrganizationSchema | BreadcrumbSchema;
  schemaType: SchemaType;
  validation?: ValidationResult;
  onCopy?: () => void;
}

/**
 * Syntax highlighting for JSON-LD
 * Applies color coding to different JSON elements
 */
function SyntaxHighlightedJson({ json }: { json: object }) {
  const jsonString = JSON.stringify(json, null, 2);

  // Simple syntax highlighting using regex and inline styles
  const highlightedJson = jsonString
    .split('\n')
    .map((line, lineIndex) => {
      let processedLine = line;

      // Detect different JSON elements
      const isKey = line.includes('":');
      const isStringValue = /"([^"]+)":\s*"([^"]+)"/;
      const isNumberValue = /"([^"]+)":\s*(\d+\.?\d*)/;
      const isBooleanValue = /"([^"]+)":\s*(true|false)/;
      const isArrayOrObject = /[[\]{}]/;

      return (
        <div key={lineIndex} style={{ fontFamily: 'monospace', lineHeight: '1.5' }}>
          {/* Property keys in blue */}
          <span
            dangerouslySetInnerHTML={{
              __html: processedLine
                .replace(/"(@?[^"]+)":/g, '<span style="color: #0066cc;">"$1"</span>:')
                .replace(/:\s*"([^"]+)"/g, ': <span style="color: #00aa00;">"$1"</span>')
                .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color: #aa00aa;">$1</span>')
                .replace(/:\s*(true|false)/g, ': <span style="color: #aa5500;">$1</span>')
                .replace(/([[\]{}])/g, '<span style="color: #666666;">$1</span>')
                .replace(/,$/g, '<span style="color: #999999;">,</span>')
            }}
          />
        </div>
      );
    });

  return <div style={{ fontSize: '13px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', overflow: 'auto', maxHeight: '500px' }}>{highlightedJson}</div>;
}

/**
 * Schema Preview Component
 * Displays JSON-LD schema with syntax highlighting, validation status, and copy functionality
 */
export function SchemaPreview({
  schema,
  schemaType,
  validation,
  onCopy
}: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    const jsonString = JSON.stringify(schema, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      onCopy?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getSchemaTypeLabel = (): string => {
    switch (schemaType) {
      case 'PRODUCT':
        return 'Product Schema';
      case 'ORGANIZATION':
        return 'Organization Schema';
      case 'BREADCRUMB':
        return 'Breadcrumb Schema';
      default:
        return 'Schema';
    }
  };

  const getSchemaTypeUrl = (): string => {
    switch (schemaType) {
      case 'PRODUCT':
        return 'https://schema.org/Product';
      case 'ORGANIZATION':
        return 'https://schema.org/Organization';
      case 'BREADCRUMB':
        return 'https://schema.org/BreadcrumbList';
      default:
        return 'https://schema.org';
    }
  };

  const getValidationBadge = () => {
    if (!validation) return null;

    const errorCount = validation.issues.filter(i => i.severity === 'error').length;
    const warningCount = validation.issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 0) {
      return <Badge tone="critical">{`${errorCount} error${errorCount > 1 ? 's' : ''}`}</Badge>;
    }

    if (warningCount > 0) {
      return <Badge tone="warning">{`${warningCount} warning${warningCount > 1 ? 's' : ''}`}</Badge>;
    }

    return <Badge tone="success" icon={CheckCircleIcon}>Valid</Badge>;
  };

  const renderValidationIssues = () => {
    if (!validation || validation.issues.length === 0) {
      return (
        <Banner tone="success" icon={CheckCircleIcon}>
          Schema is valid and ready to use!
        </Banner>
      );
    }

    const errors = validation.issues.filter(i => i.severity === 'error');
    const warnings = validation.issues.filter(i => i.severity === 'warning');
    const infos = validation.issues.filter(i => i.severity === 'info');

    return (
      <BlockStack gap="300">
        {errors.length > 0 && (
          <Banner tone="critical" title={`${errors.length} Error${errors.length > 1 ? 's' : ''} Found`}>
            <List>
              {errors.map((issue, index) => (
                <List.Item key={index}>
                  <strong>{issue.field}:</strong> {issue.message}
                  {issue.path && <Text as="span" tone="subdued"> ({issue.path})</Text>}
                </List.Item>
              ))}
            </List>
          </Banner>
        )}

        {warnings.length > 0 && (
          <Banner tone="warning" title={`${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`}>
            <List>
              {warnings.map((issue, index) => (
                <List.Item key={index}>
                  <strong>{issue.field}:</strong> {issue.message}
                </List.Item>
              ))}
            </List>
          </Banner>
        )}

        {infos.length > 0 && (
          <Banner tone="info" title="Suggestions for Improvement">
            <List>
              {infos.map((issue, index) => (
                <List.Item key={index}>
                  <strong>{issue.field}:</strong> {issue.message}
                </List.Item>
              ))}
            </List>
          </Banner>
        )}
      </BlockStack>
    );
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h3">
              {getSchemaTypeLabel()}
            </Text>
            {getValidationBadge()}
          </InlineStack>

          <InlineStack gap="200">
            <Button
              icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setIsExpanded(!isExpanded)}
              variant="plain"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>

            <Button
              icon={ClipboardIcon}
              onClick={handleCopy}
              variant="primary"
            >
              {copied ? 'Copied!' : 'Copy JSON-LD'}
            </Button>
          </InlineStack>
        </InlineStack>

        {/* Schema.org link */}
        <Box>
          <InlineStack gap="100" blockAlign="center">
            <Icon source={InfoIcon} tone="subdued" />
            <Text as="span" tone="subdued">
              Schema type:{' '}
            </Text>
            <Link url={getSchemaTypeUrl()} target="_blank">
              {schema['@type']}
            </Link>
            <Icon source={ExternalIcon} tone="subdued" />
          </InlineStack>
        </Box>

        <Divider />

        {/* Collapsible validation section */}
        <Collapsible
          open={isExpanded}
          id="schema-validation"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <BlockStack gap="400">
            {/* Validation issues */}
            {renderValidationIssues()}

            {/* JSON preview */}
            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">
                Generated JSON-LD
              </Text>
              <Box>
                <SyntaxHighlightedJson json={schema} />
              </Box>
            </BlockStack>

            {/* Testing links */}
            <Box>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  Test Your Schema
                </Text>
                <InlineStack gap="200">
                  <Button
                    url="https://search.google.com/test/rich-results"
                    target="_blank"
                    icon={ExternalIcon}
                  >
                    Google Rich Results Test
                  </Button>
                  <Button
                    url="https://validator.schema.org/"
                    target="_blank"
                    icon={ExternalIcon}
                    variant="plain"
                  >
                    Schema.org Validator
                  </Button>
                </InlineStack>
                <Text as="p" tone="subdued" variant="bodySm">
                  Copy the JSON-LD above and paste it into these tools to validate your structured data.
                </Text>
              </BlockStack>
            </Box>
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

/**
 * Compact version of SchemaPreview for use in tables or lists
 */
export function SchemaPreviewCompact({
  schema,
  schemaType,
  validation
}: Omit<SchemaPreviewProps, 'onCopy'>) {
  const [showFull, setShowFull] = useState(false);

  if (showFull) {
    return (
      <div>
        <SchemaPreview
          schema={schema}
          schemaType={schemaType}
          validation={validation}
          onCopy={() => {}}
        />
        <Box paddingBlockStart="300">
          <Button onClick={() => setShowFull(false)} variant="plain">
            Show less
          </Button>
        </Box>
      </div>
    );
  }

  const errorCount = validation?.issues.filter(i => i.severity === 'error').length || 0;
  const isValid = validation?.isValid !== false;

  return (
    <InlineStack align="space-between" blockAlign="center">
      <InlineStack gap="200" blockAlign="center">
        <Text as="span">
          {schema['@type']} Schema
        </Text>
        {!isValid && (
          <Badge tone="critical">{`${errorCount} error${errorCount > 1 ? 's' : ''}`}</Badge>
        )}
      </InlineStack>

      <Button onClick={() => setShowFull(true)} variant="plain">
        View details
      </Button>
    </InlineStack>
  );
}

export default SchemaPreview;
