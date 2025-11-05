// app/services/schema/productSchema.server.ts

import type { ProductSchema, ShopifyProduct } from '~/types/schema';

/**
 * Strips HTML tags from a string
 * Used to clean product descriptions for schema markup
 */
function stripHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Truncates text to a maximum length while preserving word boundaries
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If we found a space, cut at the word boundary
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Determines schema.org availability status based on Shopify availability
 */
function getAvailabilityStatus(availableForSale: boolean): string {
  return availableForSale
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

/**
 * Extracts image URLs from Shopify product data
 * Returns up to 5 images for the schema
 */
function extractImageUrls(product: ShopifyProduct): string[] {
  if (!product.images?.edges || product.images.edges.length === 0) {
    return [];
  }

  return product.images.edges
    .slice(0, 5) // Limit to 5 images as per best practices
    .map(edge => edge.node.url)
    .filter(url => url && url.length > 0);
}

/**
 * Formats price for schema.org (removes currency symbols, ensures decimal format)
 */
function formatPrice(price: string): string {
  // Remove any currency symbols and spaces
  const cleaned = price.replace(/[^0-9.]/g, '');

  // Ensure we have a valid number with 2 decimal places
  const numPrice = parseFloat(cleaned);
  return numPrice.toFixed(2);
}

/**
 * Generates a complete Product schema (schema.org/Product) for a Shopify product
 *
 * @param product - Shopify product data from GraphQL query
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @returns Complete Product JSON-LD schema object
 *
 * @example
 * const schema = generateProductSchema(product, "mystore.myshopify.com");
 * // Returns valid JSON-LD that can be embedded in <script type="application/ld+json">
 */
export function generateProductSchema(
  product: ShopifyProduct,
  shopDomain: string
): ProductSchema {
  // Extract first variant for offer data (single-offer products)
  const firstVariant = product.variants?.edges?.[0]?.node;

  if (!firstVariant) {
    throw new Error('Product must have at least one variant');
  }

  // Build product URL
  const productUrl = `https://${shopDomain}/products/${product.handle}`;

  // Clean and truncate description (200 chars max as per best practices)
  const cleanDescription = stripHtml(product.description || '');
  const truncatedDescription = truncateText(cleanDescription, 200);

  // Extract images
  const imageUrls = extractImageUrls(product);

  // Get price and currency from product
  const price = formatPrice(product.priceRangeV2.minVariantPrice.amount);
  const currency = product.priceRangeV2.minVariantPrice.currencyCode;

  // Get availability status
  const availability = getAvailabilityStatus(firstVariant.availableForSale);

  // Build the schema
  const schema: ProductSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: truncatedDescription,
    image: imageUrls,
    url: productUrl,
    sku: firstVariant.sku || firstVariant.id,
    brand: {
      '@type': 'Organization',
      name: product.vendor || 'Unknown Vendor'
    },
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: currency,
      availability: availability,
      url: productUrl,
      seller: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: product.vendor || 'Unknown Vendor',
        url: `https://${shopDomain}`
      }
    }
  };

  // Add optional product type if available
  if (product.productType) {
    // Note: productType can be added as additionalType in future enhancements
    // For now, it's available in the product data for potential use
  }

  return schema;
}

/**
 * Generates Product schema with aggregate rating (if reviews exist)
 * This is an enhanced version that includes rating data
 *
 * Note: Shopify doesn't provide native review data, so this would need
 * to be integrated with a review app (Judge.me, Yotpo, etc.)
 */
export function generateProductSchemaWithRating(
  product: ShopifyProduct,
  shopDomain: string,
  rating?: {
    averageRating: number;
    reviewCount: number;
  }
): ProductSchema {
  const baseSchema = generateProductSchema(product, shopDomain);

  // Add aggregate rating if provided
  if (rating && rating.reviewCount > 0) {
    baseSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.averageRating.toFixed(1),
      reviewCount: rating.reviewCount,
      bestRating: '5',
      worstRating: '1'
    };
  }

  return baseSchema;
}

/**
 * Validates that a product has the minimum required data for schema generation
 */
export function validateProductForSchema(product: ShopifyProduct): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!product.title || product.title.trim().length === 0) {
    errors.push('Product title is required');
  }

  if (!product.handle || product.handle.trim().length === 0) {
    errors.push('Product handle is required');
  }

  if (!product.variants?.edges || product.variants.edges.length === 0) {
    errors.push('Product must have at least one variant');
  }

  if (!product.priceRangeV2?.minVariantPrice) {
    errors.push('Product price information is missing');
  }

  if (!product.vendor || product.vendor.trim().length === 0) {
    errors.push('Product vendor/brand is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Batch generates product schemas for multiple products
 * Useful for bulk operations (PRO tier feature)
 */
export function generateBulkProductSchemas(
  products: ShopifyProduct[],
  shopDomain: string
): Array<{ productId: string; schema: ProductSchema; errors?: string[] }> {
  return products.map(product => {
    const validation = validateProductForSchema(product);

    if (!validation.isValid) {
      return {
        productId: product.id,
        schema: {} as ProductSchema,
        errors: validation.errors
      };
    }

    try {
      const schema = generateProductSchema(product, shopDomain);
      return {
        productId: product.id,
        schema
      };
    } catch (error) {
      return {
        productId: product.id,
        schema: {} as ProductSchema,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  });
}
