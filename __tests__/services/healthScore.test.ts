/**
 * Unit Tests for Health Score Calculator Service
 *
 * Tests for SEO health score calculation algorithm
 * Includes: score calculation, penalties, bonuses, status determination, utility functions
 */

// Mock Prisma before importing the service
jest.mock('~/db.server', () => ({
  __esModule: true,
  default: {
    audit: {
      findFirst: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  calculateHealthScore,
  getHealthScoreTone,
  getHealthScoreStatusText,
  type HealthScoreData,
} from '~/services/dashboard/healthScore.server';
import prisma from '~/db.server';

describe('Health Score Calculator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // calculateHealthScore Tests
  // ========================================

  describe('calculateHealthScore', () => {
    const storeId = 'store-123';

    it('should throw error if store not found', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(calculateHealthScore(storeId)).rejects.toThrow('Store not found');
    });

    it('should calculate base score from latest audit', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 80,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(80);
      expect(result.breakdown.baseScore).toBe(80);
    });

    it('should return score of 0 when no audit exists', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(0);
      expect(result.breakdown.baseScore).toBe(0);
    });

    it('should apply critical penalty (-5 per issue)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 90,
        criticalIssues: 2,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.criticalPenalty).toBe(10);
      expect(result.score).toBe(80); // 90 - 10
    });

    it('should apply high penalty (-2 per issue)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 90,
        criticalIssues: 0,
        highIssues: 5,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.highPenalty).toBe(10);
      expect(result.score).toBe(80); // 90 - 10
    });

    it('should apply both critical and high penalties', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 95,
        criticalIssues: 2,
        highIssues: 5,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.criticalPenalty).toBe(10); // 2 * 5
      expect(result.breakdown.highPenalty).toBe(10); // 5 * 2
      expect(result.score).toBe(75); // 95 - 10 - 10
    });

    it('should add sitemap bonus (+5) when generated', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 80,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: new Date(),
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.sitemapBonus).toBe(5);
      expect(result.score).toBe(85); // 80 + 5
    });

    it('should add GSC bonus (+5) when connected', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 80,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: true,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.gscBonus).toBe(5);
      expect(result.score).toBe(85); // 80 + 5
    });

    it('should add both sitemap and GSC bonuses (+10 total)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 80,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: new Date(),
        gscConnected: true,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.breakdown.sitemapBonus).toBe(5);
      expect(result.breakdown.gscBonus).toBe(5);
      expect(result.score).toBe(90); // 80 + 5 + 5
    });

    it('should clamp score to maximum of 100', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 98,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: new Date(),
        gscConnected: true,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(100); // Clamped from 108
    });

    it('should clamp score to minimum of 0', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 10,
        criticalIssues: 5,
        highIssues: 10,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(0); // Would be -35, clamped to 0
    });

    it('should round final score to nearest integer', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 85.7,
        criticalIssues: 0,
        highIssues: 1,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(84); // 85.7 - 2 = 83.7, rounded to 84
    });

    // Status determination tests
    it('should set status to excellent (86-100)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 90,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('excellent');
    });

    it('should set status to excellent at boundary 86', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 86,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('excellent');
    });

    it('should set status to good (71-85)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 78,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('good');
    });

    it('should set status to good at boundary 71', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 71,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('good');
    });

    it('should set status to needs-work (41-70)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 55,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('needs-work');
    });

    it('should set status to needs-work at boundary 41', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 41,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('needs-work');
    });

    it('should set status to critical (0-40)', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 25,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('critical');
    });

    it('should set status to critical at boundary 40', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 40,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.status).toBe('critical');
    });
  });

  // ========================================
  // getHealthScoreTone Tests
  // ========================================

  describe('getHealthScoreTone', () => {
    it('should return critical for critical status', () => {
      const tone = getHealthScoreTone('critical');
      expect(tone).toBe('critical');
    });

    it('should return warning for needs-work status', () => {
      const tone = getHealthScoreTone('needs-work');
      expect(tone).toBe('warning');
    });

    it('should return success for good status', () => {
      const tone = getHealthScoreTone('good');
      expect(tone).toBe('success');
    });

    it('should return success for excellent status', () => {
      const tone = getHealthScoreTone('excellent');
      expect(tone).toBe('success');
    });
  });

  // ========================================
  // getHealthScoreStatusText Tests
  // ========================================

  describe('getHealthScoreStatusText', () => {
    it('should return critical text for critical status', () => {
      const text = getHealthScoreStatusText('critical');
      expect(text).toBe('Critical - Immediate action needed');
    });

    it('should return needs-work text for needs-work status', () => {
      const text = getHealthScoreStatusText('needs-work');
      expect(text).toBe('Needs Work - Several issues to fix');
    });

    it('should return good text for good status', () => {
      const text = getHealthScoreStatusText('good');
      expect(text).toBe('Good - Minor improvements possible');
    });

    it('should return excellent text for excellent status', () => {
      const text = getHealthScoreStatusText('excellent');
      expect(text).toBe('Excellent - Keep up the great work!');
    });
  });

  // ========================================
  // Integration & Complex Scenarios
  // ========================================

  describe('Complex Score Calculations', () => {
    const storeId = 'store-complex';

    it('should handle realistic scenario: good audit with penalties and bonuses', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 85,
        criticalIssues: 1,
        highIssues: 3,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: new Date(),
        gscConnected: true,
      });

      const result = await calculateHealthScore(storeId);

      // 85 - (1 * 5) - (3 * 2) + 5 + 5 = 84
      expect(result.score).toBe(84);
      expect(result.status).toBe('good');
      expect(result.breakdown.baseScore).toBe(85);
      expect(result.breakdown.criticalPenalty).toBe(5);
      expect(result.breakdown.highPenalty).toBe(6);
      expect(result.breakdown.sitemapBonus).toBe(5);
      expect(result.breakdown.gscBonus).toBe(5);
    });

    it('should handle realistic scenario: many issues', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 70,
        criticalIssues: 4,
        highIssues: 8,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      // 70 - 20 - 16 = 34
      expect(result.score).toBe(34);
      expect(result.status).toBe('critical');
    });

    it('should handle realistic scenario: poor audit with bonuses saves it', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 50,
        criticalIssues: 2,
        highIssues: 2,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: new Date(),
        gscConnected: true,
      });

      const result = await calculateHealthScore(storeId);

      // 50 - 10 - 4 + 5 + 5 = 46
      expect(result.score).toBe(46);
      expect(result.status).toBe('needs-work');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    const storeId = 'store-edge';

    it('should handle null override score values', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: null,
        criticalIssues: null,
        highIssues: null,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      // All null values should default to 0
      expect(result.score).toBe(0);
      expect(result.breakdown.baseScore).toBe(0);
      expect(result.breakdown.criticalPenalty).toBe(0);
      expect(result.breakdown.highPenalty).toBe(0);
    });

    it('should handle zero audit values', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 0,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(0);
      expect(result.status).toBe('critical');
    });

    it('should handle perfect audit score', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 100,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      expect(result.score).toBe(100);
      expect(result.status).toBe('excellent');
    });

    it('should handle database error', async () => {
      (prisma.audit.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(calculateHealthScore(storeId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle store lookup errors', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 80,
        criticalIssues: 0,
        highIssues: 0,
      });
      (prisma.store.findUnique as jest.Mock).mockRejectedValue(
        new Error('Store lookup failed')
      );

      await expect(calculateHealthScore(storeId)).rejects.toThrow(
        'Store lookup failed'
      );
    });

    it('should handle very large penalty values', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        overallScore: 100,
        criticalIssues: 100,
        highIssues: 100,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: storeId,
        sitemapLastGenerated: null,
        gscConnected: false,
      });

      const result = await calculateHealthScore(storeId);

      // 100 - 500 - 200 = -600, clamped to 0
      expect(result.score).toBe(0);
      expect(result.status).toBe('critical');
    });
  });
});
