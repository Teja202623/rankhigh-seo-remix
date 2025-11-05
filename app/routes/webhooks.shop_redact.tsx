import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR Webhook: SHOP_REDACT
 *
 * Shopify calls this when a shop requests deletion of all their data.
 * You MUST delete all personal/sensitive data associated with this shop
 * to comply with GDPR right to be forgotten.
 *
 * Required for app store review - Part of GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  try {
    // Find the store to delete
    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
      select: { id: true, shopUrl: true },
    });

    if (!store) {
      console.log(`[GDPR] Store not found for ${shop}, nothing to redact`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const storeId = store.id;
    console.log(`[GDPR] Redacting all data for shop: ${shop} (store: ${storeId})`);

    // Delete all shop-related data in order of foreign key dependencies
    // Start with most dependent data, work up to core shop record
    await Promise.all([
      // Delete analytics data
      prisma.gscQuery.deleteMany({ where: { storeId } }),
      prisma.gscPage.deleteMany({ where: { storeId } }),
      prisma.gscMetric.deleteMany({ where: { storeId } }),

      // Delete SEO issues (linked through page relation)
      prisma.seoIssue.deleteMany({ where: { page: { storeId } } }),

      // Delete keyword rankings (linked through keyword relation)
      prisma.keywordRanking.deleteMany({ where: { keyword: { storeId } } }),

      // Delete audit records (directly linked to store)
      prisma.audit.deleteMany({ where: { storeId } }),

      // Delete page-related data
      prisma.keyword.deleteMany({ where: { storeId } }),
      prisma.page.deleteMany({ where: { storeId } }),

      // Delete other related data
      prisma.schemaMarkup.deleteMany({ where: { storeId } }),
      prisma.redirect.deleteMany({ where: { storeId } }),
      prisma.notification.deleteMany({ where: { storeId } }),
      prisma.activityLog.deleteMany({ where: { storeId } }),

      // Delete users associated with this store
      prisma.user.deleteMany({ where: { storeId } }),
    ]);

    // Delete all sessions for this shop
    await prisma.session.deleteMany({ where: { shop } });

    // Finally, delete the Store record itself
    const deletedStore = await prisma.store.delete({
      where: { id: storeId },
      select: { shopUrl: true },
    });

    console.log(`[GDPR] Completed redaction for shop: ${deletedStore.shopUrl}`);

    // Return 200 OK to acknowledge receipt
    return new Response(JSON.stringify({ success: true, redacted: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[GDPR] Error handling ${topic}:`, error);
    // Return 200 anyway to prevent Shopify retries
    // Log the error for manual investigation
    return new Response(JSON.stringify({ error: "Redaction failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
