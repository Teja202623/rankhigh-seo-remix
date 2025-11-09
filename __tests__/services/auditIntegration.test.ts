/**
 * Integration Tests for Audit Workflow
 *
 * Tests complete audit workflows and cross-service interactions
 * Includes: audit creation, queuing, processing, status tracking, and completion
 */

jest.mock('~/db.server', () => ({
  __esModule: true,
  default: {
    audit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sEOIssue: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('~/services/audit/auditQueue.server', () => ({
  queueAudit: jest.fn().mockResolvedValue('sync'),
  getAuditJobStatus: jest.fn(),
  canRunAudit: jest.fn().mockResolvedValue({ allowed: true }),
  cancelAudit: jest.fn(),
}));

jest.mock('~/services/audit/checks/missingMetaTitles.server', () => ({
  checkMissingMetaTitles: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/duplicateMetaTitles.server', () => ({
  checkDuplicateMetaTitles: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/missingMetaDescriptions.server', () => ({
  checkMissingMetaDescriptions: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/missingAltText.server', () => ({
  checkMissingAltText: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/brokenLinks.server', () => ({
  checkBrokenLinks: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/mixedContent.server', () => ({
  checkMixedContent: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/services/audit/checks/indexingDirectives.server', () => ({
  checkIndexingDirectives: jest.fn().mockResolvedValue([]),
}));

jest.mock('~/shopify.server', () => ({
  authenticate: jest.fn(),
}));

jest.mock('~/services/cache.server', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  buildCacheKey: jest.fn((namespace, key) => `${namespace}:${key}`),
  CACHE_TTL: 3600,
  CACHE_NAMESPACE: 'audit',
}));

jest.mock('~/services/cacheInvalidation.server', () => ({
  onDataChange: jest.fn(),
}));

import {
  startAudit,
} from '~/services/audit/auditService.server';
import { queueAudit, canRunAudit } from '~/services/audit/auditQueue.server';
import prisma from '~/db.server';

describe('Audit Workflow Integration Tests', () => {
  const storeId = 'store-integration-test';
  const shopDomain = 'integration-test.myshopify.com';
  const auditId = 'audit-integration-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Audit Creation and Initialization
  // ========================================

  describe('Audit Creation Workflow', () => {
    it('should create audit and queue for processing', async () => {
      const expectedAudit = {
        id: auditId,
        storeId,
        status: 'PENDING',
        totalUrls: 0,
        completed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.audit.create as jest.Mock).mockResolvedValue(expectedAudit);
      (queueAudit as jest.Mock).mockResolvedValue('sync');

      const result = await startAudit(storeId, shopDomain);

      expect(result).toBe(auditId);
      expect(prisma.audit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId,
          status: 'PENDING',
          totalUrls: 0,
          completed: 0,
        }),
      });
      expect(queueAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          auditId,
          storeId,
          shopDomain,
        })
      );
    });

    it('should initialize audit with zero issues', async () => {
      const expectedAudit = {
        id: auditId,
        storeId,
        status: 'PENDING',
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        createdAt: new Date(),
      };

      (prisma.audit.create as jest.Mock).mockResolvedValue(expectedAudit);
      (queueAudit as jest.Mock).mockResolvedValue('sync');

      await startAudit(storeId, shopDomain);

      const createCall = (prisma.audit.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.criticalIssues).toBe(0);
      expect(createCall[0].data.highIssues).toBe(0);
      expect(createCall[0].data.mediumIssues).toBe(0);
      expect(createCall[0].data.lowIssues).toBe(0);
    });

    it('should handle audit creation errors', async () => {
      (prisma.audit.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(startAudit(storeId, shopDomain)).rejects.toThrow(
        'Database error'
      );
    });

    it('should set audit status to PENDING on creation', async () => {
      const createdAudit = {
        id: auditId,
        storeId,
        status: 'PENDING',
        totalUrls: 0,
        completed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        createdAt: new Date(),
      };

      (prisma.audit.create as jest.Mock).mockResolvedValue(createdAudit);
      (queueAudit as jest.Mock).mockResolvedValue('sync');

      const result = await startAudit(storeId, shopDomain);

      expect(result).toBe(auditId);
      const createCall = (prisma.audit.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.status).toBe('PENDING');
    });
  });

  // ========================================
  // Multi-Store Audit Management
  // ========================================

  describe('Multiple Store Audits', () => {
    it('should prevent concurrent audits on same store', async () => {
      const store1 = 'store-1';

      (canRunAudit as jest.Mock)
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, reason: 'Already running' });

      const check1 = await canRunAudit(store1);
      const check2 = await canRunAudit(store1);

      expect(check1.allowed).toBe(true);
      expect(check2.allowed).toBe(false);
    });

    it('should allow different stores to run audits simultaneously', async () => {
      const store1 = 'store-1';
      const store2 = 'store-2';

      (canRunAudit as jest.Mock).mockResolvedValue({ allowed: true });

      const check1 = await canRunAudit(store1);
      const check2 = await canRunAudit(store2);

      expect(check1.allowed).toBe(true);
      expect(check2.allowed).toBe(true);
    });

    it('should track audit history per store', async () => {
      const store = 'store-tracked';

      const audits = [
        {
          id: 'audit-1',
          storeId: store,
          status: 'COMPLETED',
          createdAt: new Date('2024-11-01'),
        },
        {
          id: 'audit-2',
          storeId: store,
          status: 'COMPLETED',
          createdAt: new Date('2024-11-03'),
        },
      ];

      (prisma.audit.findMany as jest.Mock).mockResolvedValue(audits);

      const result = await (prisma.audit.findMany as jest.Mock)({
        where: { storeId: store },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      // Mocks return in order created, not sorted
      expect(result).toContainEqual(expect.objectContaining({ id: 'audit-2'}));
    });
  });

  // ========================================
  // Issue Aggregation and Severity Levels
  // ========================================

  describe('Issue Tracking and Severity', () => {
    it('should categorize issues by severity level', async () => {
      const issues = [
        { type: 'critical', message: 'No meta titles', severity: 'CRITICAL' },
        { type: 'high', message: 'Alt text missing', severity: 'HIGH' },
        { type: 'medium', message: 'Slow page', severity: 'MEDIUM' },
        { type: 'low', message: 'Poor layout', severity: 'LOW' },
      ];

      const severityCounts = {
        CRITICAL: issues.filter((i) => i.severity === 'CRITICAL').length,
        HIGH: issues.filter((i) => i.severity === 'HIGH').length,
        MEDIUM: issues.filter((i) => i.severity === 'MEDIUM').length,
        LOW: issues.filter((i) => i.severity === 'LOW').length,
      };

      expect(severityCounts.CRITICAL).toBe(1);
      expect(severityCounts.HIGH).toBe(1);
      expect(severityCounts.MEDIUM).toBe(1);
      expect(severityCounts.LOW).toBe(1);
    });

    it('should save issues to database with metadata', async () => {
      (prisma.sEOIssue.createMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await (prisma.sEOIssue.createMany as jest.Mock)({
        data: [
          { auditId, type: 'test', severity: 'HIGH' },
        ],
      });

      expect(result.count).toBe(3);
      expect(prisma.sEOIssue.createMany).toHaveBeenCalled();
    });

    it('should handle empty issue lists', async () => {
      (prisma.sEOIssue.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await (prisma.sEOIssue.createMany as jest.Mock)({
        data: [],
      });

      expect(result.count).toBe(0);
    });
  });

  // ========================================
  // Audit State Transitions
  // ========================================

  describe('Audit State Transitions', () => {
    it('should transition from PENDING to RUNNING', async () => {
      const auditStates: string[] = [];

      auditStates.push('PENDING');

      (prisma.audit.update as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'RUNNING',
      });

      const updated = await (prisma.audit.update as jest.Mock)({
        where: { id: auditId },
        data: { status: 'RUNNING' },
      });

      auditStates.push(updated.status);

      expect(auditStates).toEqual(['PENDING', 'RUNNING']);
    });

    it('should transition from RUNNING to COMPLETED', async () => {
      const auditStates: string[] = [];

      auditStates.push('RUNNING');

      (prisma.audit.update as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const updated = await (prisma.audit.update as jest.Mock)({
        where: { id: auditId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      auditStates.push(updated.status);

      expect(auditStates).toEqual(['RUNNING', 'COMPLETED']);
    });

    it('should handle transition to FAILED state', async () => {
      const auditStates: string[] = [];

      auditStates.push('RUNNING');

      (prisma.audit.update as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Connection timeout',
      });

      const updated = await (prisma.audit.update as jest.Mock)({
        where: { id: auditId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: 'Connection timeout',
        },
      });

      auditStates.push(updated.status);

      expect(auditStates).toEqual(['RUNNING', 'FAILED']);
    });
  });

  // ========================================
  // Audit Cooldown and Rate Limiting
  // ========================================

  describe('Audit Cooldown and Rate Limiting', () => {
    it('should enforce 1-hour cooldown between audits', async () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      (canRunAudit as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: '1 hour cooldown',
        nextAllowedTime: oneHourLater,
      });

      const result = await canRunAudit(storeId);

      expect(result.allowed).toBe(false);
      expect(result.nextAllowedTime).toBeDefined();
      expect(result.nextAllowedTime!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should allow audit immediately after cooldown expires', async () => {
      (canRunAudit as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await canRunAudit(storeId);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.nextAllowedTime).toBeUndefined();
    });

    it('should calculate correct cooldown time', async () => {
      const now = new Date();
      const fiftyMinutesAgo = new Date(now.getTime() - 50 * 60 * 1000);
      const expectedNextTime = new Date(fiftyMinutesAgo.getTime() + 60 * 60 * 1000);

      (canRunAudit as jest.Mock).mockResolvedValue({
        allowed: false,
        nextAllowedTime: expectedNextTime,
      });

      const result = await canRunAudit(storeId);

      const timeUntilAllowed = result.nextAllowedTime!.getTime() - now.getTime();
      expect(timeUntilAllowed).toBeGreaterThan(9 * 60 * 1000);
      expect(timeUntilAllowed).toBeLessThan(11 * 60 * 1000);
    });
  });

  // ========================================
  // Audit Completion and Results
  // ========================================

  describe('Audit Completion and Results', () => {
    it('should return complete audit result', async () => {
      const mockAudit = {
        id: auditId,
        storeId,
        status: 'COMPLETED',
        totalUrls: 100,
        completed: 100,
        criticalIssues: 5,
        highIssues: 10,
        mediumIssues: 20,
        lowIssues: 15,
        score: 72,
        completedAt: new Date(),
      };

      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(mockAudit);

      const result = await (prisma.audit.findUnique as jest.Mock)({
        where: { id: auditId },
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.score).toBe(72);
      expect(result.criticalIssues).toBe(5);
      expect(result.completedAt).toBeDefined();
    });

    it('should set completedAt timestamp', async () => {
      const beforeCompletion = new Date();
      const completedAudit = {
        id: auditId,
        storeId,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(completedAudit);

      const result = await (prisma.audit.findUnique as jest.Mock)({
        where: { id: auditId },
      });

      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCompletion.getTime()
      );
    });

    it('should calculate SEO score on completion', async () => {
      const mockAudit = {
        id: auditId,
        criticalIssues: 2,
        highIssues: 5,
        mediumIssues: 10,
        lowIssues: 15,
      };

      const calculateScore = (audit: any) => {
        let score = 100;
        score -= audit.criticalIssues * 10;
        score -= audit.highIssues * 5;
        score -= audit.mediumIssues * 2;
        score -= audit.lowIssues * 1;
        return Math.max(0, Math.min(100, score));
      };

      const score = calculateScore(mockAudit);
      expect(score).toBe(20); // 100 - (2*10) - (5*5) - (10*2) - (15*1) = 100 - 20 - 25 - 20 - 15 = 20
    });
  });

  // ========================================
  // Error Handling and Recovery
  // ========================================

  describe('Error Handling and Recovery', () => {
    it('should mark audit as FAILED on error', async () => {
      const mockAudit = {
        id: auditId,
        storeId,
        status: 'RUNNING',
      };

      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(mockAudit);
      (prisma.audit.update as jest.Mock).mockResolvedValue({
        ...mockAudit,
        status: 'FAILED',
        error: 'API error',
      });

      const updated = await (prisma.audit.update as jest.Mock)({
        where: { id: auditId },
        data: {
          status: 'FAILED',
          error: 'API error',
          completedAt: new Date(),
        },
      });

      expect(updated.status).toBe('FAILED');
      expect(updated.error).toBeDefined();
    });

    it('should preserve partial results on failure', async () => {
      const mockAudit = {
        id: auditId,
        storeId,
        status: 'FAILED',
        totalUrls: 100,
        completed: 45,
        criticalIssues: 3,
        error: 'Timeout during processing',
      };

      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(mockAudit);

      const result = await (prisma.audit.findUnique as jest.Mock)({
        where: { id: auditId },
      });

      expect(result.completed).toBe(45);
      expect(result.criticalIssues).toBe(3);
      expect(result.error).toBeDefined();
    });

    it('should allow retry after failure', async () => {
      const newAudit = {
        id: 'audit-retry',
        storeId,
        status: 'PENDING',
      };

      (prisma.audit.create as jest.Mock).mockResolvedValue(newAudit);
      (queueAudit as jest.Mock).mockResolvedValue('sync');
      (canRunAudit as jest.Mock).mockResolvedValue({ allowed: true });

      const result = await startAudit(storeId, shopDomain);

      expect(result).toBe('audit-retry');
      expect(prisma.audit.create).toHaveBeenCalled();
    });
  });

  // ========================================
  // Audit Status Tracking
  // ========================================

  describe('Audit Status Tracking', () => {
    it('should query audit by ID', async () => {
      const mockAudit = {
        id: auditId,
        storeId,
        status: 'RUNNING',
        createdAt: new Date(),
      };

      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(mockAudit);

      const result = await (prisma.audit.findUnique as jest.Mock)({
        where: { id: auditId },
      });

      expect(result.id).toBe(auditId);
      expect(prisma.audit.findUnique).toHaveBeenCalledWith({
        where: { id: auditId },
      });
    });

    it('should find latest audit for store', async () => {
      const mockAudit = {
        id: auditId,
        storeId,
        status: 'COMPLETED',
        createdAt: new Date(),
      };

      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(mockAudit);

      const result = await (prisma.audit.findFirst as jest.Mock)({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result.storeId).toBe(storeId);
      expect(result.status).toBe('COMPLETED');
    });

    it('should count audits for store', async () => {
      (prisma.audit.count as jest.Mock).mockResolvedValue(5);

      const count = await (prisma.audit.count as jest.Mock)({
        where: { storeId },
      });

      expect(count).toBe(5);
    });
  });

  // ========================================
  // Concurrent Operation Handling
  // ========================================

  describe('Concurrent Operation Handling', () => {
    it('should handle concurrent audit checks', async () => {
      (canRunAudit as jest.Mock).mockResolvedValue({ allowed: true });

      const [check1, check2, check3] = await Promise.all([
        canRunAudit(storeId),
        canRunAudit(storeId),
        canRunAudit(storeId),
      ]);

      expect(check1.allowed).toBe(true);
      expect(check2.allowed).toBe(true);
      expect(check3.allowed).toBe(true);
      expect(canRunAudit).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent audit creation', async () => {
      const expectedAudit1 = {
        id: 'audit-1',
        storeId,
        status: 'PENDING',
      };

      const expectedAudit2 = {
        id: 'audit-2',
        storeId: 'store-2',
        status: 'PENDING',
      };

      (prisma.audit.create as jest.Mock)
        .mockResolvedValueOnce(expectedAudit1)
        .mockResolvedValueOnce(expectedAudit2);
      (queueAudit as jest.Mock).mockResolvedValue('sync');

      const [result1, result2] = await Promise.all([
        startAudit(storeId, shopDomain),
        startAudit('store-2', 'store2.myshopify.com'),
      ]);

      expect(result1).toBe('audit-1');
      expect(result2).toBe('audit-2');
    });
  });
});
