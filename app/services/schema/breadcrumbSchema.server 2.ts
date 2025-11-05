// app/services/schema/breadcrumbSchema.server.ts

import type { BreadcrumbSchema, BreadcrumbListItem, BreadcrumbConfig, ResourceType } from '~/types/schema';

/**
 * Normalizes URL to ensure it's absolute and uses HTTPS
 */
function normalizeUrl(url: string): string {
  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

/**
 * Parses a URL path into segments
 * Example: "/collections/shoes/products/sneaker" -> ["collections", "shoes", "products", "sneaker"]
 */
function parseUrlPath(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return path
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => decodeURIComponent(segment));
  } catch {
    // If URL parsing fails, try splitting the path directly
    return url
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => decodeURIComponent(segment));
  }
}

/**
 * Capitalizes first letter of each word in a string
 * Used for generating human-readable breadcrumb names from URL segments
 */
function toTitleCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates breadcrumb items for a product page
 * Path: Home → Collection → Product
 */
function generateProductBreadcrumbs(
  config: BreadcrumbConfig
): BreadcrumbListItem[] {
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${config.shopDomain}`;

  // 1. Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // 2. Collection (if available from URL or config)
  if (config.collectionTitle) {
    const segments = parseUrlPath(config.url);
    const collectionsIndex = segments.indexOf('collections');

    if (collectionsIndex !== -1 && segments[collectionsIndex + 1]) {
      const collectionHandle = segments[collectionsIndex + 1];

      items.push({
        '@type': 'ListItem',
        position: 2,
        name: config.collectionTitle,
        item: `${baseUrl}/collections/${collectionHandle}`
      });
    }
  }

  // 3. Product (current page)
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: config.resourceTitle,
    item: normalizeUrl(config.url)
  });

  return items;
}

/**
 * Generates breadcrumb items for a collection page
 * Path: Home → Collection
 */
function generateCollectionBreadcrumbs(
  config: BreadcrumbConfig
): BreadcrumbListItem[] {
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${config.shopDomain}`;

  // 1. Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // 2. Collection (current page)
  items.push({
    '@type': 'ListItem',
    position: 2,
    name: config.resourceTitle,
    item: normalizeUrl(config.url)
  });

  return items;
}

/**
 * Generates breadcrumb items for an article page
 * Path: Home → Blog → Article
 */
function generateArticleBreadcrumbs(
  config: BreadcrumbConfig
): BreadcrumbListItem[] {
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${config.shopDomain}`;

  // 1. Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // 2. Blog
  if (config.blogTitle) {
    const segments = parseUrlPath(config.url);
    const blogsIndex = segments.indexOf('blogs');

    if (blogsIndex !== -1 && segments[blogsIndex + 1]) {
      const blogHandle = segments[blogsIndex + 1];

      items.push({
        '@type': 'ListItem',
        position: 2,
        name: config.blogTitle,
        item: `${baseUrl}/blogs/${blogHandle}`
      });
    }
  } else {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: `${baseUrl}/blogs/news` // Default blog
    });
  }

  // 3. Article (current page)
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: config.resourceTitle,
    item: normalizeUrl(config.url)
  });

  return items;
}

/**
 * Generates breadcrumb items for a blog page
 * Path: Home → Blog
 */
function generateBlogBreadcrumbs(
  config: BreadcrumbConfig
): BreadcrumbListItem[] {
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${config.shopDomain}`;

  // 1. Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // 2. Blog (current page)
  items.push({
    '@type': 'ListItem',
    position: 2,
    name: config.resourceTitle,
    item: normalizeUrl(config.url)
  });

  return items;
}

/**
 * Generates breadcrumb items for a regular page
 * Path: Home → Page
 */
