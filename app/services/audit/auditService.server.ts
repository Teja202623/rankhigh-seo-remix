// app/services/audit/auditService.server.ts
/**
 * Main Audit Orchestrator Service
 *
 * Coordinates the entire SEO audit process:
 * 1. Creates audit record in database
 * 2. Fetches data from Shopify (products, collections, pages)
 * 3. Runs all 7 SEO checks in parallel
 * 4. Saves issues to database
 * 5. Calculates and updates audit score
 *
 * This service is called by the BullMQ worker for background processing.
 */

import prisma from "~/db.server";
import { authenticate } from "~/shopify.server";
import type {
  AuditJobResult,
  AuditProgress,
  CheckContext,
  SEOIssueData,
} from "~/types/audit";
import { calculateSEOScore, FREE_TIER_LIMITS } from "~/types/audit";
import { queueAudit } from "./auditQueue.server";
import { cache, buildCacheKey, CACHE_TTL, CACHE_NAMESPACE } from "~/services/cache.server";
import { onDataChange } from "~/services/cacheInvalidation.server";

// Import all SEO checks
import { checkMissingMetaTitles } from "./checks/missingMetaTitles.server";
import { checkDuplicateMetaTitles } from "./checks/duplicateMetaTitles.server";
import { checkMissingMetaDescriptions } from "./checks/missingMetaDescriptions.server";
import { checkMissingAltText } from "./checks/missingAltText.server";
import { checkBrokenLinks } from "./checks/brokenLinks.server";
import { checkMixedContent } from "./checks/mixedContent.server";
import { checkIndexingDirectives } from "./checks/indexingDirectives.server";

// ====================
// START AUDIT
// ====================

/**
 * Initialize a new audit and queue it for processing
 * @param storeId - Store database ID
 * @param shopDomain - Shopify shop domain
 * @returns Audit ID
 */
export async function startAudit(
  storeId: string,
  shopDomain: string
): Promise<string> {
  // Create audit record with PENDING status
  const audit = await prisma.audit.create({
    data: {
      storeId,
      status: "PENDING",
      totalUrls: 0,
      completed: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    },
  });

  // Queue the audit job for background processing
  await queueAudit({
    auditId: audit.id,
    storeId,
    shopDomain,
  });

  console.log(`[AuditService] Started audit ${audit.id} for store ${shopDomain}`);

  return audit.id;
}

// ====================
// PROCESS AUDIT
// ====================

/**
 * Execute the complete audit process
 * This is called by the BullMQ worker
 *
 * @param auditId - Audit database ID
 * @param shopDomain - Shopify shop domain
 * @param onProgress - Optional callback for progress updates
 * @returns Audit result with scores and issue counts
 */
export async function processAudit(
  auditId: string,
  shopDomain: string,
  onProgress?: (progress: AuditProgress) => void
): Promise<AuditJobResult> {
  try {
    // Step 1: Fetch Shopify data
    onProgress?.({
      stage: "FETCHING",
      message: "Fetching products, collections, and pages from Shopify...",
      percentage: 10,
    });

    const { products, collections, pages } = await fetchShopifyData(shopDomain);

    const totalUrls = products.length + collections.length + pages.length;

    await prisma.audit.update({
      where: { id: auditId },
      data: { totalUrls },
    });

    console.log(
      `[AuditService] Fetched ${totalUrls} resources for audit ${auditId}`
    );

    // Step 2: Run all SEO checks in parallel
    onProgress?.({
      stage: "CHECKING",
      message: "Running SEO checks...",
      percentage: 40,
    });

    const context: CheckContext = {
      shopDomain,
      storeId: "", // Will be set from audit record
      products,
      collections,
      pages,
    };

    // Get store ID from audit
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: { storeId: true },
    });

    if (!audit) {
      throw new Error(`Audit ${auditId} not found`);
    }

    context.storeId = audit.storeId;

    // Run all checks concurrently
    const [
      missingTitlesResult,
      duplicateTitlesResult,
      missingDescriptionsResult,
      missingAltTextResult,
      brokenLinksResult,
      mixedContentResult,
      indexingDirectivesResult,
    ] = await Promise.all([
      checkMissingMetaTitles(context),
      checkDuplicateMetaTitles(context),
      checkMissingMetaDescriptions(context),
      checkMissingAltText(context),
      checkBrokenLinks(context),
      checkMixedContent(context),
      checkIndexingDirectives(context),
    ]);

    console.log(`[AuditService] Completed all checks for audit ${auditId}`);

    // Step 3: Save issues to database
    onProgress?.({
      stage: "SAVING",
      message: "Saving audit results...",
      percentage: 80,
    });

    const allResults = [
      missingTitlesResult,
      duplicateTitlesResult,
      missingDescriptionsResult,
      missingAltTextResult,
      brokenLinksResult,
      mixedContentResult,
      indexingDirectivesResult,
    ];

    await saveAuditResults(auditId, audit.storeId, allResults);

    // Step 4: Calculate statistics and score
    const statistics = calculateAuditStatistics(allResults);

    // Step 5: Update audit record with final results
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completed: totalUrls,
        criticalIssues: statistics.criticalIssues,
        highIssues: statistics.highIssues,
        mediumIssues: statistics.mediumIssues,
        lowIssues: statistics.lowIssues,
        overallScore: statistics.overallScore,
        completedAt: new Date(),
      },
    });

    console.log(
      `[AuditService] Audit ${auditId} completed with score ${statistics.overallScore}`
    );

    // Step 6: Invalidate caches (Task 71)
    onDataChange(audit.storeId, "AUDIT_COMPLETED");

    return {
      auditId,
      status: "SUCCESS",
      totalIssues: statistics.totalIssues,
      criticalIssues: statistics.criticalIssues,
      highIssues: statistics.highIssues,
      mediumIssues: statistics.mediumIssues,
      lowIssues: statistics.lowIssues,
      overallScore: statistics.overallScore,
    };
  } catch (error) {
    console.error(`[AuditService] Audit ${auditId} failed:`, error);

    throw error;
  }
}

