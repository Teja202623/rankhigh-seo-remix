/**
 * Unit Tests for GSC Metrics Service
 *
 * Tests for Google Search Console metrics fetching, caching, and formatting
 * Includes: aggregated metrics, caching logic, error handling, health checks, formatting
 */

// Mock dependencies before importing
jest.mock('~/db.server', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: jest.fn(),
    },
    gSCMetric: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('~/services/gsc/gscAuth.server', () => ({
  getValidAccessToken: jest.fn(),
}));

jest.mock('googleapis', () => {
  // Create the mock instances that will be reused across tests
  const mockQueryFn = jest.fn();
  const mockOAuth2Instance = {
    setCredentials: jest.fn(),
  };

  const mockWebmastersInstance = {
    searchanalytics: {
      query: mockQueryFn,
    },
  };

  const googleMock = {
    auth: {
      OAuth2: jest.fn(function() {
        // Return the same instance
        return mockOAuth2Instance;
      }),
    },
    webmasters: jest.fn(function() {
      return mockWebmastersInstance;
    }),
  };

  // Store references so tests can access them
  (googleMock as any)._mockQueryFn = mockQueryFn;
  (googleMock as any)._mockOAuth2Instance = mockOAuth2Instance;

  return {
    google: googleMock,
  };
});

// Create accessors for the mocks
const getMockQuery = () => {
  const { google } = jest.requireMock('googleapis');
  return (google as any)._mockQueryFn;
};

const getMockOAuth2 = () => {
  const { google } = jest.requireMock('googleapis');
  return (google as any)._mockOAuth2Instance;
};

import {
  fetchAggregatedMetrics,
  getMetricsWithComparison,
  formatMetrics,
  getMetricsSummary,
  checkMetricsHealth,
} from '~/services/gsc/gscMetrics.server';
import { GSCError } from '~/types/gsc';
import prisma from '~/db.server';
import { getValidAccessToken } from '~/services/gsc/gscAuth.server';
import { google } from 'googleapis';

