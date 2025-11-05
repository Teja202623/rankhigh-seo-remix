// app/services/store.server.ts
import prisma from "~/db.server";
import type { Store } from "@prisma/client";

/**
 * Store Service
 *
 * Handles all database operations for the Store model following Shopify Remix best practices.
 * This service provides CRUD operations and business logic for managing Shopify stores
 * in the RankHigh SEO application.
 *
 * Key Features:
 * - Type-safe operations with TypeScript
 * - Comprehensive error handling
 * - Soft delete support (isActive flag)
 * - Plan management for subscription tiers
 * - Optimized queries with proper indexing
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Available subscription plans
 * FREE: Basic features with limitations
 * BASIC: Core SEO features
 * PRO: Advanced features and higher limits
 * ENTERPRISE: Full features with custom limits
 */
export type StorePlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

/**
 * Data structure for updating store information
 */
export interface UpdateStoreData {
  accessToken?: string;
  plan?: StorePlan;
  isActive?: boolean;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  gtmId?: string;
  ga4Id?: string;
}

/**
 * Custom error types for better error handling
 */
export class StoreError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "DUPLICATE" | "VALIDATION" | "DATABASE",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "StoreError";
  }
}

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new store record
 *
 * This is typically called during the OAuth installation flow when a merchant
 * installs your Shopify app. The access token should be encrypted in production.
 *
 * @param shopUrl - The myshopify.com domain (e.g., "example.myshopify.com")
 * @param accessToken - The OAuth access token from Shopify
 * @returns The newly created store record
 * @throws {StoreError} If a store with this shopUrl already exists
 *
 * @example
 * ```ts
 * const store = await createStore("example.myshopify.com", "shpat_abc123");
 * ```
 */
