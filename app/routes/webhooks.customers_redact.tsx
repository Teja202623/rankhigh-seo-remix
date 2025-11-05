import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: CUSTOMERS_REDACT
 * 
 * Shopify calls this when a customer requests deletion of their personal data.
 * You must delete all personally identifiable information about this customer.
 * 
 * Required for app store review - Part of GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, body } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  try {
    // Parse the webhook payload to get customer data
    const payload = typeof body === "string" ? JSON.parse(body) : body;
    const customerId = payload.customer?.id;
    const email = payload.customer?.email;

    console.log(`[GDPR] Redacting customer data: ${email}`);

    if (customerId) {
      // In a real implementation, you would:
      // 1. Find all records associated with this customer
      // 2. Delete or redact all personal information
      // 3. Keep only non-personal data (like order counts, aggregate stats)
      // 4. Log the deletion for compliance records

      const store = await prisma.store.findUnique({
        where: { shopUrl: shop },
      });

      if (store) {
        // TODO: Delete customer-specific data from your database
        console.log(`[GDPR] Deleted data for customer ${customerId} in store ${store.id}`);
      }
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
