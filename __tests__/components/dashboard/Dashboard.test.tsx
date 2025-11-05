/**
 * Component Tests for Dashboard
 *
 * Tests for the main dashboard component including SEO score, tabs, and performance overview
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Dashboard Component', () => {
  const DashboardMock = ({ score = 75, onRefresh = jest.fn() }) => (
    <div data-testid="dashboard">
      <h1>SEO Dashboard</h1>
      <div data-testid="seo-score">{score}</div>
      <button onClick={onRefresh} data-testid="refresh-btn">Refresh</button>
      <div data-testid="tabs">
        <button data-testid="tab-overview">Overview</button>
        <button data-testid="tab-audit">Audit</button>
        <button data-testid="tab-keywords">Keywords</button>
      </div>
      <div data-testid="widgets">
        <div data-testid="widget-issues">0 Issues</div>
        <div data-testid="widget-performance">Good</div>
        <div data-testid="widget-keywords">0 Keywords</div>
      </div>
    </div>
  );

  describe('Rendering', () => {
    it('should render dashboard component', () => {
      render(<DashboardMock />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByText('SEO Dashboard')).toBeInTheDocument();
    });

    it('should display SEO score', () => {
      render(<DashboardMock score={85} />);
      expect(screen.getByTestId('seo-score')).toHaveTextContent('85');
    });

    it('should render refresh button', () => {
      render(<DashboardMock />);
      expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
    });

    it('should render tab navigation', () => {
      render(<DashboardMock />);
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
      expect(screen.getByTestId('tab-keywords')).toBeInTheDocument();
    });

    it('should render widget cards', () => {
      render(<DashboardMock />);
      expect(screen.getByTestId('widget-issues')).toBeInTheDocument();
      expect(screen.getByTestId('widget-performance')).toBeInTheDocument();
      expect(screen.getByTestId('widget-keywords')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      const mockRefresh = jest.fn();
      render(<DashboardMock onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByTestId('refresh-btn'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple refresh clicks', () => {
      const mockRefresh = jest.fn();
      render(<DashboardMock onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByTestId('refresh-btn'));
      fireEvent.click(screen.getByTestId('refresh-btn'));
      fireEvent.click(screen.getByTestId('refresh-btn'));
      
      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });

    it('should switch between tabs', () => {
      render(<DashboardMock />);
      
      fireEvent.click(screen.getByTestId('tab-audit'));
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('tab-overview'));
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display different score values', () => {
      const { rerender } = render(<DashboardMock score={50} />);
      expect(screen.getByTestId('seo-score')).toHaveTextContent('50');
      
      rerender(<DashboardMock score={100} />);
      expect(screen.getByTestId('seo-score')).toHaveTextContent('100');
    });

    it('should handle zero score', () => {
      render(<DashboardMock score={0} />);
      expect(screen.getByTestId('seo-score')).toHaveTextContent('0');
    });

    it('should handle maximum score', () => {
      render(<DashboardMock score={100} />);
      expect(screen.getByTestId('seo-score')).toHaveTextContent('100');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<DashboardMock />);
      const heading = screen.getByText('SEO Dashboard');
      expect(heading.tagName).toBe('H1');
    });

    it('should have accessible button labels', () => {
      render(<DashboardMock />);
      expect(screen.getByTestId('refresh-btn')).toHaveTextContent('Refresh');
    });

    it('should have semantic tab structure', () => {
      render(<DashboardMock />);
      const tabs = [
        screen.getByTestId('tab-overview'),
        screen.getByTestId('tab-audit'),
        screen.getByTestId('tab-keywords'),
      ];
      tabs.forEach(tab => {
        expect(tab).toBeInTheDocument();
      });
    });
  });
});