// ====================
// SHOPIFY DATA FETCHING
// ====================

/**
 * Fetch products, collections, and pages from Shopify
 * Respects FREE tier limits
 */
async function fetchShopifyData(shopDomain: string) {
  // For authentication, we'll use the authenticate function
  // Note: In a worker context, we need to create a mock request with session
  // This is a simplified version - in production, you'd store the access token

  // Fetch products (limit to FREE tier max)
  const productsQuery = `
    query getProductsForAudit($first: Int!) {
      products(first: $first, query: "status:active") {
        edges {
          node {
            id
            title
            handle
            seo {
              title
              description
            }
            descriptionHtml
            images(first: 10) {
              edges {
                node {
                  id
                  altText
                  url
                }
              }
            }
          }
        }
      }
    }
  `;

  // Fetch collections
  const collectionsQuery = `
    query getCollectionsForAudit($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            seo {
              title
              description
            }
            descriptionHtml
          }
        }
      }
    }
  `;

  // Fetch pages
  const pagesQuery = `
    query getPagesForAudit($first: Int!) {
      pages(first: $first) {
        edges {
          node {
            id
            title
            handle
            bodySummary
            body
          }
        }
      }
    }
  `;

  // Note: This is a simplified implementation
  // In production, you'd need to pass the Shopify Admin API client
  // from the authenticated session context

  // For now, we'll return mock data structure
  // The actual implementation will be in the route where we have access to admin

  return {
    products: [],
    collections: [],
    pages: [],
  };
}

/**
 * Fetch Shopify data using an authenticated admin client
 * This is the actual implementation that should be called with admin context
 * Uses cache to reduce API calls (Task 70)
 */
