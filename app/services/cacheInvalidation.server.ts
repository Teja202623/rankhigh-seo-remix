// app/services/cacheInvalidation.server.ts
// Cache Invalidation Strategy (Task 71)

/**
 * Cache Invalidation Service
 *
 * Handles cache invalidation when data changes to ensure freshness
 *
 * Strategies:
 * 1. Manual invalidation: Clear cache when data is updated
 * 2. Pattern-based invalidation: Clear all caches matching a pattern
 * 3. Time-based invalidation: Automatic TTL expiration (handled by cache service)
 * 4. Event-based invalidation: Clear cache on specific events
 */

import { cache, buildCacheKey, CACHE_NAMESPACE } from "~/services/cache.server";

/**
 * Invalidate all Shopify data caches for a store
 * Call this when products, collections, or pages are updated via webhooks
 */
export function invalidateShopifyCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared Shopify cache for store ${storeId}`);
}

/**
 * Invalidate product cache for a store
 * Call this when products are created, updated, or deleted
 */
export function invalidateProductCache(storeId: string): void {
  const key = buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "products");
  cache.delete(key);
  console.log(`[CacheInvalidation] Cleared product cache for store ${storeId}`);
}

/**
 * Invalidate collection cache for a store
 * Call this when collections are created, updated, or deleted
 */
export function invalidateCollectionCache(storeId: string): void {
  const key = buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "collections");
  cache.delete(key);
  console.log(`[CacheInvalidation] Cleared collection cache for store ${storeId}`);
}

/**
 * Invalidate page cache for a store
 * Call this when pages are created, updated, or deleted
 */
export function invalidatePageCache(storeId: string): void {
  const key = buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "pages");
  cache.delete(key);
  console.log(`[CacheInvalidation] Cleared page cache for store ${storeId}`);
}

/**
 * Invalidate dashboard caches (health score, quick wins, activity log)
 * Call this after audits complete or when dashboard data changes
 */
export function invalidateDashboardCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.DASHBOARD, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared dashboard cache for store ${storeId}`);
}

/**
 * Invalidate health score cache
 * Call this after audit completion
 */
export function invalidateHealthScoreCache(storeId: string): void {
  const key = buildCacheKey(CACHE_NAMESPACE.DASHBOARD, storeId, "health-score");
  cache.delete(key);
  console.log(`[CacheInvalidation] Cleared health score cache for store ${storeId}`);
}

/**
 * Invalidate quick wins cache
 * Call this after audit completion or data changes
 */
export function invalidateQuickWinsCache(storeId: string): void {
  const key = buildCacheKey(CACHE_NAMESPACE.DASHBOARD, storeId, "quick-wins");
  cache.delete(key);
  console.log(`[CacheInvalidation] Cleared quick wins cache for store ${storeId}`);
}

/**
 * Invalidate GSC data caches
 * Call this after syncing new GSC data
 */
export function invalidateGSCCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.GSC, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared GSC cache for store ${storeId}`);
}

/**
 * Invalidate audit cache
 * Call this when new audit is completed
 */
export function invalidateAuditCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.AUDIT, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared audit cache for store ${storeId}`);
}

/**
 * Invalidate meta data cache
 * Call this when meta titles/descriptions are updated
 */
export function invalidateMetaCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.META, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared meta cache for store ${storeId}`);
}

/**
 * Invalidate ALT text cache
 * Call this when image ALT texts are updated
 */
export function invalidateAltCache(storeId: string): void {
  const pattern = buildCacheKey(CACHE_NAMESPACE.ALT, storeId, "*");
  cache.clear(pattern);
  console.log(`[CacheInvalidation] Cleared ALT cache for store ${storeId}`);
}

/**
 * Invalidate all caches for a store
 * Nuclear option - use sparingly (e.g., when store is uninstalled)
 */
export function invalidateAllStoreCache(storeId: string): void {
  cache.clear(`*:${storeId}:*`);
  console.log(`[CacheInvalidation] Cleared ALL caches for store ${storeId}`);
}

/**
 * Event-based cache invalidation
 * Call this from various parts of the app when data changes
 */
export function onDataChange(
  storeId: string,
  event:
    | "PRODUCT_CREATED"
    | "PRODUCT_UPDATED"
    | "PRODUCT_DELETED"
    | "COLLECTION_CREATED"
    | "COLLECTION_UPDATED"
    | "COLLECTION_DELETED"
    | "PAGE_CREATED"
    | "PAGE_UPDATED"
    | "PAGE_DELETED"
    | "AUDIT_COMPLETED"
    | "META_UPDATED"
    | "ALT_UPDATED"
    | "GSC_SYNCED"
): void {
  switch (event) {
    case "PRODUCT_CREATED":
    case "PRODUCT_UPDATED":
    case "PRODUCT_DELETED":
      invalidateProductCache(storeId);
      invalidateDashboardCache(storeId); // Products affect quick wins
      break;

    case "COLLECTION_CREATED":
    case "COLLECTION_UPDATED":
    case "COLLECTION_DELETED":
      invalidateCollectionCache(storeId);
      invalidateDashboardCache(storeId);
      break;

    case "PAGE_CREATED":
    case "PAGE_UPDATED":
    case "PAGE_DELETED":
      invalidatePageCache(storeId);
      invalidateDashboardCache(storeId);
      break;

    case "AUDIT_COMPLETED":
      invalidateAuditCache(storeId);
      invalidateDashboardCache(storeId); // Audit affects health score and quick wins
      break;

    case "META_UPDATED":
      invalidateMetaCache(storeId);
      invalidateHealthScoreCache(storeId); // Meta updates affect health score
      break;

    case "ALT_UPDATED":
      invalidateAltCache(storeId);
      invalidateHealthScoreCache(storeId); // ALT updates affect health score
      break;

    case "GSC_SYNCED":
      invalidateGSCCache(storeId);
      invalidateHealthScoreCache(storeId); // GSC connection affects health score
      break;
  }
}
