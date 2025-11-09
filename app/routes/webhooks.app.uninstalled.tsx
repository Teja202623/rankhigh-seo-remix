import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * App Uninstall Webhook Handler
 * 
 * Shopify calls this when a merchant uninstalls the app.
 * We must delete or anonymize all personal data:
 * - Store credentials (access tokens)
 * - Google integration tokens
 * - Analytics data (GA4, GTM IDs)
 * - All related audit data, pages, keywords, etc.
 * 
 * Required for app store review and GDPR compliance
 * Reference: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`[UNINSTALL] Received ${topic} webhook for ${shop}`);

  try {
    // Step 1: Delete all related data for this store (in dependency order)
    // Start with dependent records, work up to core Store record
    
    const store = await prisma.store.findUnique({
      where: { shopUrl: shop },
      select: { id: true },
    });

    if (!store) {
      console.log(`[UNINSTALL] Store not found for ${shop}, nothing to clean up`);
      return new Response();
    }

    const storeId = store.id;
    console.log(`[UNINSTALL] Cleaning up all data for store: ${storeId}`);

    // Delete all related records in order of foreign key dependencies
    await Promise.all([
      // Delete analytics data
      prisma.gSCQuery.deleteMany({ where: { storeId } }),
      prisma.gSCPage.deleteMany({ where: { storeId } }),
      prisma.gSCMetric.deleteMany({ where: { storeId } }),

      // Delete SEO issues (linked through page relation)
      prisma.sEOIssue.deleteMany({ where: { page: { storeId } } }),

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

    // Delete all sessions for this shop (from Shopify authentication)
    if (session) {
      await prisma.session.deleteMany({ where: { shop } });
    }

    // Finally, delete the Store record itself
    const deletedStore = await prisma.store.delete({
      where: { id: storeId },
      select: { shopUrl: true },
    });

    console.log(`[UNINSTALL] Successfully deleted all data for store: ${deletedStore.shopUrl}`);

    // Return 200 OK to acknowledge successful receipt and processing
    return new Response(JSON.stringify({ success: true, deleted: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[UNINSTALL] Error handling ${topic}:`, error);

    // Return 500 error so Shopify retries the webhook
    // This ensures data cleanup is retried until successful
    // Shopify will eventually give up after max retries and alert merchant
    return new Response(
      JSON.stringify({
        success: false,
        error: "Cleanup failed - Shopify will retry",
        shop,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
