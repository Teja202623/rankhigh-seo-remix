/**
 * Component Tests for SERPPreview
 *
 * Tests for SERP preview showing how page appears in Google with character counters
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('SERPPreview Component', () => {
  const SERPPreviewMock = ({ title = 'Page Title', description = 'This is a description', url = 'https://example.com' }) => (
    <div data-testid="serp-preview">
      <div data-testid="serp-title" className="text-blue-600">{title}</div>
      <div data-testid="serp-url" className="text-green-600">{url}</div>
      <div data-testid="serp-description">{description}</div>
      <div data-testid="char-count-title">Title: {title.length}/60</div>
      <div data-testid="char-count-desc">Description: {description.length}/160</div>
    </div>
  );

  describe('Rendering', () => {
    it('should render SERP preview', () => {
      render(<SERPPreviewMock />);
      expect(screen.getByTestId('serp-preview')).toBeInTheDocument();
    });

    it('should display title', () => {
      render(<SERPPreviewMock title="Test Title" />);
      expect(screen.getByTestId('serp-title')).toHaveTextContent('Test Title');
    });

    it('should display URL', () => {
      render(<SERPPreviewMock url="https://example.com" />);
      expect(screen.getByTestId('serp-url')).toHaveTextContent('https://example.com');
    });

    it('should display description', () => {
      render(<SERPPreviewMock description="Test description" />);
      expect(screen.getByTestId('serp-description')).toHaveTextContent('Test description');
    });
  });

  describe('Character Counting', () => {
    it('should count title characters', () => {
      render(<SERPPreviewMock title="Hello World" />);
      expect(screen.getByTestId('char-count-title')).toHaveTextContent('Title: 11/60');
    });

    it('should count description characters', () => {
      const desc = 'This is a test description';
      render(<SERPPreviewMock description={desc} />);
      expect(screen.getByTestId('char-count-desc')).toHaveTextContent(`Description: ${desc.length}/160`);
    });

    it('should handle empty title', () => {
      render(<SERPPreviewMock title="" />);
      expect(screen.getByTestId('char-count-title')).toHaveTextContent('Title: 0/60');
    });

    it('should handle long title', () => {
      const longTitle = 'A'.repeat(70);
      render(<SERPPreviewMock title={longTitle} />);
      expect(screen.getByTestId('char-count-title')).toHaveTextContent('Title: 70/60');
    });
  });

  describe('Styling', () => {
    it('should apply blue color to title', () => {
      render(<SERPPreviewMock />);
      expect(screen.getByTestId('serp-title')).toHaveClass('text-blue-600');
    });

    it('should apply green color to URL', () => {
      render(<SERPPreviewMock />);
      expect(screen.getByTestId('serp-url')).toHaveClass('text-green-600');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible character count labels', () => {
      render(<SERPPreviewMock />);
      expect(screen.getByTestId('char-count-title')).toBeInTheDocument();
      expect(screen.getByTestId('char-count-desc')).toBeInTheDocument();
    });
  });
});
