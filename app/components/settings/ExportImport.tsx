import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Badge,
  Icon,
  Select,
  DropZone,
  Banner,
  InlineCode,
} from '@shopify/polaris';
import {
  ArrowDownIcon,
  UploadIcon,
  FileIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@shopify/polaris-icons';
import { useState, useCallback } from 'react';

export interface ExportConfig {
  dataTypes: {
    pages: boolean;
    keywords: boolean;
    schema: boolean;
    redirects: boolean;
    settings: boolean;
    reports: boolean;
    localSEO: boolean;
    competitors: boolean;
  };
  format: 'json' | 'csv' | 'xml';
  includeHistory: boolean;
  compress: boolean;
}

export interface ImportResult {
  success: boolean;
  itemsProcessed: number;
  itemsFailed: number;
  errors?: string[];
  warnings?: string[];
}

interface ExportImportProps {
  onExport?: (config: ExportConfig) => Promise<void>;
  onImport?: (file: File) => Promise<ImportResult>;
  isExporting?: boolean;
  isImporting?: boolean;
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  dataTypes: {
    pages: true,
    keywords: true,
    schema: true,
    redirects: true,
    settings: true,
    reports: false,
    localSEO: false,
    competitors: false,
  },
  format: 'json',
  includeHistory: false,
  compress: true,
};

export default function ExportImport({
  onExport,
  onImport,
  isExporting = false,
  isImporting = false,
}: ExportImportProps) {
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [files, setFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);

  const handleDropZoneDrop = useCallback((_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    setFiles(acceptedFiles);
    setImportResult(null);
    setImportError(null);
  }, []);

  const handleExport = async () => {
    if (!onExport) return;

    setIsExportLoading(true);
    setExportError(null);
    setShowExportSuccess(false);

    try {
      await onExport(exportConfig);
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 5000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (files.length === 0 || !onImport) return;

    setIsImportLoading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await onImport(files[0]);
      setImportResult(result);
      if (result.success) {
        setFiles([]);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setIsImportLoading(false);
    }
  };

  const updateExportConfig = (updates: Partial<ExportConfig>) => {
    setExportConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateDataTypes = (type: keyof ExportConfig['dataTypes'], value: boolean) => {
    setExportConfig((prev) => ({
      ...prev,
      dataTypes: {
        ...prev.dataTypes,
        [type]: value,
      },
    }));
  };

  const selectedDataTypesCount = Object.values(exportConfig.dataTypes).filter(Boolean).length;
  const estimatedFileSize = selectedDataTypesCount * 0.5; // Rough estimate in MB

  const uploadedFiles = files.length > 0 && (
    <div style={{ padding: '8px' }}>
      <InlineStack gap="200" blockAlign="center">
        <Icon source={FileIcon} tone="info" />
        <Text as="span" variant="bodySm">
          {files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
        </Text>
      </InlineStack>
    </div>
  );

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Export & Import
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Backup your SEO data or migrate between stores
          </Text>
        </BlockStack>
      </Card>

      {/* Export Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h3" variant="headingMd">
                Export Data
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Download your SEO data for backup or migration
              </Text>
            </div>
            <Icon source={ArrowDownIcon} tone="info" />
          </InlineStack>

          {/* Format Selection */}
          <div style={{ width: '200px' }}>
            <Select
              label="Export Format"
              options={[
                { label: 'JSON (recommended)', value: 'json' },
                { label: 'CSV (spreadsheet)', value: 'csv' },
                { label: 'XML', value: 'xml' },
              ]}
              value={exportConfig.format}
              onChange={(value) => updateExportConfig({ format: value as 'json' | 'csv' | 'xml' })}
            />
          </div>

          {/* Data Type Selection */}
          <div>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Select Data to Export
            </Text>
            <BlockStack gap="200">
              <Checkbox
                label="Page SEO Data (meta tags, content analysis)"
                checked={exportConfig.dataTypes.pages}
                onChange={(value) => updateDataTypes('pages', value)}
              />
              <Checkbox
                label="Tracked Keywords & Rankings"
                checked={exportConfig.dataTypes.keywords}
                onChange={(value) => updateDataTypes('keywords', value)}
              />
              <Checkbox
                label="Schema Markup"
                checked={exportConfig.dataTypes.schema}
                onChange={(value) => updateDataTypes('schema', value)}
              />
              <Checkbox
                label="Redirects & 404 Errors"
                checked={exportConfig.dataTypes.redirects}
                onChange={(value) => updateDataTypes('redirects', value)}
              />
              <Checkbox
                label="SEO Settings & Configuration"
                checked={exportConfig.dataTypes.settings}
                onChange={(value) => updateDataTypes('settings', value)}
              />
              <Checkbox
                label="Report Templates & History"
                checked={exportConfig.dataTypes.reports}
                onChange={(value) => updateDataTypes('reports', value)}
              />
              <Checkbox
                label="Local SEO Data (business info, citations)"
                checked={exportConfig.dataTypes.localSEO}
                onChange={(value) => updateDataTypes('localSEO', value)}
              />
              <Checkbox
                label="Competitor Tracking Data"
                checked={exportConfig.dataTypes.competitors}
                onChange={(value) => updateDataTypes('competitors', value)}
              />
            </BlockStack>
          </div>

          {/* Export Options */}
          <div>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Export Options
            </Text>
            <BlockStack gap="200">
              <Checkbox
                label="Include historical data"
                checked={exportConfig.includeHistory}
                onChange={(value) => updateExportConfig({ includeHistory: value })}
                helpText="Include ranking history, score trends, etc."
              />
              <Checkbox
                label="Compress export file (ZIP)"
                checked={exportConfig.compress}
                onChange={(value) => updateExportConfig({ compress: value })}
                helpText="Reduce file size for easier transfer"
              />
            </BlockStack>
          </div>

          {/* Export Summary */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Data types selected:
                </Text>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  {selectedDataTypesCount} / 8
                </Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Estimated file size:
                </Text>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  ~{exportConfig.compress ? estimatedFileSize * 0.3 : estimatedFileSize.toFixed(1)} MB
                </Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Format:
                </Text>
                <Badge>{exportConfig.format.toUpperCase()}</Badge>
              </InlineStack>
            </BlockStack>
          </div>

          {showExportSuccess && (
            <Banner tone="success" icon={CheckCircleIcon}>
              Export completed successfully! Your file is downloading.
            </Banner>
          )}

          {exportError && (
            <Banner tone="critical" onDismiss={() => setExportError(null)}>
              {exportError}
            </Banner>
          )}

          <InlineStack align="end">
            <Button
              variant="primary"
              icon={ArrowDownIcon}
              onClick={handleExport}
              loading={isExportLoading || isExporting}
              disabled={selectedDataTypesCount === 0}
            >
              Export Data
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Import Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h3" variant="headingMd">
                Import Data
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Restore from a backup or migrate from another store
              </Text>
            </div>
            <Icon source={UploadIcon} tone="info" />
          </InlineStack>

          <Banner tone="warning">
            <p>
              <strong>Important:</strong> Importing will overwrite existing data. We recommend creating a backup before
              importing.
            </p>
          </Banner>

          {/* File Upload */}
          <DropZone
            label="Upload file"
            onDrop={handleDropZoneDrop}
            accept=".json,.csv,.xml,.zip"
            type="file"
            allowMultiple={false}
          >
            {uploadedFiles || (
              <DropZone.FileUpload
                actionTitle="Add file"
                actionHint="or drop file to upload"
              />
            )}
          </DropZone>

          {/* Import Result */}
          {importResult && (
            <div>
              {importResult.success ? (
                <Banner tone="success" icon={CheckCircleIcon}>
                  <p>
                    <strong>Import successful!</strong>
                  </p>
                  <p>
                    Processed {importResult.itemsProcessed} items
                    {importResult.itemsFailed > 0 && `, ${importResult.itemsFailed} failed`}
                  </p>
                </Banner>
              ) : (
                <Banner tone="critical" icon={AlertTriangleIcon}>
                  <p>
                    <strong>Import failed</strong>
                  </p>
                  {importResult.errors && (
                    <ul>
                      {importResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  )}
                </Banner>
              )}

              {importResult.warnings && importResult.warnings.length > 0 && (
                <Banner tone="warning">
                  <p>
                    <strong>Warnings:</strong>
                  </p>
                  <ul>
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </Banner>
              )}
            </div>
          )}

          {importError && (
            <Banner tone="critical" onDismiss={() => setImportError(null)}>
              {importError}
            </Banner>
          )}

          <InlineStack align="end">
            <Button
              variant="primary"
              icon={UploadIcon}
              onClick={handleImport}
              loading={isImportLoading || isImporting}
              disabled={files.length === 0}
            >
              Import Data
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* File Format Guide */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Supported File Formats
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
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  JSON (recommended)
                </Text>
                <Text as="p" variant="bodySm">
                  • Preserves all data types and relationships
                  <br />• Best for full backups and migrations
                  <br />• Can be compressed to .zip
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  CSV (spreadsheet)
                </Text>
                <Text as="p" variant="bodySm">
                  • Easy to edit in Excel/Google Sheets
                  <br />• Good for bulk page meta tag updates
                  <br />• Limited to simple data structures
                </Text>
              </div>
              <div>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  XML
                </Text>
                <Text as="p" variant="bodySm">
                  • Compatible with other SEO tools
                  <br />• Good for schema markup and sitemaps
                  <br />• Larger file size than JSON
                </Text>
              </div>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Best Practices
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
                  <strong>Regular backups</strong> - Export your data monthly as a backup
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Test imports</strong> - Always test imports on a development store first
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Store securely</strong> - Keep export files in a secure location
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Document changes</strong> - Note what data you're importing and why
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Verify after import</strong> - Check that critical data imported correctly
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
