import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: CUSTOMERS_DATA_REQUEST
 * 
 * Shopify calls this when a customer requests their personal data.
 * The merchant has 30 days to provide the data in a CSV format.
 * 
 * Required for app store review - Part of GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  try {
    // In a real implementation, you would:
    // 1. Collect all customer data related to this shop
    // 2. Format it as a CSV
    // 3. Make it available for download by the merchant
    // 4. Send the URL to Shopify webhook callback

    // For now, log that we received the request
    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
    });

    if (store) {
      console.log(`[GDPR] Data request received for store: ${store.id}`);
      // TODO: Implement data collection and CSV generation
      // Store the request for manual processing or async handling
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
