import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2025-07";
import prisma from "./db.server";

/**
 * Environment Variable Validation
 *
 * Validate all required environment variables before app initialization.
 * This ensures the app fails fast with clear error messages rather than
 * experiencing silent failures during runtime.
 */
const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_APP_URL',
  'SCOPES',
  'DATABASE_URL',
  'SESSION_SECRET',
] as const;

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`❌ CRITICAL: Missing required environment variable: ${varName}`);
  }
}

// Validate SESSION_SECRET is not the default placeholder
if (process.env.SESSION_SECRET === 'your-super-secret-session-key-change-this-in-production') {
  throw new Error('❌ CRITICAL: SESSION_SECRET must be changed from default placeholder value');
}

// Validate SHOPIFY_APP_URL uses HTTPS (required by Shopify)
if (!process.env.SHOPIFY_APP_URL!.startsWith('https://')) {
  throw new Error('❌ CRITICAL: SHOPIFY_APP_URL must use HTTPS protocol');
}

console.log('✅ All required environment variables validated');
console.log('🚀 EMBEDDED APP MODE: isEmbeddedApp=true, newEmbeddedAuthStrategy=true - BUILD_v3');

/**
 * Shopify App Configuration
 *
 * This sets up the core Shopify app with:
 * - OAuth authentication
 * - Session storage using Prisma
 * - Webhook handlers
 * - App distribution settings
 */
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(",") || [],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,

  /**
   * CRITICAL: Embedded app configuration for OAuth cookie persistence
   * - isEmbeddedApp: true enables proper cookie handling for iframe context
   * - useOnlineTokens: false uses offline tokens (persists across sessions)
   */
  isEmbeddedApp: true,
  useOnlineTokens: false,

  /**
   * Webhook Configuration
   * Required webhooks for App Store approval:
   * - APP_UNINSTALLED: Clean up when merchant uninstalls
   * - CUSTOMERS_DATA_REQUEST: GDPR data export
   * - CUSTOMERS_REDACT: GDPR customer data deletion
   * - SHOP_REDACT: GDPR shop data deletion
   *
   * Each webhook routes to its specific handler file in app/routes/webhooks.*.tsx
   * Route mapping: webhooks.topic.subtopic.tsx → /webhooks/topic/subtopic
   */
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers_data_request",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers_redact",
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/shop_redact",
    },
  },

  /**
   * Lifecycle Hooks
   */
  hooks: {
    /**
     * After successful OAuth authentication
     * - Register all webhooks
     * - Create or update store record in database
     */
    afterAuth: async ({ session }) => {
      // Register webhooks for this shop
      shopify.registerWebhooks({ session });

      // CRITICAL: Create or update store record in database
      // This ensures the store exists before feature loaders try to access it
      try {
        if (session.accessToken) {
          await prisma.store.upsert({
            where: { shopUrl: session.shop },
            create: {
              shopUrl: session.shop,
              accessToken: session.accessToken,
            },
            update: {
              accessToken: session.accessToken,
              updatedAt: new Date(),
            },
          });
        }
        console.log(`Store ${session.shop} created/updated in database`);
      } catch (error) {
        console.error("Error storing shop data:", error);
        throw error;
      }
    },
  },

  /**
   * Future flags for new API features
   *
   * CRITICAL: unstable_newEmbeddedAuthStrategy
   * - Enables Shopify managed installation with token exchange
   * - Eliminates cookie-based OAuth (solves "Could not find OAuth cookie" errors)
   * - Uses session tokens instead of cookies for authentication
   * - No-redirect OAuth flow for better UX
   * - Recommended by Shopify for all embedded apps (default since Feb 2024)
   */
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

/**
 * Exports for use in Remix routes
 */
export default shopify;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
