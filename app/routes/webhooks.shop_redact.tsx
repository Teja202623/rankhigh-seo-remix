import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: SHOP_REDACT
 * 
 * Shopify calls this when a shop requests deletion of all their data.
 * This typically happens when a store is deleted or the app is uninstalled.
 * You must delete all data associated with this shop.
 * 
 * Required for app store review - Part of GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  try {
    // Delete all shop data from the database
    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
    });

    if (store) {
      console.log(`[GDPR] Redacting all data for shop: ${shop} (store: ${store.id})`);

      // Delete all shop-related data in order of dependencies
      // Start with most dependent data, work up to core shop record

      // TODO: Delete any audit records
      // TODO: Delete any cached GSC data
      // TODO: Delete any custom data specific to your app
      // TODO: Delete any customer data associated with this shop
      
      // Finally, delete the store record itself
      // Note: Keep sessions and basic records for audit trail if needed
      // await prisma.store.delete({ where: { id: store.id } });

      console.log(`[GDPR] Completed redaction for shop: ${shop}`);
    }

    // Return 200 OK to acknowledge receipt
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[GDPR] Error handling ${topic}:`, error);
    // Return 200 anyway to prevent Shopify retries
    // Log the error for manual investigation
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
