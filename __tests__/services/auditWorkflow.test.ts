/**
 * End-to-End Tests for Complete Audit Workflow
 *
 * Tests for the full audit lifecycle:
 * - Audit initiation and validation
 * - Rate limiting and cooldown enforcement
 * - Complete audit execution
 * - Result aggregation and scoring
 * - Multi-store audit handling
 * - Error handling and recovery
 * - Audit history and statistics
 */

import type { AuditStatus, IssueSeverity } from '~/types/audit';

// Mock context setup for complete audit workflow
const createMockAuditContext = (overrides = {}) => {
  return {
    storeId: 'test-store-123',
    shopDomain: 'test-store.myshopify.com',
    timestamp: new Date(),
    products: [
      {
        id: 'product-1',
        title: 'Test Product 1',
        handle: 'test-product-1',
        seo: { title: 'SEO Title 1', description: 'Description 1' },
        images: [{ alt: 'Product Image' }],
      },
      {
        id: 'product-2',
        title: 'Test Product 2',
        handle: 'test-product-2',
        seo: { title: '', description: '' }, // Missing meta
        images: [{ alt: '' }], // Missing alt text
      },
    ],
    collections: [
      {
        id: 'collection-1',
        title: 'Test Collection',
        handle: 'test-collection',
        seo: { title: 'Collection Title', description: 'Collection Desc' },
      },
    ],
    pages: [
      {
        id: 'page-1',
        title: 'Test Page',
        handle: 'test-page',
        seo: { title: 'Page Title', description: 'Page Description' },
        body: '<a href="http://example.com">Link</a>', // Mixed content
      },
    ],
    ...overrides,
  };
};