function generatePageBreadcrumbs(
  config: BreadcrumbConfig
): BreadcrumbListItem[] {
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${config.shopDomain}`;

  // 1. Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // 2. Page (current page)
  items.push({
    '@type': 'ListItem',
    position: 2,
    name: config.resourceTitle,
    item: normalizeUrl(config.url)
  });

  return items;
}

/**
 * Generates a complete BreadcrumbList schema (schema.org/BreadcrumbList)
 *
 * Automatically builds breadcrumb hierarchy based on the URL structure and resource type
 *
 * @param config - Configuration containing URL, resource type, title, and shop domain
 * @returns Complete BreadcrumbList JSON-LD schema object
 *
 * @example
 * // For a product page
 * const schema = generateBreadcrumbSchema({
 *   url: "https://store.com/collections/shoes/products/sneaker",
 *   resourceType: "product",
 *   resourceTitle: "Blue Sneaker",
 *   shopDomain: "store.myshopify.com",
 *   collectionTitle: "Shoes"
 * });
 *
 * @example
 * // For an article page
 * const schema = generateBreadcrumbSchema({
 *   url: "https://store.com/blogs/news/new-release",
 *   resourceType: "article",
 *   resourceTitle: "New Product Release",
 *   shopDomain: "store.myshopify.com",
 *   blogTitle: "News"
 * });
 */
export function generateBreadcrumbSchema(
  config: BreadcrumbConfig
): BreadcrumbSchema {
  let items: BreadcrumbListItem[];

  // Generate breadcrumb items based on resource type
  switch (config.resourceType) {
    case 'product':
      items = generateProductBreadcrumbs(config);
      break;
    case 'collection':
      items = generateCollectionBreadcrumbs(config);
      break;
    case 'article':
      items = generateArticleBreadcrumbs(config);
      break;
    case 'blog':
      items = generateBlogBreadcrumbs(config);
      break;
    case 'page':
      items = generatePageBreadcrumbs(config);
      break;
    case 'home':
      // Home page doesn't need breadcrumbs
      items = [];
      break;
    default:
      // Default to simple page breadcrumbs
      items = generatePageBreadcrumbs(config);
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  };
}

/**
 * Auto-generates breadcrumb schema from a URL by parsing the path structure
 * This is useful when you don't have explicit resource type information
 *
 * @param url - The full URL to parse
 * @param shopDomain - Shop domain
 * @param resourceTitle - Title of the current page/resource
 * @returns Complete BreadcrumbList schema
 */
export function generateBreadcrumbSchemaFromUrl(
  url: string,
  shopDomain: string,
  resourceTitle: string
): BreadcrumbSchema {
  const segments = parseUrlPath(url);
  const items: BreadcrumbListItem[] = [];
  const baseUrl = `https://${shopDomain}`;

  // Always start with Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: baseUrl
  });

  // Build breadcrumbs from URL segments
  let currentPath = baseUrl;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip common Shopify path prefixes that aren't breadcrumb-worthy
    if (['products', 'pages', 'blogs', 'collections'].includes(segment)) {
      continue;
    }

    // Check if next segment is also a path prefix
    const nextSegment = segments[i + 1];
    if (nextSegment && ['products', 'pages'].includes(nextSegment)) {
      continue;
    }

    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: toTitleCase(segment),
      item: currentPath
    });
  }

  // Add current page
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: resourceTitle,
    item: normalizeUrl(url)
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  };
}

/**
 * Validates breadcrumb configuration
 */
export function validateBreadcrumbConfig(config: BreadcrumbConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.url || config.url.trim().length === 0) {
    errors.push('URL is required');
  }

  if (!config.resourceType) {
    errors.push('Resource type is required');
  }

  if (!config.resourceTitle || config.resourceTitle.trim().length === 0) {
    errors.push('Resource title is required');
  }

  if (!config.shopDomain || config.shopDomain.trim().length === 0) {
    errors.push('Shop domain is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates example breadcrumb schema for preview/documentation purposes
 */
export function generateExampleBreadcrumbSchema(
  shopDomain: string
): BreadcrumbSchema {
  return generateBreadcrumbSchema({
    url: `https://${shopDomain}/collections/clothing/products/blue-t-shirt`,
    resourceType: 'product',
    resourceTitle: 'Blue Cotton T-Shirt',
    shopDomain: shopDomain,
    collectionTitle: 'Clothing'
  });
}
