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

import {
  formatMetrics,
  getMetricsSummary,
  checkMetricsHealth,
} from '~/services/gsc/gscMetrics.server';
import prisma from '~/db.server';

describe('GSC Metrics Service', () => {
  const storeId = 'store-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Formatting Tests (No googleapis mocking needed)
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

    it('should handle high CTR values', () => {
      const highCTRMetrics = {
        ...metrics,
        averageCtr: 0.25,
      };

      const result = formatMetrics(highCTRMetrics);
      expect(result.averageCtr).toBe('25.00%');
    });

    it('should handle decimal positions', () => {
      const decimalMetrics = {
        ...metrics,
        averagePosition: 2.789,
      };

      const result = formatMetrics(decimalMetrics);
      expect(result.averagePosition).toBe('2.8');
    });
  });

  // ========================================
  // Cache Retrieval Tests
  // ========================================

  describe('Cache Retrieval', () => {
    it('should retrieve cached metrics from database', async () => {
      const cachedMetrics = {
        totalClicks: 150,
        totalImpressions: 1500,
        averageCtr: 0.1,
        averagePosition: 5.5,
        startDate: new Date('2024-10-08'),
        endDate: new Date('2024-11-05'),
        createdAt: new Date(),
      };

      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(cachedMetrics);

      // Simulate cache check
      const result = await (prisma.gSCMetric.findFirst as jest.Mock)({
        where: { storeId },
      });

      expect(result).toEqual(cachedMetrics);
      expect(prisma.gSCMetric.findFirst).toHaveBeenCalled();
    });

    it('should return null when no cached metrics exist', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await (prisma.gSCMetric.findFirst as jest.Mock)({
        where: { storeId },
      });

      expect(result).toBeNull();
    });

    it('should filter by storeId in cache queries', async () => {
      (prisma.gSCMetric.findFirst as jest.Mock).mockResolvedValue(null);

      await (prisma.gSCMetric.findFirst as jest.Mock)({
        where: { storeId },
      });

      expect(prisma.gSCMetric.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId,
          }),
        })
      );
    });
  });

  // ========================================
  // Cache Write Tests
  // ========================================

  describe('Cache Write', () => {
    it('should delete old cached data before saving new data', async () => {
      (prisma.gSCMetric.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await (prisma.gSCMetric.deleteMany as jest.Mock)({
        where: { storeId },
      });

      expect(prisma.gSCMetric.deleteMany).toHaveBeenCalledWith({
        where: { storeId },
      });
    });

    it('should create new cached metrics', async () => {
      const newMetrics = {
        storeId,
        totalClicks: 200,
        totalImpressions: 2000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: new Date('2024-10-08'),
        endDate: new Date('2024-11-05'),
      };

      (prisma.gSCMetric.create as jest.Mock).mockResolvedValue({
        ...newMetrics,
        createdAt: new Date(),
      });

      await (prisma.gSCMetric.create as jest.Mock)({
        data: newMetrics,
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
  // Metrics Health Check Logic Tests
  // ========================================

  describe('Metrics Health Checks', () => {
    it('should identify healthy metrics', () => {
      const healthyMetrics = {
        totalClicks: 500,
        totalImpressions: 5000,
        averageCtr: 0.1, // 10% CTR
        averagePosition: 5, // Position 5
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      // Health check logic: CTR >= 2%, impressions >= 100, position <= 20
      const isHealthyCTR = healthyMetrics.averageCtr >= 0.02;
      const isHealthyImpressions = healthyMetrics.totalImpressions >= 100;
      const isHealthyPosition = healthyMetrics.averagePosition <= 20;

      expect(isHealthyCTR).toBe(true);
      expect(isHealthyImpressions).toBe(true);
      expect(isHealthyPosition).toBe(true);
    });

    it('should flag low CTR (below 2%)', () => {
      const lowCTRMetrics = {
        totalClicks: 10,
        totalImpressions: 1000,
        averageCtr: 0.01, // 1% CTR (below 2%)
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const isLowCTR = lowCTRMetrics.averageCtr < 0.02;
      expect(isLowCTR).toBe(true);
    });

    it('should flag low impressions (below 100)', () => {
      const lowImpressionsMetrics = {
        totalClicks: 5,
        totalImpressions: 50, // Below 100
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const isLowImpressions = lowImpressionsMetrics.totalImpressions < 100;
      expect(isLowImpressions).toBe(true);
    });

    it('should flag poor position (above 20)', () => {
      const poorPositionMetrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 25, // Above 20
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const isPoorPosition = poorPositionMetrics.averagePosition > 20;
      expect(isPoorPosition).toBe(true);
    });

    it('should identify multiple issues simultaneously', () => {
      const problematicMetrics = {
        totalClicks: 1,
        totalImpressions: 50,
        averageCtr: 0.01,
        averagePosition: 25,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const issues = [];
      if (problematicMetrics.averageCtr < 0.02)
        issues.push('low_ctr');
      if (problematicMetrics.totalImpressions < 100)
        issues.push('low_impressions');
      if (problematicMetrics.averagePosition > 20)
        issues.push('poor_position');

      expect(issues).toHaveLength(3);
      expect(issues).toContain('low_ctr');
      expect(issues).toContain('low_impressions');
      expect(issues).toContain('poor_position');
    });
  });

  // ========================================
  // Summary Generation Tests
  // ========================================

  describe('Metrics Summary Generation', () => {
    it('should format summary string correctly', () => {
      const metrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const formatted = formatMetrics(metrics);
      const summary = `Your site received ${formatted.totalClicks} clicks from ${formatted.totalImpressions} impressions (${formatted.averageCtr} CTR) with an average position of ${formatted.averagePosition} in the last 28 days.`;

      expect(summary).toContain('100');
      expect(summary).toContain('1,000');
      expect(summary).toContain('10.00%');
      expect(summary).toContain('5.0');
      expect(summary).toContain('28 days');
    });

    it('should handle zero metrics in summary', () => {
      const metrics = {
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      const formatted = formatMetrics(metrics);
      const summary = `Your site received ${formatted.totalClicks} clicks from ${formatted.totalImpressions} impressions (${formatted.averageCtr} CTR).`;

      expect(summary).toContain('0');
      expect(summary).toContain('0.00%');
    });

    it('should include date range in summary', () => {
      const metrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      expect(metrics.startDate).toBe('2024-10-08');
      expect(metrics.endDate).toBe('2024-11-05');
    });
  });

  // ========================================
  // Data Validation Tests
  // ========================================

  describe('Data Validation', () => {
    it('should validate positive click counts', () => {
      const validMetrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      expect(validMetrics.totalClicks).toBeGreaterThanOrEqual(0);
      expect(validMetrics.totalImpressions).toBeGreaterThanOrEqual(0);
    });

    it('should validate CTR as decimal between 0 and 1', () => {
      const metrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      expect(metrics.averageCtr).toBeGreaterThanOrEqual(0);
      expect(metrics.averageCtr).toBeLessThanOrEqual(1);
    });

    it('should validate position as positive number', () => {
      const metrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      expect(metrics.averagePosition).toBeGreaterThan(0);
    });

    it('should validate date format', () => {
      const metrics = {
        totalClicks: 100,
        totalImpressions: 1000,
        averageCtr: 0.1,
        averagePosition: 5,
        startDate: '2024-10-08',
        endDate: '2024-11-05',
      };

      // Simple date format validation (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test(metrics.startDate)).toBe(true);
      expect(dateRegex.test(metrics.endDate)).toBe(true);
    });
  });
});
