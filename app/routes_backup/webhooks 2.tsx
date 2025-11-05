import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
// TODO: Re-enable after database setup
// import prisma from "~/db.server";

/**
 * Webhook Handler Route
 *
 * Handles all Shopify webhooks including:
 * - APP_UNINSTALLED: Clean up store data when app is uninstalled
 * - CUSTOMERS_DATA_REQUEST: GDPR - Export customer data
 * - CUSTOMERS_REDACT: GDPR - Delete customer data
 * - SHOP_REDACT: GDPR - Delete shop data
 * - PRODUCTS_UPDATE: Track product changes for SEO
 * - THEMES_PUBLISH: Re-inject schema when theme is published
 */

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(
    request
  );

  console.log(`📨 Received webhook: ${topic} from ${shop}`);

  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        await handleAppUninstalled(shop);
        break;

      case "CUSTOMERS_DATA_REQUEST":
        await handleCustomersDataRequest(shop, payload);
        break;

      case "CUSTOMERS_REDACT":
        await handleCustomersRedact(shop, payload);
        break;

      case "SHOP_REDACT":
        await handleShopRedact(shop);
        break;

      case "PRODUCTS_UPDATE":
        await handleProductsUpdate(shop, payload);
        break;

      case "THEMES_PUBLISH":
        await handleThemesPublish(shop, payload);
        break;

      default:
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error(`❌ Error processing webhook ${topic}:`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
};

/**
 * APP_UNINSTALLED Handler
 * Clean up all store data when merchant uninstalls the app
 */
async function handleAppUninstalled(shop: string) {
  console.log(`🗑️ Cleaning up data for uninstalled shop: ${shop}`);
  // TODO: Re-enable after database setup
  console.log(`⚠️ Database not configured - skipping cleanup for ${shop}`);
}

/**
 * CUSTOMERS/DATA_REQUEST Handler (GDPR)
 * Export all customer data for a specific customer
 */
async function handleCustomersDataRequest(shop: string, payload: any) {
  console.log(`📋 Processing customer data request for shop: ${shop}`);

  // TODO: Implement customer data export
  // 1. Find all data associated with customer_id from payload
  // 2. Compile into JSON format
  // 3. Store securely for merchant to download
  // 4. Notify merchant via email

  const customerId = payload.customer?.id;
  console.log(`Customer ID: ${customerId}`);

  // For RankHigh SEO, we likely don't store customer PII
  // But we should document this and return empty data if needed
}

/**
 * CUSTOMERS/REDACT Handler (GDPR)
 * Delete all data for a specific customer
 */
async function handleCustomersRedact(shop: string, payload: any) {
  console.log(`🗑️ Processing customer redaction for shop: ${shop}`);

  // TODO: Implement customer data deletion
  // 1. Find all data associated with customer_id from payload
  // 2. Delete or anonymize the data
  // 3. Log the action for compliance

  const customerId = payload.customer?.id;
  console.log(`Redacting data for customer ID: ${customerId}`);

  // For RankHigh SEO, we likely don't store customer PII
  // But we should handle this webhook for compliance
}

/**
 * SHOP/REDACT Handler (GDPR)
 * Delete all shop data (48 hours after uninstall)
 */
async function handleShopRedact(shop: string) {
  console.log(`🗑️ Processing shop redaction for: ${shop}`);
  // TODO: Re-enable after database setup
  console.log(`⚠️ Database not configured - skipping redaction for ${shop}`);
}

/**
 * PRODUCTS/UPDATE Handler
 * Track product updates for SEO monitoring
 */
async function handleProductsUpdate(shop: string, payload: any) {
  console.log(`📦 Processing product update for shop: ${shop}`);

  const productId = payload.id;
  const productTitle = payload.title;

  // TODO: Implement product tracking
  // 1. Update product page in Pages table
  // 2. Trigger SEO analysis for product page
  // 3. Check for meta tag issues
}

/**
 * THEMES/PUBLISH Handler
 * Re-inject schema markup when theme is published
 */
async function handleThemesPublish(shop: string, payload: any) {
  console.log(`🎨 Processing theme publish for shop: ${shop}`);

  const themeId = payload.id;

  // TODO: Implement schema injection
  // 1. Get all active schema markup for this store
  // 2. Inject into theme files
  // 3. Update injection status in database
}
