/**
 * Unit Tests for Rate Limiting Service
 *
 * Tests for rate limiting functionality:
 * - Basic rate limit checking
 * - Window-based limiting
 * - Limit exceeded detection
 * - Reset behavior
 * - Multiple keys and concurrent access
 */

import { checkRateLimit } from '~/services/rateLimit.server';
import type { RateLimitConfig } from '~/services/rateLimit.server';

// Helper to create rate limit config
const createConfig = (limit: number, windowMs: number = 3600000): RateLimitConfig => ({
  limit,
  windowMs,
});

describe('Rate Limiting Service', () => {
  beforeEach(() => {
    // Clear any rate limit state if possible
    jest.clearAllMocks();
  });

  // ========================================
  // Basic Rate Limit Tests
  // ========================================

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const config = createConfig(10); // 10 requests allowed
      const key = 'test-key-1';

      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(10 - (i + 1));
      }
    });

    it('should deny requests exceeding limit', () => {
      const config = createConfig(5); // 5 requests allowed
      const key = 'test-key-2';

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, config);
      }

      // Next request should be denied
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
    });

    it('should return limit information', () => {
      const config = createConfig(100);
      const key = 'test-key-3';

      const result = checkRateLimit(key, config);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
      expect(result.limit).toBe(100);
    });

    it('should track remaining requests', () => {
      const config = createConfig(10);
      const key = 'test-key-4';

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, config);
        expect(result.remaining).toBe(10 - (i + 1));
      }
    });

    it('should return reset time', () => {
      const config = createConfig(10);
      const key = 'test-key-5';

      const result = checkRateLimit(key, config);

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ========================================
  // Window-Based Limiting Tests
  // ========================================

  describe('Time Window Behavior', () => {
    it('should respect configured time window', () => {
      const shortWindow = 100; // 100ms
      const config = createConfig(2, shortWindow);
      const key = 'window-test-1';

      // Make 2 requests (limit)
      checkRateLimit(key, config);
      const result = checkRateLimit(key, config);
      expect(result.remaining).toBe(0);

      // Third should be denied
      const denied = checkRateLimit(key, config);
      expect(denied.allowed).toBe(false);
    });

    it('should handle different window sizes', () => {
      const config1 = createConfig(5, 3600000); // 1 hour
      const config2 = createConfig(5, 60000);   // 1 minute
      const config3 = createConfig(5, 1000);    // 1 second

      const key1 = 'window-size-1';
      const key2 = 'window-size-2';
      const key3 = 'window-size-3';

      const result1 = checkRateLimit(key1, config1);
      const result2 = checkRateLimit(key2, config2);
      const result3 = checkRateLimit(key3, config3);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);

      // Reset times should be different
      expect(result1.resetAt.getTime()).not.toBe(result2.resetAt.getTime());
      expect(result2.resetAt.getTime()).not.toBe(result3.resetAt.getTime());
    });

    it('should reset after window expires', (done) => {
      const shortWindow = 50; // 50ms
      const config = createConfig(1, shortWindow);
      const key = 'window-expire-test';

      // First request succeeds
      const first = checkRateLimit(key, config);
      expect(first.allowed).toBe(true);

      // Second request denied
      const second = checkRateLimit(key, config);
      expect(second.allowed).toBe(false);

      // After window expires, should allow again
      setTimeout(() => {
        const third = checkRateLimit(key, config);
        expect(third.allowed).toBe(true);
        done();
      }, 100);
    });
  });

  // ========================================
  // Multiple Keys Tests
  // ========================================

  describe('Multiple Keys', () => {
    it('should track separate limits for different keys', () => {
      const config = createConfig(5);
      const key1 = 'user-1:audit';
      const key2 = 'user-2:audit';

      // Exhaust limit for key1
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key1, config);
      }

      // key1 should be limited
      expect(checkRateLimit(key1, config).allowed).toBe(false);

      // key2 should still have capacity
      expect(checkRateLimit(key2, config).allowed).toBe(true);
    });

    it('should handle store-specific rate limits', () => {
      const config = createConfig(10);
      const store1Key = 'store:123:global';
      const store2Key = 'store:456:global';

      for (let i = 0; i < 10; i++) {
        checkRateLimit(store1Key, config);
      }

      // Store 1 exhausted
      expect(checkRateLimit(store1Key, config).allowed).toBe(false);

      // Store 2 still has quota
      expect(checkRateLimit(store2Key, config).allowed).toBe(true);
      expect(checkRateLimit(store2Key, config).allowed).toBe(true);
    });

    it('should handle operation-specific rate limits', () => {
      const auditConfig = createConfig(10); // 10 audits per window
      const updateConfig = createConfig(50); // 50 updates per window

      const auditKey = 'store:123:audit';
      const updateKey = 'store:123:update';

      // Use audit limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(auditKey, auditConfig);
      }

      // Use update limit
      for (let i = 0; i < 50; i++) {
        checkRateLimit(updateKey, updateConfig);
      }

      // Both should be exceeded
      expect(checkRateLimit(auditKey, auditConfig).allowed).toBe(false);
      expect(checkRateLimit(updateKey, updateConfig).allowed).toBe(false);
    });
  });

  // ========================================
  // FREE Tier Limits Tests
  // ========================================

  describe('FREE Tier Rate Limits', () => {
    it('should enforce 100 requests per hour per store', () => {
      const config = createConfig(100, 3600000); // 100 per hour
      const key = 'store:global:hour:1';

      // Use up 100 requests
      let allowedCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(key, config);
        if (result.allowed) allowedCount++;
      }

      expect(allowedCount).toBe(100);

      // 101st request should fail
      const exceeded = checkRateLimit(key, config);
      expect(exceeded.allowed).toBe(false);
    });

    it('should enforce 10 audit runs per day', () => {
      const config = createConfig(10, 86400000); // 10 per day (24 hours)
      const key = 'store:audit:2';

      // Use up 10 audits
      let allowedCount = 0;
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(key, config);
        if (result.allowed) allowedCount++;
      }

      expect(allowedCount).toBe(10);

      // 11th audit should fail
      const exceeded = checkRateLimit(key, config);
      expect(exceeded.allowed).toBe(false);
    });

    it('should enforce 50 meta updates per day', () => {
      const config = createConfig(50, 86400000); // 50 per day
      const key = 'store:meta:update:2';

      // Use up 50 updates
      let allowedCount = 0;
      for (let i = 0; i < 50; i++) {
        const result = checkRateLimit(key, config);
        if (result.allowed) allowedCount++;
      }

      expect(allowedCount).toBe(50);

      // 51st update should fail
      const exceeded = checkRateLimit(key, config);
      expect(exceeded.allowed).toBe(false);
    });

    it('should enforce 100 GSC API calls per day', () => {
      const config = createConfig(100, 86400000); // 100 per day
      const key = 'store:123:gsc-api';

      // Use up 100 calls
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }

      // 101st call should fail
      const exceeded = checkRateLimit(key, config);
      expect(exceeded.allowed).toBe(false);
    });
  });

  // ========================================
  // Concurrent Access Tests
  // ========================================

  describe('Concurrent Access', () => {
    it('should handle concurrent requests safely', () => {
      const config = createConfig(100);
      const key = 'concurrent-test';

      const promises = Array.from({ length: 50 }, () =>
        Promise.resolve(checkRateLimit(key, config))
      );

      return Promise.all(promises).then((results) => {
        const allowedCount = results.filter((r) => r.allowed).length;
        expect(allowedCount).toBeLessThanOrEqual(100);
      });
    });

    it('should accurately count concurrent increments', () => {
      const config = createConfig(100);
      const key = 'concurrent-count';

      let allowedCount = 0;
      const promises = Array.from({ length: 150 }, () => {
        const result = checkRateLimit(key, config);
        if (result.allowed) allowedCount++;
        return Promise.resolve(result);
      });

      return Promise.all(promises).then(() => {
        expect(allowedCount).toBe(100); // Exactly 100 allowed
      });
    });
  });

  // ========================================
  // Edge Cases Tests
  // ========================================

  describe('Edge Cases', () => {
    it('should handle zero limit', () => {
      const config = createConfig(0); // No requests allowed
      const key = 'zero-limit';

      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
    });

    it('should handle large limits', () => {
      const config = createConfig(1000000); // 1 million
      const key = 'large-limit';

      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1000000);
    });

    it('should handle very short time windows', () => {
      const config = createConfig(5, 10); // 10ms window
      const key = 'short-window';

      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, config);
      }

      expect(checkRateLimit(key, config).allowed).toBe(false);
    });

    it('should handle very long time windows', () => {
      const config = createConfig(100, 315360000000); // ~10 years
      const key = 'long-window';

      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now() + 100000);
    });

    it('should handle special characters in keys', () => {
      const config = createConfig(10);
      const specialKeys = [
        'store:123:audit:v1',
        'user@example.com:global',
        'tenant-abc-123:meta',
        'api-key-xyz-789:gsc',
      ];

      specialKeys.forEach((key) => {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      });
    });
  });

  // ========================================
  // Real-World Scenario Tests
  // ========================================

  describe('Real-World Scenarios', () => {
    it('should handle multiple store operations simultaneously', () => {
      const config = createConfig(100, 3600000);

      const stores = Array.from({ length: 10 }, (_, i) => `store:${i}:global`);
      const results = stores.map((key) => {
        const res = [];
        for (let i = 0; i < 100; i++) {
          res.push(checkRateLimit(key, config).allowed);
        }
        return res;
      });

      // Each store should have 100 allowed requests
      results.forEach((res) => {
        expect(res.filter((r) => r).length).toBe(100);
      });
    });

    it('should handle mixed operation types for one store', () => {
      const globalConfig = createConfig(100, 3600000);
      const auditConfig = createConfig(10, 86400000);
      const updateConfig = createConfig(50, 86400000);

      const storeId = 'store:999';

      // Make requests of different types
      for (let i = 0; i < 100; i++) {
        checkRateLimit(`${storeId}:global`, globalConfig);
      }
      for (let i = 0; i < 10; i++) {
        checkRateLimit(`${storeId}:audit`, auditConfig);
      }
      for (let i = 0; i < 50; i++) {
        checkRateLimit(`${storeId}:update`, updateConfig);
      }

      // All should be exhausted
      expect(checkRateLimit(`${storeId}:global`, globalConfig).allowed).toBe(false);
      expect(checkRateLimit(`${storeId}:audit`, auditConfig).allowed).toBe(false);
      expect(checkRateLimit(`${storeId}:update`, updateConfig).allowed).toBe(false);
    });

    it('should handle burst traffic pattern', () => {
      const config = createConfig(100, 3600000);
      const key = 'burst-test';

      // Simulate burst: 100 requests in quick succession
      const results = Array.from({ length: 150 }, () => checkRateLimit(key, config));

      const allowed = results.filter((r) => r.allowed).length;
      const denied = results.filter((r) => !r.allowed).length;

      expect(allowed).toBe(100);
      expect(denied).toBe(50);
    });
  });

  // ========================================
  // Data Type and Format Tests
  // ========================================

  describe('Return Value Format', () => {
    it('should return correct data types', () => {
      const config = createConfig(10);
      const result = checkRateLimit('format-test', config);

      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(result.resetAt instanceof Date).toBe(true);
    });

    it('should return valid remaining count', () => {
      const config = createConfig(10);
      const key = 'remaining-test';

      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(key, config);
        expect(result.remaining).toBe(10 - (i + 1));
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return consistent reset time within window', () => {
      const config = createConfig(10);
      const key = 'reset-time-test';

      const result1 = checkRateLimit(key, config);
      const result2 = checkRateLimit(key, config);

      // Reset times should be the same within the window
      expect(result1.resetAt.getTime()).toBe(result2.resetAt.getTime());
    });
  });
});
