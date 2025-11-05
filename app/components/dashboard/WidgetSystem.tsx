import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Icon,
  Checkbox,
  Select,
} from '@shopify/polaris';
import {
  DragHandleIcon,
  PlusIcon,
  SettingsIcon,
  ViewIcon,
  HideIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface Widget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  isVisible: boolean;
  position: number;
  config?: Record<string, any>;
}

export interface WidgetType {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultSize: 'small' | 'medium' | 'large';
  icon?: any;
}

interface WidgetSystemProps {
  widgets?: Widget[];
  availableWidgetTypes?: WidgetType[];
  onUpdateWidgets?: (widgets: Widget[]) => void;
  onAddWidget?: (type: string) => void;
  onRemoveWidget?: (id: string) => void;
  onToggleWidget?: (id: string) => void;
  onReorderWidgets?: (widgets: Widget[]) => void;
}

const DEFAULT_WIDGET_TYPES: WidgetType[] = [
  {
    id: 'seo-score',
    name: 'SEO Score',
    description: 'Overall SEO health score with breakdown',
    category: 'Overview',
    defaultSize: 'medium',
  },
  {
    id: 'quick-wins',
    name: 'Quick Wins',
    description: 'High-impact SEO tasks to complete',
    category: 'Overview',
    defaultSize: 'large',
  },
  {
    id: 'keyword-rankings',
    name: 'Keyword Rankings',
    description: 'Track your keyword positions',
    category: 'Keywords',
    defaultSize: 'large',
  },
  {
    id: 'organic-traffic',
    name: 'Organic Traffic',
    description: 'Search traffic trends over time',
    category: 'Analytics',
    defaultSize: 'medium',
  },
  {
    id: 'top-pages',
    name: 'Top Pages',
    description: 'Best performing pages',
    category: 'Analytics',
    defaultSize: 'medium',
  },
  {
    id: 'broken-links',
    name: 'Broken Links',
    description: '404 errors and broken links',
    category: 'Technical',
    defaultSize: 'small',
  },
  {
    id: 'page-speed',
    name: 'Page Speed',
    description: 'Core Web Vitals performance',
    category: 'Performance',
    defaultSize: 'medium',
  },
  {
    id: 'indexing-status',
    name: 'Indexing Status',
    description: 'Pages indexed by Google',
    category: 'Technical',
    defaultSize: 'small',
  },
  {
    id: 'backlinks',
    name: 'Backlinks',
    description: 'Backlink growth and quality',
    category: 'Links',
    defaultSize: 'medium',
  },
  {
    id: 'competitor-comparison',
    name: 'Competitor Comparison',
    description: 'Compare your metrics with competitors',
    category: 'Competitive',
    defaultSize: 'large',
  },
  {
    id: 'local-seo',
    name: 'Local SEO',
    description: 'Local search performance and reviews',
    category: 'Local',
    defaultSize: 'medium',
  },
  {
    id: 'recent-changes',
    name: 'Recent Changes',
    description: 'Latest updates to your SEO',
    category: 'Activity',
    defaultSize: 'small',
  },
];

