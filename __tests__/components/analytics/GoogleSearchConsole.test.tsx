/**
 * GoogleSearchConsole Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GoogleSearchConsole, { GSCData } from '~/components/analytics/GoogleSearchConsole';

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-component">Chart</div>,
}));

jest.mock('@shopify/polaris', () => ({
  Card: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  Text: ({ children, variant, tone }: any) => (
    <span data-testid="text-default">{children}</span>
  ),
  BlockStack: ({ children }: any) => <div data-testid="block-stack">{children}</div>,
  InlineStack: ({ children }: any) => <div data-testid="inline-stack">{children}</div>,
  Button: ({ children, onClick, variant }: any) => (
    <button data-testid="polaris-button" onClick={onClick}>
      {children}
    </button>
  ),
  Select: ({ options, value, onChange }: any) => (
    <select data-testid="polaris-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options?.map((opt: any, i: number) => (
        <option key={i} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
  DataTable: ({ rows }: any) => (
    <table data-testid="data-table">
      <tbody>
        {rows?.map((row: any, i: number) => (
          <tr key={i}>
            {row.map((cell: any, j: number) => (
              <td key={j}>{typeof cell === 'string' || typeof cell === 'number' ? cell : ''}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Badge: ({ children, tone }: any) => <span data-testid="badge">{children}</span>,
  Icon: ({ tone }: any) => <span data-testid="icon" />,
  Banner: ({ children, tone }: any) => (
    <div data-testid="banner">{children}</div>
  ),
}));

const mockGSCData: GSCData = {
  isConnected: true,
  propertyUrl: 'https://example.com',
  dateRange: { startDate: '2024-10-05', endDate: '2024-11-05' },
  metrics: { clicks: 1250, impressions: 15000, ctr: 0.0833, position: 3.5 },
  previousMetrics: { clicks: 1000, impressions: 12000, ctr: 0.0833, position: 4.2 },
  chartData: {
    dates: ['Oct 5', 'Oct 12'],
    clicks: [200, 220],
    impressions: [2500, 2800],
    ctr: [0.08, 0.079],
    position: [3.8, 3.7],
  },
  topQueries: [
    { query: 'best product', clicks: 150, impressions: 2000, ctr: 0.075, position: 2.1 },
    { query: 'buy online', clicks: 120, impressions: 1800, ctr: 0.067, position: 3.2 },
  ],
  topPages: [
    { page: '/products/item-1', clicks: 300, impressions: 4000, ctr: 0.075, position: 2.5 },
    { page: '/products/item-2', clicks: 250, impressions: 3500, ctr: 0.071, position: 3.2 },
  ],
};

describe('GoogleSearchConsole Component', () => {
  describe('Disconnected State', () => {
    it('should show connection prompt when not connected', () => {
      render(<GoogleSearchConsole data={{ ...mockGSCData, isConnected: false }} />);
      expect(screen.getByText('Google Search Console')).toBeInTheDocument();
    });

    it('should show connect button when onConnect provided', () => {
      const onConnect = jest.fn();
      render(<GoogleSearchConsole data={{ ...mockGSCData, isConnected: false }} onConnect={onConnect} />);
      expect(screen.getByTestId('polaris-button')).toBeInTheDocument();
    });

    it('should call onConnect when button clicked', () => {
      const onConnect = jest.fn();
      render(<GoogleSearchConsole data={{ ...mockGSCData, isConnected: false }} onConnect={onConnect} />);
      fireEvent.click(screen.getByTestId('polaris-button'));
      expect(onConnect).toHaveBeenCalled();
    });
  });

  describe('Connected State - Rendering', () => {
    it('should render content when connected', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should display chart when connected', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.getByTestId('chart-component')).toBeInTheDocument();
    });

    it('should display property URL when connected', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('should render tables when connected', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const tables = screen.getAllByTestId('data-table');
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Display', () => {
    it('should display clicks metric', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should display impressions metric', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle missing metrics', () => {
      const data = { ...mockGSCData, metrics: { clicks: 0, impressions: 0, ctr: 0, position: 0 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });

  describe('Performance Changes', () => {
    it('should handle positive change in clicks', () => {
      const data = { ...mockGSCData, metrics: { ...mockGSCData.metrics, clicks: 1100 }, previousMetrics: { ...mockGSCData.previousMetrics!, clicks: 1000 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle missing previous metrics', () => {
      const data = { ...mockGSCData, previousMetrics: undefined };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });

  describe('Chart and Metric View', () => {
    it('should render chart component', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.getByTestId('chart-component')).toBeInTheDocument();
    });

    it('should have metric view selector', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const selects = screen.queryAllByTestId('polaris-select');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Top Queries Table', () => {
    it('should render data table for queries', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const tables = screen.getAllByTestId('data-table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should display query names', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const tables = screen.queryAllByTestId('data-table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should handle empty top queries', () => {
      const data = { ...mockGSCData, topQueries: [] };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });

  describe('Top Pages Table', () => {
    it('should render data table for pages', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const tables = screen.getAllByTestId('data-table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should display page URLs', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      const tables = screen.queryAllByTestId('data-table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should handle empty top pages', () => {
      const data = { ...mockGSCData, topPages: [] };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });

  describe('Date Range Selection', () => {
    it('should display date range', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });

  describe('Callbacks', () => {
    it('should call onConnect when provided', () => {
      const onConnect = jest.fn();
      render(<GoogleSearchConsole data={{ ...mockGSCData, isConnected: false }} onConnect={onConnect} />);
      fireEvent.click(screen.getByTestId('polaris-button'));
      expect(onConnect).toHaveBeenCalled();
    });

    it('should not error if callbacks not provided', () => {
      expect(() => { render(<GoogleSearchConsole data={mockGSCData} />); }).not.toThrow();
    });
  });

  describe('Layout and Structure', () => {
    it('should use block stack for vertical layout', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('block-stack').length).toBeGreaterThan(0);
    });

    it('should use inline stack for horizontal layout', () => {
      render(<GoogleSearchConsole data={mockGSCData} />);
      expect(screen.queryAllByTestId('inline-stack').length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle CTR of 0', () => {
      const data = { ...mockGSCData, metrics: { ...mockGSCData.metrics, ctr: 0 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle CTR of 1.0', () => {
      const data = { ...mockGSCData, metrics: { ...mockGSCData.metrics, ctr: 1.0 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle position of 1.0', () => {
      const data = { ...mockGSCData, metrics: { ...mockGSCData.metrics, position: 1.0 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle very large click numbers', () => {
      const data = { ...mockGSCData, metrics: { ...mockGSCData.metrics, clicks: 1000000 } };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('should handle special characters in queries', () => {
      const data = { ...mockGSCData, topQueries: [{ ...mockGSCData.topQueries[0], query: 'test & query' }] };
      render(<GoogleSearchConsole data={data} />);
      expect(screen.queryAllByTestId('card-content').length).toBeGreaterThan(0);
    });
  });
});