export async function createStore(
  shopUrl: string,
  accessToken: string
): Promise<Store> {
  try {
    // Validate inputs
    if (!shopUrl || !accessToken) {
      throw new StoreError(
        "shopUrl and accessToken are required",
        "VALIDATION",
        400
      );
    }

    // Normalize shop URL to lowercase for consistency
    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    // Check if store already exists
    const existingStore = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    if (existingStore) {
      throw new StoreError(
        `Store with shopUrl "${normalizedShopUrl}" already exists`,
        "DUPLICATE",
        409
      );
    }

    // Create the store with FREE plan as default
    const store = await prisma.store.create({
      data: {
        shopUrl: normalizedShopUrl,
        accessToken,
        plan: "FREE",
        isActive: true,
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    // Handle Prisma unique constraint violation
    if ((error as any).code === "P2002") {
      throw new StoreError(
        `Store with shopUrl "${shopUrl}" already exists`,
        "DUPLICATE",
        409
      );
    }

    throw new StoreError(
      `Failed to create store: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Get a store by its shop URL
 *
 * This is the primary method for retrieving store data in most Shopify app flows.
 * The shop URL is typically extracted from the session or request headers.
 *
 * @param shopUrl - The myshopify.com domain
 * @returns The store record or null if not found
 *
 * @example
 * ```ts
 * const store = await getStore(session.shop);
 * if (!store) {
 *   throw new Response("Store not found", { status: 404 });
 * }
 * ```
 */
export async function getStore(shopUrl: string): Promise<Store | null> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    const store = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to get store: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Get a store by its database ID
 *
 * Useful when you have the store ID from a related model (e.g., Audit, Page)
 * and need to fetch the full store details.
 *
 * @param id - The store's UUID
 * @returns The store record or null if not found
 *
 * @example
 * ```ts
 * const store = await getStoreById(audit.storeId);
 * ```
 */
export async function getStoreById(id: string): Promise<Store | null> {
  try {
    if (!id) {
      throw new StoreError("id is required", "VALIDATION", 400);
    }

    const store = await prisma.store.findUnique({
      where: { id },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to get store by ID: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Update store data
 *
 * Use this for updating the access token (on token refresh) or other store properties.
 * For plan updates, prefer using updateStorePlan() for better type safety.
 *
 * @param shopUrl - The myshopify.com domain
 * @param data - Object containing fields to update
 * @returns The updated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * const store = await updateStore("example.myshopify.com", {
 *   accessToken: "shpat_new_token_123"
 * });
 * ```
 */
export async function updateStore(
  shopUrl: string,
  data: UpdateStoreData
): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    if (!data || Object.keys(data).length === 0) {
      throw new StoreError("Update data is required", "VALIDATION", 400);
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    if (!existingStore) {
      throw new StoreError(
        `Store with shopUrl "${normalizedShopUrl}" not found`,
        "NOT_FOUND",
        404
      );
    }

    // Update the store
    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to update store: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Update a store's subscription plan
 *
 * Called after successful billing API interactions or plan upgrades/downgrades.
 * This method ensures type safety for plan values and logs the plan change.
 *
 * @param shopUrl - The myshopify.com domain
 * @param plan - The new subscription plan tier
 * @returns The updated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * // After successful billing confirmation
 * const store = await updateStorePlan("example.myshopify.com", "PRO");
 * ```
 */
export async function updateStorePlan(
  shopUrl: string,
  plan: StorePlan
): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    if (!plan) {
      throw new StoreError("plan is required", "VALIDATION", 400);
    }

    // Validate plan value
    const validPlans: StorePlan[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
    if (!validPlans.includes(plan)) {
      throw new StoreError(
        `Invalid plan. Must be one of: ${validPlans.join(", ")}`,
        "VALIDATION",
        400
      );
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    if (!existingStore) {
      throw new StoreError(
        `Store with shopUrl "${normalizedShopUrl}" not found`,
        "NOT_FOUND",
        404
      );
    }

    // Update the plan
    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        plan,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to update store plan: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Soft delete a store by setting isActive to false
 *
 * Use this when a merchant uninstalls the app or cancels their subscription.
 * Soft deletes preserve data for potential reactivation and maintain referential integrity.
 *
 * Note: Related records (audits, pages, etc.) are NOT deleted due to soft delete approach.
 * Use Prisma's cascade delete if hard deletion is required.
 *
 * @param shopUrl - The myshopify.com domain
 * @returns The deactivated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * // In your app/uninstalled webhook handler
 * await deactivateStore(session.shop);
 * ```
 */
export async function deactivateStore(shopUrl: string): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    if (!existingStore) {
      throw new StoreError(
        `Store with shopUrl "${normalizedShopUrl}" not found`,
        "NOT_FOUND",
        404
      );
    }

    // Soft delete by setting isActive to false
    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to deactivate store: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Get all active stores
 *
 * Useful for batch operations, analytics, or background jobs that need to process
 * all active stores (e.g., sending reports, running scheduled audits).
 *
 * Note: This can return a large dataset. Consider adding pagination for production use.
 *
 * @returns Array of all active store records
 *
 * @example
 * ```ts
 * // In a scheduled job
 * const activeStores = await getAllActiveStores();
 * for (const store of activeStores) {
 *   await sendWeeklyReport(store);
 * }
 * ```
 */
export async function getAllActiveStores(): Promise<Store[]> {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return stores;
  } catch (error) {
    throw new StoreError(
      `Failed to get active stores: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a store exists and is active
 *
 * Quick utility to verify store status without retrieving full record.
 * Useful for middleware or authentication guards.
 *
 * @param shopUrl - The myshopify.com domain
 * @returns Boolean indicating if store exists and is active
 *
 * @example
 * ```ts
 * if (!await isStoreActive(session.shop)) {
 *   throw new Response("Store is inactive", { status: 403 });
 * }
 * ```
 */
export async function isStoreActive(shopUrl: string): Promise<boolean> {
  try {
    if (!shopUrl) {
      return false;
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    const store = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
      select: { isActive: true },
    });

    return store?.isActive ?? false;
  } catch (error) {
    throw new StoreError(
      `Failed to check store status: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Get store count by plan
 *
 * Analytics helper for understanding plan distribution.
 * Useful for admin dashboards or reporting.
 *
 * @returns Object with count per plan
 *
 * @example
 * ```ts
 * const planCounts = await getStoreCountByPlan();
 * // { FREE: 150, BASIC: 45, PRO: 12, ENTERPRISE: 3 }
 * ```
 */
export async function getStoreCountByPlan(): Promise<Record<StorePlan, number>> {
  try {
    const stores = await prisma.store.groupBy({
      by: ["plan"],
      where: {
        isActive: true,
      },
      _count: {
        plan: true,
      },
    });

    const counts: Record<StorePlan, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    stores.forEach((group) => {
      if (group.plan in counts) {
        counts[group.plan as StorePlan] = group._count.plan;
      }
    });

    return counts;
  } catch (error) {
    throw new StoreError(
      `Failed to get store count by plan: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Reactivate a previously deactivated store
 *
 * Use this when a merchant reinstalls the app or reactivates their subscription.
 * This preserves all historical data and relationships.
 *
 * @param shopUrl - The myshopify.com domain
 * @param accessToken - New access token from OAuth flow
 * @returns The reactivated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * // During reinstall OAuth flow
 * const store = await reactivateStore("example.myshopify.com", newAccessToken);
 * ```
 */
export async function reactivateStore(
  shopUrl: string,
  accessToken: string
): Promise<Store> {
  try {
    if (!shopUrl || !accessToken) {
      throw new StoreError(
        "shopUrl and accessToken are required",
        "VALIDATION",
        400
      );
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { shopUrl: normalizedShopUrl },
    });

    if (!existingStore) {
      throw new StoreError(
        `Store with shopUrl "${normalizedShopUrl}" not found`,
        "NOT_FOUND",
        404
      );
    }

    // Reactivate and update access token
    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        isActive: true,
        accessToken,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to reactivate store: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

// ============================================================================
// ONBOARDING METHODS
// ============================================================================

/**
 * Update onboarding progress for a store
 *
 * Track which step the user is currently on during the onboarding flow.
 * This allows users to resume onboarding if they leave mid-process.
 *
 * @param shopUrl - The myshopify.com domain
 * @param step - The current step number (1-5)
 * @returns The updated store record
 * @throws {StoreError} If the store is not found or step is invalid
 *
 * @example
 * ```ts
 * await updateOnboardingStep("example.myshopify.com", 3);
 * ```
 */
export async function updateOnboardingStep(
  shopUrl: string,
  step: number
): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    if (!step || step < 1 || step > 5) {
      throw new StoreError(
        "Step must be between 1 and 5",
        "VALIDATION",
        400
      );
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        onboardingStep: step,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to update onboarding step: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Mark onboarding as completed
 *
 * Called when the user finishes all 5 steps of the onboarding wizard.
 * This prevents the wizard from showing again on subsequent visits.
 *
 * @param shopUrl - The myshopify.com domain
 * @returns The updated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * await completeOnboarding("example.myshopify.com");
 * ```
 */
export async function completeOnboarding(shopUrl: string): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to complete onboarding: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}

/**
 * Update GTM and GA4 IDs
 *
 * Save Google Tag Manager and Google Analytics 4 IDs during onboarding step 4.
 *
 * @param shopUrl - The myshopify.com domain
 * @param gtmId - Google Tag Manager ID (e.g., "GTM-XXXXXXX")
 * @param ga4Id - Google Analytics 4 ID (e.g., "G-XXXXXXXXXX")
 * @returns The updated store record
 * @throws {StoreError} If the store is not found
 *
 * @example
 * ```ts
 * await updateAnalyticsIds("example.myshopify.com", "GTM-ABC123", "G-XYZ456");
 * ```
 */
export async function updateAnalyticsIds(
  shopUrl: string,
  gtmId?: string,
  ga4Id?: string
): Promise<Store> {
  try {
    if (!shopUrl) {
      throw new StoreError("shopUrl is required", "VALIDATION", 400);
    }

    const normalizedShopUrl = shopUrl.toLowerCase().trim();

    const store = await prisma.store.update({
      where: { shopUrl: normalizedShopUrl },
      data: {
        gtmId: gtmId || null,
        ga4Id: ga4Id || null,
        updatedAt: new Date(),
      },
    });

    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      throw error;
    }

    throw new StoreError(
      `Failed to update analytics IDs: ${(error as Error).message}`,
      "DATABASE",
      500
    );
  }
}
