// app/services/schema/organizationSchema.server.ts

import type { OrganizationSchema, ShopInfo, SocialMediaLinks } from '~/types/schema';

/**
 * Validates and formats a URL to ensure it's absolute and uses HTTPS
 */
function normalizeUrl(url: string): string {
  if (!url) return '';

  // If the URL doesn't start with http:// or https://, add https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Upgrade HTTP to HTTPS for security
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

/**
 * Validates that a URL is a valid social media profile URL
 */
function isValidSocialUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;

  try {
    const urlObj = new URL(url);
    // Must be HTTPS and have a domain
    return urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Extracts valid social media URLs from configuration
 * Filters out empty or invalid URLs
 */
function extractSocialMediaUrls(socialLinks?: SocialMediaLinks): string[] {
  if (!socialLinks) return [];

  const urls: string[] = [];

  // Check each social platform
  if (socialLinks.facebook && isValidSocialUrl(socialLinks.facebook)) {
    urls.push(normalizeUrl(socialLinks.facebook));
  }

  if (socialLinks.twitter && isValidSocialUrl(socialLinks.twitter)) {
    urls.push(normalizeUrl(socialLinks.twitter));
  }

  if (socialLinks.instagram && isValidSocialUrl(socialLinks.instagram)) {
    urls.push(normalizeUrl(socialLinks.instagram));
  }

  if (socialLinks.linkedin && isValidSocialUrl(socialLinks.linkedin)) {
    urls.push(normalizeUrl(socialLinks.linkedin));
  }

  if (socialLinks.youtube && isValidSocialUrl(socialLinks.youtube)) {
    urls.push(normalizeUrl(socialLinks.youtube));
  }

  if (socialLinks.pinterest && isValidSocialUrl(socialLinks.pinterest)) {
    urls.push(normalizeUrl(socialLinks.pinterest));
  }

  return urls;
}

/**
 * Generates a default logo URL for stores without a custom logo
 * This would typically point to a default Shopify logo or theme logo
 */
function getDefaultLogoUrl(shopDomain: string): string {
  // In production, this might fetch from theme settings or use a default
  // For now, return a placeholder that indicates logo should be configured
  return `https://${shopDomain}/cdn/shop/files/logo.png`;
}

/**
 * Generates a complete Organization schema (schema.org/Organization) for a Shopify store
 *
 * @param shopInfo - Shop information from Shopify GraphQL query
 * @param options - Optional configuration including logo URL and social media links
 * @returns Complete Organization JSON-LD schema object
 *
 * @example
 * const schema = generateOrganizationSchema(shopInfo, {
 *   logoUrl: "https://cdn.shopify.com/logo.png",
 *   socialLinks: { facebook: "https://facebook.com/store", twitter: "..." }
 * });
 */
export function generateOrganizationSchema(
  shopInfo: ShopInfo,
  options?: {
    logoUrl?: string;
    socialLinks?: SocialMediaLinks;
    contactPhone?: string;
    address?: {
      streetAddress?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  }
): OrganizationSchema {
  // Normalize shop URL (ensure HTTPS)
  const shopUrl = normalizeUrl(shopInfo.primaryDomain.url);

  // Build base schema with required fields
  const schema: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: shopInfo.name,
    url: shopUrl
  };

  // Add logo (required for most rich results)
  if (options?.logoUrl) {
    schema.logo = normalizeUrl(options.logoUrl);
  } else {
    // Use default logo location
    schema.logo = getDefaultLogoUrl(shopInfo.myshopifyDomain);
  }

  // Add contact point if email is available
  if (shopInfo.contactEmail) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: shopInfo.contactEmail
    };

    // Add contact page URL
    schema.contactPoint.url = `${shopUrl}/pages/contact`;

    // Add phone number if provided
    if (options?.contactPhone) {
      schema.contactPoint.telephone = options.contactPhone;
    }
  }

  // Add social media profiles (sameAs property)
  if (options?.socialLinks) {
    const socialUrls = extractSocialMediaUrls(options.socialLinks);
    if (socialUrls.length > 0) {
      schema.sameAs = socialUrls;
    }
  }

  // Add physical address if provided
  if (options?.address) {
    const { streetAddress, city, state, postalCode, country } = options.address;

    // Only add address if at least city or country is provided
    if (city || country) {
      schema.address = {
        '@type': 'PostalAddress'
      };

      if (streetAddress) schema.address.streetAddress = streetAddress;
      if (city) schema.address.addressLocality = city;
      if (state) schema.address.addressRegion = state;
      if (postalCode) schema.address.postalCode = postalCode;
      if (country) schema.address.addressCountry = country;
    }
  }

  // Add main telephone number if provided
  if (options?.contactPhone) {
    schema.telephone = options.contactPhone;
  }

  return schema;
}

/**
 * Generates a minimal Organization schema with only required fields
 * Useful for quick setup or when optional data isn't available
 */
export function generateMinimalOrganizationSchema(
  shopInfo: ShopInfo
): OrganizationSchema {
  const shopUrl = normalizeUrl(shopInfo.primaryDomain.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: shopInfo.name,
    url: shopUrl,
    logo: getDefaultLogoUrl(shopInfo.myshopifyDomain)
  };
}

/**
 * Validates shop info has the minimum required data for organization schema
 */
export function validateShopInfoForSchema(shopInfo: ShopInfo): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!shopInfo.name || shopInfo.name.trim().length === 0) {
    errors.push('Shop name is required');
  }

  if (!shopInfo.primaryDomain?.url || shopInfo.primaryDomain.url.trim().length === 0) {
    errors.push('Shop URL is required');
  }

  // Recommended fields (warnings)
  if (!shopInfo.contactEmail || shopInfo.contactEmail.trim().length === 0) {
    warnings.push('Contact email is recommended for better SEO');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper to extract social media links from various sources
 * Can be extended to pull from metafields or other Shopify data
 */
export function extractSocialLinksFromMetafields(
  metafields?: Array<{ key: string; value: string }>
): SocialMediaLinks | undefined {
  if (!metafields || metafields.length === 0) return undefined;

  const socialLinks: SocialMediaLinks = {};

  metafields.forEach(field => {
    const key = field.key.toLowerCase();
    const value = field.value;

    if (key.includes('facebook')) {
      socialLinks.facebook = value;
    } else if (key.includes('twitter')) {
      socialLinks.twitter = value;
    } else if (key.includes('instagram')) {
      socialLinks.instagram = value;
    } else if (key.includes('linkedin')) {
      socialLinks.linkedin = value;
    } else if (key.includes('youtube')) {
      socialLinks.youtube = value;
    } else if (key.includes('pinterest')) {
      socialLinks.pinterest = value;
    }
  });

  return Object.keys(socialLinks).length > 0 ? socialLinks : undefined;
}

/**
 * Merges multiple organization schemas (useful for aggregating data from different sources)
 */
export function mergeOrganizationSchemas(
  baseSchema: OrganizationSchema,
  updates: Partial<OrganizationSchema>
): OrganizationSchema {
  return {
    ...baseSchema,
    ...updates,
    // Merge sameAs arrays if both exist
    sameAs: [
      ...(baseSchema.sameAs || []),
      ...(updates.sameAs || [])
    ].filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
  };
}
