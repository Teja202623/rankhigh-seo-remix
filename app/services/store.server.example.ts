// app/services/store.server.example.ts
/**
 * Example Usage of Store Service
 *
 * This file demonstrates how to use the store service in your Remix routes and loaders.
 * Delete this file once you're familiar with the patterns.
 */

import {
  createStore,
  getStore,
  getStoreById,
  updateStore,
  updateStorePlan,
  deactivateStore,
  getAllActiveStores,
  isStoreActive,
  getStoreCountByPlan,
  reactivateStore,
  StoreError,
} from "~/services/store.server";

// ============================================================================
// EXAMPLE 1: Creating a store during OAuth installation
// ============================================================================

export async function handleOAuthCallback(shop: string, accessToken: string) {
  try {
    // Create new store after successful OAuth
    const store = await createStore(shop, accessToken);
    console.log("Store created:", store.id);
    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      if (error.code === "DUPLICATE") {
        // Store already exists, reactivate it instead
        return await reactivateStore(shop, accessToken);
      }
      throw error;
    }
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Using store data in a Remix loader
// ============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Get authenticated session
  const { session } = await authenticate.admin(request);

  // Fetch store data
  const store = await getStore(session.shop);

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  // Check if store is active
  if (!store.isActive) {
    throw new Response("Store is inactive", { status: 403 });
  }

  // Return store data to frontend
  return json({
    store: {
      id: store.id,
      shopUrl: store.shopUrl,
      plan: store.plan,
      createdAt: store.createdAt,
    },
  });
}

// ============================================================================
// EXAMPLE 3: Updating store after billing confirmation
// ============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    // After successful billing API call
    const store = await updateStorePlan(session.shop, "PRO");

    return json({
      success: true,
      message: "Plan updated successfully",
      plan: store.plan,
    });
  } catch (error) {
    if (error instanceof StoreError) {
      return json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return json(
      { success: false, error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXAMPLE 4: Handling app uninstallation webhook
// ============================================================================

export async function handleUninstallWebhook(shop: string) {
  try {
    await deactivateStore(shop);
    console.log(`Store ${shop} deactivated successfully`);
  } catch (error) {
    console.error(`Failed to deactivate store ${shop}:`, error);
    // Log to error monitoring service (Sentry, etc.)
  }
}

// ============================================================================
// EXAMPLE 5: Background job - Send weekly reports to all active stores
// ============================================================================

export async function sendWeeklyReportsJob() {
  try {
    const activeStores = await getAllActiveStores();

    console.log(`Processing ${activeStores.length} active stores`);

    for (const store of activeStores) {
      try {
        // Send report logic here
        console.log(`Sending report to ${store.shopUrl}`);
        // await sendEmailReport(store);
      } catch (error) {
        console.error(`Failed to send report to ${store.shopUrl}:`, error);
        // Continue with next store
      }
    }
  } catch (error) {
    console.error("Failed to get active stores:", error);
  }
}

// ============================================================================
// EXAMPLE 6: Middleware - Check store status before processing request
// ============================================================================

export async function requireActiveStore(shop: string) {
  const active = await isStoreActive(shop);

  if (!active) {
    throw new Response("Store is not active. Please reinstall the app.", {
      status: 403,
    });
  }
}

// ============================================================================
// EXAMPLE 7: Admin dashboard - Get plan distribution analytics
// ============================================================================

export async function getAnalyticsDashboardData() {
  try {
    const planCounts = await getStoreCountByPlan();
    const totalStores = Object.values(planCounts).reduce((a, b) => a + b, 0);

    return {
      totalStores,
      planDistribution: planCounts,
      planPercentages: {
        FREE: (planCounts.FREE / totalStores) * 100,
        BASIC: (planCounts.BASIC / totalStores) * 100,
        PRO: (planCounts.PRO / totalStores) * 100,
        ENTERPRISE: (planCounts.ENTERPRISE / totalStores) * 100,
      },
    };
  } catch (error) {
    console.error("Failed to get analytics data:", error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Update access token (token refresh scenario)
// ============================================================================

export async function refreshStoreAccessToken(
  shop: string,
  newAccessToken: string
) {
  try {
    await updateStore(shop, { accessToken: newAccessToken });
    console.log(`Access token updated for ${shop}`);
  } catch (error) {
    if (error instanceof StoreError && error.code === "NOT_FOUND") {
      // Store doesn't exist, create it
      await createStore(shop, newAccessToken);
    } else {
      throw error;
    }
  }
}

// ============================================================================
// EXAMPLE 9: Error handling patterns
// ============================================================================

export async function exampleErrorHandling(shop: string) {
  try {
    const store = await getStore(shop);
    return store;
  } catch (error) {
    if (error instanceof StoreError) {
      // Handle specific error types
      switch (error.code) {
        case "NOT_FOUND":
          console.log("Store not found, might need to reinstall");
          break;
        case "VALIDATION":
          console.log("Invalid input:", error.message);
          break;
        case "DATABASE":
          console.log("Database error:", error.message);
          // Log to monitoring service
          break;
        default:
          console.error("Unknown store error:", error);
      }

      // Return appropriate HTTP response
      throw new Response(error.message, { status: error.statusCode });
    }

    // Handle other errors
    console.error("Unexpected error:", error);
    throw new Response("Internal server error", { status: 500 });
  }
}

// ============================================================================
// EXAMPLE 10: Using store data with relations
// ============================================================================

export async function getStoreWithRelations(shop: string) {
  // Note: The base service doesn't include relations for performance
  // Use Prisma directly when you need related data
  const prisma = (await import("~/db.server")).default;

  const store = await prisma.store.findUnique({
    where: { shopUrl: shop.toLowerCase() },
    include: {
      users: true,
      audits: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
      pages: {
        take: 10,
        orderBy: { updatedAt: "desc" },
      },
      keywords: {
        where: { isTracking: true },
      },
    },
  });

  return store;
}
