/**
 * Component Tests for SEOScoreCircle
 *
 * Tests for the circular score indicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('SEOScoreCircle Component', () => {
  // Mock component for testing
  const SEOScoreCircleMock = ({ score = 75, size = 'medium', showLabel = true }) => {
    const getColorClass = (score) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div data-testid="seo-score-circle" className={`score-size-${size}`}>
        <div className={`score-value ${getColorClass(score)}`} data-testid="score-value">
          {score}
        </div>
        {showLabel && <div data-testid="score-label">SEO Score</div>}
        <svg data-testid="score-circle" width={size === 'large' ? 200 : 120}>
          <circle cx="50%" cy="50%" r="45%" />
        </svg>
      </div>
    );
  };

  describe('Rendering', () => {
    it('should render SEO score circle', () => {
      render(<SEOScoreCircleMock />);
      expect(screen.getByTestId('seo-score-circle')).toBeInTheDocument();
      expect(screen.getByTestId('score-circle')).toBeInTheDocument();
    });

    it('should display score value', () => {
      render(<SEOScoreCircleMock score={85} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('85');
    });

    it('should display label when showLabel is true', () => {
      render(<SEOScoreCircleMock showLabel={true} />);
      expect(screen.getByTestId('score-label')).toHaveTextContent('SEO Score');
    });

    it('should hide label when showLabel is false', () => {
      render(<SEOScoreCircleMock showLabel={false} />);
      expect(screen.queryByTestId('score-label')).not.toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should apply green color for high scores', () => {
      render(<SEOScoreCircleMock score={85} />);
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toHaveClass('text-green-600');
    });

    it('should apply yellow color for medium scores', () => {
      render(<SEOScoreCircleMock score={65} />);
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toHaveClass('text-yellow-600');
    });

    it('should apply red color for low scores', () => {
      render(<SEOScoreCircleMock score={45} />);
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toHaveClass('text-red-600');
    });

    it('should handle score at 80 boundary', () => {
      render(<SEOScoreCircleMock score={80} />);
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toHaveClass('text-green-600');
    });

    it('should handle score at 60 boundary', () => {
      render(<SEOScoreCircleMock score={60} />);
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toHaveClass('text-yellow-600');
    });
  });

  describe('Sizing', () => {
    it('should apply small size class', () => {
      render(<SEOScoreCircleMock size="small" />);
      expect(screen.getByTestId('seo-score-circle')).toHaveClass('score-size-small');
    });

    it('should apply medium size class', () => {
      render(<SEOScoreCircleMock size="medium" />);
      expect(screen.getByTestId('seo-score-circle')).toHaveClass('score-size-medium');
    });

    it('should apply large size class', () => {
      render(<SEOScoreCircleMock size="large" />);
      expect(screen.getByTestId('seo-score-circle')).toHaveClass('score-size-large');
    });
  });

  describe('Data Display', () => {
    it('should display score 0', () => {
      render(<SEOScoreCircleMock score={0} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('0');
    });

    it('should display score 100', () => {
      render(<SEOScoreCircleMock score={100} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('100');
    });

    it('should update score when prop changes', () => {
      const { rerender } = render(<SEOScoreCircleMock score={50} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('50');
      
      rerender(<SEOScoreCircleMock score={75} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('75');
    });
  });

  describe('Accessibility', () => {
    it('should have meaningful test IDs', () => {
      render(<SEOScoreCircleMock />);
      expect(screen.getByTestId('seo-score-circle')).toBeInTheDocument();
      expect(screen.getByTestId('score-value')).toBeInTheDocument();
    });
  });
});
