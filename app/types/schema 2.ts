// app/types/schema.ts

/**
 * Schema.org JSON-LD Type Definitions
 * Following schema.org specifications for structured data
 */

export type SchemaType = 'PRODUCT' | 'ORGANIZATION' | 'BREADCRUMB';

export interface BaseSchema {
  '@context': string;
  '@type': string;
}

// ============= Product Schema Types =============

export interface ProductOffer {
  '@context'?: string;
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
  availability: string; // Schema.org URL
  url: string;
  seller?: OrganizationSchema;
}

export interface AggregateRating {
  '@type': 'AggregateRating';
  ratingValue: string;
  reviewCount: number;
  bestRating?: string;
  worstRating?: string;
}

export interface Review {
  '@type': 'Review';
  author: {
    '@type': 'Person';
    name: string;
  };
  reviewRating: {
    '@type': 'Rating';
    ratingValue: string;
    bestRating?: string;
  };
  reviewBody?: string;
  datePublished?: string;
}

export interface ProductSchema extends BaseSchema {
  '@type': 'Product';
  name: string;
  description: string;
  image: string[];
  url: string;
  sku: string;
  brand: {
    '@type': 'Organization';
    name: string;
  };
  offers: ProductOffer;
  aggregateRating?: AggregateRating;
  review?: Review[];
  gtin?: string;
  mpn?: string;
}

// ============= Organization Schema Types =============

export interface ContactPoint {
  '@type': 'ContactPoint';
  contactType: string;
  email?: string;
  telephone?: string;
  url?: string;
}

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface OrganizationSchema extends BaseSchema {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  contactPoint?: ContactPoint;
  sameAs?: string[];
  address?: PostalAddress;
  telephone?: string;
}

// ============= Breadcrumb Schema Types =============

export interface BreadcrumbListItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface BreadcrumbSchema extends BaseSchema {
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbListItem[];
}

// ============= Validation Types =============

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  path?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  schemaType: string;
}

// ============= Shopify Data Types =============

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  vendor: string;
  handle: string;
  productType?: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku?: string;
        availableForSale: boolean;
        price: string;
      };
    }>;
  };
}

export interface ShopInfo {
  name: string;
  primaryDomain: {
    url: string;
  };
  contactEmail?: string;
  myshopifyDomain: string;
}

export interface SocialMediaLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  pinterest?: string;
}

// ============= Database Types =============

export interface SchemaMarkupRecord {
  id: string;
  storeId: string;
  pageId?: string;
  type: SchemaType;
  schema: ProductSchema | OrganizationSchema | BreadcrumbSchema;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Resource Types =============

export type ResourceType = 'product' | 'collection' | 'page' | 'article' | 'blog' | 'home';

export interface BreadcrumbConfig {
  url: string;
  resourceType: ResourceType;
  resourceTitle: string;
  shopDomain: string;
  collectionTitle?: string;
  blogTitle?: string;
}

// ============= UI Types =============

export interface SchemaPreviewProps {
  schema: ProductSchema | OrganizationSchema | BreadcrumbSchema;
  schemaType: SchemaType;
  validation?: ValidationResult;
  onCopy?: () => void;
}

export interface ActiveSchemaRecord {
  id: string;
  type: SchemaType;
  resource: string;
  status: 'active' | 'inactive';
  lastUpdated: string;
  validationStatus: 'valid' | 'warning' | 'error';
}
