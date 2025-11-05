// app/services/schema/schemaValidator.server.ts

import type {
  ProductSchema,
  OrganizationSchema,
  BreadcrumbSchema,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity
} from '~/types/schema';

/**
 * Validates that a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);
    // Must use HTTPS for security and SEO
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates that a string is a valid email address
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that a price is in the correct format
 */
function isValidPrice(price: string): boolean {
  if (!price || typeof price !== 'string') return false;

  // Price should be a number with up to 2 decimal places
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  return priceRegex.test(price);
}

/**
 * Validates that a currency code is valid (ISO 4217)
 */
function isValidCurrency(currency: string): boolean {
  if (!currency || typeof currency !== 'string') return false;

  // Must be 3 uppercase letters
  return /^[A-Z]{3}$/.test(currency);
}

/**
 * Validates that a schema.org availability URL is valid
 */
function isValidAvailability(availability: string): boolean {
  const validAvailabilities = [
    'https://schema.org/InStock',
    'https://schema.org/OutOfStock',
    'https://schema.org/PreOrder',
    'https://schema.org/BackOrder',
    'https://schema.org/Discontinued',
    'https://schema.org/SoldOut',
    'https://schema.org/LimitedAvailability'
  ];

  return validAvailabilities.includes(availability);
}

/**
 * Creates a validation issue object
 */
function createIssue(
  field: string,
  message: string,
  severity: ValidationSeverity,
  path?: string
): ValidationIssue {
  return { field, message, severity, path };
}

/**
 * Validates a Product schema (schema.org/Product)
 *
 * Checks for required fields, recommended fields, and validates data formats
 */
export function validateProductSchema(schema: ProductSchema): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields validation
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    issues.push(createIssue('@context', 'Must be "https://schema.org"', 'error'));
  }

  if (!schema['@type'] || schema['@type'] !== 'Product') {
    issues.push(createIssue('@type', 'Must be "Product"', 'error'));
  }

  if (!schema.name || schema.name.trim().length === 0) {
    issues.push(createIssue('name', 'Product name is required', 'error'));
  }

  if (!schema.description || schema.description.trim().length === 0) {
    issues.push(createIssue('description', 'Product description is required', 'error'));
  } else if (schema.description.length < 50) {
    issues.push(createIssue('description', 'Description should be at least 50 characters for better SEO', 'warning'));
  }

  // Image validation
  if (!schema.image || schema.image.length === 0) {
    issues.push(createIssue('image', 'At least one product image is required', 'error'));
  } else {
    schema.image.forEach((imageUrl, index) => {
      if (!isValidUrl(imageUrl)) {
        issues.push(createIssue('image', `Image URL at index ${index} is not a valid HTTPS URL`, 'error', `image[${index}]`));
      }
    });
  }

  // URL validation
  if (!schema.url) {
    issues.push(createIssue('url', 'Product URL is required', 'error'));
  } else if (!isValidUrl(schema.url)) {
    issues.push(createIssue('url', 'Product URL must be a valid HTTPS URL', 'error'));
  }

  // SKU validation
  if (!schema.sku || schema.sku.trim().length === 0) {
    issues.push(createIssue('sku', 'Product SKU is required', 'error'));
  }

  // Brand validation
  if (!schema.brand || !schema.brand.name) {
    issues.push(createIssue('brand.name', 'Brand name is required', 'error'));
  }

  // Offers validation
  if (!schema.offers) {
    issues.push(createIssue('offers', 'Product offers are required', 'error'));
  } else {
    const offer = schema.offers;

    if (!offer.price) {
      issues.push(createIssue('offers.price', 'Offer price is required', 'error'));
    } else if (!isValidPrice(offer.price)) {
      issues.push(createIssue('offers.price', 'Price must be a valid number (e.g., "29.99")', 'error'));
    }

    if (!offer.priceCurrency) {
      issues.push(createIssue('offers.priceCurrency', 'Price currency is required', 'error'));
    } else if (!isValidCurrency(offer.priceCurrency)) {
      issues.push(createIssue('offers.priceCurrency', 'Currency must be a valid 3-letter ISO code (e.g., "USD")', 'error'));
    }

    if (!offer.availability) {
      issues.push(createIssue('offers.availability', 'Availability status is required', 'error'));
    } else if (!isValidAvailability(offer.availability)) {
      issues.push(createIssue('offers.availability', 'Availability must be a valid schema.org URL', 'error'));
    }

    if (!offer.url) {
      issues.push(createIssue('offers.url', 'Offer URL is required', 'error'));
    } else if (!isValidUrl(offer.url)) {
      issues.push(createIssue('offers.url', 'Offer URL must be a valid HTTPS URL', 'error'));
    }
  }

  // Recommended fields (warnings)
  if (!schema.aggregateRating) {
    issues.push(createIssue('aggregateRating', 'Adding ratings can improve search visibility', 'info'));
  }

  if (!schema.gtin && !schema.mpn) {
    issues.push(createIssue('gtin/mpn', 'Adding GTIN or MPN can improve product matching in search', 'info'));
  }

  return {
    isValid: !issues.some(issue => issue.severity === 'error'),
    issues,
    schemaType: 'Product'
  };
}

