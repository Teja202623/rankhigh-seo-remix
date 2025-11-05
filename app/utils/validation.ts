/**
 * Validation utilities for RankHigh SEO
 * Provides functions for email, URL, and phone number validation
 */

/**
 * Validates an email address using RFC 5322 standard
 * @param email - The email address to validate
 * @returns True if the email is valid, false otherwise
 * @example
 * validateEmail('user@example.com') // returns true
 * validateEmail('invalid-email') // returns false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Sanitizes a URL by removing potential XSS vectors and validating format
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if invalid
 * @example
 * sanitizeUrl('https://example.com') // returns 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // returns null
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmedUrl.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  // Validate URL format
  try {
    // If URL doesn't have a protocol, assume https
    const urlToValidate = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    const urlObject = new URL(urlToValidate);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      return null;
    }

    return urlObject.toString();
  } catch {
    return null;
  }
}

/**
 * Validates a phone number (supports international formats)
 * @param phone - The phone number to validate
 * @returns True if the phone number is valid, false otherwise
 * @example
 * validatePhoneNumber('+1-555-123-4567') // returns true
 * validatePhoneNumber('555-1234') // returns true
 * validatePhoneNumber('abc') // returns false
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove common formatting characters
  const cleanedPhone = phone.replace(/[\s\-\(\)\+\.]/g, '');

  // Check if it contains only digits (after removing formatting)
  if (!/^\d+$/.test(cleanedPhone)) {
    return false;
  }

  // Valid phone numbers typically have between 7 and 15 digits
  // (E.164 standard allows up to 15 digits)
  const digitCount = cleanedPhone.length;
  return digitCount >= 7 && digitCount <= 15;
}

/**
 * Formats a phone number to a standard format
 * @param phone - The phone number to format
 * @returns Formatted phone number or original string if invalid
 * @example
 * formatPhoneNumber('5551234567') // returns '(555) 123-4567'
 */
export function formatPhoneNumber(phone: string): string {
  if (!validatePhoneNumber(phone)) {
    return phone;
  }

  // Remove formatting
  const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');

  // Format US numbers as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format US numbers with country code as +1 (XXX) XXX-XXXX
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return cleaned number for other formats
  return cleaned;
}

/**
 * Validates if a string is a valid URL slug
 * @param slug - The slug to validate
 * @returns True if the slug is valid, false otherwise
 * @example
 * validateSlug('my-product-name') // returns true
 * validateSlug('My Product!') // returns false
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  // Should not start or end with a hyphen
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Converts a string to a valid URL slug
 * @param text - The text to convert to a slug
 * @returns A valid URL slug
 * @example
 * toSlug('My Product Name!') // returns 'my-product-name'
 */
export function toSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
