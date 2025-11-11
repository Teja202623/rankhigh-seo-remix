import prisma from "~/db.server";
import { checkMissingMetaTitles } from "./checks/missingMetaTitles.server";
import { checkMissingMetaDescriptions } from "./checks/missingMetaDescriptions.server";
import { checkMissingAltText } from "./checks/missingAltText.server";
import { checkDuplicateMetaTitles } from "./checks/duplicateMetaTitles.server";
import { checkBrokenLinks } from "./checks/brokenLinks.server";
import { checkMixedContent } from "./checks/mixedContent.server";
import { checkIndexingDirectives } from "./checks/indexingDirectives.server";
import { calculateSEOScore } from "~/types/audit";
import type { CheckContext, ShopifyProduct, ShopifyCollection, ShopifyPage } from "~/types/audit";

// GraphQL queries for fetching Shopify data for audit
const GET_PRODUCTS_FOR_AUDIT = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_COLLECTIONS_FOR_AUDIT = `
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_PAGES_FOR_AUDIT = `
  query getPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          body
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Execute a real SEO audit for a store
 * Fetches Shopify data and runs all checks
 */
export async function executeAudit(auditId: string, storeId: string) {
  try {
    // Update status to RUNNING
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "RUNNING",
        progress: 5,
        startedAt: new Date(),
      },
    });

    // Get store info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Parse shop domain from URL (e.g., "myshop.myshopify.com")
    const shopDomain = store.shopUrl;

    // Progress: 10% - Fetching Shopify data
    await updateProgress(auditId, 10);

    const context = await fetchShopifyDataWithAdmin(storeId, shopDomain, store.accessToken);

    // Progress: 30% - Running checks
    await updateProgress(auditId, 30);

    // Run all checks in parallel
    const checkResults = await Promise.all([
      checkMissingMetaTitles(context),
      checkMissingMetaDescriptions(context),
      checkMissingAltText(context),
      checkDuplicateMetaTitles(context),
      checkBrokenLinks(context),
      checkMixedContent(context),
      checkIndexingDirectives(context),
    ]);

    // Progress: 70% - Processing results
    await updateProgress(auditId, 70);

    // Count issues by severity
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    for (const result of checkResults) {
      const issueCount = result.issues.length;
      if (result.severity === "CRITICAL") {
        criticalIssues += issueCount;
      } else if (result.severity === "HIGH") {
        highIssues += issueCount;
      } else if (result.severity === "MEDIUM") {
        mediumIssues += issueCount;
      } else if (result.severity === "LOW") {
        lowIssues += issueCount;
      }
    }

    // Calculate SEO score based on issues
    const score = calculateSEOScore(
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues
    );

    // Progress: 95% - Saving results
    await updateProgress(auditId, 95);

    // Save audit results
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        progress: 100,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        score,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      score,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
    };
  } catch (error) {
    console.error("Audit execution failed:", error);

    // Mark audit as failed
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        progress: 0,
      },
    });

    throw error;
  }
}

/**
 * Fetch Shopify data using the Admin API
 */
async function fetchShopifyDataWithAdmin(
  storeId: string,
  shopDomain: string,
  accessToken: string
): Promise<CheckContext> {
  const products: ShopifyProduct[] = [];
  const collections: ShopifyCollection[] = [];
  const pages: ShopifyPage[] = [];

  try {
    // Fetch products
    const productsData = await fetchAllProducts(shopDomain, accessToken);
    products.push(...productsData);

    // Fetch collections
    const collectionsData = await fetchAllCollections(shopDomain, accessToken);
    collections.push(...collectionsData);

    // Fetch pages
    const pagesData = await fetchAllPages(shopDomain, accessToken);
    pages.push(...pagesData);
  } catch (error) {
    console.error("Failed to fetch Shopify data:", error);
    // Return empty context to allow audit to continue with sample data
  }

  return {
    shopDomain,
    storeId,
    products,
    collections,
    pages,
  };
}

/**
 * Fetch all products from Shopify Admin API
 */
async function fetchAllProducts(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response = await makeShopifyRequest(
        shopDomain,
        accessToken,
        GET_PRODUCTS_FOR_AUDIT,
        {
          first: 50,
          after: cursor,
        }
      );

      const data = await response.json();

      if (data.data?.products?.edges) {
        for (const edge of data.data.products.edges) {
          const node = edge.node;
          products.push({
            id: node.id,
            title: node.title,
            handle: node.handle,
            seo: {
              title: node.seo?.title || null,
              description: node.seo?.description || null,
            },
            descriptionHtml: node.descriptionHtml,
            images: node.images,
          });
        }

        hasNextPage = data.data.products.pageInfo.hasNextPage;
        cursor = data.data.products.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      hasNextPage = false;
    }
  }

  return products;
}

/**
 * Fetch all collections from Shopify Admin API
 */
async function fetchAllCollections(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response = await makeShopifyRequest(
        shopDomain,
        accessToken,
        GET_COLLECTIONS_FOR_AUDIT,
        {
          first: 50,
          after: cursor,
        }
      );

      const data = await response.json();

      if (data.data?.collections?.edges) {
        for (const edge of data.data.collections.edges) {
          const node = edge.node;
          collections.push({
            id: node.id,
            title: node.title,
            handle: node.handle,
            seo: {
              title: node.seo?.title || null,
              description: node.seo?.description || null,
            },
            descriptionHtml: node.descriptionHtml,
          });
        }

        hasNextPage = data.data.collections.pageInfo.hasNextPage;
        cursor = data.data.collections.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      hasNextPage = false;
    }
  }

  return collections;
}

/**
 * Fetch all pages from Shopify Admin API
 */
async function fetchAllPages(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyPage[]> {
  const pages: ShopifyPage[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response = await makeShopifyRequest(
        shopDomain,
        accessToken,
        GET_PAGES_FOR_AUDIT,
        {
          first: 50,
          after: cursor,
        }
      );

      const data = await response.json();

      if (data.data?.pages?.edges) {
        for (const edge of data.data.pages.edges) {
          const node = edge.node;
          pages.push({
            id: node.id,
            title: node.title,
            handle: node.handle,
            body: node.body,
          });
        }

        hasNextPage = data.data.pages.pageInfo.hasNextPage;
        cursor = data.data.pages.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      hasNextPage = false;
    }
  }

  return pages;
}

/**
 * Make an authenticated request to Shopify Admin API
 */
async function makeShopifyRequest(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, any>
) {
  const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
}

/**
 * Update audit progress
 */
async function updateProgress(auditId: string, progress: number) {
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      progress: Math.min(progress, 100),
      updatedAt: new Date(),
    },
  });
}
