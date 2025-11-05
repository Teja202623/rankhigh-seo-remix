// app/types/sitemap.ts

/**
 * Sitemap URL change frequency values as defined by sitemaps.org protocol
 */
export type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

/**
 * Priority value for sitemap URLs (0.0 to 1.0)
 */
export type Priority = number; // 0.0 - 1.0

/**
 * Types of content that can be included in the sitemap
 */
export type SitemapContentType =
  | "product"
  | "collection"
  | "page"
  | "blog_post"
  | "homepage"
  | "collections_page";

/**
 * Individual URL entry in the sitemap
 */
export interface SitemapUrl {
  loc: string; // Absolute URL
  lastmod?: string; // ISO 8601 date format
  changefreq?: ChangeFrequency;
  priority?: Priority;
  contentType?: SitemapContentType; // For internal tracking
}

/**
 * Complete sitemap structure
 */
export interface Sitemap {
  urls: SitemapUrl[];
  generated: Date;
  urlCount: number;
}

/**
 * Exclusion rules configuration stored in database
 */
export interface ExclusionRules {
  excludePasswordProtected: boolean;
  excludeOutOfStock: boolean;
  excludeDraft: boolean;
  excludeSearch: boolean;
  excludeCart: boolean;
  excludeCheckout: boolean;
  excludeAccount: boolean;
  customExclusions: string[]; // Array of regex patterns
}

/**
 * Sitemap generation options
 */
export interface SitemapGenerationOptions {
  shopDomain: string;
  exclusionRules: ExclusionRules;
  maxUrls?: number; // FREE tier limit
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: "error" | "warning";
  message: string;
  line?: number;
  url?: string;
}

/**
 * Sitemap validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  statistics: {
    totalUrls: number;
    fileSize: number;
    duplicateUrls: number;
    invalidUrls: number;
  };
}

/**
 * Sitemap statistics for UI display
 */
export interface SitemapStatistics {
  totalUrls: number;
  lastGenerated: Date | null;
  fileSize: number;
  urlsByType: {
    products: number;
    collections: number;
    pages: number;
    blogPosts: number;
    other: number;
  };
  freeTierUsage?: {
    used: number;
    limit: number;
    percentage: number;
  };
}

/**
 * Shopify product node for sitemap generation
 */
export interface ShopifyProductNode {
  id: string;
  handle: string;
  updatedAt: string;
  status: string;
  totalInventory?: number;
}

/**
 * Shopify collection node for sitemap generation
 */
export interface ShopifyCollectionNode {
  id: string;
  handle: string;
  updatedAt: string;
}

/**
 * Shopify page node for sitemap generation
 */
export interface ShopifyPageNode {
  id: string;
  handle: string;
  updatedAt: string;
}

/**
 * Shopify blog article node for sitemap generation
 */
export interface ShopifyArticleNode {
  id: string;
  handle: string;
  updatedAt: string;
  blog: {
    handle: string;
  };
}

/**
 * GraphQL response structure for products
 */
export interface ProductsQueryResponse {
  products: {
    edges: Array<{
      node: ShopifyProductNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

/**
 * GraphQL response structure for collections
 */
export interface CollectionsQueryResponse {
  collections: {
    edges: Array<{
      node: ShopifyCollectionNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

/**
 * GraphQL response structure for pages
 */
export interface PagesQueryResponse {
  pages: {
    edges: Array<{
      node: ShopifyPageNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

/**
 * GraphQL response structure for blog articles
 */
export interface ArticlesQueryResponse {
  articles: {
    edges: Array<{
      node: ShopifyArticleNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}
