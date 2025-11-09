// app/types/seo.ts
/**
 * TypeScript interfaces for SEO Meta Editor feature
 *
 * This file defines all types used across the meta editor components:
 * - Product data from Shopify API
 * - SEO metadata structures
 * - Template system types
 * - Character/pixel counting utilities
 */

/**
 * Shopify Product with SEO fields
 * Maps to the GraphQL Admin API product response
 */
export interface ShopifyProduct {
  id: string; // Format: gid://shopify/Product/123456
  title: string;
  handle: string;
  description?: string;
  vendor?: string;
  productType?: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  seo: {
    title?: string | null;
    description?: string | null;
  };
  featuredImage?: {
    url: string;
    altText?: string;
  } | null;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  onlineStoreUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated product list response
 * Shopify uses cursor-based pagination
 */
export interface ProductConnection {
  edges: Array<{
    cursor: string;
    node: ShopifyProduct;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

/**
 * Product update input for mutations
 */
export interface ProductUpdateInput {
  id: string; // Must be full GID format
  seo: {
    title: string;
    description: string;
  };
}

/**
 * Meta template variable definition
 * Variables can be inserted into templates: {product_title}, {vendor}, etc.
 */
export interface TemplateVariable {
  key: string; // e.g., "product_title"
  label: string; // e.g., "Product Title"
  description: string; // What this variable represents
  example: string; // Example output
}

/**
 * Pre-built meta template
 */
export interface MetaTemplate {
  id: string;
  name: string;
  description: string;
  titleTemplate: string; // e.g., "{product_title} | {store_name}"
  descriptionTemplate: string; // e.g., "Buy {product_title} from {vendor}..."
  category: "product" | "collection" | "blog" | "custom";
  isDefault?: boolean;
}

/**
 * Custom template saved by user
 */
export interface SavedTemplate {
  id: string;
  storeId: string;
  name: string;
  titleTemplate: string;
  descriptionTemplate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * SEO character count analysis
 * Helps users optimize meta tags for search engines
 */
export interface MetaAnalysis {
  title: {
    length: number; // Character count
    pixelWidth: number; // Approximate pixel width in SERP
    status: "too_short" | "optimal" | "too_long"; // < 50, 50-60, > 60
    truncated?: string; // How it appears if truncated
  };
  description: {
    length: number;
    pixelWidth: number;
    status: "too_short" | "optimal" | "too_long"; // < 120, 150-160, > 160
    truncated?: string;
  };
}

/**
 * Product with local editing state
 * Used in the UI to track changes before saving
 */
export interface ProductWithDraft extends ShopifyProduct {
  draft?: {
    title: string;
    description: string;
  };
  isEditing?: boolean;
  isDirty?: boolean; // Has unsaved changes
}

/**
 * Bulk edit operation
 */
export interface BulkEditOperation {
  productIds: string[];
  template: MetaTemplate;
  applyToTitle: boolean;
  applyToDescription: boolean;
}

/**
 * API Response types
 */
export interface ProductsLoaderData {
  products: ShopifyProduct[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
  store: {
    id: string;
    plan: string;
    shopUrl: string;
  };
  limits: {
    maxProducts: number; // FREE: 50, BASIC: 200, PRO: unlimited
    maxBulkEdit: number; // FREE: 10, BASIC: 50, PRO: 200
    currentUsage: number;
  };
  templates: MetaTemplate[];
}

/**
 * Action response for product updates
 */
export interface UpdateProductResponse {
  success: boolean;
  updatedCount: number;
  errors?: Array<{
    productId: string;
    message: string;
  }>;
  limitExceeded?: boolean;
}

/**
 * Filter/search parameters
 */
export interface ProductFilters {
  query?: string; // Search by title/SKU
  status?: "ACTIVE" | "ARCHIVED" | "DRAFT";
  hasMetaIssues?: boolean; // Missing or suboptimal meta tags
  cursor?: string; // For pagination
  limit?: number;
}

/**
 * Product Image from Shopify Admin API
 * Represents a single product image with ALT text
 */
export interface ProductImage {
  id: string; // Format: gid://shopify/MediaImage/123456
  src: string; // Image URL
  url?: string; // Alias for compatibility with audit tooling
  altText?: string | null; // ALT text for accessibility and SEO
  width?: number;
  height?: number;
  position?: number; // Order in product gallery (1-indexed)
  productImageId?: string; // Legacy gid://shopify/ProductImage/...
  fileId?: string; // Explicit file identifier (same as id)
}

/**
 * Shopify Product with full image data
 * Extended version with all product images (not just featured)
 */
export interface ProductWithImages {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  productType?: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  images: {
    edges: Array<{
      node: ProductImage;
    }>;
  };
  featuredImage?: {
    url: string;
    altText?: string;
  } | null;
}

/**
 * Product with image editing state
 * Tracks local changes to image ALT text before saving
 */
export interface ProductWithImageDraft extends ProductWithImages {
  imageDrafts?: Record<string, string>; // Map of imageId -> draft ALT text
  isDirty?: boolean;
  stats?: {
    totalImages: number;
    imagesWithAlt: number;
    imagesMissingAlt: number;
    completionPercentage: number;
  };
}

/**
 * Image ALT text template
 * Pre-built templates for common image scenarios
 */
export interface AltTemplate {
  id: string;
  name: string;
  description: string;
  template: string; // e.g., "{product_title} by {vendor}"
  category: "main" | "variant" | "lifestyle" | "detail" | "custom";
  isDefault?: boolean;
}

/**
 * Image update input for mutations
 */
export interface ImageUpdateInput {
  id: string; // Product GID
  images: Array<{
    id?: string; // Image GID (optional for new images)
    altText: string;
  }>;
}

/**
 * ALT text template variable
 * Variables specific to image ALT text generation
 */
export interface AltTemplateVariable extends TemplateVariable {
  appliesToPosition?: boolean; // Can use {position} variable
}

/**
 * Image loader data for ALT text manager
 */
export interface ImageLoaderData {
  products: ProductWithImageDraft[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  stats: {
    totalProducts: number;
    totalImages: number;
    imagesWithAlt: number;
    imagesMissingAlt: number;
    completionPercentage: number;
  };
  store: {
    id: string;
    plan: string;
    shopUrl: string;
    name: string;
  };
  limits: {
    maxProducts: number;
    maxBulkEdit: number;
    currentUsage: number;
  };
  templates: AltTemplate[];
}

/**
 * Image update response
 */
export interface UpdateImageResponse {
  success: boolean;
  updatedCount: number;
  errors?: Array<{
    productId: string;
    imageId?: string;
    message: string;
  }>;
  limitExceeded?: boolean;
}

/**
 * Character width calculation utilities
 * Based on Google's font rendering in SERPs
 */
export const CHAR_WIDTHS = {
  // Average pixel widths for common characters in Google's SERP font
  uppercase: 10, // A-Z
  lowercase: 7, // a-z
  number: 8, // 0-9
  space: 3,
  punctuation: 5, // .,!?;:
  special: 9, // @#$%
} as const;

/**
 * Google SERP display limits (approximate)
 */
export const SERP_LIMITS = {
  title: {
    minChars: 50,
    maxChars: 60,
    maxPixels: 600,
  },
  description: {
    minChars: 120,
    maxChars: 160,
    maxPixels: 920,
  },
} as const;

/**
 * Default meta templates
 * Available to all users out of the box
 */
export const DEFAULT_TEMPLATES: MetaTemplate[] = [
  {
    id: "default-product-1",
    name: "Product with Store",
    description: "Classic product title with store branding",
    titleTemplate: "{product_title} | {store_name}",
    descriptionTemplate: "Shop {product_title} at {store_name}. {description}",
    category: "product",
    isDefault: true,
  },
  {
    id: "default-product-2",
    name: "Product with Price",
    description: "Highlight product pricing in meta description",
    titleTemplate: "{product_title} - {product_type}",
    descriptionTemplate: "Buy {product_title} for {price}. {description} Shop now at {store_name}!",
    category: "product",
  },
  {
    id: "default-product-3",
    name: "Product with Vendor",
    description: "Emphasize brand/vendor name",
    titleTemplate: "{product_title} by {vendor} | {store_name}",
    descriptionTemplate: "Discover {product_title} from {vendor}. {description} Available at {store_name}.",
    category: "product",
  },
  {
    id: "default-product-4",
    name: "Product Type Focus",
    description: "Category-first approach for SEO",
    titleTemplate: "{product_type}: {product_title}",
    descriptionTemplate: "Looking for {product_type}? Check out {product_title}. {description}",
    category: "product",
  },
  {
    id: "default-collection-1",
    name: "Collection Standard",
    description: "Collection page meta tags",
    titleTemplate: "{collection} Collection | {store_name}",
    descriptionTemplate: "Browse our {collection} collection. Find the perfect products for your needs.",
    category: "collection",
  },
];

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: "product_title",
    label: "Product Title",
    description: "The product's display title",
    example: "Wireless Bluetooth Headphones",
  },
  {
    key: "vendor",
    label: "Vendor/Brand",
    description: "The product vendor or brand name",
    example: "TechAudio",
  },
  {
    key: "product_type",
    label: "Product Type",
    description: "The product category or type",
    example: "Electronics",
  },
  {
    key: "price",
    label: "Price",
    description: "Product price with currency",
    example: "$99.99",
  },
  {
    key: "store_name",
    label: "Store Name",
    description: "Your Shopify store name",
    example: "MyStore",
  },
  {
    key: "description",
    label: "Product Description",
    description: "First 100 chars of product description",
    example: "Premium wireless headphones with noise cancellation...",
  },
  {
    key: "collection",
    label: "Collection",
    description: "Primary collection name",
    example: "Audio Accessories",
  },
];

/**
 * FREE tier limits
 */
export const FREE_TIER_LIMITS = {
  maxProducts: 50,
  maxBulkEdit: 10,
  maxCustomTemplates: 3,
} as const;

export const BASIC_TIER_LIMITS = {
  maxProducts: 200,
  maxBulkEdit: 50,
  maxCustomTemplates: 10,
} as const;

export const PRO_TIER_LIMITS = {
  maxProducts: -1, // Unlimited
  maxBulkEdit: 200,
  maxCustomTemplates: -1, // Unlimited
} as const;

/**
 * Default ALT text templates for product images
 * Optimized for SEO and accessibility
 */
export const DEFAULT_ALT_TEMPLATES: AltTemplate[] = [
  {
    id: "alt-main-1",
    name: "Product Main Image",
    description: "Simple product title with vendor",
    template: "{product_title} by {vendor}",
    category: "main",
    isDefault: true,
  },
  {
    id: "alt-main-2",
    name: "Product with Type",
    description: "Product title with category",
    template: "{product_title} - {product_type}",
    category: "main",
  },
  {
    id: "alt-variant-1",
    name: "Product Variant",
    description: "Include color and size for variants",
    template: "{product_title} - {color} {size}",
    category: "variant",
  },
  {
    id: "alt-detail-1",
    name: "Product Detail View",
    description: "Numbered view (1st image, 2nd image, etc.)",
    template: "{product_title} - {position} view",
    category: "detail",
  },
  {
    id: "alt-lifestyle-1",
    name: "Lifestyle Image",
    description: "Product in use context",
    template: "{product_title} in use",
    category: "lifestyle",
  },
  {
    id: "alt-vendor-focus",
    name: "Brand Focus",
    description: "Emphasize vendor/brand",
    template: "{vendor} {product_title}",
    category: "main",
  },
];

/**
 * Available ALT template variables
 * Includes position-based variables for image order
 */
export const ALT_TEMPLATE_VARIABLES: AltTemplateVariable[] = [
  {
    key: "product_title",
    label: "Product Title",
    description: "The product's display title",
    example: "Wireless Bluetooth Headphones",
    appliesToPosition: false,
  },
  {
    key: "vendor",
    label: "Vendor/Brand",
    description: "The product vendor or brand name",
    example: "TechAudio",
    appliesToPosition: false,
  },
  {
    key: "product_type",
    label: "Product Type",
    description: "The product category or type",
    example: "Electronics",
    appliesToPosition: false,
  },
  {
    key: "color",
    label: "Color",
    description: "Product color (if available in variant)",
    example: "Black",
    appliesToPosition: false,
  },
  {
    key: "size",
    label: "Size",
    description: "Product size (if available in variant)",
    example: "Large",
    appliesToPosition: false,
  },
  {
    key: "position",
    label: "Image Position",
    description: "Image order number (1st, 2nd, 3rd, etc.)",
    example: "1st",
    appliesToPosition: true,
  },
  {
    key: "store_name",
    label: "Store Name",
    description: "Your Shopify store name",
    example: "MyStore",
    appliesToPosition: false,
  },
];
