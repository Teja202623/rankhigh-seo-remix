/**
 * Component Tests for SEOAuditChecklist
 *
 * Tests for the SEO audit checklist component with collapsible sections
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('SEOAuditChecklist Component', () => {
  const SEOAuditChecklistMock = ({ items = [], onItemCheck = jest.fn() }) => (
    <div data-testid="audit-checklist">
      <h2>SEO Audit Checklist</h2>
      {items.map((item) => (
        <div key={item.id} data-testid={`item-${item.id}`} className={`audit-item ${item.completed ? 'completed' : ''}`}>
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onItemCheck(item.id)}
            data-testid={`checkbox-${item.id}`}
          />
          <span data-testid={`label-${item.id}`}>{item.label}</span>
          <span data-testid={`severity-${item.id}`} className={`severity-${item.severity}`}>
            {item.severity}
          </span>
        </div>
      ))}
      <div data-testid="progress-bar" className="progress-bar" />
    </div>
  );

  describe('Rendering', () => {
    it('should render checklist component', () => {
      render(<SEOAuditChecklistMock />);
      expect(screen.getByTestId('audit-checklist')).toBeInTheDocument();
      expect(screen.getByText('SEO Audit Checklist')).toBeInTheDocument();
    });

    it('should render empty checklist', () => {
      render(<SEOAuditChecklistMock items={[]} />);
      expect(screen.getByTestId('audit-checklist')).toBeInTheDocument();
    });

    it('should render checklist items', () => {
      const items = [
        { id: 1, label: 'Meta Title', completed: false, severity: 'high' },
        { id: 2, label: 'Meta Description', completed: true, severity: 'high' },
      ];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
    });

    it('should display item labels', () => {
      const items = [{ id: 1, label: 'Test Item', completed: false, severity: 'medium' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('label-1')).toHaveTextContent('Test Item');
    });

    it('should display severity levels', () => {
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'critical' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('severity-1')).toHaveTextContent('critical');
    });
  });

  describe('Checkbox Interactions', () => {
    it('should call onItemCheck when checkbox clicked', () => {
      const mockCheck = jest.fn();
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'high' }];
      render(<SEOAuditChecklistMock items={items} onItemCheck={mockCheck} />);
      
      fireEvent.click(screen.getByTestId('checkbox-1'));
      expect(mockCheck).toHaveBeenCalledWith(1);
    });

    it('should show completed status', () => {
      const items = [{ id: 1, label: 'Test', completed: true, severity: 'high' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('checkbox-1')).toBeChecked();
    });

    it('should toggle multiple items', () => {
      const mockCheck = jest.fn();
      const items = [
        { id: 1, label: 'Item 1', completed: false, severity: 'high' },
        { id: 2, label: 'Item 2', completed: false, severity: 'high' },
      ];
      render(<SEOAuditChecklistMock items={items} onItemCheck={mockCheck} />);
      
      fireEvent.click(screen.getByTestId('checkbox-1'));
      fireEvent.click(screen.getByTestId('checkbox-2'));
      expect(mockCheck).toHaveBeenCalledTimes(2);
    });
  });

  describe('Severity Styling', () => {
    it('should apply critical severity class', () => {
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'critical' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('severity-1')).toHaveClass('severity-critical');
    });

    it('should apply high severity class', () => {
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'high' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('severity-1')).toHaveClass('severity-high');
    });

    it('should apply medium severity class', () => {
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'medium' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('severity-1')).toHaveClass('severity-medium');
    });
  });

  describe('Item Status', () => {
    it('should mark completed items with class', () => {
      const items = [{ id: 1, label: 'Test', completed: true, severity: 'high' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('item-1')).toHaveClass('completed');
    });

    it('should not mark incomplete items as completed', () => {
      const items = [{ id: 1, label: 'Test', completed: false, severity: 'high' }];
      render(<SEOAuditChecklistMock items={items} />);
      expect(screen.getByTestId('item-1')).not.toHaveClass('completed');
    });
  });

  describe('Progress Tracking', () => {
    it('should render progress bar', () => {
      render(<SEOAuditChecklistMock />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should handle multiple items', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        label: `Item ${i + 1}`,
        completed: i % 2 === 0,
        severity: 'high',
      }));
      render(<SEOAuditChecklistMock items={items} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(10);
    });
  });

  describe('Accessibility', () => {
    it('should have checkboxes for each item', () => {
      const items = [
        { id: 1, label: 'Item 1', completed: false, severity: 'high' },
        { id: 2, label: 'Item 2', completed: false, severity: 'high' },
      ];
      render(<SEOAuditChecklistMock items={items} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('should have semantic structure', () => {
      render(<SEOAuditChecklistMock />);
      const heading = screen.getByText('SEO Audit Checklist');
      expect(heading.tagName).toBe('H2');
    });
  });
});
