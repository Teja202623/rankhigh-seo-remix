// app/services/cache.server.ts
// In-Memory Caching Service (Task 69)

/**
 * Simple in-memory cache for RankHigh SEO App
 *
 * FREE Tier: Uses in-memory storage (no Redis needed)
 * - Automatic TTL expiration
 * - LRU eviction when memory limit reached
 * - Namespace support for different data types
 *
 * Use cases:
 * - Cache Shopify API responses (products, collections, pages)
 * - Cache GSC API responses
 * - Cache audit results
 * - Cache health score calculations
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp
  lastAccessed: number; // For LRU eviction
}

interface CacheStore {
  [key: string]: CacheEntry<any>;
}

class MemoryCache {
  private store: CacheStore = {};
  private maxEntries: number = 1000; // Max 1000 entries for FREE tier
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store[key];

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      delete this.store[key];
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;

    // Check if need to evict entries
    if (Object.keys(this.store).length >= this.maxEntries) {
      this.evictLRU();
    }

    this.store[key] = {
      value,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
    };
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    delete this.store[key];
  }

  /**
   * Clear all cache entries (or entries matching a pattern)
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.store = {};
      return;
    }

    // Clear entries matching pattern (e.g., "shopify:*")
    const regex = new RegExp(pattern.replace("*", ".*"));
    Object.keys(this.store).forEach((key) => {
      if (regex.test(key)) {
        delete this.store[key];
      }
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime: number = Infinity;

    Object.entries(this.store).forEach(([key, entry]) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      delete this.store[oldestKey];
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Object.values(this.store);
    const now = Date.now();

    return {
      totalEntries: entries.length,
      maxEntries: this.maxEntries,
      expiredEntries: entries.filter((e) => e.expiresAt < now).length,
      utilizationPercent: Math.round((entries.length / this.maxEntries) * 100),
    };
  }

  /**
   * Cleanup expired entries (run periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    Object.entries(this.store).forEach(([key, entry]) => {
      if (entry.expiresAt < now) {
        delete this.store[key];
        removed++;
      }
    });

    return removed;
  }
}

// Singleton instance
const cache = new MemoryCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`[Cache] Cleaned up ${removed} expired entries`);
  }
}, 5 * 60 * 1000);

// Export cache instance and helper functions
export { cache };

/**
 * Helper to build cache keys with namespaces
 */
export function buildCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(":")}`;
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  // Shopify data - changes infrequently
  SHOPIFY_PRODUCTS: 15 * 60 * 1000, // 15 minutes
  SHOPIFY_COLLECTIONS: 15 * 60 * 1000, // 15 minutes
  SHOPIFY_PAGES: 30 * 60 * 1000, // 30 minutes
  SHOPIFY_BLOG_POSTS: 30 * 60 * 1000, // 30 minutes

  // GSC data - updated daily
  GSC_METRICS: 60 * 60 * 1000, // 1 hour
  GSC_QUERIES: 60 * 60 * 1000, // 1 hour
  GSC_PAGES: 60 * 60 * 1000, // 1 hour

  // Audit results - static once completed
  AUDIT_RESULTS: 24 * 60 * 60 * 1000, // 24 hours

  // Health score - recalculate frequently
  HEALTH_SCORE: 5 * 60 * 1000, // 5 minutes

  // Quick wins - recalculate frequently
  QUICK_WINS: 5 * 60 * 1000, // 5 minutes

  // Activity log - update frequently
  ACTIVITY_LOG: 2 * 60 * 1000, // 2 minutes
} as const;

/**
 * Cache namespaces for organization
 */
export const CACHE_NAMESPACE = {
  SHOPIFY: "shopify",
  GSC: "gsc",
  AUDIT: "audit",
  DASHBOARD: "dashboard",
  META: "meta",
  ALT: "alt",
} as const;
