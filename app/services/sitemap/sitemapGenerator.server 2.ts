// app/services/sitemap/sitemapGenerator.server.ts

import type {
  SitemapUrl,
  Sitemap,
  SitemapGenerationOptions,
  ProductsQueryResponse,
  CollectionsQueryResponse,
  PagesQueryResponse,
  ShopifyProductNode,
  SitemapStatistics,
} from "~/types/sitemap";
import {
  shouldExcludeProduct,
  shouldExcludeUrl,
  filterUrlsByExclusionRules,
} from "./exclusionRules.server";
import { validateSitemapUrls } from "./sitemapValidator.server";

/**
 * GraphQL query to fetch products for sitemap
 */
const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      edges {
        node {
          id
          handle
          updatedAt
          status
          totalInventory
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
 * GraphQL query to fetch collections for sitemap
 */
const GET_COLLECTIONS_QUERY = `
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          updatedAt
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
 * GraphQL query to fetch pages for sitemap
 */
const GET_PAGES_QUERY = `
  query getPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          updatedAt
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
 * GraphQL query to fetch blog articles for sitemap
 */
const GET_ARTICLES_QUERY = `
  query getArticles($first: Int!, $after: String) {
    articles(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          updatedAt
          blog {
            handle
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

/**
 * Generates a complete XML sitemap for a Shopify store
 * @param admin - Shopify Admin API client
 * @param options - Sitemap generation options
 * @returns Promise<Sitemap> - Generated sitemap object
 */
export async function generateSitemap(
  admin: any, // Shopify Admin GraphQL client
  options: SitemapGenerationOptions
): Promise<Sitemap> {
  const urls: SitemapUrl[] = [];
  const maxUrls = options.maxUrls || 50000;

  // Add homepage
  urls.push({
    loc: `https://${options.shopDomain}`,
    changefreq: "daily",
    priority: 1.0,
    contentType: "homepage",
  });

  // Add collections page
  urls.push({
    loc: `https://${options.shopDomain}/collections`,
    changefreq: "weekly",
    priority: 0.9,
    contentType: "collections_page",
  });

  // Fetch and add products (with FREE tier limit enforcement)
  const productUrls = await fetchProductUrls(
    admin,
    options.shopDomain,
    options.exclusionRules,
    maxUrls - urls.length
  );
  urls.push(...productUrls);

  // Fetch and add collections (if we haven't reached the limit)
  if (urls.length < maxUrls) {
    const collectionUrls = await fetchCollectionUrls(
      admin,
      options.shopDomain,
      options.exclusionRules,
      maxUrls - urls.length
    );
    urls.push(...collectionUrls);
  }

  // Fetch and add pages (if we haven't reached the limit)
  if (urls.length < maxUrls) {
    const pageUrls = await fetchPageUrls(
      admin,
      options.shopDomain,
      options.exclusionRules,
      maxUrls - urls.length
    );
    urls.push(...pageUrls);
  }

  // Fetch and add blog articles (if we haven't reached the limit)
  if (urls.length < maxUrls) {
    const articleUrls = await fetchArticleUrls(
      admin,
      options.shopDomain,
      options.exclusionRules,
      maxUrls - urls.length
    );
    urls.push(...articleUrls);
  }

  // Filter URLs based on exclusion rules
  const filteredUrls = filterUrlsByExclusionRules(urls, options.exclusionRules);

  // Enforce max URLs limit
  const finalUrls = filteredUrls.slice(0, maxUrls);

  return {
    urls: finalUrls,
    generated: new Date(),
    urlCount: finalUrls.length,
  };
}

/**
 * Fetches product URLs from Shopify
 * @param admin - Shopify Admin API client
 * @param shopDomain - Shop domain
 * @param exclusionRules - Exclusion rules
 * @param maxUrls - Maximum URLs to fetch
 * @returns Promise<SitemapUrl[]>
 */
async function fetchProductUrls(
  admin: any,
  shopDomain: string,
  exclusionRules: any,
  maxUrls: number
): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && urls.length < maxUrls) {
    try {
      const response = await admin.graphql(GET_PRODUCTS_QUERY, {
        variables: {
          first: Math.min(50, maxUrls - urls.length), // Fetch in batches of 50
          after: cursor,
        },
      });

      const data: ProductsQueryResponse = await response.json();

      if (data.products && data.products.edges) {
        for (const edge of data.products.edges) {
          const product = edge.node;

          // Check if product should be excluded
          if (!shouldExcludeProduct(product, exclusionRules)) {
            urls.push({
              loc: `https://${shopDomain}/products/${product.handle}`,
              lastmod: formatDate(product.updatedAt),
              changefreq: "weekly",
              priority: 0.8,
              contentType: "product",
            });
          }

          // Stop if we've reached the limit
          if (urls.length >= maxUrls) break;
        }

        hasNextPage = data.products.pageInfo.hasNextPage;
        cursor = data.products.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching products for sitemap:", error);
      hasNextPage = false;
    }
  }

  return urls;
}

/**
 * Fetches collection URLs from Shopify
 * @param admin - Shopify Admin API client
 * @param shopDomain - Shop domain
 * @param exclusionRules - Exclusion rules
 * @param maxUrls - Maximum URLs to fetch
 * @returns Promise<SitemapUrl[]>
 */