/**
 * Validates an Organization schema (schema.org/Organization)
 */
export function validateOrganizationSchema(schema: OrganizationSchema): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields validation
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    issues.push(createIssue('@context', 'Must be "https://schema.org"', 'error'));
  }

  if (!schema['@type'] || schema['@type'] !== 'Organization') {
    issues.push(createIssue('@type', 'Must be "Organization"', 'error'));
  }

  if (!schema.name || schema.name.trim().length === 0) {
    issues.push(createIssue('name', 'Organization name is required', 'error'));
  }

  if (!schema.url) {
    issues.push(createIssue('url', 'Organization URL is required', 'error'));
  } else if (!isValidUrl(schema.url)) {
    issues.push(createIssue('url', 'Organization URL must be a valid HTTPS URL', 'error'));
  }

  // Logo validation (required for most rich results)
  if (!schema.logo) {
    issues.push(createIssue('logo', 'Logo is required for Google rich results', 'warning'));
  } else if (!isValidUrl(schema.logo)) {
    issues.push(createIssue('logo', 'Logo URL must be a valid HTTPS URL', 'error'));
  }

  // Contact point validation
  if (schema.contactPoint) {
    const contact = schema.contactPoint;

    if (contact.email && !isValidEmail(contact.email)) {
      issues.push(createIssue('contactPoint.email', 'Invalid email format', 'error'));
    }

    if (contact.url && !isValidUrl(contact.url)) {
      issues.push(createIssue('contactPoint.url', 'Contact URL must be a valid HTTPS URL', 'error'));
    }

    if (!contact.email && !contact.telephone && !contact.url) {
      issues.push(createIssue('contactPoint', 'Contact point should have at least email, telephone, or URL', 'warning'));
    }
  } else {
    issues.push(createIssue('contactPoint', 'Adding contact information improves customer trust', 'info'));
  }

  // Social media validation
  if (schema.sameAs && schema.sameAs.length > 0) {
    schema.sameAs.forEach((url, index) => {
      if (!isValidUrl(url)) {
        issues.push(createIssue('sameAs', `Social media URL at index ${index} is not a valid HTTPS URL`, 'error', `sameAs[${index}]`));
      }
    });
  } else {
    issues.push(createIssue('sameAs', 'Adding social media profiles can improve brand recognition', 'info'));
  }

  // Address validation
  if (schema.address) {
    if (!schema.address.addressLocality && !schema.address.addressCountry) {
      issues.push(createIssue('address', 'Address should include at least city or country', 'warning'));
    }
  }

  return {
    isValid: !issues.some(issue => issue.severity === 'error'),
    issues,
    schemaType: 'Organization'
  };
}

/**
 * Validates a BreadcrumbList schema (schema.org/BreadcrumbList)
 */