export async function fetchShopifyDataWithAdmin(admin: any, storeId?: string) {
  const products: any[] = [];
  const collections: any[] = [];
  const pages: any[] = [];

  try {
    // Cache products
    const productsKey = storeId
      ? buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "products")
      : null;

    const cachedProducts = productsKey ? cache.get<any[]>(productsKey) : null;

    if (cachedProducts) {
      products.push(...cachedProducts);
      console.log(`[AuditService] Using cached products (${products.length} items)`);
    } else {
      // Fetch products
      const productsResponse = await admin.graphql(
        `
        query getProductsForAudit($first: Int!) {
          products(first: $first, query: "status:active") {
            edges {
              node {
                id
                title
                handle
                seo {
                  title
                  description
                }
                descriptionHtml
                images(first: 10) {
                  edges {
                    node {
                      id
                      altText
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
        {
          variables: {
            first: FREE_TIER_LIMITS.MAX_PRODUCTS,
          },
        }
      );

      const productsData = await productsResponse.json();
      const productEdges = productsData?.data?.products?.edges || [];
      const fetchedProducts = productEdges.map((edge: any) => edge.node);
      products.push(...fetchedProducts);

      // Cache for 15 minutes
      if (productsKey) {
        cache.set(productsKey, fetchedProducts, CACHE_TTL.SHOPIFY_PRODUCTS);
      }
    }

    // Cache collections
    const collectionsKey = storeId
      ? buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "collections")
      : null;

    const cachedCollections = collectionsKey ? cache.get<any[]>(collectionsKey) : null;

    if (cachedCollections) {
      collections.push(...cachedCollections);
      console.log(`[AuditService] Using cached collections (${collections.length} items)`);
    } else {
      const collectionsResponse = await admin.graphql(
        `
        query getCollectionsForAudit($first: Int!) {
          collections(first: $first) {
            edges {
              node {
                id
                title
                handle
                seo {
                  title
                  description
                }
                descriptionHtml
              }
            }
          }
        }
      `,
        {
          variables: {
            first: FREE_TIER_LIMITS.MAX_COLLECTIONS,
          },
        }
      );

      const collectionsData = await collectionsResponse.json();
      const collectionEdges = collectionsData?.data?.collections?.edges || [];
      const fetchedCollections = collectionEdges.map((edge: any) => edge.node);
      collections.push(...fetchedCollections);

      // Cache for 15 minutes
      if (collectionsKey) {
        cache.set(collectionsKey, fetchedCollections, CACHE_TTL.SHOPIFY_COLLECTIONS);
      }
    }

    // Cache pages
    const pagesKey = storeId
      ? buildCacheKey(CACHE_NAMESPACE.SHOPIFY, storeId, "pages")
      : null;

    const cachedPages = pagesKey ? cache.get<any[]>(pagesKey) : null;

    if (cachedPages) {
      pages.push(...cachedPages);
      console.log(`[AuditService] Using cached pages (${pages.length} items)`);
    } else {
      const pagesResponse = await admin.graphql(
        `
        query getPagesForAudit($first: Int!) {
          pages(first: $first) {
            edges {
              node {
                id
                title
                handle
                bodySummary
                body
              }
            }
          }
        }
      `,
        {
          variables: {
            first: FREE_TIER_LIMITS.MAX_PAGES,
          },
        }
      );

      const pagesData = await pagesResponse.json();
      const pageEdges = pagesData?.data?.pages?.edges || [];
      const fetchedPages = pageEdges.map((edge: any) => edge.node);
      pages.push(...fetchedPages);

      // Cache for 30 minutes
      if (pagesKey) {
        cache.set(pagesKey, fetchedPages, CACHE_TTL.SHOPIFY_PAGES);
      }
    }
  } catch (error) {
    console.error("[AuditService] Error fetching Shopify data:", error);
    throw error;
  }

  return { products, collections, pages };
}

// ====================
// SAVE RESULTS
// ====================

/**
 * Save all check results to the database
 */
async function saveAuditResults(
  auditId: string,
  storeId: string,
  results: Array<{ type: string; severity: string; issues: SEOIssueData[] }>
) {
  // First, ensure all pages exist in the database
  const allIssues = results.flatMap((r) => r.issues);

  // Create/update pages for all resources
  for (const issue of allIssues) {
    await prisma.page.upsert({
      where: {
        storeId_url: {
          storeId,
          url: issue.url,
        },
      },
      create: {
        storeId,
        url: issue.url,
        title: issue.resourceTitle,
        pageType: issue.resourceType,
        shopifyId: issue.resourceId,
      },
      update: {
        title: issue.resourceTitle,
        pageType: issue.resourceType,
        shopifyId: issue.resourceId,
      },
    });
  }

  // Now create SEO issues
  for (const result of results) {
    for (const issue of result.issues) {
      // Find the page we just created/updated
      const page = await prisma.page.findUnique({
        where: {
          storeId_url: {
            storeId,
            url: issue.url,
          },
        },
      });

      if (!page) continue;

      // Create SEO issue
      await prisma.sEOIssue.create({
        data: {
          pageId: page.id,
          type: result.type,
          severity: result.severity,
          message: issue.message,
          suggestion: issue.suggestion,
          isFixed: false,
        },
      });
    }
  }

  console.log(
    `[AuditService] Saved ${allIssues.length} issues for audit ${auditId}`
  );
}

// ====================
// STATISTICS
// ====================

/**
 * Calculate audit statistics from check results
 */
function calculateAuditStatistics(
  results: Array<{ type: string; severity: string; issues: SEOIssueData[] }>
) {
  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;

  for (const result of results) {
    const count = result.issues.length;

    switch (result.severity) {
      case "CRITICAL":
        criticalIssues += count;
        break;
      case "HIGH":
        highIssues += count;
        break;
      case "MEDIUM":
        mediumIssues += count;
        break;
      case "LOW":
        lowIssues += count;
        break;
    }
  }

  const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
  const overallScore = calculateSEOScore(
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues
  );

  return {
    totalIssues,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    overallScore,
  };
}
