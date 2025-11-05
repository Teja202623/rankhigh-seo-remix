import {
  Card,
  Text,
  BlockStack,
  DataTable,
  Checkbox,
  Button,
  InlineStack,
  TextField,
  Select,
  Badge,
  Banner,
} from '@shopify/polaris';
import { useState } from 'react';

export interface BulkEditPage {
  id: string;
  url: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  type: string;
}

interface BulkEditInterfaceProps {
  pages: BulkEditPage[];
  onSave?: (updates: Array<{ id: string; metaTitle: string; metaDescription: string }>) => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
}

export default function BulkEditInterface({ pages, onSave, onExport, onImport }: BulkEditInterfaceProps) {
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [editedPages, setEditedPages] = useState<Map<string, Partial<BulkEditPage>>>(new Map());
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkAction, setBulkAction] = useState('');

  // Bulk action templates
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const togglePageSelection = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPages.size === filteredPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const updatePageField = (pageId: string, field: string, value: string) => {
    const newEdited = new Map(editedPages);
    const existing = newEdited.get(pageId) || {};
    newEdited.set(pageId, { ...existing, [field]: value });
    setEditedPages(newEdited);
  };

  const applyBulkTemplate = () => {
    if (!templateTitle && !templateDescription) return;

    selectedPages.forEach((pageId) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      const newEdited = new Map(editedPages);
      const existing = newEdited.get(pageId) || {};

      // Support variables: {title}, {type}, {url}
      const replacements = {
        '{title}': page.title,
        '{type}': page.type,
        '{url}': page.url,
      };

      let newTitle = templateTitle || existing.metaTitle || page.metaTitle;
      let newDesc = templateDescription || existing.metaDescription || page.metaDescription;

      Object.entries(replacements).forEach(([key, value]) => {
        newTitle = newTitle.replace(new RegExp(key, 'g'), value);
        newDesc = newDesc.replace(new RegExp(key, 'g'), value);
      });

      newEdited.set(pageId, {
        ...existing,
        ...(templateTitle && { metaTitle: newTitle }),
        ...(templateDescription && { metaDescription: newDesc }),
      });

      setEditedPages(newEdited);
    });

    setTemplateTitle('');
    setTemplateDescription('');
    setBulkAction('');
  };

  const handleSaveChanges = () => {
    if (onSave) {
      const updates = Array.from(editedPages.entries()).map(([id, changes]) => {
        const page = pages.find((p) => p.id === id);
        return {
          id,
          metaTitle: changes.metaTitle || page?.metaTitle || '',
          metaDescription: changes.metaDescription || page?.metaDescription || '',
        };
      });
      onSave(updates);
      setEditedPages(new Map());
      setSelectedPages(new Set());
    }
  };

  // Filtering
  const filteredPages = pages.filter((page) => {
    const matchesType = filterType === 'all' || page.type === filterType;
    const matchesSearch =
      !searchQuery ||
      page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const rows = filteredPages.map((page) => {
    const edited = editedPages.get(page.id);
    const isEdited = !!edited;
    const currentTitle = edited?.metaTitle ?? page.metaTitle;
    const currentDesc = edited?.metaDescription ?? page.metaDescription;

    return [
      <Checkbox
        checked={selectedPages.has(page.id)}
        onChange={() => togglePageSelection(page.id)}
        label=""
      />,
      <div style={{ maxWidth: '200px' }}>
        <Text as="p" variant="bodySm" fontWeight="semibold">
          {page.title}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {page.url}
        </Text>
      </div>,
      <Badge>{page.type}</Badge>,
      <TextField
        value={currentTitle}
        onChange={(value) => updatePageField(page.id, 'metaTitle', value)}
        autoComplete="off"
        label=""
      />,
      <TextField
        value={currentDesc}
        onChange={(value) => updatePageField(page.id, 'metaDescription', value)}
        autoComplete="off"
        multiline={2}
        label=""
      />,
      isEdited && <Badge tone="warning">Modified</Badge>,
    ];
  });

  const hasChanges = editedPages.size > 0;

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingLg">
                Bulk Meta Tag Editor
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Edit multiple pages at once with templates and variables
              </Text>
            </div>
            <InlineStack gap="200">
              {onExport && <Button onClick={onExport}>Export CSV</Button>}
              {onImport && (
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) onImport(file);
                    };
                    input.click();
                  }}
                >
                  Import CSV
                </Button>
              )}
              {hasChanges && (
                <Button variant="primary" onClick={handleSaveChanges}>
                  {`Save ${editedPages.size} Change${editedPages.size !== 1 ? 's' : ''}`}
                </Button>
              )}
            </InlineStack>
          </InlineStack>

          {hasChanges && (
            <Banner tone="warning">
              You have unsaved changes. Click "Save" to apply them to your pages.
            </Banner>
          )}
        </BlockStack>
      </Card>

      {/* Filters and Bulk Actions */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Filters & Bulk Actions
          </Text>

          <InlineStack gap="300" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by URL or title..."
                autoComplete="off"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Select
                label="Page Type"
                options={[
                  { label: 'All Types', value: 'all' },
                  { label: 'Products', value: 'PRODUCT' },
                  { label: 'Collections', value: 'COLLECTION' },
                  { label: 'Pages', value: 'PAGE' },
                  { label: 'Blog Posts', value: 'BLOG' },
                ]}
                value={filterType}
                onChange={setFilterType}
              />
            </div>
          </InlineStack>

          {selectedPages.size > 0 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
              }}
            >
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h4" variant="headingSm">
                    Bulk Edit {selectedPages.size} Selected Page{selectedPages.size !== 1 ? 's' : ''}
                  </Text>
                  <Button size="slim" onClick={() => setSelectedPages(new Set())}>
                    Clear Selection
                  </Button>
                </InlineStack>

                <Select
                  label="Bulk Action"
                  options={[
                    { label: 'Choose action...', value: '' },
                    { label: 'Apply Template', value: 'template' },
                    { label: 'Clear Meta Titles', value: 'clear_titles' },
                    { label: 'Clear Descriptions', value: 'clear_descriptions' },
                  ]}
                  value={bulkAction}
                  onChange={setBulkAction}
                />

                {bulkAction === 'template' && (
                  <>
                    <TextField
                      label="Meta Title Template"
                      value={templateTitle}
                      onChange={setTemplateTitle}
                      placeholder="e.g., {title} | Your Store Name"
                      helpText="Use {title}, {type}, {url} as variables"
                      autoComplete="off"
                    />
                    <TextField
                      label="Meta Description Template"
                      value={templateDescription}
                      onChange={setTemplateDescription}
                      placeholder="e.g., Shop {title} at our store..."
                      helpText="Use {title}, {type}, {url} as variables"
                      multiline={2}
                      autoComplete="off"
                    />
                    <Button onClick={applyBulkTemplate}>
                      {`Apply Template to ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}`}
                    </Button>
                  </>
                )}
              </BlockStack>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Data Table */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text as="h3" variant="headingMd">
              Pages ({filteredPages.length})
            </Text>
            <Checkbox
              label="Select All"
              checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
              onChange={toggleSelectAll}
            />
          </InlineStack>

          {filteredPages.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
              headings={['', 'Page', 'Type', 'Meta Title', 'Meta Description', 'Status']}
              rows={rows}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Text as="p" variant="bodyMd" tone="subdued">
                No pages match your filter criteria
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
