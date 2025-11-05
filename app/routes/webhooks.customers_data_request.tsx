import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: CUSTOMERS_DATA_REQUEST
 *
 * Shopify calls this when a customer requests their personal data export.
 * The merchant has 30 days to provide the data to the customer.
 *
 * This app does NOT store customer personal data directly. We acknowledge
 * the request and log it for compliance. Shopify will handle providing
 * the customer's order history and account data.
 *
 * Required for app store review - Part of GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // Clone request before authenticate consumes the body
  const requestForPayload = request.clone();

  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  try {
    // Parse the cloned request body to get request details
    const text = await requestForPayload.text();
    const payload = JSON.parse(text);
    const customerId = payload.customer?.id;
    const email = payload.customer?.email;

    console.log(`[GDPR] Data request for customer: ${email} (ID: ${customerId})`);

    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
      select: { id: true, shopUrl: true },
    });

    if (!store) {
      console.log(`[GDPR] Store not found for ${shop}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[GDPR] Data request received for store: ${store.id}`);

    // Note: This app doesn't store customer personal data directly.
    // If you had customer data, you would:
    // 1. Collect all customer data from your models
    // 2. Format as CSV with headers: id, email, name, created_at, etc.
    // 3. Upload to a temporary S3/storage URL
    // 4. Send the URL back to Shopify via the callback_url in the payload
    //
    // Example:
    // const csvData = await generateCustomerCSV(store.id, customerId);
    // const uploadUrl = await uploadToStorage(csvData);
    // await shopify.postToCallback(payload.callback_url, { data_url: uploadUrl });

    // Return 200 OK to acknowledge receipt
    // Shopify will use this acknowledgment to track that we received the request
    return new Response(JSON.stringify({ success: true, acknowledged: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[GDPR] Error handling ${topic}:`, error);
    // Return 200 anyway to prevent Shopify retries
    // Log the error for manual investigation
    return new Response(JSON.stringify({ error: "Request processing failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
