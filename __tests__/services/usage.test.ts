// __tests__/services/usage.test.ts
/**
 * Unit Tests for Usage Tracking Service (Week 4)
 *
 * Tests the complete usage tracking system including:
 * - Creating/resetting daily usage records
 * - Checking action limits
 * - Incrementing usage counters
 * - Warning thresholds
 * - Batch operations
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { startOfDay } from "date-fns";
import prisma from "~/db.server";
import {
  FREE_TIER_USAGE_LIMITS,
  getOrCreateTodayUsage,
  canPerformAction,
  incrementUsage,
  getUsageStatus,
  isAtWarningThreshold,
  isLimitReached,
  resetUsage,
  resetAllUsage,
  getUsageQuotas,
} from "~/services/usage.server";

// ====================
// TEST DATA
// ====================

const TEST_STORE_ID = "test-store-123";

// ====================
// SETUP & TEARDOWN
// ====================

beforeEach(async () => {
  // Clear existing test data
  await prisma.usageTracking.deleteMany({
    where: { storeId: TEST_STORE_ID },
  });
});

afterEach(async () => {
  // Cleanup
  await prisma.usageTracking.deleteMany({
    where: { storeId: TEST_STORE_ID },
  });
});

// ====================
// TESTS: INITIALIZATION
// ====================

describe("getOrCreateTodayUsage", () => {
  it("creates new usage record for today if none exists", async () => {
    const usage = await getOrCreateTodayUsage(TEST_STORE_ID);

    expect(usage).toBeDefined();
    expect(usage.storeId).toBe(TEST_STORE_ID);
    expect(usage.auditRunsToday).toBe(0);
    expect(usage.bulkEditsToday).toBe(0);
  });

  it("returns existing record if it's still today", async () => {
    const first = await getOrCreateTodayUsage(TEST_STORE_ID);

    // Increment usage
    await incrementUsage(TEST_STORE_ID, "auditRuns", 1);

    // Get again - should return existing record with incremented value
    const second = await getOrCreateTodayUsage(TEST_STORE_ID);

    expect(first.id).toBe(second.id);
    expect(second.auditRunsToday).toBe(1);
  });

  it("resets counters when accessing from a new day", async () => {
    // Create record for today
    let usage = await getOrCreateTodayUsage(TEST_STORE_ID);

    // Increment usage
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);
    usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.auditRunsToday).toBe(5);

    // Manually set date to yesterday to simulate new day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.usageTracking.update({
      where: { storeId: TEST_STORE_ID },
      data: { date: yesterday },
    });

    // Get again - should reset counters
    usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.auditRunsToday).toBe(0);
    expect(usage.date).toEqual(startOfDay(new Date()));
  });
});

// ====================
// TESTS: ACTION VALIDATION
// ====================

describe("canPerformAction", () => {
  it("allows action when under limit", async () => {
    const result = await canPerformAction(TEST_STORE_ID, "auditRuns", 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(FREE_TIER_USAGE_LIMITS.auditRuns);
  });

  it("denies action when at limit", async () => {
    // Use up all audits
    const limit = FREE_TIER_USAGE_LIMITS.auditRuns;
    for (let i = 0; i < limit; i++) {
      await incrementUsage(TEST_STORE_ID, "auditRuns", 1);
    }

    const result = await canPerformAction(TEST_STORE_ID, "auditRuns", 1);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("denies action when exceeding limit", async () => {
    const result = await canPerformAction(
      TEST_STORE_ID,
      "bulkEdits",
      FREE_TIER_USAGE_LIMITS.bulkEdits + 1
    );

    expect(result.allowed).toBe(false);
  });

  it("allows partial action when at near limit", async () => {
    // Use up most of the limit
    await incrementUsage(TEST_STORE_ID, "metaUpdates", 45);

    // Try to use 10 more (would exceed 50 limit)
    const result = await canPerformAction(TEST_STORE_ID, "metaUpdates", 10);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(5);
  });

  it("tracks different actions independently", async () => {
    // Use some audits
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);

    const auditResult = await canPerformAction(
      TEST_STORE_ID,
      "auditRuns",
      1
    );
    const editResult = await canPerformAction(
      TEST_STORE_ID,
      "bulkEdits",
      1
    );

    expect(auditResult.remaining).toBe(
      FREE_TIER_USAGE_LIMITS.auditRuns - 5
    );
    expect(editResult.remaining).toBe(
      FREE_TIER_USAGE_LIMITS.bulkEdits
    ); // Unaffected
  });
});

// ====================
// TESTS: USAGE INCREMENT
// ====================

describe("incrementUsage", () => {
  it("increments usage counter", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 1);

    const usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.auditRunsToday).toBe(1);
  });

  it("increments by multiple amount", async () => {
    await incrementUsage(TEST_STORE_ID, "metaUpdates", 15);

    const usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.metaUpdatesToday).toBe(15);
  });

  it("accumulates multiple increments", async () => {
    await incrementUsage(TEST_STORE_ID, "bulkEdits", 3);
    await incrementUsage(TEST_STORE_ID, "bulkEdits", 2);

    const usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.bulkEditsToday).toBe(5);
  });
});

// ====================
// TESTS: USAGE STATUS
// ====================

describe("getUsageStatus", () => {
  it("returns complete usage status", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 3);
    await incrementUsage(TEST_STORE_ID, "bulkEdits", 5);

    const status = await getUsageStatus(TEST_STORE_ID);

    expect(status.auditRuns.used).toBe(3);
    expect(status.auditRuns.limit).toBe(FREE_TIER_USAGE_LIMITS.auditRuns);
    expect(status.auditRuns.remaining).toBe(
      FREE_TIER_USAGE_LIMITS.auditRuns - 3
    );
    expect(status.auditRuns.percentage).toBe(30);

    expect(status.bulkEdits.used).toBe(5);
    expect(status.bulkEdits.remaining).toBe(
      FREE_TIER_USAGE_LIMITS.bulkEdits - 5
    );
    expect(status.bulkEdits.percentage).toBe(50);
  });

  it("calculates percentage correctly", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 8);

    const status = await getUsageStatus(TEST_STORE_ID);
    expect(status.auditRuns.percentage).toBe(80);
  });

  it("handles zero usage", async () => {
    const status = await getUsageStatus(TEST_STORE_ID);

    expect(status.auditRuns.used).toBe(0);
    expect(status.auditRuns.remaining).toBe(
      FREE_TIER_USAGE_LIMITS.auditRuns
    );
    expect(status.auditRuns.percentage).toBe(0);
  });
});

// ====================
// TESTS: WARNING THRESHOLDS
// ====================

describe("isAtWarningThreshold", () => {
  it("returns false when under 80%", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 7); // 70%

    const isWarning = await isAtWarningThreshold(TEST_STORE_ID, "auditRuns");
    expect(isWarning).toBe(false);
  });

  it("returns true when at 80%", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 8); // 80%

    const isWarning = await isAtWarningThreshold(TEST_STORE_ID, "auditRuns");
    expect(isWarning).toBe(true);
  });

  it("returns true when over 80%", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 9); // 90%

    const isWarning = await isAtWarningThreshold(TEST_STORE_ID, "auditRuns");
    expect(isWarning).toBe(true);
  });

  it("returns true when at limit", async () => {
    await incrementUsage(
      TEST_STORE_ID,
      "auditRuns",
      FREE_TIER_USAGE_LIMITS.auditRuns
    ); // 100%

    const isWarning = await isAtWarningThreshold(TEST_STORE_ID, "auditRuns");
    expect(isWarning).toBe(true);
  });
});

describe("isLimitReached", () => {
  it("returns false when under limit", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);

    const reached = await isLimitReached(TEST_STORE_ID, "auditRuns");
    expect(reached).toBe(false);
  });

  it("returns true when at limit", async () => {
    await incrementUsage(
      TEST_STORE_ID,
      "auditRuns",
      FREE_TIER_USAGE_LIMITS.auditRuns
    );

    const reached = await isLimitReached(TEST_STORE_ID, "auditRuns");
    expect(reached).toBe(true);
  });
});

// ====================
// TESTS: RESET OPERATIONS
// ====================

describe("resetUsage", () => {
  it("resets all counters to zero", async () => {
    // Use up some usage
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);
    await incrementUsage(TEST_STORE_ID, "bulkEdits", 3);

    // Reset
    await resetUsage(TEST_STORE_ID);

    const usage = await getOrCreateTodayUsage(TEST_STORE_ID);
    expect(usage.auditRunsToday).toBe(0);
    expect(usage.bulkEditsToday).toBe(0);
    expect(usage.metaUpdatesToday).toBe(0);
  });
});

describe("resetAllUsage", () => {
  it("resets old records but not today's", async () => {
    // Create record for today
    await getOrCreateTodayUsage(TEST_STORE_ID);
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);

    // Manually set to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.usageTracking.update({
      where: { storeId: TEST_STORE_ID },
      data: { date: yesterday },
    });

    // Call batch reset
    const count = await resetAllUsage();

    expect(count).toBeGreaterThan(0);

    // Verify reset
    const usage = await prisma.usageTracking.findUnique({
      where: { storeId: TEST_STORE_ID },
    });

    expect(usage?.auditRunsToday).toBe(0);
    expect(usage?.date).toEqual(startOfDay(new Date()));
  });
});

// ====================
// TESTS: GET QUOTAS
// ====================

describe("getUsageQuotas", () => {
  it("returns quotas when record exists", async () => {
    await incrementUsage(TEST_STORE_ID, "auditRuns", 3);
    await incrementUsage(TEST_STORE_ID, "metaUpdates", 10);

    const quotas = await getUsageQuotas(TEST_STORE_ID);

    expect(quotas?.auditRuns).toBe(3);
    expect(quotas?.metaUpdates).toBe(10);
  });

  it("returns zeros for new day", async () => {
    // Create and use
    await incrementUsage(TEST_STORE_ID, "auditRuns", 5);

    // Move to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.usageTracking.update({
      where: { storeId: TEST_STORE_ID },
      data: { date: yesterday },
    });

    // Get quotas (should detect it's a new day)
    const quotas = await getUsageQuotas(TEST_STORE_ID);

    expect(quotas?.auditRuns).toBe(0); // Reset
  });

  it("returns null if no record exists", async () => {
    const quotas = await getUsageQuotas("nonexistent-store");

    expect(quotas).toBeNull();
  });
});

// ====================
// INTEGRATION TESTS
// ====================

describe("Usage Tracking - Integration Scenarios", () => {
  it("handles complete workflow: check → increment → check again", async () => {
    // Step 1: Check if can run audit
    const canRun1 = await canPerformAction(TEST_STORE_ID, "auditRuns", 1);
    expect(canRun1.allowed).toBe(true);
    expect(canRun1.remaining).toBe(10);

    // Step 2: Increment usage
    await incrementUsage(TEST_STORE_ID, "auditRuns", 1);

    // Step 3: Check again
    const canRun2 = await canPerformAction(TEST_STORE_ID, "auditRuns", 1);
    expect(canRun2.remaining).toBe(9);

    // Step 4: Check status
    const status = await getUsageStatus(TEST_STORE_ID);
    expect(status.auditRuns.used).toBe(1);
    expect(status.auditRuns.percentage).toBe(10);
  });

  it("prevents operations at limit", async () => {
    const limit = FREE_TIER_USAGE_LIMITS.bulkEdits;

    // Fill up to limit
    for (let i = 0; i < limit; i++) {
      const can = await canPerformAction(TEST_STORE_ID, "bulkEdits", 1);
      expect(can.allowed).toBe(true);
      await incrementUsage(TEST_STORE_ID, "bulkEdits", 1);
    }

    // One more should fail
    const canNot = await canPerformAction(TEST_STORE_ID, "bulkEdits", 1);
    expect(canNot.allowed).toBe(false);
    expect(canNot.remaining).toBe(0);
  });

  it("tracks multiple features independently", async () => {
    // Use each feature differently
    await incrementUsage(TEST_STORE_ID, "auditRuns", 1);
    await incrementUsage(TEST_STORE_ID, "bulkEdits", 5);
    await incrementUsage(TEST_STORE_ID, "metaUpdates", 20);

    const status = await getUsageStatus(TEST_STORE_ID);

    expect(status.auditRuns.used).toBe(1);
    expect(status.bulkEdits.used).toBe(5);
    expect(status.metaUpdates.used).toBe(20);

    // Each should have independent remaining
    expect(status.auditRuns.remaining).toBe(9);
    expect(status.bulkEdits.remaining).toBe(5);
    expect(status.metaUpdates.remaining).toBe(30);
  });
});