export function validateBreadcrumbSchema(schema: BreadcrumbSchema): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields validation
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    issues.push(createIssue('@context', 'Must be "https://schema.org"', 'error'));
  }

  if (!schema['@type'] || schema['@type'] !== 'BreadcrumbList') {
    issues.push(createIssue('@type', 'Must be "BreadcrumbList"', 'error'));
  }

  if (!schema.itemListElement || schema.itemListElement.length === 0) {
    issues.push(createIssue('itemListElement', 'At least one breadcrumb item is required', 'error'));
  } else {
    const items = schema.itemListElement;

    // Validate each breadcrumb item
    items.forEach((item, index) => {
      if (!item['@type'] || item['@type'] !== 'ListItem') {
        issues.push(createIssue('itemListElement', `Item at index ${index} must have @type "ListItem"`, 'error', `itemListElement[${index}]`));
      }

      if (typeof item.position !== 'number' || item.position < 1) {
        issues.push(createIssue('itemListElement', `Item at index ${index} must have a position >= 1`, 'error', `itemListElement[${index}].position`));
      }

      if (!item.name || item.name.trim().length === 0) {
        issues.push(createIssue('itemListElement', `Item at index ${index} must have a name`, 'error', `itemListElement[${index}].name`));
      }

      if (!item.item) {
        issues.push(createIssue('itemListElement', `Item at index ${index} must have an item URL`, 'error', `itemListElement[${index}].item`));
      } else if (!isValidUrl(item.item)) {
        issues.push(createIssue('itemListElement', `Item URL at index ${index} must be a valid HTTPS URL`, 'error', `itemListElement[${index}].item`));
      }
    });

    // Validate positions are sequential
    const positions = items.map(item => item.position).sort((a, b) => a - b);
    const expectedPositions = Array.from({ length: items.length }, (_, i) => i + 1);

    if (JSON.stringify(positions) !== JSON.stringify(expectedPositions)) {
      issues.push(createIssue('itemListElement', 'Positions should be sequential starting from 1', 'warning'));
    }

    // Validate minimum breadcrumbs (should have at least 2 for meaningful breadcrumbs)
    if (items.length < 2) {
      issues.push(createIssue('itemListElement', 'Breadcrumbs should have at least 2 items for meaningful navigation', 'warning'));
    }
  }

  return {
    isValid: !issues.some(issue => issue.severity === 'error'),
    issues,
    schemaType: 'BreadcrumbList'
  };
}

/**
 * Validates any schema type by detecting the @type field
 */
export function validateSchema(
  schema: ProductSchema | OrganizationSchema | BreadcrumbSchema
): ValidationResult {
  const schemaType = schema['@type'];

  switch (schemaType) {
    case 'Product':
      return validateProductSchema(schema as ProductSchema);
    case 'Organization':
      return validateOrganizationSchema(schema as OrganizationSchema);
    case 'BreadcrumbList':
      return validateBreadcrumbSchema(schema as BreadcrumbSchema);
    default:
      return {
        isValid: false,
        issues: [
          createIssue('@type', `Unknown schema type: ${schemaType}`, 'error')
        ],
        schemaType: schemaType || 'Unknown'
      };
  }
}

/**
 * Validates that JSON-LD is valid JSON
 */
export function validateJsonSyntax(jsonString: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    JSON.parse(jsonString);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON syntax'
    };
  }
}

/**
 * Checks for common schema.org issues and best practices
 */
export function performBestPracticeCheck(
  schema: ProductSchema | OrganizationSchema | BreadcrumbSchema
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for absolute URLs
  const checkAbsoluteUrl = (url: string, field: string) => {
    if (url && !url.startsWith('http')) {
      issues.push(createIssue(field, 'URL should be absolute (start with https://)', 'warning'));
    }
  };

  // Check schema based on type
  if (schema['@type'] === 'Product') {
    const productSchema = schema as ProductSchema;

    // Description length check
    if (productSchema.description && productSchema.description.length > 5000) {
      issues.push(createIssue('description', 'Description is very long, consider keeping it under 5000 characters', 'info'));
    }

    // Image count check
    if (productSchema.image && productSchema.image.length > 10) {
      issues.push(createIssue('image', 'Having more than 10 images might slow down page load', 'info'));
    }

    // Price check
    if (productSchema.offers && productSchema.offers.price === '0.00') {
      issues.push(createIssue('offers.price', 'Price is 0.00 - verify this is intentional', 'warning'));
    }
  }

  if (schema['@type'] === 'Organization') {
    const orgSchema = schema as OrganizationSchema;

    // Logo dimensions (recommended for Google)
    if (orgSchema.logo) {
      issues.push(createIssue('logo', 'Ensure logo is at least 112x112px and max 10MB for Google', 'info'));
    }

    // Contact information completeness
    if (orgSchema.contactPoint && !orgSchema.contactPoint.email) {
      issues.push(createIssue('contactPoint.email', 'Adding an email address improves customer trust', 'info'));
    }
  }

  return issues;
}

/**
 * Generates a validation summary for display
 */
export function getValidationSummary(result: ValidationResult): {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  statusText: string;
  statusColor: 'success' | 'warning' | 'critical';
} {
  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const infoCount = result.issues.filter(i => i.severity === 'info').length;

  let statusText = 'Valid';
  let statusColor: 'success' | 'warning' | 'critical' = 'success';

  if (errorCount > 0) {
    statusText = `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    statusColor = 'critical';
  } else if (warningCount > 0) {
    statusText = `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    statusColor = 'warning';
  } else if (infoCount > 0) {
    statusText = 'Valid with suggestions';
    statusColor = 'success';
  }

  return {
    errorCount,
    warningCount,
    infoCount,
    statusText,
    statusColor
  };
}
