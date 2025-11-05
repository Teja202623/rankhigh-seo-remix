import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Badge,
  Icon,
  TextField,
  Select,
  Modal,
  ProgressBar,
} from '@shopify/polaris';
import { PlusIcon, DeleteIcon, ExportIcon, CheckCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'content' | 'on-page' | 'off-page' | 'local' | 'mobile';
  priority: 'high' | 'medium' | 'low';
  isCompleted: boolean;
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
  completedAt?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  items: Omit<ChecklistItem, 'id' | 'isCompleted' | 'completedAt'>[];
}

interface SEOAuditChecklistProps {
  items: ChecklistItem[];
  templates?: ChecklistTemplate[];
  onToggleItem?: (id: string) => void;
  onAddItem?: (item: Omit<ChecklistItem, 'id'>) => void;
  onDeleteItem?: (id: string) => void;
  onLoadTemplate?: (templateId: string) => void;
  onExport?: () => void;
}

export default function SEOAuditChecklist({
  items,
  templates = [],
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onLoadTemplate,
  onExport,
}: SEOAuditChecklistProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: 'technical' as ChecklistItem['category'],
    priority: 'medium' as ChecklistItem['priority'],
    assignedTo: '',
    dueDate: '',
    notes: '',
  });

  // Calculate progress
  const completedCount = items.filter((item) => item.isCompleted).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Filter items
  const filteredItems = items.filter((item) => {
    const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
    const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
    return categoryMatch && priorityMatch;
  });

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const handleAddItem = () => {
    if (newItem.title && onAddItem) {
      onAddItem({
        ...newItem,
        isCompleted: false,
      });
      setNewItem({
        title: '',
        description: '',
        category: 'technical',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        notes: '',
      });
      setShowAddModal(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      technical: 'Technical SEO',
      content: 'Content',
      'on-page': 'On-Page',
      'off-page': 'Off-Page',
      local: 'Local SEO',
      mobile: 'Mobile',
    };
    return labels[category] || category;
  };

  const getPriorityTone = (priority: string): 'critical' | 'warning' | 'info' => {
    if (priority === 'high') return 'critical';
    if (priority === 'medium') return 'warning';
    return 'info';
  };

  return (
    <BlockStack gap="400">
      {/* Header & Progress */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <div>
              <Text as="h2" variant="headingMd">
                SEO Audit Checklist
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Track your SEO tasks and improvements
              </Text>
            </div>
            <InlineStack gap="200">
              {templates.length > 0 && (
                <Button onClick={() => setShowTemplateModal(true)}>Load Template</Button>
              )}
              {onExport && (
                <Button icon={ExportIcon} onClick={onExport}>
                  Export
                </Button>
              )}
              {onAddItem && (
                <Button variant="primary" icon={PlusIcon} onClick={() => setShowAddModal(true)}>
                  Add Task
                </Button>
              )}
            </InlineStack>
          </InlineStack>

          {/* Progress Bar */}
          <div>
            <InlineStack align="space-between" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Progress: {completedCount} of {totalCount} completed
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {progressPercentage.toFixed(0)}%
              </Text>
            </InlineStack>
            <div style={{ marginTop: '8px' }}>
              <ProgressBar
                progress={progressPercentage}
                size="medium"
                tone={progressPercentage >= 80 ? 'success' : progressPercentage >= 50 ? 'primary' : 'critical'}
              />
            </div>
          </div>
        </BlockStack>
      </Card>

      {/* Filters */}
      <Card>
        <InlineStack gap="300" wrap={false}>
          <div style={{ flex: 1 }}>
            <Select
              label="Category"
              options={[
                { label: 'All Categories', value: 'all' },
                { label: 'Technical SEO', value: 'technical' },
                { label: 'Content', value: 'content' },
                { label: 'On-Page', value: 'on-page' },
                { label: 'Off-Page', value: 'off-page' },
                { label: 'Local SEO', value: 'local' },
                { label: 'Mobile', value: 'mobile' },
              ]}
              value={filterCategory}
              onChange={setFilterCategory}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              label="Priority"
              options={[
                { label: 'All Priorities', value: 'all' },
                { label: 'High Priority', value: 'high' },
                { label: 'Medium Priority', value: 'medium' },
                { label: 'Low Priority', value: 'low' },
              ]}
              value={filterPriority}
              onChange={setFilterPriority}
            />
          </div>
        </InlineStack>
      </Card>

      {/* Checklist Items */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <Card key={category}>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              {getCategoryLabel(category)} ({categoryItems.filter((i) => i.isCompleted).length}/
              {categoryItems.length})
            </Text>
            <BlockStack gap="300">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: item.isCompleted ? '#f0fdf4' : '#fafafa',
                  }}
                >
                  <InlineStack gap="300" blockAlign="start" wrap={false}>
                    <div style={{ paddingTop: '2px' }}>
                      <Checkbox
                        checked={item.isCompleted}
                        onChange={() => onToggleItem && onToggleItem(item.id)}
                        label=""
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="start">
                          <div style={{ flex: 1 }}>
                            <InlineStack gap="200" blockAlign="center">
                              <Text
                                as="span"
                                variant="bodyMd"
                                fontWeight="semibold"
                                tone={item.isCompleted ? 'subdued' : undefined}
                              >
                                <span
                                  style={{
                                    textDecoration: item.isCompleted ? 'line-through' : 'none',
                                  }}
                                >
                                  {item.title}
                                </span>
                              </Text>
                              <Badge tone={getPriorityTone(item.priority)}>
                                {`${item.priority} priority`}
                              </Badge>
                            </InlineStack>
                          </div>
                          {onDeleteItem && (
                            <Button
                              size="slim"
                              icon={DeleteIcon}
                              onClick={() => onDeleteItem(item.id)}
                            />
                          )}
                        </InlineStack>

                        {item.description && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            {item.description}
                          </Text>
                        )}

                        <InlineStack gap="300" wrap>
                          {item.assignedTo && (
                            <Text as="span" variant="bodySm">
                              👤 {item.assignedTo}
                            </Text>
                          )}
                          {item.dueDate && (
                            <Text as="span" variant="bodySm">
                              📅 Due: {new Date(item.dueDate).toLocaleDateString()}
                            </Text>
                          )}
                          {item.completedAt && (
                            <Text as="span" variant="bodySm" tone="success">
                              ✓ Completed: {new Date(item.completedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </InlineStack>

                        {item.notes && (
                          <div
                            style={{
                              padding: '8px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '4px',
                            }}
                          >
                            <Text as="p" variant="bodySm">
                              📝 {item.notes}
                            </Text>
                          </div>
                        )}
                      </BlockStack>
                    </div>
                  </InlineStack>
                </div>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      ))}

      {filteredItems.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            {items.length === 0 ? (
              <>
                <Icon source={CheckCircleIcon} />
                <Text as="p" variant="headingMd" fontWeight="semibold">
                  No tasks yet
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Add your first SEO task or load a template to get started
                </Text>
              </>
            ) : (
              <>
                <Text as="p" variant="headingMd" fontWeight="semibold">
                  No tasks match your filters
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Try adjusting the category or priority filters
                </Text>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add SEO Task"
        primaryAction={{
          content: 'Add Task',
          onAction: handleAddItem,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowAddModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Task Title"
              value={newItem.title}
              onChange={(value) => setNewItem({ ...newItem, title: value })}
              placeholder="e.g., Optimize meta descriptions"
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={newItem.description}
              onChange={(value) => setNewItem({ ...newItem, description: value })}
              multiline={3}
              placeholder="Details about the task..."
              autoComplete="off"
            />
            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Category"
                  options={[
                    { label: 'Technical SEO', value: 'technical' },
                    { label: 'Content', value: 'content' },
                    { label: 'On-Page', value: 'on-page' },
                    { label: 'Off-Page', value: 'off-page' },
                    { label: 'Local SEO', value: 'local' },
                    { label: 'Mobile', value: 'mobile' },
                  ]}
                  value={newItem.category}
                  onChange={(value) => setNewItem({ ...newItem, category: value as any })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Priority"
                  options={[
                    { label: 'High', value: 'high' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Low', value: 'low' },
                  ]}
                  value={newItem.priority}
                  onChange={(value) => setNewItem({ ...newItem, priority: value as any })}
                />
              </div>
            </InlineStack>
            <TextField
              label="Assigned To (optional)"
              value={newItem.assignedTo}
              onChange={(value) => setNewItem({ ...newItem, assignedTo: value })}
              placeholder="Team member name"
              autoComplete="off"
            />
            <TextField
              label="Due Date (optional)"
              value={newItem.dueDate}
              onChange={(value) => setNewItem({ ...newItem, dueDate: value })}
              type="date"
              autoComplete="off"
            />
            <TextField
              label="Notes (optional)"
              value={newItem.notes}
              onChange={(value) => setNewItem({ ...newItem, notes: value })}
              multiline={2}
              placeholder="Additional notes..."
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Template Modal */}
      <Modal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Load Checklist Template"
      >
        <Modal.Section>
          <BlockStack gap="300">
            {templates.map((template) => (
              <div
                key={template.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onLoadTemplate && onLoadTemplate(template.id);
                  setShowTemplateModal(false);
                }}
              >
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {template.name}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {template.description}
                  </Text>
                  <Text as="p" variant="bodySm">
                    {template.items.length} tasks
                  </Text>
                </BlockStack>
              </div>
            ))}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}

/**
 * Pre-built checklist templates
 */
export const DEFAULT_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'basic-seo',
    name: 'Basic SEO Audit',
    description: 'Essential SEO tasks for any website',
    items: [
      {
        title: 'Verify Google Search Console connection',
        description: 'Connect your site to GSC to track performance',
        category: 'technical',
        priority: 'high',
      },
      {
        title: 'Submit XML sitemap',
        description: 'Ensure search engines can find all your pages',
        category: 'technical',
        priority: 'high',
      },
      {
        title: 'Optimize all meta titles',
        description: 'Ensure titles are 50-60 characters with keywords',
        category: 'on-page',
        priority: 'high',
      },
      {
        title: 'Write compelling meta descriptions',
        description: 'Create 150-160 character descriptions for all pages',
        category: 'on-page',
        priority: 'high',
      },
      {
        title: 'Add ALT text to all images',
        description: 'Improve accessibility and image SEO',
        category: 'on-page',
        priority: 'medium',
      },
      {
        title: 'Fix broken links',
        description: 'Find and fix all 404 errors',
        category: 'technical',
        priority: 'medium',
      },
      {
        title: 'Improve page load speed',
        description: 'Optimize images, minify CSS/JS, enable caching',
        category: 'technical',
        priority: 'medium',
      },
      {
        title: 'Implement schema markup',
        description: 'Add structured data for rich results',
        category: 'technical',
        priority: 'low',
      },
    ],
  },
  {
    id: 'ecommerce-seo',
    name: 'E-commerce SEO',
    description: 'SEO checklist for online stores',
    items: [
      {
        title: 'Optimize product titles',
        description: 'Include brand, product name, and key features',
        category: 'on-page',
        priority: 'high',
      },
      {
        title: 'Write unique product descriptions',
        description: 'Avoid manufacturer descriptions, write original content',
        category: 'content',
        priority: 'high',
      },
      {
        title: 'Add product schema markup',
        description: 'Include price, availability, ratings',
        category: 'technical',
        priority: 'high',
      },
      {
        title: 'Optimize product images',
        description: 'Compress images, use descriptive filenames',
        category: 'on-page',
        priority: 'medium',
      },
      {
        title: 'Create category page content',
        description: 'Add unique descriptions to category pages',
        category: 'content',
        priority: 'medium',
      },
      {
        title: 'Implement breadcrumb navigation',
        description: 'Help users and search engines understand site structure',
        category: 'technical',
        priority: 'medium',
      },
      {
        title: 'Set up review schema',
        description: 'Display star ratings in search results',
        category: 'technical',
        priority: 'low',
      },
    ],
  },
];
