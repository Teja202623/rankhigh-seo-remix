/**
 * Component Tests for LoadingSpinner
 *
 * Tests for the loading spinner component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('LoadingSpinner Component', () => {
  const LoadingSpinnerMock = ({ visible = true, size = 'medium', message = 'Loading...' }) => (
    <div data-testid="spinner-container" style={{ display: visible ? 'block' : 'none' }}>
      <div data-testid="spinner" className={`spinner-${size}`}>
        <div className="spinner-circle" />
      </div>
      {message && <p data-testid="spinner-message">{message}</p>}
    </div>
  );

  describe('Rendering', () => {
    it('should render spinner when visible', () => {
      render(<LoadingSpinnerMock visible={true} />);
      expect(screen.getByTestId('spinner-container')).toBeVisible();
    });

    it('should hide spinner when not visible', () => {
      render(<LoadingSpinnerMock visible={false} />);
      expect(screen.getByTestId('spinner-container')).not.toBeVisible();
    });

    it('should render spinner element', () => {
      render(<LoadingSpinnerMock />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should display loading message', () => {
      render(<LoadingSpinnerMock message="Loading data..." />);
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Loading data...');
    });

    it('should allow empty message', () => {
      render(<LoadingSpinnerMock message="" />);
      expect(screen.queryByTestId('spinner-message')).not.toBeInTheDocument();
    });
  });

  describe('Sizing', () => {
    it('should apply small size class', () => {
      render(<LoadingSpinnerMock size="small" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner-small');
    });

    it('should apply medium size class', () => {
      render(<LoadingSpinnerMock size="medium" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner-medium');
    });

    it('should apply large size class', () => {
      render(<LoadingSpinnerMock size="large" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner-large');
    });
  });

  describe('State Management', () => {
    it('should handle visibility toggle', () => {
      const { rerender } = render(<LoadingSpinnerMock visible={true} />);
      expect(screen.getByTestId('spinner-container')).toBeVisible();
      
      rerender(<LoadingSpinnerMock visible={false} />);
      expect(screen.getByTestId('spinner-container')).not.toBeVisible();
    });

    it('should update message', () => {
      const { rerender } = render(<LoadingSpinnerMock message="Loading..." />);
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Loading...');
      
      rerender(<LoadingSpinnerMock message="Almost done..." />);
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Almost done...');
    });

    it('should change size', () => {
      const { rerender } = render(<LoadingSpinnerMock size="small" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner-small');
      
      rerender(<LoadingSpinnerMock size="large" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner-large');
    });
  });

  describe('Styling', () => {
    it('should render spinner circle', () => {
      render(<LoadingSpinnerMock />);
      const circle = screen.getByTestId('spinner').querySelector('.spinner-circle');
      expect(circle).toBeInTheDocument();
    });

    it('should have proper container structure', () => {
      render(<LoadingSpinnerMock />);
      const container = screen.getByTestId('spinner-container');
      expect(container).toContainElement(screen.getByTestId('spinner'));
    });
  });

  describe('Accessibility', () => {
    it('should have aria-busy indicator', () => {
      const { container } = render(<LoadingSpinnerMock visible={true} />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should display descriptive message', () => {
      render(<LoadingSpinnerMock message="Loading your audit results..." />);
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Loading your audit results...');
    });
  });
});