export default function WidgetSystem({
  widgets: initialWidgets = [],
  availableWidgetTypes = DEFAULT_WIDGET_TYPES,
  onUpdateWidgets,
  onAddWidget,
  onRemoveWidget,
  onToggleWidget,
  onReorderWidgets,
}: WidgetSystemProps) {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const visibleWidgets = widgets.filter((w) => w.isVisible).sort((a, b) => a.position - b.position);
  const hiddenWidgets = widgets.filter((w) => !w.isVisible);

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetWidgetId: string) => {
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget);
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId);

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update positions
    const updatedWidgets = newWidgets.map((w, index) => ({
      ...w,
      position: index,
    }));

    setWidgets(updatedWidgets);
    setDraggedWidget(null);

    if (onReorderWidgets) {
      onReorderWidgets(updatedWidgets);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
    );
    setWidgets(updatedWidgets);

    if (onToggleWidget) {
      onToggleWidget(widgetId);
    }
  };

  const handleAddWidget = (typeId: string) => {
    if (onAddWidget) {
      onAddWidget(typeId);
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
    setWidgets(updatedWidgets);

    if (onRemoveWidget) {
      onRemoveWidget(widgetId);
    }
  };

  const handleUpdateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const updatedWidgets = widgets.map((w) => (w.id === widgetId ? { ...w, size } : w));
    setWidgets(updatedWidgets);

    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleSaveLayout = () => {
    setIsCustomizing(false);
    if (onUpdateWidgets) {
      onUpdateWidgets(widgets);
    }
  };

  const handleResetLayout = () => {
    // Reset to default layout
    const defaultWidgets: Widget[] = [
      { id: '1', type: 'seo-score', title: 'SEO Score', size: 'medium', isVisible: true, position: 0 },
      { id: '2', type: 'quick-wins', title: 'Quick Wins', size: 'large', isVisible: true, position: 1 },
      { id: '3', type: 'organic-traffic', title: 'Organic Traffic', size: 'medium', isVisible: true, position: 2 },
      { id: '4', type: 'keyword-rankings', title: 'Keyword Rankings', size: 'large', isVisible: true, position: 3 },
    ];
    setWidgets(defaultWidgets);

    if (onUpdateWidgets) {
      onUpdateWidgets(defaultWidgets);
    }
  };

  // Group available widget types by category
  const widgetsByCategory = availableWidgetTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, WidgetType[]>);

  const getWidgetSizeClass = (size: string) => {
    switch (size) {
      case 'small':
        return { flex: '0 0 calc(25% - 12px)', minWidth: '250px' };
      case 'medium':
        return { flex: '0 0 calc(50% - 12px)', minWidth: '400px' };
      case 'large':
        return { flex: '0 0 100%' };
      default:
        return { flex: '0 0 calc(50% - 12px)' };
    }
  };

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Dashboard Layout
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {isCustomizing
                ? 'Drag widgets to reorder, toggle visibility, or change sizes'
                : `${visibleWidgets.length} widgets visible, ${hiddenWidgets.length} hidden`}
            </Text>
          </div>
          <InlineStack gap="200">
            {isCustomizing ? (
              <>
                <Button onClick={handleResetLayout}>Reset to Default</Button>
                <Button variant="primary" onClick={handleSaveLayout}>
                  Save Layout
                </Button>
              </>
            ) : (
              <Button icon={SettingsIcon} onClick={() => setIsCustomizing(true)}>
                Customize Dashboard
              </Button>
            )}
          </InlineStack>
        </InlineStack>
      </Card>

      {/* Customization Mode */}
      {isCustomizing && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Customize Widgets
            </Text>

            {/* Current Widgets */}
            <div>
              <Text as="p" variant="bodySm" fontWeight="semibold">
                Current Widgets
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Drag to reorder, toggle visibility, or adjust size
              </Text>
            </div>

            <BlockStack gap="200">
              {widgets
                .sort((a, b) => a.position - b.position)
                .map((widget) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(widget.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(widget.id)}
                    style={{
                      padding: '12px',
                      backgroundColor: widget.isVisible ? '#f9fafb' : '#f3f4f6',
                      border: draggedWidget === widget.id ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'grab',
                      opacity: widget.isVisible ? 1 : 0.6,
                    }}
                  >
                    <InlineStack align="space-between" blockAlign="center" wrap={false}>
                      <InlineStack gap="300" blockAlign="center" wrap={false}>
                        <Icon source={DragHandleIcon} tone="subdued" />
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {widget.title}
                          </Text>
                          <Badge tone={widget.isVisible ? 'success' : 'info'}>
                            {widget.size}
                          </Badge>
                        </div>
                      </InlineStack>
                      <InlineStack gap="200" wrap={false}>
                        <div style={{ width: '120px' }}>
                          <Select
                            label=""
                            labelHidden
                            options={[
                              { label: 'Small', value: 'small' },
                              { label: 'Medium', value: 'medium' },
                              { label: 'Large', value: 'large' },
                            ]}
                            value={widget.size}
                            onChange={(value) => handleUpdateWidgetSize(widget.id, value as 'small' | 'medium' | 'large')}
                          />
                        </div>
                        <Button
                          icon={widget.isVisible ? ViewIcon : HideIcon}
                          onClick={() => handleToggleWidget(widget.id)}
                        >
                          {widget.isVisible ? 'Hide' : 'Show'}
                        </Button>
                        <Button tone="critical" onClick={() => handleRemoveWidget(widget.id)}>
                          Remove
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </div>
                ))}
            </BlockStack>

            {/* Add Widgets */}
            <div>
              <Text as="p" variant="bodySm" fontWeight="semibold">
                Add Widgets
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Click to add a widget to your dashboard
              </Text>
            </div>

            {Object.entries(widgetsByCategory).map(([category, types]) => (
              <div key={category}>
                <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                  {category}
                </Text>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '8px',
                  }}
                >
                  {types.map((type) => {
                    const isAdded = widgets.some((w) => w.type === type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => !isAdded && handleAddWidget(type.id)}
                        disabled={isAdded}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: isAdded ? '#e5e7eb' : '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: isAdded ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          opacity: isAdded ? 0.5 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isAdded && <Icon source={PlusIcon} tone="base" />}
                          <div>
                            <Text as="p" variant="bodySm" fontWeight="semibold">
                              {type.name}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {type.description}
                            </Text>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </BlockStack>
        </Card>
      )}

      {/* Widget Grid Preview */}
      {!isCustomizing && (
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {visibleWidgets.map((widget) => (
              <div key={widget.id} style={getWidgetSizeClass(widget.size)}>
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingSm">
                        {widget.title}
                      </Text>
                      <Badge tone="info">{widget.size}</Badge>
                    </InlineStack>
                    <div
                      style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '2px dashed #e5e7eb',
                      }}
                    >
                      <Text as="p" variant="bodySm" tone="subdued">
                        {widget.type.charAt(0).toUpperCase() + widget.type.slice(1).replace('-', ' ')}{' '}
                        widget content
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        This would display actual data
                      </Text>
                    </div>
                  </BlockStack>
                </Card>
              </div>
            ))}
          </div>

          {visibleWidgets.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Text as="p" variant="headingMd" fontWeight="semibold">
                  No widgets to display
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Click "Customize Dashboard" to add widgets
                </Text>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tips */}
      {isCustomizing && (
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              Customization Tips
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
                    <strong>Drag handles</strong> to reorder widgets on your dashboard
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>Toggle visibility</strong> to show/hide widgets without removing them
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>Adjust sizes</strong> - Small (25%), Medium (50%), Large (100%)
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>Add multiple instances</strong> of the same widget type for different views
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodySm">
                    <strong>Reset to default</strong> if you want to start over
                  </Text>
                </li>
              </ul>
            </div>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
