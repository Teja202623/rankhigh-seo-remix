import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  DataTable,
  ProgressBar,
  Icon,
  Banner,
  Select,
} from '@shopify/polaris';
import { CheckCircleIcon, AlertTriangleIcon, ClockIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
}

export interface PageSpeedData {
  url: string;
  performanceScore: number;
  coreWebVitals: CoreWebVitals;
  loadTime: number;
  pageSize: number;
  requests: number;
  device: 'mobile' | 'desktop';
  opportunities: SpeedOpportunity[];
  diagnostics: SpeedDiagnostic[];
}

export interface SpeedOpportunity {
  title: string;
  description: string;
  savings: number; // time saved in ms
  priority: 'high' | 'medium' | 'low';
}

export interface SpeedDiagnostic {
  title: string;
  status: 'pass' | 'warning' | 'fail';
  value: string;
}

interface SiteSpeedAnalysisProps {
  data?: PageSpeedData;
  onAnalyze?: (url: string, device: 'mobile' | 'desktop') => void;
  isLoading?: boolean;
}

export default function SiteSpeedAnalysis({ data, onAnalyze, isLoading }: SiteSpeedAnalysisProps) {
  const [testUrl, setTestUrl] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  if (!data && !isLoading) {
    return (
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Site Speed & Core Web Vitals
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Analyze your page performance and get optimization tips
              </Text>
            </div>
            <Icon source={ClockIcon} />
          </InlineStack>

          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <BlockStack gap="300">
              <Text as="p" variant="headingMd">
                Test Your Site Speed
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Enter a URL to analyze performance and Core Web Vitals
              </Text>
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <BlockStack gap="300">
                  <InlineStack gap="200" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        placeholder="https://example.com/page"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        }}
                      />
                    </div>
                    <Select
                      label=""
                      labelHidden
                      options={[
                        { label: 'Mobile', value: 'mobile' },
                        { label: 'Desktop', value: 'desktop' },
                      ]}
                      value={device}
                      onChange={(value) => setDevice(value as any)}
                    />
                  </InlineStack>
                  {onAnalyze && (
                    <Button
                      variant="primary"
                      onClick={() => onAnalyze(testUrl, device)}
                      disabled={!testUrl}
                    >
                      Analyze Page Speed
                    </Button>
                  )}
                </BlockStack>
              </div>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BlockStack gap="300">
            <Text as="p" variant="headingMd">
              Analyzing page speed...
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              This may take 30-60 seconds
            </Text>
            <ProgressBar progress={75} size="small" />
          </BlockStack>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  // Core Web Vitals thresholds
  const getLCPStatus = (lcp: number): 'good' | 'needs-improvement' | 'poor' => {
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  };

  const getFIDStatus = (fid: number): 'good' | 'needs-improvement' | 'poor' => {
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  };

  const getCLSStatus = (cls: number): 'good' | 'needs-improvement' | 'poor' => {
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  };

  const getStatusTone = (status: string): 'success' | 'warning' | 'critical' => {
    if (status === 'good' || status === 'pass') return 'success';
    if (status === 'needs-improvement' || status === 'warning') return 'warning';
    return 'critical';
  };

  const lcpStatus = getLCPStatus(data.coreWebVitals.lcp);
  const fidStatus = getFIDStatus(data.coreWebVitals.fid);
  const clsStatus = getCLSStatus(data.coreWebVitals.cls);

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Opportunities table
  const opportunityRows = data.opportunities.map((opp) => [
    opp.title,
    <div style={{ maxWidth: '300px' }}>
      <Text as="span" variant="bodySm">
        {opp.description}
      </Text>
    </div>,
    <Badge tone={opp.priority === 'high' ? 'critical' : opp.priority === 'medium' ? 'warning' : 'info'}>
      {opp.priority}
    </Badge>,
    `${(opp.savings / 1000).toFixed(2)}s`,
  ]);

  // Diagnostics table
  const diagnosticRows = data.diagnostics.map((diag) => [
    <InlineStack gap="200" blockAlign="center">
      <Icon
        source={diag.status === 'pass' ? CheckCircleIcon : AlertTriangleIcon}
        tone={getStatusTone(diag.status)}
      />
      <Text as="span" variant="bodyMd">
        {diag.title}
      </Text>
    </InlineStack>,
    diag.value,
    <Badge tone={getStatusTone(diag.status)}>
      {diag.status === 'pass' ? 'Passed' : diag.status === 'warning' ? 'Warning' : 'Failed'}
    </Badge>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Overall Score */}
      <Card>
        <InlineStack gap="600" wrap={false} blockAlign="center">
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `10px solid ${getPerformanceColor(data.performanceScore)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Text as="span" variant="heading2xl" fontWeight="bold">
                {data.performanceScore}
              </Text>
            </div>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Performance Score
            </Text>
          </div>

          <div style={{ flex: 1 }}>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                {data.url}
              </Text>
              <InlineStack gap="400">
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Load Time
                  </Text>
                  <Text as="p" variant="headingMd">
                    {(data.loadTime / 1000).toFixed(2)}s
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Page Size
                  </Text>
                  <Text as="p" variant="headingMd">
                    {(data.pageSize / 1024).toFixed(0)} KB
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Requests
                  </Text>
                  <Text as="p" variant="headingMd">
                    {data.requests}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Device
                  </Text>
                  <Text as="p" variant="headingMd">
                    {data.device}
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </div>
        </InlineStack>
      </Card>

      {/* Core Web Vitals */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Core Web Vitals
          </Text>
          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Largest Contentful Paint (LCP)
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {(data.coreWebVitals.lcp / 1000).toFixed(2)}s
                  </Text>
                  <Badge tone={getStatusTone(lcpStatus)}>
                    {lcpStatus === 'good' ? 'Good' : lcpStatus === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                  </Badge>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Target: ≤ 2.5s
                  </Text>
                </BlockStack>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    First Input Delay (FID)
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {data.coreWebVitals.fid}ms
                  </Text>
                  <Badge tone={getStatusTone(fidStatus)}>
                    {fidStatus === 'good' ? 'Good' : fidStatus === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                  </Badge>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Target: ≤ 100ms
                  </Text>
                </BlockStack>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Cumulative Layout Shift (CLS)
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {data.coreWebVitals.cls.toFixed(3)}
                  </Text>
                  <Badge tone={getStatusTone(clsStatus)}>
                    {clsStatus === 'good' ? 'Good' : clsStatus === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                  </Badge>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Target: ≤ 0.1
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Opportunities */}
      {data.opportunities.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Optimization Opportunities
            </Text>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Opportunity', 'Description', 'Priority', 'Est. Savings']}
              rows={opportunityRows}
            />
          </BlockStack>
        </Card>
      )}

      {/* Diagnostics */}
      {data.diagnostics.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Diagnostics
            </Text>
            <DataTable
              columnContentTypes={['text', 'text', 'text']}
              headings={['Diagnostic', 'Value', 'Status']}
              rows={diagnosticRows}
            />
          </BlockStack>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Improve Your Page Speed
          </Text>
          <Banner tone="info">
            Core Web Vitals are critical ranking factors. Pages that meet the "Good" thresholds rank higher in search results.
          </Banner>
          <ul style={{ marginLeft: '20px' }}>
            <li>
              <Text as="span" variant="bodySm">
                <strong>Optimize images:</strong> Compress and use WebP format
              </Text>
            </li>
            <li>
              <Text as="span" variant="bodySm">
                <strong>Minimize JavaScript:</strong> Remove unused code and defer non-critical scripts
              </Text>
            </li>
            <li>
              <Text as="span" variant="bodySm">
                <strong>Use CDN:</strong> Serve static assets from a content delivery network
              </Text>
            </li>
            <li>
              <Text as="span" variant="bodySm">
                <strong>Enable caching:</strong> Set appropriate cache headers
              </Text>
            </li>
            <li>
              <Text as="span" variant="bodySm">
                <strong>Reduce server response time:</strong> Optimize database queries and use faster hosting
              </Text>
            </li>
          </ul>
        </BlockStack>
      </Card>

      {onAnalyze && (
        <Button onClick={() => onAnalyze(data.url, data.device)} fullWidth>
          Re-analyze
        </Button>
      )}
    </BlockStack>
  );
}
