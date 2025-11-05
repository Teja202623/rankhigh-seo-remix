import {
  Card,
  Text,
  BlockStack,
  DataTable,
  Button,
  InlineStack,
  TextField,
  Select,
  Badge,
  Icon,
  Modal,
  Banner,
} from '@shopify/polaris';
import { AlertTriangleIcon, DeleteIcon, EditIcon, PlusIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface NotFoundError {
  id: string;
  url: string;
  count: number;
  lastSeen: string;
  referrer?: string;
  estimatedTrafficLoss: number;
}

export interface Redirect {
  id: string;
  from: string;
  to: string;
  type: '301' | '302' | '307';
  hits: number;
  createdAt: string;
  isActive: boolean;
}

interface RedirectsManagerProps {
  notFoundErrors: NotFoundError[];
  redirects: Redirect[];
  onAddRedirect?: (redirect: Omit<Redirect, 'id' | 'hits' | 'createdAt'>) => void;
  onUpdateRedirect?: (id: string, redirect: Partial<Redirect>) => void;
  onDeleteRedirect?: (id: string) => void;
  onTestRedirect?: (from: string) => Promise<string | null>;
  onBulkImport?: (redirects: Array<Omit<Redirect, 'id' | 'hits' | 'createdAt'>>) => void;
  onExport?: () => void;
}

export default function RedirectsManager({
  notFoundErrors,
  redirects,
  onAddRedirect,
  onUpdateRedirect,
  onDeleteRedirect,
  onTestRedirect,
  onBulkImport,
  onExport,
}: RedirectsManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromUrl, setFromUrl] = useState('');
  const [toUrl, setToUrl] = useState('');
  const [redirectType, setRedirectType] = useState<'301' | '302' | '307'>('301');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState('');

  // Statistics
  const total404s = notFoundErrors.reduce((sum, err) => sum + err.count, 0);
  const estimatedLoss = notFoundErrors.reduce((sum, err) => sum + err.estimatedTrafficLoss, 0);
  const activeRedirects = redirects.filter((r) => r.isActive).length;
  const totalRedirects = redirects.length;

  const handleAddRedirect = () => {
    if (fromUrl && toUrl && onAddRedirect) {
      onAddRedirect({
        from: fromUrl,
        to: toUrl,
        type: redirectType,
        isActive: true,
      });
      setFromUrl('');
      setToUrl('');
      setRedirectType('301');
      setShowAddModal(false);
    }
  };

  const handleQuickFix = (error: NotFoundError) => {
    setFromUrl(error.url);
    setShowAddModal(true);
  };

  const handleTestRedirect = async () => {
    if (onTestRedirect && fromUrl) {
      const result = await onTestRedirect(fromUrl);
      setTestResult(result || 'No redirect found');
    }
  };

  const handleBulkImport = () => {
    if (!bulkData.trim() || !onBulkImport) return;

    const lines = bulkData.trim().split('\n');
    const redirectsToImport: Array<Omit<Redirect, 'id' | 'hits' | 'createdAt'>> = [];

    lines.forEach((line) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        redirectsToImport.push({
          from: parts[0],
          to: parts[1],
          type: (parts[2] as any) || '301',
          isActive: true,
        });
      }
    });

    if (redirectsToImport.length > 0) {
      onBulkImport(redirectsToImport);
      setBulkData('');
      setShowBulkImport(false);
    }
  };

  // 404 Errors Table
  const error404Rows = notFoundErrors.map((error) => [
    <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {error.url}
      </Text>
    </div>,
    <Badge tone="critical">{error.count.toString()}</Badge>,
    error.referrer ? (
      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <Text as="span" variant="bodySm" tone="subdued">
          {error.referrer}
        </Text>
      </div>
    ) : (
      '-'
    ),
    <Badge tone={error.estimatedTrafficLoss > 100 ? 'critical' : 'warning'}>
      {`~${error.estimatedTrafficLoss} visits/mo`}
    </Badge>,
    new Date(error.lastSeen).toLocaleDateString(),
    <Button size="slim" onClick={() => handleQuickFix(error)}>
      Create Redirect
    </Button>,
  ]);

  // Redirects Table
  const redirectRows = redirects.map((redirect) => [
    <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {redirect.from}
      </Text>
    </div>,
    <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text as="span" variant="bodyMd">
        {redirect.to}
      </Text>
    </div>,
    <Badge tone={redirect.type === '301' ? 'success' : 'info'}>{redirect.type}</Badge>,
    redirect.hits.toLocaleString(),
    redirect.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>,
    <InlineStack gap="100">
      <Button
        size="slim"
        icon={EditIcon}
        onClick={() => {
          setEditingId(redirect.id);
          setFromUrl(redirect.from);
          setToUrl(redirect.to);
          setRedirectType(redirect.type);
          setShowAddModal(true);
        }}
      />
      {onDeleteRedirect && (
        <Button
          size="slim"
          icon={DeleteIcon}
          tone="critical"
          onClick={() => onDeleteRedirect(redirect.id)}
        />
      )}
    </InlineStack>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Statistics */}
      <InlineStack gap="400" wrap={false}>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                404 Errors
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: '#ef4444' }}>{total404s}</span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Est. Traffic Loss
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: '#f59e0b' }}>{estimatedLoss}/mo</span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Active Redirects
              </Text>
              <Text as="p" variant="heading2xl">
                <span style={{ color: '#10b981' }}>{activeRedirects}</span>
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Redirects
              </Text>
              <Text as="p" variant="heading2xl">
                {totalRedirects}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* 404 Errors */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                404 Errors
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Broken URLs affecting your SEO and user experience
              </Text>
            </div>
            <Icon source={AlertTriangleIcon} tone="critical" />
          </InlineStack>

          {notFoundErrors.length > 0 ? (
            <>
              <Banner tone="warning">
                You have {notFoundErrors.length} broken URL{notFoundErrors.length !== 1 ? 's' : ''}{' '}
                that should be fixed with redirects.
              </Banner>
              <DataTable
                columnContentTypes={['text', 'numeric', 'text', 'text', 'text', 'text']}
                headings={['URL', 'Hits', 'Referrer', 'Traffic Loss', 'Last Seen', 'Actions']}
                rows={error404Rows}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Text as="p" variant="headingMd" fontWeight="semibold">
                No 404 errors found!
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                All URLs are working correctly.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Redirects */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                Redirects
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Manage 301, 302, and 307 redirects
              </Text>
            </div>
            <InlineStack gap="200">
              {onExport && <Button onClick={onExport}>Export CSV</Button>}
              <Button onClick={() => setShowBulkImport(true)}>Bulk Import</Button>
              {onAddRedirect && (
                <Button variant="primary" icon={PlusIcon} onClick={() => setShowAddModal(true)}>
                  Add Redirect
                </Button>
              )}
            </InlineStack>
          </InlineStack>

          {redirects.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text']}
              headings={['From', 'To', 'Type', 'Hits', 'Status', 'Actions']}
              rows={redirectRows}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Text as="p" variant="bodyMd" tone="subdued">
                No redirects configured yet. Add your first redirect above.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Add/Edit Redirect Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingId(null);
          setFromUrl('');
          setToUrl('');
          setTestResult(null);
        }}
        title={editingId ? 'Edit Redirect' : 'Add New Redirect'}
        primaryAction={{
          content: editingId ? 'Update' : 'Add Redirect',
          onAction: handleAddRedirect,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setShowAddModal(false);
              setEditingId(null);
              setFromUrl('');
              setToUrl('');
              setTestResult(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="From URL"
              value={fromUrl}
              onChange={setFromUrl}
              placeholder="/old-page"
              helpText="The broken or old URL that should redirect"
              autoComplete="off"
            />
            <TextField
              label="To URL"
              value={toUrl}
              onChange={setToUrl}
              placeholder="/new-page"
              helpText="The destination URL where users should be redirected"
              autoComplete="off"
            />
            <Select
              label="Redirect Type"
              options={[
                { label: '301 - Permanent (Recommended)', value: '301' },
                { label: '302 - Temporary', value: '302' },
                { label: '307 - Temporary (Preserves Method)', value: '307' },
              ]}
              value={redirectType}
              onChange={(value) => setRedirectType(value as any)}
              helpText="301 redirects pass the most SEO value"
            />

            {onTestRedirect && (
              <>
                <Button onClick={handleTestRedirect}>Test Redirect</Button>
                {testResult && (
                  <Banner tone={testResult.startsWith('http') ? 'success' : 'warning'}>
                    {testResult}
                  </Banner>
                )}
              </>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        open={showBulkImport}
        onClose={() => {
          setShowBulkImport(false);
          setBulkData('');
        }}
        title="Bulk Import Redirects"
        primaryAction={{
          content: 'Import',
          onAction: handleBulkImport,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setShowBulkImport(false);
              setBulkData('');
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="info">
              Enter one redirect per line in the format: from,to,type (e.g., /old,/new,301)
            </Banner>
            <TextField
              label="Redirect Data"
              value={bulkData}
              onChange={setBulkData}
              multiline={10}
              placeholder={`/old-page,/new-page,301\n/another-old,/another-new,301\n/temp-redirect,/destination,302`}
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
