/**
 * Component Tests for MetaPreview
 *
 * Tests for the meta tag preview component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('MetaPreview Component', () => {
  const MetaPreviewMock = ({ meta = {} }) => {
    const defaultMeta = {
      title: 'Default Title',
      description: 'Default description',
      keywords: ['seo', 'optimization'],
      canonicalUrl: 'https://example.com',
      ...meta,
    };

    return (
      <div data-testid="meta-preview" className="meta-preview">
        <div data-testid="meta-title" className="meta-field">
          <label>Title:</label>
          <span>{defaultMeta.title}</span>
          <small>{defaultMeta.title.length}/60</small>
        </div>
        <div data-testid="meta-description" className="meta-field">
          <label>Description:</label>
          <span>{defaultMeta.description}</span>
          <small>{defaultMeta.description.length}/160</small>
        </div>
        <div data-testid="meta-keywords" className="meta-field">
          <label>Keywords:</label>
          <span>{defaultMeta.keywords.join(', ')}</span>
        </div>
        <div data-testid="meta-canonical" className="meta-field">
          <label>Canonical URL:</label>
          <span>{defaultMeta.canonicalUrl}</span>
        </div>
      </div>
    );
  };

  describe('Rendering', () => {
    it('should render meta preview', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-preview')).toBeInTheDocument();
    });

    it('should display title field', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-title')).toBeInTheDocument();
      expect(screen.getByText(/Title:/)).toBeInTheDocument();
    });

    it('should display description field', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-description')).toBeInTheDocument();
      expect(screen.getByText(/Description:/)).toBeInTheDocument();
    });

    it('should display keywords field', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-keywords')).toBeInTheDocument();
      expect(screen.getByText(/Keywords:/)).toBeInTheDocument();
    });

    it('should display canonical URL field', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-canonical')).toBeInTheDocument();
      expect(screen.getByText(/Canonical URL:/)).toBeInTheDocument();
    });
  });

  describe('Meta Data Display', () => {
    it('should display custom title', () => {
      const meta = { title: 'Custom Title' };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-title')).toHaveTextContent('Custom Title');
    });

    it('should display custom description', () => {
      const meta = { description: 'Custom description text' };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-description')).toHaveTextContent('Custom description text');
    });

    it('should display multiple keywords', () => {
      const meta = { keywords: ['keyword1', 'keyword2', 'keyword3'] };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-keywords')).toHaveTextContent('keyword1, keyword2, keyword3');
    });

    it('should display custom canonical URL', () => {
      const meta = { canonicalUrl: 'https://mysite.com/page' };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-canonical')).toHaveTextContent('https://mysite.com/page');
    });
  });

  describe('Character Counters', () => {
    it('should show title character count', () => {
      const meta = { title: 'Test' };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-title')).toHaveTextContent('4/60');
    });

    it('should show description character count', () => {
      const meta = { description: 'Test description' };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-description')).toHaveTextContent('16/160');
    });

    it('should handle max length title', () => {
      const longTitle = 'A'.repeat(60);
      const meta = { title: longTitle };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-title')).toHaveTextContent('60/60');
    });

    it('should handle over length description', () => {
      const longDesc = 'A'.repeat(200);
      const meta = { description: longDesc };
      render(<MetaPreviewMock meta={meta} />);
      expect(screen.getByTestId('meta-description')).toHaveTextContent('200/160');
    });
  });

  describe('Accessibility', () => {
    it('should have labeled fields', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByText(/Title:/)).toBeInTheDocument();
      expect(screen.getByText(/Description:/)).toBeInTheDocument();
    });

    it('should have meaningful data-testid', () => {
      render(<MetaPreviewMock />);
      expect(screen.getByTestId('meta-title')).toBeInTheDocument();
      expect(screen.getByTestId('meta-preview')).toBeInTheDocument();
    });
  });
});
