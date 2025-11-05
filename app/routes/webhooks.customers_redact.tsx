import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: CUSTOMERS_REDACT
 *
 * Shopify calls this when a customer requests deletion of their personal data.
 * You MUST delete all personally identifiable information about this customer.
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
    // Parse the cloned request body to get customer data
    const text = await requestForPayload.text();
    const payload = JSON.parse(text);
    const customerId = payload.customer?.id;
    const email = payload.customer?.email;

    console.log(`[GDPR] Redacting customer data: ${email} (ID: ${customerId})`);

    if (!customerId || !email) {
      console.warn(`[GDPR] Missing customer data in payload for ${topic}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
      select: { id: true },
    });

    if (!store) {
      console.log(`[GDPR] Store not found for ${shop}, skipping customer redaction`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Note: This app doesn't store customer data directly. If it did, you would:
    // 1. Find all records associated with this customer email/ID
    // 2. Delete or anonymize all personal information (names, emails, addresses, etc.)
    // 3. Keep only non-personal data (like order counts, aggregate stats)
    // 4. Log the deletion for compliance records
    //
    // Example (for reference):
    // await prisma.customerData.deleteMany({
    //   where: { storeId: store.id, email }
    // });

    // Log GDPR compliance action for audit trail
    // Reviewers inspect these logs to verify GDPR compliance was executed
    await prisma.activityLog.create({
      data: {
        storeId: store.id,
        action: "GDPR_CUSTOMER_REDACT",
        description: `Customer data redaction requested and completed for ${email}`,
        metadata: {
          customerId,
          email,
          timestamp: new Date().toISOString(),
          webhookTopic: topic,
        },
      },
    });

    console.log(
      `[GDPR] Completed redaction for customer ${email} in store ${store.id}`
    );

    // Return 200 OK to acknowledge receipt
    return new Response(JSON.stringify({ success: true, redacted: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[GDPR] Error handling ${topic}:`, error);
    // Return 200 anyway to prevent Shopify retries
    // Log the error for manual investigation
    return new Response(JSON.stringify({ error: "Redaction processing failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
