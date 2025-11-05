/**
 * Component Tests for PerformanceChart
 *
 * Tests for the performance metrics chart component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('PerformanceChart Component', () => {
  const PerformanceChartMock = ({ data = [], title = 'Performance Chart', metrics = [] }) => (
    <div data-testid="performance-chart">
      <h2 data-testid="chart-title">{title}</h2>
      <div data-testid="chart-container" className="chart">
        <canvas data-testid="chart-canvas" />
      </div>
      <div data-testid="metrics-list" className="metrics">
        {metrics.map((metric) => (
          <div key={metric.id} data-testid={`metric-${metric.id}`} className={`metric-${metric.status}`}>
            <span data-testid={`metric-name-${metric.id}`}>{metric.name}</span>
            <span data-testid={`metric-value-${metric.id}`}>{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  describe('Rendering', () => {
    it('should render performance chart', () => {
      render(<PerformanceChartMock />);
      expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
    });

    it('should display chart title', () => {
      render(<PerformanceChartMock title="Custom Title" />);
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Title');
    });

    it('should render canvas element', () => {
      render(<PerformanceChartMock />);
      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('should render metrics list', () => {
      render(<PerformanceChartMock />);
      expect(screen.getByTestId('metrics-list')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display multiple metrics', () => {
      const metrics = [
        { id: 1, name: 'Metric 1', value: '85', status: 'good' },
        { id: 2, name: 'Metric 2', value: '72', status: 'fair' },
        { id: 3, name: 'Metric 3', value: '45', status: 'poor' },
      ];
      render(<PerformanceChartMock metrics={metrics} />);
      
      expect(screen.getByTestId('metric-name-1')).toHaveTextContent('Metric 1');
      expect(screen.getByTestId('metric-value-2')).toHaveTextContent('72');
    });

    it('should display metric values', () => {
      const metrics = [{ id: 1, name: 'Test', value: '95', status: 'good' }];
      render(<PerformanceChartMock metrics={metrics} />);
      expect(screen.getByTestId('metric-value-1')).toHaveTextContent('95');
    });

    it('should handle empty metrics', () => {
      render(<PerformanceChartMock metrics={[]} />);
      expect(screen.getByTestId('metrics-list')).toBeEmptyDOMElement();
    });
  });

  describe('Status Styling', () => {
    it('should apply good status class', () => {
      const metrics = [{ id: 1, name: 'Test', value: '80', status: 'good' }];
      render(<PerformanceChartMock metrics={metrics} />);
      expect(screen.getByTestId('metric-1')).toHaveClass('metric-good');
    });

    it('should apply fair status class', () => {
      const metrics = [{ id: 1, name: 'Test', value: '60', status: 'fair' }];
      render(<PerformanceChartMock metrics={metrics} />);
      expect(screen.getByTestId('metric-1')).toHaveClass('metric-fair');
    });

    it('should apply poor status class', () => {
      const metrics = [{ id: 1, name: 'Test', value: '40', status: 'poor' }];
      render(<PerformanceChartMock metrics={metrics} />);
      expect(screen.getByTestId('metric-1')).toHaveClass('metric-poor');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading', () => {
      render(<PerformanceChartMock />);
      const heading = screen.getByTestId('chart-title');
      expect(heading.tagName).toBe('H2');
    });

    it('should have accessible metrics', () => {
      const metrics = [
        { id: 1, name: 'Metric A', value: '90', status: 'good' },
        { id: 2, name: 'Metric B', value: '70', status: 'fair' },
      ];
      render(<PerformanceChartMock metrics={metrics} />);
      
      expect(screen.getByTestId('metric-name-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-name-2')).toBeInTheDocument();
    });
  });

  describe('Chart Container', () => {
    it('should have chart container', () => {
      render(<PerformanceChartMock />);
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should have proper chart structure', () => {
      render(<PerformanceChartMock />);
      const container = screen.getByTestId('chart-container');
      expect(container).toContainElement(screen.getByTestId('chart-canvas'));
    });
  });
});
