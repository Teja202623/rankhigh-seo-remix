import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Webhook Handler: PRODUCTS_UPDATE
 *
 * Fires when a product is updated in the Shopify store.
 * Used for cache invalidation and re-indexing of product data.
 *
 * Reference: https://shopify.dev/docs/api/admin-rest/latest/resources/webhook
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, body } = await authenticate.webhook(request);

  console.log(`[WEBHOOK] Received ${topic} webhook for ${shop}`);

  try {
    // Parse webhook payload
    const payload = typeof body === "string" ? JSON.parse(body) : body;

    if (!payload) {
      console.log(`[WEBHOOK] Empty payload for ${topic}`);
      return new Response();
    }

    const productId = payload.id;
    console.log(`[WEBHOOK] Product updated: ${productId} for shop: ${shop}`);

    // TODO: Implement cache invalidation for updated product
    // TODO: Update any product-related data in database
    // Examples:
    // - Invalidate product cache for this store
    // - Re-fetch product metadata if stored
    // - Update audit results if this product is being audited

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[WEBHOOK] Error handling ${topic}:`, error);

    // Return 200 OK to prevent Shopify retries
    // Log the error for manual investigation
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
