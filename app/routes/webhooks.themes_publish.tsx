import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Webhook Handler: THEMES_PUBLISH
 *
 * Fires when a theme is published in the Shopify store.
 * Used to invalidate theme-related caches and notify of theme changes.
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

    const themeId = payload.id;
    const themeName = payload.name;
    console.log(`[WEBHOOK] Theme published: ${themeName} (${themeId}) for shop: ${shop}`);

    // TODO: Implement theme change handling
    // Examples:
    // - Invalidate schema/sitemap caches if theme affects them
    // - Log theme changes for compliance/audit
    // - Update store theme metadata if tracking themes
    // - Notify about potential schema.org tag conflicts

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
