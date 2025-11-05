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
  Checkbox,
  Icon,
  Tabs,
  Banner,
} from '@shopify/polaris';
import {
  EmailIcon,
  CalendarIcon,
  ExportIcon,
  PlusIcon,
  DeleteIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface ReportTemplate {
  id: string;
  name: string;
  metrics: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'csv' | 'both';
  isActive: boolean;
  lastSent?: string;
  nextScheduled?: string;
}

export interface GeneratedReport {
  id: string;
  templateName: string;
  generatedAt: string;
  period: string;
  format: string;
  fileSize: string;
  downloadUrl: string;
}

export interface ReportMetric {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface AutomatedReportsProps {
  templates?: ReportTemplate[];
  generatedReports?: GeneratedReport[];
  availableMetrics?: ReportMetric[];
  onCreateTemplate?: (template: Omit<ReportTemplate, 'id'>) => void;
  onUpdateTemplate?: (id: string, template: Partial<ReportTemplate>) => void;
  onDeleteTemplate?: (id: string) => void;
  onGenerateReport?: (templateId: string) => void;
  onDownloadReport?: (reportId: string) => void;
}

const DEFAULT_METRICS: ReportMetric[] = [
  { id: 'seo-score', name: 'SEO Score', category: 'Overview', description: 'Overall SEO health score' },
  { id: 'organic-traffic', name: 'Organic Traffic', category: 'Analytics', description: 'Total organic visits' },
  { id: 'keyword-rankings', name: 'Keyword Rankings', category: 'Keywords', description: 'Tracked keyword positions' },
  { id: 'backlinks', name: 'Backlinks', category: 'Links', description: 'Total backlink count' },
  { id: 'page-speed', name: 'Page Speed', category: 'Performance', description: 'Core Web Vitals scores' },
  { id: 'indexed-pages', name: 'Indexed Pages', category: 'Technical', description: 'Pages indexed by Google' },
  { id: 'broken-links', name: 'Broken Links', category: 'Technical', description: '404 errors and broken links' },
  { id: 'meta-tags', name: 'Meta Tags Coverage', category: 'On-Page', description: 'Pages with optimized meta tags' },
  { id: 'schema-markup', name: 'Schema Markup', category: 'Technical', description: 'Structured data implementation' },
  { id: 'mobile-usability', name: 'Mobile Usability', category: 'Performance', description: 'Mobile-friendliness score' },
  { id: 'top-queries', name: 'Top Search Queries', category: 'Analytics', description: 'Best performing keywords' },
  { id: 'click-through-rate', name: 'Average CTR', category: 'Analytics', description: 'Click-through rate from search' },
];

export default function AutomatedReports({
  templates = [],
  generatedReports = [],
  availableMetrics = DEFAULT_METRICS,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onGenerateReport,
  onDownloadReport,
}: AutomatedReportsProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    metrics: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'csv' | 'both';
    isActive: boolean;
  }>({
    name: '',
    metrics: [],
    frequency: 'weekly',
    recipients: [''],
    format: 'pdf',
    isActive: true,
  });

  const tabs = [
    { id: 'templates', content: `Templates (${templates.length})`, panelID: 'templates-panel' },
    { id: 'history', content: `Report History (${generatedReports.length})`, panelID: 'history-panel' },
  ];

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || newTemplate.metrics.length === 0 || !onCreateTemplate) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreateTemplate({
        ...newTemplate,
        recipients: newTemplate.recipients.filter((r) => r.trim() !== ''),
      });
      setNewTemplate({
        name: '',
        metrics: [],
        frequency: 'weekly',
        recipients: [''],
        format: 'pdf',
        isActive: true,
      });
      setIsCreatingTemplate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetricToggle = (metricId: string) => {
    setNewTemplate((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const handleAddRecipient = () => {
    setNewTemplate((prev) => ({
      ...prev,
      recipients: [...prev.recipients, ''],
    }));
  };

  const handleUpdateRecipient = (index: number, value: string) => {
    setNewTemplate((prev) => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => (i === index ? value : r)),
    }));
  };

  const handleRemoveRecipient = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  // Templates table
  const templateRows = templates.map((template) => [
    <div>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {template.name}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {template.metrics.length} metrics
      </Text>
    </div>,
    <Badge>{template.frequency}</Badge>,
    <div style={{ maxWidth: '200px' }}>
      <Text as="span" variant="bodySm">
        {template.recipients.length} recipient{template.recipients.length !== 1 ? 's' : ''}
      </Text>
    </div>,
    <Badge tone={template.format === 'both' ? 'info' : 'success'}>
      {template.format.toUpperCase()}
    </Badge>,
    template.isActive ? (
      <Badge tone="success">Active</Badge>
    ) : (
      <Badge>Paused</Badge>
    ),
    template.nextScheduled ? new Date(template.nextScheduled).toLocaleDateString() : '-',
    <InlineStack gap="200">
      {onGenerateReport && (
        <Button size="slim" onClick={() => onGenerateReport(template.id)}>
          Generate Now
        </Button>
      )}
      {onUpdateTemplate && (
        <Button
          size="slim"
          onClick={() =>
            onUpdateTemplate(template.id, { isActive: !template.isActive })
          }
        >
          {template.isActive ? 'Pause' : 'Resume'}
        </Button>
      )}
      {onDeleteTemplate && (
        <Button
          size="slim"
          tone="critical"
          icon={DeleteIcon}
          onClick={() => onDeleteTemplate(template.id)}
        />
      )}
    </InlineStack>,
  ]);

  // Report history table
  const historyRows = generatedReports.map((report) => [
    <div>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {report.templateName}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {report.period}
      </Text>
    </div>,
    new Date(report.generatedAt).toLocaleString(),
    <Badge tone="success">{report.format.toUpperCase()}</Badge>,
    report.fileSize,
    onDownloadReport && (
      <Button size="slim" onClick={() => onDownloadReport(report.id)}>
        Download
      </Button>
    ),
  ]);

  // Group metrics by category
  const metricsByCategory = availableMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, ReportMetric[]>);

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Automated SEO Reports
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Schedule and generate automated SEO performance reports
            </Text>
          </div>
          {!isCreatingTemplate && onCreateTemplate && (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsCreatingTemplate(true)}>
              Create Template
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Create Template Form */}
      {isCreatingTemplate && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Create Report Template
            </Text>

            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}

            <TextField
              label="Template Name"
              value={newTemplate.name}
              onChange={(value) => setNewTemplate({ ...newTemplate, name: value })}
              placeholder="Weekly SEO Performance Report"
              autoComplete="off"
            />

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Frequency"
                  options={[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ]}
                  value={newTemplate.frequency}
                  onChange={(value) => setNewTemplate({ ...newTemplate, frequency: value as 'daily' | 'weekly' | 'monthly' })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Format"
                  options={[
                    { label: 'PDF', value: 'pdf' },
                    { label: 'CSV', value: 'csv' },
                    { label: 'Both PDF & CSV', value: 'both' },
                  ]}
                  value={newTemplate.format}
                  onChange={(value) => setNewTemplate({ ...newTemplate, format: value as 'pdf' | 'csv' | 'both' })}
                />
              </div>
            </InlineStack>

            {/* Metrics Selection */}
            <div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Select Metrics to Include
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Choose the metrics you want in your report
              </Text>
            </div>

            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <div key={category}>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {category}
                </Text>
                <BlockStack gap="200">
                  {metrics.map((metric) => (
                    <Checkbox
                      key={metric.id}
                      label={metric.name}
                      checked={newTemplate.metrics.includes(metric.id)}
                      onChange={() => handleMetricToggle(metric.id)}
                      helpText={metric.description}
                    />
                  ))}
                </BlockStack>
              </div>
            ))}

            {/* Recipients */}
            <div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Email Recipients
              </Text>
              <BlockStack gap="200">
                {newTemplate.recipients.map((recipient, index) => (
                  <InlineStack key={index} gap="200" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label=""
                        labelHidden
                        type="email"
                        value={recipient}
                        onChange={(value) => handleUpdateRecipient(index, value)}
                        placeholder="email@example.com"
                        autoComplete="email"
                        prefix={<Icon source={EmailIcon} />}
                      />
                    </div>
                    {newTemplate.recipients.length > 1 && (
                      <Button
                        icon={DeleteIcon}
                        tone="critical"
                        onClick={() => handleRemoveRecipient(index)}
                      />
                    )}
                  </InlineStack>
                ))}
                <Button onClick={handleAddRecipient}>Add Recipient</Button>
              </BlockStack>
            </div>

            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsCreatingTemplate(false)} disabled={isLoading}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name || newTemplate.metrics.length === 0}
                loading={isLoading}
              >
                Create Template
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <div style={{ marginTop: '16px' }}>
            {/* Templates Tab */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                {templates.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Template', 'Frequency', 'Recipients', 'Format', 'Status', 'Next Run', 'Actions']}
                    rows={templateRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Icon source={ExportIcon} />
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      No report templates yet
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Create a template to start receiving automated SEO reports
                    </Text>
                    {!isCreatingTemplate && onCreateTemplate && (
                      <div style={{ marginTop: '16px' }}>
                        <Button variant="primary" onClick={() => setIsCreatingTemplate(true)}>
                          Create Your First Template
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </BlockStack>
            )}

            {/* History Tab */}
            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Report History
                </Text>
                {generatedReports.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Report', 'Generated', 'Format', 'Size', 'Download']}
                    rows={historyRows}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No reports generated yet
                    </Text>
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
            Report Best Practices
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
                  <strong>Weekly reports</strong> - Best frequency for monitoring SEO progress
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Focus on trends</strong> - Compare period-over-period changes
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Share with stakeholders</strong> - Keep your team informed
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Include actionable insights</strong> - Not just data, but recommendations
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Track key metrics</strong> - Focus on metrics that matter to your business
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Archive reports</strong> - Keep historical data for long-term analysis
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>

      {/* Preview Card */}
      {templates.length > 0 && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              What's Included in Reports
            </Text>
            <InlineStack gap="400" wrap>
              <div style={{ flex: 1 }}>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={CalendarIcon} tone="success" />
                    <Text as="p" variant="bodySm">
                      <strong>Period Summary</strong> - Key metrics comparison
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ExportIcon} tone="success" />
                    <Text as="p" variant="bodySm">
                      <strong>Charts & Graphs</strong> - Visual trend analysis
                    </Text>
                  </InlineStack>
                </BlockStack>
              </div>
              <div style={{ flex: 1 }}>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ExportIcon} tone="success" />
                    <Text as="p" variant="bodySm">
                      <strong>Top Performers</strong> - Best pages and keywords
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ExportIcon} tone="success" />
                    <Text as="p" variant="bodySm">
                      <strong>Recommendations</strong> - Actionable next steps
                    </Text>
                  </InlineStack>
                </BlockStack>
              </div>
            </InlineStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
