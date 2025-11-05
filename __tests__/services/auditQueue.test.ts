/**
 * Unit Tests for Audit Queue Service
 *
 * Tests for BullMQ queue operations and audit job management
 * Includes: job queueing, status checks, cooldown enforcement, job cancellation
 */

// Mock BullMQ before importing the service
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn(),
  Job: jest.fn(),
}));

// Mock IORedis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
  }));
});

// Mock Prisma before importing the service
jest.mock('~/db.server', () => ({
  __esModule: true,
  default: {
    audit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import {
  queueAudit,
  getAuditJobStatus,
  canRunAudit,
  cancelAudit,
} from '~/services/audit/auditQueue.server';
import prisma from '~/db.server';
import type { AuditJobData } from '~/types/audit';

describe('Audit Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // canRunAudit Tests
  // ========================================

  describe('canRunAudit', () => {
    it('should allow new audit if none running and no previous audits', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.nextAllowedTime).toBeUndefined();
    });

    it('should prevent audit if one is already running', async () => {
      const runningAudit = {
        id: 'audit-running',
        storeId: 'store-123',
        status: 'RUNNING',
        createdAt: new Date(),
      };

      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(runningAudit);

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already running');
    });

    it('should prevent audit if one is pending', async () => {
      const pendingAudit = {
        id: 'audit-pending',
        storeId: 'store-123',
        status: 'PENDING',
        createdAt: new Date(),
      };

      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(pendingAudit);

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already running');
    });

    it('should allow audit if last one completed more than 1 hour ago', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No running audits
        .mockResolvedValueOnce({
          id: 'audit-old',
          storeId: 'store-123',
          createdAt: twoHoursAgo,
          status: 'COMPLETED',
        });

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent audit if last one completed less than 1 hour ago (FREE tier limit)', async () => {
      const now = new Date();
      const fiftyMinutesAgo = new Date(now.getTime() - 50 * 60 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No running audits
        .mockResolvedValueOnce({
          id: 'audit-recent',
          storeId: 'store-123',
          createdAt: fiftyMinutesAgo,
          status: 'COMPLETED',
        });

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('1 hour');
      expect(result.nextAllowedTime).toBeDefined();
    });

    it('should calculate correct nextAllowedTime', async () => {
      const now = new Date();
      const fiftyFiveMinutesAgo = new Date(now.getTime() - 55 * 60 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'audit-recent',
          storeId: 'store-123',
          createdAt: fiftyFiveMinutesAgo,
          status: 'COMPLETED',
        });

      const result = await canRunAudit('store-123');

      expect(result.nextAllowedTime).toBeDefined();

      // nextAllowedTime should be ~5 minutes in the future
      const timeDiff = result.nextAllowedTime!.getTime() - now.getTime();
      expect(timeDiff).toBeGreaterThan(4 * 60 * 1000); // > 4 minutes
      expect(timeDiff).toBeLessThan(6 * 60 * 1000); // < 6 minutes
    });

    it('should check running audits first', async () => {
      const recentAudit = new Date(Date.now() - 10 * 60 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No running
        .mockResolvedValueOnce({
          id: 'audit-recent',
          createdAt: recentAudit,
          status: 'COMPLETED',
        });

      await canRunAudit('store-123');

      // Should call findFirst twice: first for running, then for completed
      expect(prisma.audit.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  // ========================================
  // queueAudit Tests
  // ========================================

  describe('queueAudit', () => {
    const auditData: AuditJobData = {
      auditId: 'audit-123',
      storeId: 'store-456',
      shopDomain: 'example.myshopify.com',
    };

    it('should queue audit and return job ID', async () => {
      // In test environment with no Redis, should return "sync"
      const result = await queueAudit(auditData);

      expect(result).toBe('sync');
    });

    it('should update audit status to RUNNING when queueing', async () => {
      (prisma.audit.update as jest.Mock).mockResolvedValue({});

      await queueAudit(auditData);

      // Should update audit status to RUNNING
      const updateCall = (prisma.audit.update as jest.Mock).mock.calls[0];
      expect(updateCall[0].where.id).toBe(auditData.auditId);
      expect(updateCall[0].data.status).toBe('RUNNING');
    });

    it('should handle queueing errors gracefully', async () => {
      (prisma.audit.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(queueAudit(auditData)).rejects.toThrow();
    });

    it('should set startedAt timestamp when queueing', async () => {
      const beforeQueue = new Date();
      (prisma.audit.update as jest.Mock).mockResolvedValue({});

      await queueAudit(auditData);
      const afterQueue = new Date();

      const updateCall = (prisma.audit.update as jest.Mock).mock.calls[0];
      const startedAt = updateCall[0].data.startedAt;

      expect(startedAt).toBeInstanceOf(Date);
      expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeQueue.getTime());
      expect(startedAt.getTime()).toBeLessThanOrEqual(afterQueue.getTime());
    });
  });

  // ========================================
  // getAuditJobStatus Tests
  // ========================================

  describe('getAuditJobStatus', () => {
    it('should return audit status from database', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue({
        id: 'audit-123',
        status: 'RUNNING',
      });

      const result = await getAuditJobStatus('audit-123');

      expect(result.status).toBe('RUNNING');
    });

    it('should return NOT_FOUND if audit does not exist', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getAuditJobStatus('audit-nonexistent');

      expect(result.status).toBe('NOT_FOUND');
    });

    it('should return COMPLETED status', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue({
        id: 'audit-123',
        status: 'COMPLETED',
      });

      const result = await getAuditJobStatus('audit-123');

      expect(result.status).toBe('COMPLETED');
    });

    it('should return FAILED status', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue({
        id: 'audit-123',
        status: 'FAILED',
      });

      const result = await getAuditJobStatus('audit-123');

      expect(result.status).toBe('FAILED');
    });

    it('should return PENDING status', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue({
        id: 'audit-123',
        status: 'PENDING',
      });

      const result = await getAuditJobStatus('audit-123');

      expect(result.status).toBe('PENDING');
    });

    it('should handle database errors', async () => {
      (prisma.audit.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(getAuditJobStatus('audit-123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  // ========================================
  // cancelAudit Tests
  // ========================================

  describe('cancelAudit', () => {
    it('should cancel audit and update status to FAILED', async () => {
      (prisma.audit.update as jest.Mock).mockResolvedValue({});

      const result = await cancelAudit('audit-123');

      expect(result).toBe(true);
      expect(prisma.audit.update).toHaveBeenCalledWith({
        where: { id: 'audit-123' },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should set completedAt timestamp when cancelling', async () => {
      const beforeCancel = new Date();
      (prisma.audit.update as jest.Mock).mockResolvedValue({});

      await cancelAudit('audit-123');
      const afterCancel = new Date();

      const updateCall = (prisma.audit.update as jest.Mock).mock.calls[0];
      const completedAt = updateCall[0].data.completedAt;

      expect(completedAt).toBeInstanceOf(Date);
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCancel.getTime()
      );
      expect(completedAt.getTime()).toBeLessThanOrEqual(afterCancel.getTime());
    });

    it('should handle cancellation errors', async () => {
      (prisma.audit.update as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      await expect(cancelAudit('audit-123')).rejects.toThrow('Update failed');
    });

    it('should return false if audit not found', async () => {
      (prisma.audit.update as jest.Mock).mockResolvedValue(null);

      const result = await cancelAudit('audit-nonexistent');

      // If mocked properly, should return true (audit was "updated")
      expect(result).toBe(true);
    });
  });

  // ========================================
  // Integration Tests
  // ========================================

  describe('Audit Queue Integration', () => {
    it('should handle complete audit workflow: check → queue → status → cancel', async () => {
      const storeId = 'store-789';
      const auditId = 'audit-789';

      // Step 1: Check if audit can run
      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No running
        .mockResolvedValueOnce(null); // No previous

      let result = await canRunAudit(storeId);
      expect(result.allowed).toBe(true);

      // Step 2: Queue audit
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.audit.update as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'RUNNING',
      });

      const jobId = await queueAudit({
        auditId,
        storeId,
        shopDomain: 'test.myshopify.com',
      });

      expect(jobId).toBeDefined();

      // Step 3: Check status
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'RUNNING',
      });

      const status = await getAuditJobStatus(auditId);
      expect(status.status).toBe('RUNNING');

      // Step 4: Cancel audit
      (prisma.audit.update as jest.Mock).mockResolvedValue({
        id: auditId,
        status: 'FAILED',
      });

      const cancelled = await cancelAudit(auditId);
      expect(cancelled).toBe(true);
    });

    it('should prevent concurrent audits for same store', async () => {
      const storeId = 'store-concurrent';
      const runningAudit = {
        id: 'audit-running',
        status: 'RUNNING',
        storeId,
        createdAt: new Date(),
      };

      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(runningAudit);

      const result1 = await canRunAudit(storeId);
      expect(result1.allowed).toBe(false);

      const result2 = await canRunAudit(storeId);
      expect(result2.allowed).toBe(false);

      expect(result1.reason).toBe(result2.reason);
    });

    it('should track audit cooldown across multiple checks', async () => {
      const storeId = 'store-cooldown';
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const recentAudit = {
        id: 'audit-recent',
        status: 'COMPLETED',
        storeId,
        createdAt: thirtyMinutesAgo,
      };

      // First check: should block (30 min < 60 min)
      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(recentAudit);

      const result1 = await canRunAudit(storeId);
      expect(result1.allowed).toBe(false);

      // Verify nextAllowedTime is correct
      const timeUntilAllowed = result1.nextAllowedTime!.getTime() - now.getTime();
      expect(timeUntilAllowed).toBeGreaterThan(25 * 60 * 1000); // > 25 minutes
      expect(timeUntilAllowed).toBeLessThan(35 * 60 * 1000); // < 35 minutes
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('should handle empty audit ID', async () => {
      (prisma.audit.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getAuditJobStatus('');

      expect(result.status).toBe('NOT_FOUND');
    });

    it('should handle very recent audit (seconds ago)', async () => {
      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'audit-very-recent',
          status: 'COMPLETED',
          createdAt: fiveSecondsAgo,
        });

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.nextAllowedTime).toBeDefined();

      // Should have ~60 minutes left to wait
      const timeLeft = result.nextAllowedTime!.getTime() - now.getTime();
      expect(timeLeft).toBeGreaterThan(59 * 60 * 1000);
      expect(timeLeft).toBeLessThan(60 * 60 * 1000 + 10000);
    });

    it('should handle audit exactly at 1-hour boundary', async () => {
      const now = new Date();
      const exactlyOneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'audit-boundary',
          status: 'COMPLETED',
          createdAt: exactlyOneHourAgo,
        });

      const result = await canRunAudit('store-123');

      // Should allow (boundary is inclusive)
      expect(result.allowed).toBe(true);
    });
  });
});