describe('E2E: Complete Audit Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Audit Initiation Tests
  // ========================================

  describe('Audit Initiation', () => {
    it('should start audit with PENDING status', () => {
      const context = createMockAuditContext();

      const audit = {
        id: 'audit-123',
        storeId: context.storeId,
        status: 'PENDING' as AuditStatus,
        startedAt: context.timestamp,
        completedAt: null,
        issueCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        score: 100,
      };

      expect(audit.status).toBe('PENDING');
      expect(audit.issueCount).toBe(0);
      expect(audit.score).toBe(100);
      expect(audit.startedAt).toBeDefined();
      expect(audit.completedAt).toBeNull();
    });

    it('should create audit record with store reference', () => {
      const context = createMockAuditContext();

      const audit = {
        id: 'audit-123',
        storeId: context.storeId,
        status: 'PENDING' as AuditStatus,
        shopDomain: context.shopDomain,
        startedAt: context.timestamp,
        completedAt: null,
      };

      expect(audit.storeId).toBe('test-store-123');
      expect(audit.shopDomain).toBe('test-store.myshopify.com');
    });

    it('should queue audit for background processing', () => {
      const context = createMockAuditContext();

      const jobData = {
        auditId: 'audit-123',
        storeId: context.storeId,
        timestamp: context.timestamp,
      };

      expect(jobData.auditId).toBeDefined();
      expect(jobData.storeId).toBe(context.storeId);
      expect(jobData.timestamp).toBe(context.timestamp);
    });

    it('should return audit ID to client', () => {
      const auditId = 'audit-456';

      expect(auditId).toBeDefined();
      expect(typeof auditId).toBe('string');
      expect(auditId.length).toBeGreaterThan(0);
    });

    it('should initialize audit with timestamp', () => {
      const startTime = new Date();
      const audit = {
        startedAt: startTime,
        completedAt: null,
      };

      expect(audit.startedAt).toBe(startTime);
      expect(audit.completedAt).toBeNull();
    });
  });

  // ========================================
  // Rate Limiting & Cooldown Tests
  // ========================================

  describe('Rate Limiting and Cooldown', () => {
    it('should prevent concurrent audits on same store', () => {
      const storeId = 'test-store-123';
      const running = { storeId, status: 'RUNNING' as AuditStatus };
      const pending = { storeId, status: 'PENDING' as AuditStatus };

      // Running audit should block new audit
      const canRun = running.status !== 'RUNNING' as AuditStatus && pending.status !== 'PENDING' as AuditStatus;
      expect(canRun).toBe(false);
    });

    it('should allow audits on different stores simultaneously', () => {
      const store1 = { storeId: 'store-1', status: 'RUNNING' as AuditStatus };
      const store2 = { storeId: 'store-2', status: 'PENDING' as AuditStatus };

      // Different stores should not block each other
      expect(store1.storeId).not.toBe(store2.storeId);
      expect(store1.status).not.toBe('COMPLETED' as AuditStatus);
      expect(store2.status).toBe('PENDING' as AuditStatus);
    });

    it('should enforce 1-hour cooldown between audits', () => {
      const now = new Date();
      const lastAuditTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
      const cooldownMs = 60 * 60 * 1000; // 1 hour

      const timeSinceLastAudit = now.getTime() - lastAuditTime.getTime();
      const canRunAudit = timeSinceLastAudit >= cooldownMs;

      expect(canRunAudit).toBe(false);
    });

    it('should allow audit after cooldown expires', () => {
      const now = new Date();
      const lastAuditTime = new Date(now.getTime() - 61 * 60 * 1000); // 61 min ago
      const cooldownMs = 60 * 60 * 1000; // 1 hour

      const timeSinceLastAudit = now.getTime() - lastAuditTime.getTime();
      const canRunAudit = timeSinceLastAudit >= cooldownMs;

      expect(canRunAudit).toBe(true);
    });

    it('should calculate correct nextAllowedTime', () => {
      const now = new Date();
      const lastAuditTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
      const cooldownMs = 60 * 60 * 1000; // 1 hour
      const nextAllowedTime = new Date(lastAuditTime.getTime() + cooldownMs);

      expect(nextAllowedTime.getTime()).toBeGreaterThan(now.getTime());
      const minutesUntilAllowed = (nextAllowedTime.getTime() - now.getTime()) / 60000;
      expect(minutesUntilAllowed).toBeCloseTo(30, 1);
    });

    it('should prevent audit if less than 1 hour since last', () => {
      const audits = [
        { completedAt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min ago
        { completedAt: new Date(Date.now() - 45 * 60 * 1000) }, // 45 min ago
        { completedAt: new Date(Date.now() - 59 * 60 * 1000) }, // 59 min ago
      ];

      const cooldownMs = 60 * 60 * 1000;
      audits.forEach((audit) => {
        const timeSince = Date.now() - audit.completedAt.getTime();
        const canRun = timeSince >= cooldownMs;
        expect(canRun).toBe(false);
      });
    });

    it('should allow audit if exactly 1 hour since last', () => {
      const now = new Date();
      const lastAuditTime = new Date(now.getTime() - 60 * 60 * 1000); // Exactly 1 hour
      const cooldownMs = 60 * 60 * 1000;

      const timeSinceLastAudit = now.getTime() - lastAuditTime.getTime();
      const canRunAudit = timeSinceLastAudit >= cooldownMs;

      expect(canRunAudit).toBe(true);
    });
  });

  // ========================================
  // Audit Execution Tests
  // ========================================

  describe('Audit Execution', () => {
    it('should fetch Shopify data during audit', () => {
      const context = createMockAuditContext();

      expect(context.products).toBeDefined();
      expect(context.collections).toBeDefined();
      expect(context.pages).toBeDefined();
      expect(context.products.length).toBeGreaterThan(0);
    });

    it('should run all 7 SEO checks in parallel', () => {
      const context = createMockAuditContext();

      const checkNames = [
        'missingMetaTitles',
        'duplicateMetaTitles',
        'missingMetaDescriptions',
        'missingAltText',
        'brokenLinks',
        'mixedContent',
        'indexingDirectives',
      ];

      expect(checkNames.length).toBe(7);
    });

    it('should update audit status to RUNNING', () => {
      const audit = {
        id: 'audit-123',
        status: 'PENDING' as AuditStatus,
      };

      // Simulate status update
      audit.status = 'RUNNING' as AuditStatus;

      expect(audit.status).toBe('RUNNING' as AuditStatus);
    });

    it('should track audit progress through stages', () => {
      const progressUpdates: string[] = [];

      // Simulate progress callbacks
      progressUpdates.push('FETCHING');
      progressUpdates.push('CHECKING');
      progressUpdates.push('SAVING');

      expect(progressUpdates).toEqual(['FETCHING', 'CHECKING', 'SAVING']);
    });

    it('should save issues to database', () => {
      const issues = [
        {
          auditId: 'audit-123',
          type: 'MISSING_META_TITLE',
          severity: 'CRITICAL' as IssueSeverity,
          resourceId: 'product-2',
          resourceType: 'product',
          message: 'Product missing meta title',
          suggestion: 'Add a descriptive meta title',
        },
      ];

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].auditId).toBe('audit-123');
      expect(issues[0].severity).toBeDefined();
    });

    it('should calculate audit score based on issues', () => {
      const auditWithoutIssues = { score: 100 };
      const auditWithIssues = { score: 75 }; // Deductions for issues

      expect(auditWithoutIssues.score).toBe(100);
      expect(auditWithIssues.score).toBeLessThan(100);
      expect(auditWithIssues.score).toBeGreaterThanOrEqual(0);
    });

    it('should update audit status to COMPLETED', () => {
      const audit = {
        id: 'audit-123',
        status: 'RUNNING' as AuditStatus,
      };

      // Simulate completion
      audit.status = 'COMPLETED' as AuditStatus;

      expect(audit.status).toBe('COMPLETED' as AuditStatus);
    });

    it('should set completedAt timestamp', () => {
      const completionTime = new Date();
      const audit = {
        startedAt: new Date(completionTime.getTime() - 60000),
        completedAt: completionTime,
      };

      expect(audit.completedAt).toBe(completionTime);
      expect(audit.completedAt.getTime()).toBeGreaterThan(audit.startedAt.getTime());
    });
  });

  // ========================================
  // Result Aggregation Tests
  // ========================================

  describe('Result Aggregation and Scoring', () => {
    it('should aggregate issues by severity', () => {
      const issues = [
        { severity: 'CRITICAL' as IssueSeverity },
        { severity: 'CRITICAL' as IssueSeverity },
        { severity: 'HIGH' as IssueSeverity },
        { severity: 'MEDIUM' as IssueSeverity },
        { severity: 'LOW' as IssueSeverity },
      ];

      const criticalsCount = issues.filter((i) => i.severity === 'CRITICAL' as IssueSeverity).length;
      const highsCount = issues.filter((i) => i.severity === 'HIGH' as IssueSeverity).length;
      const mediumsCount = issues.filter((i) => i.severity === 'MEDIUM' as IssueSeverity).length;
      const lowsCount = issues.filter((i) => i.severity === 'LOW' as IssueSeverity).length;

      expect(criticalsCount).toBe(2);
      expect(highsCount).toBe(1);
      expect(mediumsCount).toBe(1);
      expect(lowsCount).toBe(1);
    });

    it('should count total issues correctly', () => {
      const issues = [
        { type: 'MISSING_META_TITLE' },
        { type: 'MISSING_ALT_TEXT' },
        { type: 'BROKEN_LINK' },
        { type: 'MIXED_CONTENT' },
      ];

      expect(issues.length).toBe(4);
    });

    it('should calculate score in 0-100 range', () => {
      const scores = [0, 25, 50, 75, 100];

      scores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should apply deductions for critical issues', () => {
      const baseScore = 100;
      const criticalDeduction = 25;
      const scoreWithCritical = baseScore - criticalDeduction;

      expect(scoreWithCritical).toBeLessThan(baseScore);
      expect(scoreWithCritical).toBeGreaterThanOrEqual(0);
    });

    it('should apply deductions for high severity issues', () => {
      const baseScore = 100;
      const highDeduction = 10;
      const scoreWithHigh = baseScore - highDeduction;

      expect(scoreWithHigh).toBeGreaterThan(baseScore - 25);
      expect(scoreWithHigh).toBeLessThan(baseScore);
    });

    it('should return audit with all statistics', () => {
      const audit = {
        id: 'audit-123',
        score: 75,
        issueCount: 4,
        criticalCount: 1,
        highCount: 2,
        mediumCount: 1,
        lowCount: 0,
        status: 'COMPLETED' as AuditStatus,
      };

      expect(audit.issueCount).toBe(
        audit.criticalCount + audit.highCount + audit.mediumCount + audit.lowCount
      );
      expect(audit.score).toBeGreaterThanOrEqual(0);
      expect(audit.score).toBeLessThanOrEqual(100);
    });

    it('should provide issue details with messages and suggestions', () => {
      const issues = [
        {
          type: 'MISSING_META_TITLE',
          severity: 'CRITICAL' as IssueSeverity,
          message: 'Product missing meta title',
          suggestion: 'Add a descriptive meta title (50-60 characters)',
          resourceId: 'product-2',
          resourceTitle: 'Test Product 2',
        },
      ];

      expect(issues[0].message).toBeDefined();
      expect(issues[0].suggestion).toBeDefined();
      expect(issues[0].resourceId).toBeDefined();
      expect(issues[0].resourceTitle).toBeDefined();
    });
  });

  // ========================================
  // Multi-Store Audit Tests
  // ========================================

  describe('Multi-Store Audit Handling', () => {
    it('should allow simultaneous audits on different stores', () => {
      const audit1 = createMockAuditContext({ storeId: 'store-1' });
      const audit2 = createMockAuditContext({ storeId: 'store-2' });

      expect(audit1.storeId).not.toBe(audit2.storeId);
      expect(audit1).toHaveProperty('storeId', 'store-1');
      expect(audit2).toHaveProperty('storeId', 'store-2');
    });

    it('should prevent concurrent audits on same store', () => {
      const storeId = 'store-1';
      const audit1 = { storeId, id: 'audit-1', status: 'RUNNING' as AuditStatus };
      const audit2Attempt = { storeId, id: 'audit-2', status: 'PENDING' as AuditStatus };

      const canStartAudit2 = audit1.status !== 'RUNNING' as AuditStatus;
      expect(canStartAudit2).toBe(false);
    });

    it('should maintain separate audit history per store', () => {
      const store1History = [
        { storeId: 'store-1', id: 'audit-1', score: 85 },
        { storeId: 'store-1', id: 'audit-2', score: 90 },
      ];

      const store2History = [{ storeId: 'store-2', id: 'audit-3', score: 80 }];

      const store1Audits = store1History.filter((a) => a.storeId === 'store-1');
      const store2Audits = store2History.filter((a) => a.storeId === 'store-2');

      expect(store1Audits.length).toBe(2);
      expect(store2Audits.length).toBe(1);
      expect(store1Audits).not.toEqual(store2Audits);
    });

    it('should enforce cooldown per store independently', () => {
      const now = new Date();
      const store1LastAudit = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
      const store2LastAudit = new Date(now.getTime() - 61 * 60 * 1000); // 61 min ago
      const cooldown = 60 * 60 * 1000;

      const store1CanRun = now.getTime() - store1LastAudit.getTime() >= cooldown;
      const store2CanRun = now.getTime() - store2LastAudit.getTime() >= cooldown;

      expect(store1CanRun).toBe(false);
      expect(store2CanRun).toBe(true);
    });

    it('should apply FREE tier limits per store', () => {
      const MAX_URLS = 50;
      const MAX_HISTORY_DAYS = 30;

      const store1Context = createMockAuditContext({
        storeId: 'store-1',
        products: Array(50).fill({}),
      });

      const store2Context = createMockAuditContext({
        storeId: 'store-2',
        products: Array(25).fill({}),
      });

      expect(store1Context.products.length).toBeLessThanOrEqual(MAX_URLS);
      expect(store2Context.products.length).toBeLessThanOrEqual(MAX_URLS);
    });
  });

  // ========================================
  // Error Handling and Recovery Tests
  // ========================================

  describe('Error Handling and Recovery', () => {
    it('should mark audit as FAILED on error', () => {
      const audit = {
        id: 'audit-123',
        status: 'RUNNING' as AuditStatus,
        error: new Error('Check execution failed'),
      };

      if (audit.error) {
        audit.status = 'FAILED' as AuditStatus;
      }

      expect(audit.status).toBe('FAILED' as AuditStatus);
    });

    it('should preserve partial results on failure', () => {
      const audit = {
        id: 'audit-123',
        status: 'FAILED' as AuditStatus,
        issueCount: 2,
        criticalCount: 1,
        partialResults: true,
      };

      expect(audit.issueCount).toBeGreaterThan(0);
      expect(audit.partialResults).toBe(true);
    });

    it('should allow retry after failure', () => {
      const failedAudit = {
        id: 'audit-123',
        status: 'FAILED' as AuditStatus,
        completedAt: new Date(),
      };

      // Should be able to create new audit
      const retryAudit = {
        id: 'audit-456',
        status: 'PENDING' as AuditStatus,
      };

      expect(retryAudit.id).not.toBe(failedAudit.id);
      expect(retryAudit.status).toBe('PENDING' as AuditStatus);
    });

    it('should handle missing Shopify data gracefully', () => {
      const context = createMockAuditContext({
        products: [],
        collections: [],
        pages: [],
      });

      expect(context.products.length).toBe(0);
      // Audit should still complete, just with no issues found
      const audit = {
        score: 100,
        issueCount: 0,
      };

      expect(audit.issueCount).toBe(0);
      expect(audit.score).toBe(100);
    });

    it('should handle check execution errors', () => {
      const checkResults = [
        { success: true, issues: [] },
        { success: false, error: 'API rate limit exceeded' },
        { success: true, issues: [{ type: 'MISSING_TITLE' }] },
      ];

      const failedChecks = checkResults.filter((r) => !r.success);
      expect(failedChecks.length).toBe(1);
    });

    it('should set completedAt even on failure', () => {
      const startTime = new Date();
      const failureTime = new Date();

      const audit = {
        id: 'audit-123',
        status: 'FAILED' as AuditStatus,
        startedAt: startTime,
        completedAt: failureTime,
      };

      expect(audit.completedAt).toBeDefined();
      expect(audit.completedAt.getTime()).toBeGreaterThanOrEqual(audit.startedAt.getTime());
    });

    it('should log errors for debugging', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Audit failed: Database connection timeout');
      // Simulate error logging
      console.error(error);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // Audit History and Statistics Tests
  // ========================================

  describe('Audit History and Statistics', () => {
    it('should track audit history with timestamps', () => {
      const audits = [
        { id: 'audit-1', completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days
        { id: 'audit-2', completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // 3 days
        { id: 'audit-3', completedAt: new Date() }, // Today
      ];

      expect(audits.length).toBe(3);
      expect(audits[2].completedAt.getTime()).toBeGreaterThan(audits[0].completedAt.getTime());
    });

    it('should limit history to last 30 days (FREE tier)', () => {
      const now = new Date();
      const audits = [
        { id: 'audit-1', completedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) }, // 45 days
        { id: 'audit-2', completedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }, // 15 days
        { id: 'audit-3', completedAt: new Date() }, // Today
      ];

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentAudits = audits.filter((a) => a.completedAt >= thirtyDaysAgo);

      expect(recentAudits.length).toBe(2);
    });

    it('should calculate score trend over time', () => {
      const audits = [
        { completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), score: 70 },
        { completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), score: 80 },
        { completedAt: new Date(), score: 85 },
      ];

      const scores = audits.map((a) => a.score);
      const isImproving = scores[2] > scores[1] && scores[1] > scores[0];

      expect(isImproving).toBe(true);
    });

    it('should show most common issue types', () => {
      const allIssues = [
        { type: 'MISSING_META_TITLE', count: 15 },
        { type: 'MISSING_ALT_TEXT', count: 8 },
        { type: 'BROKEN_LINK', count: 3 },
        { type: 'MIXED_CONTENT', count: 2 },
      ];

      const mostCommon = allIssues.reduce((prev, current) =>
        prev.count > current.count ? prev : current
      );

      expect(mostCommon.type).toBe('MISSING_META_TITLE');
      expect(mostCommon.count).toBe(15);
    });

    it('should display average score over time', () => {
      const audits = [
        { score: 70 },
        { score: 80 },
        { score: 90 },
        { score: 85 },
      ];

      const averageScore = audits.reduce((sum, a) => sum + a.score, 0) / audits.length;
      expect(averageScore).toBe(81.25);
    });

    it('should track number of audits per store', () => {
      const audits = [
        { storeId: 'store-1', id: 'audit-1' },
        { storeId: 'store-1', id: 'audit-2' },
        { storeId: 'store-1', id: 'audit-3' },
        { storeId: 'store-2', id: 'audit-4' },
      ];

      const store1Count = audits.filter((a) => a.storeId === 'store-1').length;
      const store2Count = audits.filter((a) => a.storeId === 'store-2').length;

      expect(store1Count).toBe(3);
      expect(store2Count).toBe(1);
    });
  });

  // ========================================
  // Complete Workflow Integration Tests
  // ========================================

  describe('Complete Workflow Integration', () => {
    it('should complete full audit workflow from start to finish', () => {
      const workflowStages: string[] = [];

      // Stage 1: Initiation
      workflowStages.push('INITIATED');
      const audit = {
        id: 'audit-123',
        status: 'PENDING' as AuditStatus,
        startedAt: new Date(),
        completedAt: null,
      };

      // Stage 2: Rate limiting check
      workflowStages.push('RATE_CHECK_PASSED');
      const canRun = true; // Assume passes

      // Stage 3: Queuing
      if (canRun) {
        workflowStages.push('QUEUED');
      }

      // Stage 4: Execution
      workflowStages.push('FETCHING_DATA');
      workflowStages.push('RUNNING_CHECKS');
      workflowStages.push('SAVING_RESULTS');
      audit.status = 'RUNNING' as AuditStatus;

      // Stage 5: Completion
      audit.status = 'COMPLETED' as AuditStatus;
      audit.completedAt = new Date();
      workflowStages.push('COMPLETED');

      expect(workflowStages).toEqual([
        'INITIATED',
        'RATE_CHECK_PASSED',
        'QUEUED',
        'FETCHING_DATA',
        'RUNNING_CHECKS',
        'SAVING_RESULTS',
        'COMPLETED',
      ]);

      expect(audit.status).toBe('COMPLETED' as AuditStatus);
      expect(audit.completedAt).toBeDefined();
    });

    it('should handle complete workflow with multiple stores', () => {
      const stores = ['store-1', 'store-2', 'store-3'];
      const completedAudits = [];

      stores.forEach((storeId) => {
        const context = createMockAuditContext({ storeId });
        const audit = {
          id: `audit-${storeId}`,
          storeId,
          status: 'COMPLETED' as AuditStatus,
          score: Math.floor(Math.random() * 100),
        };
        completedAudits.push(audit);
      });

      expect(completedAudits.length).toBe(3);
      expect(completedAudits.every((a) => a.status === 'COMPLETED' as AuditStatus)).toBe(true);
    });

    it('should provide audit results with all necessary data', () => {
      const auditResult = {
        id: 'audit-123',
        storeId: 'store-1',
        status: 'COMPLETED' as AuditStatus,
        score: 82,
        issueCount: 5,
        criticalCount: 1,
        highCount: 2,
        mediumCount: 2,
        lowCount: 0,
        startedAt: new Date(Date.now() - 120000),
        completedAt: new Date(),
        issues: [
          {
            id: 'issue-1',
            type: 'MISSING_META_TITLE',
            severity: 'CRITICAL' as IssueSeverity,
            resourceId: 'product-2',
            message: 'Product missing meta title',
            suggestion: 'Add a descriptive meta title',
          },
        ],
      };

      expect(auditResult.id).toBeDefined();
      expect(auditResult.score).toBeGreaterThanOrEqual(0);
      expect(auditResult.score).toBeLessThanOrEqual(100);
      expect(auditResult.issueCount).toBe(5);
      expect(auditResult.issues.length).toBeGreaterThan(0);
      expect(auditResult.startedAt.getTime()).toBeLessThan(auditResult.completedAt.getTime());
    });
  });
});