async function fetchCollectionUrls(
  admin: any,
  shopDomain: string,
  exclusionRules: any,
  maxUrls: number
): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && urls.length < maxUrls) {
    try {
      const response = await admin.graphql(GET_COLLECTIONS_QUERY, {
        variables: {
          first: Math.min(50, maxUrls - urls.length),
          after: cursor,
        },
      });

      const data: CollectionsQueryResponse = await response.json();

      if (data.collections && data.collections.edges) {
        for (const edge of data.collections.edges) {
          const collection = edge.node;

          urls.push({
            loc: `https://${shopDomain}/collections/${collection.handle}`,
            lastmod: formatDate(collection.updatedAt),
            changefreq: "weekly",
            priority: 0.7,
            contentType: "collection",
          });

          if (urls.length >= maxUrls) break;
        }

        hasNextPage = data.collections.pageInfo.hasNextPage;
        cursor = data.collections.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching collections for sitemap:", error);
      hasNextPage = false;
    }
  }

  return urls;
}

/**
 * Fetches page URLs from Shopify
 * @param admin - Shopify Admin API client
 * @param shopDomain - Shop domain
 * @param exclusionRules - Exclusion rules
 * @param maxUrls - Maximum URLs to fetch
 * @returns Promise<SitemapUrl[]>
 */
async function fetchPageUrls(
  admin: any,
  shopDomain: string,
  exclusionRules: any,
  maxUrls: number
): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && urls.length < maxUrls) {
    try {
      const response = await admin.graphql(GET_PAGES_QUERY, {
        variables: {
          first: Math.min(50, maxUrls - urls.length),
          after: cursor,
        },
      });

      const data: PagesQueryResponse = await response.json();

      if (data.pages && data.pages.edges) {
        for (const edge of data.pages.edges) {
          const page = edge.node;

          urls.push({
            loc: `https://${shopDomain}/pages/${page.handle}`,
            lastmod: formatDate(page.updatedAt),
            changefreq: "monthly",
            priority: 0.6,
            contentType: "page",
          });

          if (urls.length >= maxUrls) break;
        }

        hasNextPage = data.pages.pageInfo.hasNextPage;
        cursor = data.pages.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching pages for sitemap:", error);
      hasNextPage = false;
    }
  }

  return urls;
}

/**
 * Fetches blog article URLs from Shopify
 * @param admin - Shopify Admin API client
 * @param shopDomain - Shop domain
 * @param exclusionRules - Exclusion rules
 * @param maxUrls - Maximum URLs to fetch
 * @returns Promise<SitemapUrl[]>
 */
async function fetchArticleUrls(
  admin: any,
  shopDomain: string,
  exclusionRules: any,
  maxUrls: number
): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && urls.length < maxUrls) {
    try {
      const response = await admin.graphql(GET_ARTICLES_QUERY, {
        variables: {
          first: Math.min(50, maxUrls - urls.length),
          after: cursor,
        },
      });

      const data: any = await response.json();

      if (data.articles && data.articles.edges) {
        for (const edge of data.articles.edges) {
          const article = edge.node;

          urls.push({
            loc: `https://${shopDomain}/blogs/${article.blog.handle}/articles/${article.handle}`,
            lastmod: formatDate(article.updatedAt),
            changefreq: "monthly",
            priority: 0.6,
            contentType: "blog_post",
          });

          if (urls.length >= maxUrls) break;
        }

        hasNextPage = data.articles.pageInfo.hasNextPage;
        cursor = data.articles.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching articles for sitemap:", error);
      hasNextPage = false;
    }
  }

  return urls;
}

/**
 * Converts a Sitemap object to XML string
 * @param sitemap - The sitemap object
 * @returns XML string
 */
export function sitemapToXml(sitemap: Sitemap): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of sitemap.urls) {
    xml += "  <url>\n";
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;

    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }

    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }

    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
    }

    xml += "  </url>\n";
  }

  xml += "</urlset>";

  return xml;
}

/**
 * Escapes special XML characters
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a date string to ISO 8601 format for sitemap
 * @param dateString - Date string from Shopify
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString();
}

/**
 * Calculates statistics for a sitemap
 * @param sitemap - The sitemap object
 * @param lastGenerated - Last generation date from database
 * @param freeTierLimit - FREE tier URL limit
 * @returns SitemapStatistics object
 */
export function calculateSitemapStatistics(
  sitemap: Sitemap,
  lastGenerated: Date | null,
  freeTierLimit?: number
): SitemapStatistics {
  const urlsByType = {
    products: 0,
    collections: 0,
    pages: 0,
    blogPosts: 0,
    other: 0,
  };

  // Count URLs by type
  for (const url of sitemap.urls) {
    switch (url.contentType) {
      case "product":
        urlsByType.products++;
        break;
      case "collection":
        urlsByType.collections++;
        break;
      case "page":
        urlsByType.pages++;
        break;
      case "blog_post":
        urlsByType.blogPosts++;
        break;
      default:
        urlsByType.other++;
    }
  }

  const xmlContent = sitemapToXml(sitemap);
  const fileSize = new Blob([xmlContent]).size;

  const statistics: SitemapStatistics = {
    totalUrls: sitemap.urlCount,
    lastGenerated,
    fileSize,
    urlsByType,
  };

  // Add FREE tier usage if limit is provided
  if (freeTierLimit) {
    statistics.freeTierUsage = {
      used: sitemap.urlCount,
      limit: freeTierLimit,
      percentage: Math.round((sitemap.urlCount / freeTierLimit) * 100),
    };
  }

  return statistics;
}

/**
 * Validates and generates a sitemap
 * @param admin - Shopify Admin API client
 * @param options - Sitemap generation options
 * @returns Promise with sitemap and validation results
 */
export async function validateAndGenerateSitemap(
  admin: any,
  options: SitemapGenerationOptions
): Promise<{
  sitemap: Sitemap;
  xml: string;
  validation: any;
}> {
  // Generate sitemap
  const sitemap = await generateSitemap(admin, options);

  // Validate URLs before converting to XML
  const validation = validateSitemapUrls(sitemap.urls, options.maxUrls);

  // Convert to XML
  const xml = sitemapToXml(sitemap);

  return {
    sitemap,
    xml,
    validation,
  };
}
