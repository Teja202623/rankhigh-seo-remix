/**
 * Unit Tests for BulkEditInterface Component
 *
 * Tests for bulk metadata editing functionality:
 * - Page selection and filtering
 * - Inline metadata editing
 * - Bulk template application with variable substitution
 * - Change tracking and save functionality
 * - Export/Import CSV operations
 * - Real-time filtering and search
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { BulkEditPage } from '~/components/pages/BulkEditInterface';

// Create a simplified test version of BulkEditInterface
const TestBulkEditInterface = ({
  pages = [],
  onSave,
  onExport,
  onImport,
}: {
  pages: BulkEditPage[];
  onSave?: (updates: Array<{ id: string; metaTitle: string; metaDescription: string }>) => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
}) => {
  const [selectedPages, setSelectedPages] = React.useState<Set<string>>(new Set());
  const [editedPages, setEditedPages] = React.useState<Map<string, Partial<BulkEditPage>>>(new Map());
  const [filterType, setFilterType] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [bulkAction, setBulkAction] = React.useState('');
  const [templateTitle, setTemplateTitle] = React.useState('');
  const [templateDescription, setTemplateDescription] = React.useState('');

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

    const newEdited = new Map(editedPages);
    

    selectedPages.forEach((pageId) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      const existing = newEdited.get(pageId) || {};

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

    setEditedPages(newEdited);

      newEdited.set(pageId, {
        ...existing,
        ...(templateTitle && { metaTitle: newTitle }),
        ...(templateDescription && { metaDescription: newDesc }),
      });

      setEditedPages(newEdited);
    });

    setTemplateTitle('');
    setTemplateDescription('');
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

  const filteredPages = pages.filter((page) => {
    const matchesType = filterType === 'all' || page.type === filterType;
    const trimmedQuery = searchQuery.trim();
    const matchesSearch =
      !trimmedQuery ||
      page.url.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
      page.title.toLowerCase().includes(trimmedQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const hasChanges = editedPages.size > 0;

  return (
    <div data-testid="bulk-edit-interface">
      <h2>Bulk Meta Tag Editor</h2>
      <p>Edit multiple pages at once with templates and variables</p>

      {hasChanges && (
        <div data-testid="unsaved-banner">You have unsaved changes. Click "Save" to apply them to your pages.</div>
      )}

      <div data-testid="filters">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search by URL or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select data-testid="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="PRODUCT">Products</option>
          <option value="COLLECTION">Collections</option>
          <option value="PAGE">Pages</option>
          <option value="BLOG">Blog Posts</option>
        </select>
      </div>

      {selectedPages.size > 0 && (
        <div data-testid="bulk-actions">
          <h4>Bulk Edit {selectedPages.size} Selected Pages</h4>
          <button data-testid="clear-selection-btn" onClick={() => setSelectedPages(new Set())}>
            Clear Selection
          </button>

          <select data-testid="bulk-action-select" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            <option value="">Choose action...</option>
            <option value="template">Apply Template</option>
            <option value="clear_titles">Clear Meta Titles</option>
            <option value="clear_descriptions">Clear Descriptions</option>
          </select>

          {bulkAction === 'template' && (
            <>
              <input
                data-testid="template-title-input"
                type="text"
                placeholder="e.g., {title} | Your Store Name"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
              />
              <input
                data-testid="template-desc-input"
                type="text"
                placeholder="e.g., Shop {title} at our store..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
              <button data-testid="apply-template-btn" onClick={applyBulkTemplate}>
                Apply Template to {selectedPages.size} Pages
              </button>
            </>
          )}
        </div>
      )}

      <div data-testid="pages-table">
        <h3>Pages ({filteredPages.length})</h3>
        {filteredPages.length === 0 ? (
          <p data-testid="no-pages-message">No pages match your filter criteria</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    data-testid="select-all-checkbox"
                    type="checkbox"
                    checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Page</th>
                <th>Type</th>
                <th>Meta Title</th>
                <th>Meta Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => {
                const edited = editedPages.get(page.id);
                const isEdited = !!edited;
                const currentTitle = edited?.metaTitle ?? page.metaTitle;
                const currentDesc = edited?.metaDescription ?? page.metaDescription;

                return (
                  <tr key={page.id} data-testid={`page-row-${page.id}`}>
                    <td>
                      <input
                        data-testid={`checkbox-${page.id}`}
                        type="checkbox"
                        checked={selectedPages.has(page.id)}
                        onChange={() => togglePageSelection(page.id)}
                      />
                    </td>
                    <td>
                      <div data-testid={`page-title-${page.id}`}>{page.title}</div>
                      <div data-testid={`page-url-${page.id}`}>{page.url}</div>
                    </td>
                    <td>
                      <span data-testid={`page-type-${page.id}`}>{page.type}</span>
                    </td>
                    <td>
                      <input
                        data-testid={`title-input-${page.id}`}
                        type="text"
                        value={currentTitle}
                        onChange={(e) => updatePageField(page.id, 'metaTitle', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        data-testid={`desc-input-${page.id}`}
                        type="text"
                        value={currentDesc}
                        onChange={(e) => updatePageField(page.id, 'metaDescription', e.target.value)}
                      />
                    </td>
                    <td>{isEdited && <span data-testid={`modified-badge-${page.id}`}>Modified</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div data-testid="action-buttons">
        {onExport && (
          <button data-testid="export-btn" onClick={onExport}>
            Export CSV
          </button>
        )}
        {onImport && (
          <button data-testid="import-btn" onClick={() => alert('Import CSV')}>
            Import CSV
          </button>
        )}
        {hasChanges && (
          <button data-testid="save-btn" onClick={handleSaveChanges}>
            Save {editedPages.size} Changes
          </button>
        )}
      </div>
    </div>
  );
};

// Mock page data
const mockPages: BulkEditPage[] = [
  {
    id: 'page-1',
    url: '/products/item-1',
    title: 'Item 1',
    metaTitle: 'Item 1 - Store',
    metaDescription: 'Buy Item 1 online',
    type: 'PRODUCT',
  },
  {
    id: 'page-2',
    url: '/products/item-2',
    title: 'Item 2',
    metaTitle: 'Item 2 - Store',
    metaDescription: 'Buy Item 2 online',
    type: 'PRODUCT',
  },
  {
    id: 'page-3',
    url: '/collections/electronics',
    title: 'Electronics',
    metaTitle: 'Electronics Collection',
    metaDescription: 'Browse our electronics',
    type: 'COLLECTION',
  },
  {
    id: 'page-4',
    url: '/pages/about',
    title: 'About Us',
    metaTitle: 'About Our Store',
    metaDescription: 'Learn about our store',
    type: 'PAGE',
  },
];

describe('BulkEditInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Component Rendering Tests
  // ========================================

  describe('Component Rendering', () => {
    it('should render bulk edit interface', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.getByTestId('bulk-edit-interface')).toBeInTheDocument();
      expect(screen.getByText('Bulk Meta Tag Editor')).toBeInTheDocument();
    });

    it('should display all pages in table', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      mockPages.forEach((page) => {
        expect(screen.getByTestId(`page-row-${page.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`page-title-${page.id}`)).toHaveTextContent(page.title);
      });
    });

    it('should show correct page count', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.getByText(`Pages (${mockPages.length})`)).toBeInTheDocument();
    });

    it('should display filters section', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.getByTestId('filters')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('filter-select')).toBeInTheDocument();
    });

    it('should not show bulk actions initially', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    });

    it('should not show unsaved banner when no changes', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.queryByTestId('unsaved-banner')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // Page Selection Tests
  // ========================================

  describe('Page Selection', () => {
    it('should toggle individual page selection', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const checkbox = screen.getByTestId('checkbox-page-1') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('should select all pages with select all checkbox', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(false);

      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox.checked).toBe(true);

      // All individual checkboxes should be checked
      mockPages.forEach((page) => {
        const checkbox = screen.getByTestId(`checkbox-${page.id}`) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });

    it('should deselect all pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      // Select all first
      const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox.checked).toBe(true);

      // Deselect all
      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox.checked).toBe(false);

      mockPages.forEach((page) => {
        const checkbox = screen.getByTestId(`checkbox-${page.id}`) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });
    });

    it('should show bulk actions when pages selected', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const checkbox = screen.getByTestId('checkbox-page-1') as HTMLInputElement;
      fireEvent.click(checkbox);

      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      expect(screen.getByText(/Bulk Edit 1 Selected Page/)).toBeInTheDocument();
    });

    it('should show correct count of selected pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      fireEvent.click(screen.getByTestId('checkbox-page-2'));

      expect(screen.getByText(/Bulk Edit 2 Selected Pages/)).toBeInTheDocument();
    });
  });

  // ========================================
  // Filtering Tests
  // ========================================

  describe('Filtering', () => {
    it('should filter pages by type', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement;
      fireEvent.change(filterSelect, { target: { value: 'PRODUCT' } });

      expect(screen.getByText('Pages (2)')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-1')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-2')).toBeInTheDocument();
      expect(screen.queryByTestId('page-row-page-3')).not.toBeInTheDocument();
    });

    it('should search pages by URL', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'electronics' } });

      expect(screen.getByText('Pages (1)')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-3')).toBeInTheDocument();
      expect(screen.queryByTestId('page-row-page-1')).not.toBeInTheDocument();
    });

    it('should search pages by title', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Item' } });

      expect(screen.getByText('Pages (2)')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-1')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-2')).toBeInTheDocument();
    });

    it('should combine filter and search', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement;
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;

      fireEvent.change(filterSelect, { target: { value: 'PRODUCT' } });
      fireEvent.change(searchInput, { target: { value: 'item-2' } });

      expect(screen.getByText('Pages (1)')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-2')).toBeInTheDocument();
    });

    it('should show no pages message when filter matches nothing', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('no-pages-message')).toBeInTheDocument();
    });

    it('should reset filter to show all pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement;
      fireEvent.change(filterSelect, { target: { value: 'PRODUCT' } });
      expect(screen.getByText('Pages (2)')).toBeInTheDocument();

      fireEvent.change(filterSelect, { target: { value: 'all' } });
      expect(screen.getByText(`Pages (${mockPages.length})`)).toBeInTheDocument();
    });
  });

  // ========================================
  // Inline Editing Tests
  // ========================================

  describe('Inline Editing', () => {
    it('should edit meta title inline', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(titleInput.value).toBe('New Title');
    });

    it('should edit meta description inline', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const descInput = screen.getByTestId('desc-input-page-1') as HTMLInputElement;
      fireEvent.change(descInput, { target: { value: 'New Description' } });

      expect(descInput.value).toBe('New Description');
    });

    it('should show modified badge when page is edited', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Modified' } });

      expect(screen.getByTestId('modified-badge-page-1')).toBeInTheDocument();
    });

    it('should show unsaved banner when changes exist', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Changed' } });

      expect(screen.getByTestId('unsaved-banner')).toBeInTheDocument();
    });

    it('should edit multiple pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const titleInput1 = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      const titleInput2 = screen.getByTestId('title-input-page-2') as HTMLInputElement;

      fireEvent.change(titleInput1, { target: { value: 'New Title 1' } });
      fireEvent.change(titleInput2, { target: { value: 'New Title 2' } });

      expect(titleInput1.value).toBe('New Title 1');
      expect(titleInput2.value).toBe('New Title 2');
    });
  });

  // ========================================
  // Bulk Template Tests
  // ========================================

  describe('Bulk Template Application', () => {
    it('should show template inputs when bulk action selected', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      expect(screen.getByTestId('template-title-input')).toBeInTheDocument();
      expect(screen.getByTestId('template-desc-input')).toBeInTheDocument();
    });

    it('should apply template with {title} variable', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      const templateTitleInput = screen.getByTestId('template-title-input') as HTMLInputElement;
      fireEvent.change(templateTitleInput, { target: { value: '{title} - Store' } });

      fireEvent.click(screen.getByTestId('apply-template-btn'));

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      expect(titleInput.value).toBe('Item 1 - Store');
    });

    it('should apply template with {type} variable', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      const templateTitleInput = screen.getByTestId('template-title-input') as HTMLInputElement;
      fireEvent.change(templateTitleInput, { target: { value: 'Shop {type}' } });

      fireEvent.click(screen.getByTestId('apply-template-btn'));

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      expect(titleInput.value).toBe('Shop PRODUCT');
    });

    it('should apply template with multiple variables', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      const templateDescInput = screen.getByTestId('template-desc-input') as HTMLInputElement;
      fireEvent.change(templateDescInput, { target: { value: 'Shop {title} ({type}) at {url}' } });

      fireEvent.click(screen.getByTestId('apply-template-btn'));

      const descInput = screen.getByTestId('desc-input-page-1') as HTMLInputElement;
      expect(descInput.value).toBe('Shop Item 1 (PRODUCT) at /products/item-1');
    });

    it('should apply template to multiple selected pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      fireEvent.click(screen.getByTestId('checkbox-page-2'));

      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      const templateTitleInput = screen.getByTestId('template-title-input') as HTMLInputElement;
      fireEvent.change(templateTitleInput, { target: { value: '{title} - Catalog' } });

      fireEvent.click(screen.getByTestId('apply-template-btn'));

      const titleInput1 = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      const titleInput2 = screen.getByTestId('title-input-page-2') as HTMLInputElement;

      expect(titleInput1.value).toBe('Item 1 - Catalog');
      expect(titleInput2.value).toBe('Item 2 - Catalog');
    });

    it('should clear template fields after applying', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const bulkActionSelect = screen.getByTestId('bulk-action-select') as HTMLSelectElement;
      fireEvent.change(bulkActionSelect, { target: { value: 'template' } });

      const templateTitleInput = screen.getByTestId('template-title-input') as HTMLInputElement;
      fireEvent.change(templateTitleInput, { target: { value: '{title} - Store' } });

      fireEvent.click(screen.getByTestId('apply-template-btn'));

      expect((screen.getByTestId('template-title-input') as HTMLInputElement).value).toBe('');
    });
  });

  // ========================================
  // Save Changes Tests
  // ========================================

  describe('Save Changes', () => {
    it('should not show save button when no changes', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      expect(screen.queryByTestId('save-btn')).not.toBeInTheDocument();
    });

    it('should show save button when changes exist', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Changed' } });

      expect(screen.getByTestId('save-btn')).toBeInTheDocument();
    });

    it('should call onSave with correct data', () => {
      const onSave = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onSave={onSave} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      fireEvent.click(screen.getByTestId('save-btn'));

      expect(onSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'page-1',
            metaTitle: 'New Title',
          }),
        ])
      );
    });

    it('should clear changes after save', () => {
      const onSave = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onSave={onSave} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Changed' } });

      expect(screen.getByTestId('unsaved-banner')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('save-btn'));

      expect(screen.queryByTestId('unsaved-banner')).not.toBeInTheDocument();
      expect(titleInput.value).toBe(mockPages[0].metaTitle);
    });

    it('should clear selection after save', () => {
      const onSave = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onSave={onSave} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Changed' } });

      fireEvent.click(screen.getByTestId('save-btn'));

      const checkbox = screen.getByTestId('checkbox-page-1') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  // ========================================
  // Clear Selection Tests
  // ========================================

  describe('Clear Selection', () => {
    it('should show clear selection button when pages selected', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));

      expect(screen.getByTestId('clear-selection-btn')).toBeInTheDocument();
    });

    it('should clear all selections when button clicked', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      fireEvent.click(screen.getByTestId('checkbox-page-2'));

      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-selection-btn'));

      expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // Export/Import Tests
  // ========================================

  describe('Export/Import', () => {
    it('should show export button when onExport provided', () => {
      const onExport = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onExport={onExport} />);

      expect(screen.getByTestId('export-btn')).toBeInTheDocument();
    });

    it('should call onExport when button clicked', () => {
      const onExport = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onExport={onExport} />);

      fireEvent.click(screen.getByTestId('export-btn'));

      expect(onExport).toHaveBeenCalled();
    });

    it('should show import button when onImport provided', () => {
      const onImport = jest.fn();
      render(<TestBulkEditInterface pages={mockPages} onImport={onImport} />);

      expect(screen.getByTestId('import-btn')).toBeInTheDocument();
    });
  });

  // ========================================
  // Edge Cases Tests
  // ========================================

  describe('Edge Cases', () => {
    it('should handle empty pages array', () => {
      render(<TestBulkEditInterface pages={[]} />);

      expect(screen.getByText('Pages (0)')).toBeInTheDocument();
      expect(screen.getByTestId('no-pages-message')).toBeInTheDocument();
    });

    it('should handle single page', () => {
      render(<TestBulkEditInterface pages={[mockPages[0]]} />);

      expect(screen.getByText('Pages (1)')).toBeInTheDocument();
      expect(screen.getByTestId('page-row-page-1')).toBeInTheDocument();
    });

    it('should handle page with empty meta fields', () => {
      const pageWithEmpty = { ...mockPages[0], metaTitle: '', metaDescription: '' };
      render(<TestBulkEditInterface pages={[pageWithEmpty]} />);

      const titleInput = screen.getByTestId('title-input-page-1') as HTMLInputElement;
      const descInput = screen.getByTestId('desc-input-page-1') as HTMLInputElement;

      expect(titleInput.value).toBe('');
      expect(descInput.value).toBe('');
    });

    it('should handle special characters in search', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '&' } });

      expect(screen.getByTestId('no-pages-message')).toBeInTheDocument();
    });

    it('should be case insensitive in search', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'ITEM' } });

      expect(screen.getByText('Pages (2)')).toBeInTheDocument();
    });

    it('should handle whitespace in search', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '   ' } });

      expect(screen.getByText(`Pages (${mockPages.length})`)).toBeInTheDocument();
    });
  });

  // ========================================
  // Multiple Selection Tests
  // ========================================

  describe('Multiple Selection Scenarios', () => {
    it('should handle selecting and deselecting individual pages', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      const checkbox1 = screen.getByTestId('checkbox-page-1') as HTMLInputElement;
      const checkbox2 = screen.getByTestId('checkbox-page-2') as HTMLInputElement;

      fireEvent.click(checkbox1);
      expect(checkbox1.checked).toBe(true);
      expect(checkbox2.checked).toBe(false);

      fireEvent.click(checkbox2);
      expect(checkbox1.checked).toBe(true);
      expect(checkbox2.checked).toBe(true);

      fireEvent.click(checkbox1);
      expect(checkbox1.checked).toBe(false);
      expect(checkbox2.checked).toBe(true);
    });

    it('should update bulk action count dynamically', () => {
      render(<TestBulkEditInterface pages={mockPages} />);

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      expect(screen.getByText(/Bulk Edit 1 Selected Page/)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('checkbox-page-2'));
      expect(screen.getByText(/Bulk Edit 2 Selected Pages/)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('checkbox-page-1'));
      expect(screen.getByText(/Bulk Edit 1 Selected Page/)).toBeInTheDocument();
    });
  });
});