describe('GSC Metrics Service', () => {
  const storeId = 'store-123';
  const gscPropertyUrl = 'https://example.com';

  beforeEach(() => {
    // Clear mocks selectively to preserve mock structure
    (prisma.gSCMetric.findFirst as jest.Mock).mockClear();
    (prisma.gSCMetric.deleteMany as jest.Mock).mockClear();
    (prisma.gSCMetric.create as jest.Mock).mockClear();
    (prisma.store.findUnique as jest.Mock).mockClear();
    (getValidAccessToken as jest.Mock).mockClear();
    getMockQuery().mockClear();
  });

  // ========================================
  // fetchAggregatedMetrics Tests
  // ========================================

  describe('fetchAggregatedMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedMetrics = {
        totalClicks: 150,
        totalImpressions: 1500,
        averageCtr: 0.1,
        averagePosition: 5.5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue({
        totalClicks: 150,
        totalImpressions: 1500,
        averageCtr: 0.1,
        averagePosition: 5.5,
        startDate: new Date('2024-10-08'),
        endDate: new Date('2024-11-05'),
        createdAt: new Date(),
      });

      const result = await fetchAggregatedMetrics(storeId);

      expect(result).toEqual(cachedMetrics);
      expect(prisma.gSCMetric.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId,
          }),
        })
      );
    });

    it('should fetch fresh data when cache is empty', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 250,
              impressions: 2500,
              ctr: 0.1,
              position: 4.5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const result = await fetchAggregatedMetrics(storeId);

      expect(result.totalClicks).toBe(250);
      expect(result.totalImpressions).toBe(2500);
      expect(result.averageCtr).toBe(0.1);
      expect(result.averagePosition).toBe(4.5);
    });

    it('should throw error when GSC not connected', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscConnected: false,
        gscPropertyUrl: null,
      });

      await expect(fetchAggregatedMetrics(storeId)).rejects.toThrow(GSCError);
    });

    it('should throw error when store not found', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(fetchAggregatedMetrics(storeId)).rejects.toThrow(GSCError);
    });

    it('should return empty metrics when no GSC data available', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const result = await fetchAggregatedMetrics(storeId);

      expect(result.totalClicks).toBe(0);
      expect(result.totalImpressions).toBe(0);
      expect(result.averageCtr).toBe(0);
      expect(result.averagePosition).toBe(0);
    });

    it('should handle 403 Forbidden error', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      getMockQuery().mockRejectedValue({ code: 403, message: 'Forbidden' });

      await expect(fetchAggregatedMetrics(storeId)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });

    it('should handle 429 Quota Exceeded error', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      getMockQuery().mockRejectedValue({ code: 429, message: 'Too Many Requests' });

      await expect(fetchAggregatedMetrics(storeId)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 429,
        })
      );
    });

    it('should force refresh when forceRefresh=true', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 100,
              impressions: 1000,
              ctr: 0.1,
              position: 5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const result = await fetchAggregatedMetrics(storeId, true);

      expect(result.totalClicks).toBe(100);
      // gSCMetric.findFirst should not be called when forceRefresh=true
      expect(prisma.gSCMetric.findFirst).not.toHaveBeenCalled();
    });

    it('should cache metrics after fetching', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 200,
              impressions: 2000,
              ctr: 0.1,
              position: 5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      await fetchAggregatedMetrics(storeId);

      expect(prisma.gSCMetric.deleteMany).toHaveBeenCalledWith({
        where: { storeId },
      });

      expect(prisma.gSCMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storeId,
            totalClicks: 200,
            totalImpressions: 2000,
          }),
        })
      );
    });
  });

  // ========================================
  // getMetricsWithComparison Tests
  // ========================================

  describe('getMetricsWithComparison', () => {
    it('should return current metrics only for FREE tier', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 150,
              impressions: 1500,
              ctr: 0.1,
              position: 5.5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const result = await getMetricsWithComparison(storeId);

      expect(result.current).toBeDefined();
      expect(result.previous).toBeUndefined();
      expect(result.changes).toBeUndefined();
    });
  });

  // ========================================
  // Formatting Tests
  // ========================================

  describe('formatMetrics', () => {
    const metrics = {
      totalClicks: 1234,
      totalImpressions: 12345,
      averageCtr: 0.09981,
      averagePosition: 5.432,
      startDate: '2024-10-08',
      endDate: '2024-11-05',
    };

    it('should format number with commas', () => {
      const result = formatMetrics(metrics);
      expect(result.totalClicks).toBe('1,234');
      expect(result.totalImpressions).toBe('12,345');
    });

    it('should format CTR as percentage', () => {
      const result = formatMetrics(metrics);
      expect(result.averageCtr).toBe('9.98%');
    });

    it('should format position to 1 decimal place', () => {
      const result = formatMetrics(metrics);
      expect(result.averagePosition).toBe('5.4');
    });

    it('should handle zero values', () => {
      const zeroMetrics = {
        ...metrics,
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
      };

      const result = formatMetrics(zeroMetrics);
      expect(result.totalClicks).toBe('0');
      expect(result.totalImpressions).toBe('0');
      expect(result.averageCtr).toBe('0.00%');
      expect(result.averagePosition).toBe('0.0');
    });

    it('should handle large numbers', () => {
      const largeMetrics = {
        ...metrics,
        totalClicks: 1234567,
        totalImpressions: 12345678,
      };

      const result = formatMetrics(largeMetrics);
      expect(result.totalClicks).toBe('1,234,567');
      expect(result.totalImpressions).toBe('12,345,678');
    });
  });

  // ========================================
  // getMetricsSummary Tests
  // ========================================

  describe('getMetricsSummary', () => {
    it('should return formatted summary string', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 100,
              impressions: 1000,
              ctr: 0.1,
              position: 5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const summary = await getMetricsSummary(storeId);

      expect(summary).toContain('100');
      expect(summary).toContain('1,000');
      expect(summary).toContain('10.00%');
      expect(summary).toContain('5.0');
      expect(summary).toContain('28 days');
    });
  });

  // ========================================
  // checkMetricsHealth Tests
  // ========================================

  describe('checkMetricsHealth', () => {
    it('should mark as healthy when metrics are good', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 500,
              impressions: 5000,
              ctr: 0.1, // 10% CTR
              position: 5, // Position 5
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const health = await checkMetricsHealth(storeId);

      expect(health.isHealthy).toBe(true);
      expect(health.warnings).toHaveLength(0);
      expect(health.suggestions).toHaveLength(0);
    });

    it('should warn about low CTR', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 10,
              impressions: 1000,
              ctr: 0.01, // 1% CTR (below 2%)
              position: 5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const health = await checkMetricsHealth(storeId);

      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain('Your average CTR is below 2%');
      expect(health.suggestions).toContain(
        expect.stringContaining('meta titles and descriptions')
      );
    });

    it('should warn about low impressions', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 5,
              impressions: 50, // Below 100
              ctr: 0.1,
              position: 5,
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const health = await checkMetricsHealth(storeId);

      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain('Your site has low visibility in search results');
      expect(health.suggestions).toContain(
        expect.stringContaining('SEO-optimized content')
      );
    });

    it('should warn about poor position', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 100,
              impressions: 1000,
              ctr: 0.1,
              position: 25, // Above 20
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const health = await checkMetricsHealth(storeId);

      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain('Your average position is below the first page');
      expect(health.suggestions).toContain(
        expect.stringContaining('on-page SEO')
      );
    });

    it('should identify multiple issues', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        gscPropertyUrl,
        gscConnected: true,
      });
      (getValidAccessToken as jest.Mock).mockResolvedValue('valid-token');

      const mockResponse = {
        data: {
          rows: [
            {
              clicks: 1,
              impressions: 50, // Low
              ctr: 0.01, // Low
              position: 25, // Poor
            },
          ],
        },
      };

      getMockQuery().mockResolvedValue(mockResponse);

      const health = await checkMetricsHealth(storeId);

      expect(health.isHealthy).toBe(false);
      expect(health.warnings.length).toBe(3);
      expect(health.suggestions.length).toBe(3);
    });
  });
});
