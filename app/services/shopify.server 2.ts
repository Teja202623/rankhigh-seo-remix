// app/services/shopify.server.ts
/**
 * Shopify Admin API Service Layer
 *
 * Centralizes all Shopify API interactions for the SEO Meta Editor.
 * Uses GraphQL Admin API for product operations.
 *
 * Key features:
 * - Product fetching with pagination
 * - Product meta tag updates (bulk and individual)
 * - Error handling and retry logic
 * - Rate limit handling
 */

import type {
  ShopifyProduct,
  ProductConnection,
  ProductUpdateInput,
  ProductFilters,
} from "~/types/seo";

/**
 * Admin API context type
 * Provides GraphQL client for Shopify Admin API
 */
interface AdminApiContext {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

/**
 * GraphQL query to fetch products with SEO fields
 *
 * Returns essential fields needed for meta editing:
 * - Basic info (id, title, handle)
 * - SEO fields (seo.title, seo.description)
 * - Metadata for templates (vendor, productType, price)
 * - Pagination cursors
 */
const PRODUCTS_QUERY = `#graphql
  query getProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          title
          handle
          description
          vendor
          productType
          status
          seo {
            title
            description
          }
          featuredImage {
            url
            altText
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          onlineStoreUrl
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * GraphQL mutation to update product SEO fields
 *
 * Updates both meta title and description atomically.
 * Returns updated product data for UI refresh.
 */
const UPDATE_PRODUCT_SEO_MUTATION = `#graphql
  mutation updateProductSeo($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        seo {
          title
          description
        }
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL query to get shop information
 * Used for template variable replacement ({store_name})
 */
const SHOP_INFO_QUERY = `#graphql
  query getShopInfo {
    shop {
      id
      name
      myshopifyDomain
      url
      currencyCode
      primaryDomain {
        url
      }
    }
  }
`;

/**
 * Fetch products from Shopify with pagination and filtering
 *
 * @param admin - Shopify Admin API context
 * @param filters - Search, filter, and pagination options
 * @returns Paginated product list
 *
 * Example usage:
 * ```ts
 * const result = await fetchProducts(admin, {
 *   limit: 20,
 *   query: "status:ACTIVE",
 *   cursor: "eyJsYXN0X2lkIjo..."
 * });
 * ```
 */
export async function fetchProducts(
  admin: AdminApiContext,
  filters: ProductFilters = {}
): Promise<ProductConnection> {
  const { query, cursor, limit = 20 } = filters;

  try {
    // Build GraphQL query string for filtering
    // Shopify query syntax: "status:ACTIVE vendor:Nike"
    let queryString = query || "";

    // Add status filter if specified
    if (filters.status) {
      queryString += ` status:${filters.status}`;
    }

    const response = await admin.graphql(PRODUCTS_QUERY, {
      variables: {
        first: Math.min(limit, 250), // Shopify max is 250 per request
        after: cursor,
        query: queryString.trim() || null,
      },
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error(`Failed to fetch products: ${data.errors[0]?.message}`);
    }

    return data.data.products as ProductConnection;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to fetch products from Shopify"
    );
  }
}

/**
 * Update SEO metadata for a single product
 *
 * @param admin - Shopify Admin API context
 * @param productId - Shopify GID (e.g., gid://shopify/Product/123)
 * @param seo - Meta title and description
 * @returns Updated product or error
 *
 * Note: This function handles the full GID format required by Shopify.
 * If you pass a numeric ID, it will be converted to GID format.
 */
export async function updateProductSeo(
  admin: AdminApiContext,
  productId: string,
  seo: { title: string; description: string }
): Promise<{
  success: boolean;
  product?: ShopifyProduct;
  error?: string;
}> {
  try {
    // Ensure productId is in GID format
    const gid = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    const response = await admin.graphql(UPDATE_PRODUCT_SEO_MUTATION, {
      variables: {
        input: {
          id: gid,
          seo: {
            title: seo.title,
            description: seo.description,
          },
        },
      },
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return {
        success: false,
        error: data.errors[0]?.message || "Unknown GraphQL error",
      };
    }

    const result = data.data.productUpdate;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error("User errors:", result.userErrors);
      return {
        success: false,
        error: result.userErrors[0]?.message || "Failed to update product",
      };
    }

    return {
      success: true,
      product: result.product,
    };
  } catch (error) {
    console.error("Error updating product SEO:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update product SEO",
    };
  }
}

/**
 * Update SEO metadata for multiple products (bulk operation)
 *
 * @param admin - Shopify Admin API context
 * @param updates - Array of product updates
 * @returns Summary of successful and failed updates
 *
 * Note: This processes updates sequentially to avoid rate limits.
 * For large batches, consider implementing exponential backoff.
 *
 * Rate limits: Shopify allows ~2 requests/second for GraphQL Admin API.
 * We add a small delay between requests to stay within limits.
 */
export async function bulkUpdateProductSeo(
  admin: AdminApiContext,
  updates: ProductUpdateInput[]
): Promise<{
  success: boolean;
  updatedCount: number;
  errors: Array<{ productId: string; message: string }>;
}> {
  const errors: Array<{ productId: string; message: string }> = [];
  let updatedCount = 0;

  // Process updates sequentially with delay to respect rate limits
  for (const update of updates) {
    const result = await updateProductSeo(admin, update.id, update.seo);

    if (result.success) {
      updatedCount++;
    } else {
      errors.push({
        productId: update.id,
        message: result.error || "Unknown error",
      });
    }

    // Small delay to avoid rate limiting (500ms = 2 requests/second)
    // Shopify's actual limit is higher, but this ensures we never hit it
    if (updates.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    success: errors.length === 0,
    updatedCount,
    errors,
  };
}

/**
 * Fetch shop information
 * Used for template variables like {store_name}
 *
 * @param admin - Shopify Admin API context
 * @returns Shop details
 */
export async function fetchShopInfo(admin: AdminApiContext): Promise<{
  id: string;
  name: string;
  domain: string;
  url: string;
  currencyCode: string;
}> {
  try {
    const response = await admin.graphql(SHOP_INFO_QUERY);
    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error(`Failed to fetch shop info: ${data.errors[0]?.message}`);
    }

    const shop = data.data.shop;

    return {
      id: shop.id,
      name: shop.name,
      domain: shop.myshopifyDomain,
      url: shop.primaryDomain?.url || shop.url,
      currencyCode: shop.currencyCode,
    };
  } catch (error) {
    console.error("Error fetching shop info:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to fetch shop information"
    );
  }
}

/**
 * Count products with missing or suboptimal meta tags
 *
 * Uses GraphQL to efficiently count products needing SEO attention:
 * - Missing meta title
 * - Missing meta description
 * - Title too short (< 30 chars)
 * - Description too short (< 100 chars)
 *
 * @param admin - Shopify Admin API context
 * @returns Count of products with SEO issues
 */
export async function countProductsWithMetaIssues(
  admin: AdminApiContext
): Promise<number> {
  const PRODUCTS_COUNT_QUERY = `#graphql
    query countProducts($query: String) {
      products(first: 1, query: $query) {
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  try {
    // This is a simplified version - in production, you'd want to
    // fetch products and analyze their meta tags client-side or
    // use a more complex query structure

    // For now, we'll just return 0 as a placeholder
    // TODO: Implement proper meta issue detection
    return 0;
  } catch (error) {
    console.error("Error counting products with meta issues:", error);
    return 0;
  }
}

/**
 * Extract numeric ID from Shopify GID
 *
 * Converts: gid://shopify/Product/123456 → "123456"
 *
 * @param gid - Shopify Global ID
 * @returns Numeric ID as string
 */
export function extractIdFromGid(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1];
}

/**
 * Convert numeric ID to Shopify GID
 *
 * Converts: 123456 → gid://shopify/Product/123456
 *
 * @param id - Numeric product ID
 * @param resourceType - Shopify resource type (default: Product)
 * @returns Shopify GID
 */
export function toShopifyGid(
  id: string | number,
  resourceType: string = "Product"
): string {
  return `gid://shopify/${resourceType}/${id}`;
}

/**
 * Format price for display
 *
 * @param amount - Price amount as string
 * @param currencyCode - Currency code (e.g., "USD")
 * @returns Formatted price (e.g., "$99.99")
 */
export function formatPrice(amount: string, currencyCode: string): string {
  const price = parseFloat(amount);

  // Use Intl.NumberFormat for proper currency formatting
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Truncate text to specified length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * GraphQL query to fetch products with all their images
 *
 * Optimized for Image ALT Text Manager:
 * - Fetches all product images (up to 10 per product)
 * - Includes ALT text for each image
 * - Returns image metadata (id, src, position)
 * - Includes product info for template variables
 */
const PRODUCTS_WITH_IMAGES_QUERY = `#graphql
  query getProductsWithImages($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          title
          handle
          vendor
          productType
          status
          images(first: 10) {
            edges {
              node {
                id
                src
                altText
                width
                height
              }
            }
          }
          featuredImage {
            url
            altText
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * GraphQL mutation to update product images (including ALT text)
 *
 * Updates image ALT text by updating the entire product.
 * Note: Shopify requires the full product input, but we only modify images.
 *
 * Important: This uses the productUpdate mutation with the images field.
 * Each image must include its ID and the new altText.
 */
const UPDATE_PRODUCT_IMAGES_MUTATION = `#graphql
  mutation updateProductImages($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        images(first: 10) {
          edges {
            node {
              id
              altText
            }
          }
        }
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Fetch products with all their images for ALT text management
 *
 * @param admin - Shopify Admin API context
 * @param filters - Search, filter, and pagination options
 * @returns Products with full image data
 *
 * Example usage:
 * ```ts
 * const products = await fetchProductsWithImages(admin, {
 *   limit: 20,
 *   query: "status:ACTIVE"
 * });
 * ```
 */
export async function fetchProductsWithImages(
  admin: AdminApiContext,
  filters: ProductFilters = {}
): Promise<{
  products: Array<{
    id: string;
    title: string;
    handle: string;
    vendor?: string;
    productType?: string;
    status: string;
    images: {
      edges: Array<{
        node: {
          id: string;
          src: string;
          altText?: string | null;
          width?: number;
          height?: number;
        };
      }>;
    };
    featuredImage?: {
      url: string;
      altText?: string;
    } | null;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}> {
  const { query, cursor, limit = 20 } = filters;

  try {
    let queryString = query || "";

    if (filters.status) {
      queryString += ` status:${filters.status}`;
    }

    const response = await admin.graphql(PRODUCTS_WITH_IMAGES_QUERY, {
      variables: {
        first: Math.min(limit, 250),
        after: cursor,
        query: queryString.trim() || null,
      },
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error(`Failed to fetch products: ${data.errors[0]?.message}`);
    }

    const productsConnection = data.data.products;

    return {
      products: productsConnection.edges.map((edge: { node: unknown }) => edge.node),
      pageInfo: productsConnection.pageInfo,
    };
  } catch (error) {
    console.error("Error fetching products with images:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to fetch products with images"
    );
  }
}

/**
 * Update ALT text for product images
 *
 * @param admin - Shopify Admin API context
 * @param productId - Shopify Product GID
 * @param imageUpdates - Array of image updates with id and altText
 * @returns Success status and updated product
 *
 * Note: This mutation updates only the ALT text of existing images.
 * Image IDs must be provided in GID format.
 *
 * Example:
 * ```ts
 * await updateProductImageAltText(admin, "gid://shopify/Product/123", [
 *   { id: "gid://shopify/ProductImage/456", altText: "New alt text" }
 * ]);
 * ```
 */
export async function updateProductImageAltText(
  admin: AdminApiContext,
  productId: string,
  imageUpdates: Array<{ id: string; altText: string }>
): Promise<{
  success: boolean;
  product?: {
    id: string;
    title: string;
    images: {
      edges: Array<{
        node: {
          id: string;
          altText?: string | null;
        };
      }>;
    };
  };
  error?: string;
}> {
  try {
    // Ensure productId is in GID format
    const gid = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    // Build images input array
    const imagesInput = imageUpdates.map((img) => ({
      id: img.id.startsWith("gid://") ? img.id : `gid://shopify/ProductImage/${img.id}`,
      altText: img.altText,
    }));

    const response = await admin.graphql(UPDATE_PRODUCT_IMAGES_MUTATION, {
      variables: {
        input: {
          id: gid,
          images: imagesInput,
        },
      },
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return {
        success: false,
        error: data.errors[0]?.message || "Unknown GraphQL error",
      };
    }

    const result = data.data.productUpdate;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error("User errors:", result.userErrors);
      return {
        success: false,
        error: result.userErrors[0]?.message || "Failed to update images",
      };
    }

    return {
      success: true,
      product: result.product,
    };
  } catch (error) {
    console.error("Error updating product image ALT text:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update image ALT text",
    };
  }
}

/**
 * Bulk update image ALT text for multiple products
 *
 * @param admin - Shopify Admin API context
 * @param updates - Array of product updates with image ALT text changes
 * @returns Summary of successful and failed updates
 *
 * Rate limiting: Processes sequentially with 500ms delay between requests
 * to respect Shopify's GraphQL API rate limits.
 *
 * Example:
 * ```ts
 * await bulkUpdateImageAltText(admin, [
 *   {
 *     productId: "gid://shopify/Product/123",
 *     images: [{ id: "gid://shopify/ProductImage/456", altText: "New alt" }]
 *   }
 * ]);
 * ```
 */
export async function bulkUpdateImageAltText(
  admin: AdminApiContext,
  updates: Array<{
    productId: string;
    images: Array<{ id: string; altText: string }>;
  }>
): Promise<{
  success: boolean;
  updatedCount: number;
  errors: Array<{ productId: string; imageId?: string; message: string }>;
}> {
  const errors: Array<{ productId: string; imageId?: string; message: string }> = [];
  let updatedCount = 0;

  // Process updates sequentially with delay to respect rate limits
  for (const update of updates) {
    const result = await updateProductImageAltText(
      admin,
      update.productId,
      update.images
    );

    if (result.success) {
      updatedCount++;
    } else {
      errors.push({
        productId: update.productId,
        message: result.error || "Unknown error",
      });
    }

    // Delay to avoid rate limiting (500ms = 2 requests/second)
    if (updates.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    success: errors.length === 0,
    updatedCount,
    errors,
  };
}

/**
 * Calculate image statistics for a product
 *
 * @param images - Product images array
 * @returns Statistics about image ALT text completion
 */
export function calculateImageStats(
  images: Array<{ altText?: string | null }>
): {
  totalImages: number;
  imagesWithAlt: number;
  imagesMissingAlt: number;
  completionPercentage: number;
} {
  const totalImages = images.length;
  const imagesWithAlt = images.filter(
    (img) => img.altText && img.altText.trim() !== ""
  ).length;
  const imagesMissingAlt = totalImages - imagesWithAlt;
  const completionPercentage =
    totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;

  return {
    totalImages,
    imagesWithAlt,
    imagesMissingAlt,
    completionPercentage,
  };
}

/**
 * Convert position number to ordinal string
 *
 * @param position - Image position (1-indexed)
 * @returns Ordinal string (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalPosition(position: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = position % 100;
  return position + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
