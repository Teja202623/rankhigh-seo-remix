// app/services/sitemap/sitemapValidator.server.ts

import type {
  ValidationResult,
  ValidationError,
  SitemapUrl,
  ChangeFrequency,
} from "~/types/sitemap";
import { formatFileSize } from "~/utils/format";

/**
 * Valid change frequency values per sitemaps.org protocol
 */
const VALID_CHANGE_FREQUENCIES: ChangeFrequency[] = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
];

/**
 * Maximum number of URLs allowed in a sitemap per sitemaps.org protocol
 */
const MAX_URLS_STANDARD = 50000;

/**
 * Maximum sitemap file size (50MB per sitemaps.org protocol)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Validates an XML sitemap string for compliance with sitemaps.org protocol
 * @param xmlContent - The XML sitemap content as a string
 * @param maxUrls - Maximum URLs allowed (for tier enforcement)
 * @returns ValidationResult with errors, warnings, and statistics
 */
export function validateSitemap(
  xmlContent: string,
  maxUrls: number = MAX_URLS_STANDARD
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const statistics = {
    totalUrls: 0,
    fileSize: 0,
    duplicateUrls: 0,
    invalidUrls: 0,
  };

  // Calculate file size
  statistics.fileSize = new Blob([xmlContent]).size;

  // Check file size
  if (statistics.fileSize > MAX_FILE_SIZE) {
    errors.push({
      type: "error",
      message: `Sitemap file size (${formatFileSize(statistics.fileSize)}) exceeds maximum allowed size of 50MB`,
    });
  }

  // Validate XML syntax
  try {
    // Basic XML structure validation
    if (!xmlContent.includes('<?xml version="1.0"')) {
      errors.push({
        type: "error",
        message: "Missing XML declaration",
      });
    }

    if (!xmlContent.includes("<urlset")) {
      errors.push({
        type: "error",
        message: "Missing <urlset> root element",
      });
    }

    if (
      !xmlContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    ) {
      errors.push({
        type: "error",
        message: "Missing or incorrect XML namespace declaration",
      });
    }

    // Extract URLs from XML
    const urls = extractUrlsFromXml(xmlContent);
    statistics.totalUrls = urls.length;

    // Check URL count limits
    if (urls.length > maxUrls) {
      errors.push({
        type: "error",
        message: `Sitemap contains ${urls.length} URLs, exceeding the limit of ${maxUrls}`,
      });
    }

    if (urls.length === 0) {
      warnings.push({
        type: "warning",
        message: "Sitemap contains no URLs",
      });
    }

    // Validate each URL
    const seenUrls = new Set<string>();
    for (const url of urls) {
      // Check for duplicate URLs
      if (seenUrls.has(url.loc)) {
        statistics.duplicateUrls++;
        warnings.push({
          type: "warning",
          message: `Duplicate URL found: ${url.loc}`,
          url: url.loc,
        });
      }
      seenUrls.add(url.loc);

      // Validate URL structure
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        statistics.invalidUrls++;
        errors.push({
          type: "error",
          message: urlValidation.error || "Invalid URL",
          url: url.loc,
        });
      }
    }
  } catch (error) {
    errors.push({
      type: "error",
      message: `XML parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    statistics,
  };
}

/**
 * Extracts URL entries from XML sitemap content
 * @param xmlContent - The XML sitemap content
 * @returns Array of SitemapUrl objects
 */
function extractUrlsFromXml(xmlContent: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];

  // Simple regex-based extraction (for more complex scenarios, use a proper XML parser)
  const urlPattern =
    /<url>([\s\S]*?)<\/url>/g;
  let match;

  while ((match = urlPattern.exec(xmlContent)) !== null) {
    const urlBlock = match[1];

    // Extract loc
    const locMatch = /<loc>(.*?)<\/loc>/.exec(urlBlock);
    if (!locMatch) continue;

    const url: SitemapUrl = {
      loc: locMatch[1].trim(),
    };

    // Extract lastmod (optional)
    const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/.exec(urlBlock);
    if (lastmodMatch) {
      url.lastmod = lastmodMatch[1].trim();
    }

    // Extract changefreq (optional)
    const changefreqMatch = /<changefreq>(.*?)<\/changefreq>/.exec(urlBlock);
    if (changefreqMatch) {
      url.changefreq = changefreqMatch[1].trim() as ChangeFrequency;
    }

    // Extract priority (optional)
    const priorityMatch = /<priority>(.*?)<\/priority>/.exec(urlBlock);
    if (priorityMatch) {
      url.priority = parseFloat(priorityMatch[1].trim());
    }

    urls.push(url);
  }

  return urls;
}

/**
 * Validates a single sitemap URL entry
 * @param url - The SitemapUrl object to validate
 * @returns Object with valid flag and error message if invalid
 */
function validateUrl(url: SitemapUrl): { valid: boolean; error?: string } {
  // Validate loc (required)
  if (!url.loc || url.loc.trim() === "") {
    return { valid: false, error: "URL location (loc) is required" };
  }

  // Check if URL is absolute
  try {
    const parsedUrl = new URL(url.loc);

    // Check if URL is HTTPS
    if (parsedUrl.protocol !== "https:") {
      return {
        valid: false,
        error: `URL must use HTTPS protocol: ${url.loc}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${url.loc}`,
    };
  }

  // Validate lastmod (optional)
  if (url.lastmod) {
    if (!isValidISO8601Date(url.lastmod)) {
      return {
        valid: false,
        error: `Invalid lastmod date format (must be ISO 8601): ${url.lastmod}`,
      };
    }
  }

  // Validate changefreq (optional)
  if (url.changefreq) {
    if (!VALID_CHANGE_FREQUENCIES.includes(url.changefreq)) {
      return {
        valid: false,
        error: `Invalid changefreq value: ${url.changefreq}. Must be one of: ${VALID_CHANGE_FREQUENCIES.join(", ")}`,
      };
    }
  }

  // Validate priority (optional)
  if (url.priority !== undefined) {
    if (typeof url.priority !== "number" || url.priority < 0 || url.priority > 1) {
      return {
        valid: false,
        error: `Invalid priority value: ${url.priority}. Must be between 0.0 and 1.0`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates if a string is a valid ISO 8601 date
 * @param dateString - The date string to validate
 * @returns true if valid, false otherwise
 */
function isValidISO8601Date(dateString: string): boolean {
  // ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DD
  const iso8601Pattern =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

  if (!iso8601Pattern.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validates an array of SitemapUrl objects before generating XML
 * @param urls - Array of SitemapUrl objects
 * @param maxUrls - Maximum URLs allowed
 * @returns ValidationResult
 */
export function validateSitemapUrls(
  urls: SitemapUrl[],
  maxUrls: number = MAX_URLS_STANDARD
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const statistics = {
    totalUrls: urls.length,
    fileSize: 0, // Will be calculated after XML generation
    duplicateUrls: 0,
    invalidUrls: 0,
  };

  // Check URL count
  if (urls.length > maxUrls) {
    errors.push({
      type: "error",
      message: `Sitemap contains ${urls.length} URLs, exceeding the limit of ${maxUrls}`,
    });
  }

  if (urls.length === 0) {
    warnings.push({
      type: "warning",
      message: "Sitemap contains no URLs",
    });
  }

  // Validate each URL and check for duplicates
  const seenUrls = new Set<string>();
  for (const url of urls) {
    // Check for duplicates
    if (seenUrls.has(url.loc)) {
      statistics.duplicateUrls++;
      warnings.push({
        type: "warning",
        message: `Duplicate URL found: ${url.loc}`,
        url: url.loc,
      });
    }
    seenUrls.add(url.loc);

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      statistics.invalidUrls++;
      errors.push({
        type: "error",
        message: urlValidation.error || "Invalid URL",
        url: url.loc,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    statistics,
  };
}

/**
 * Generates a validation summary for display in UI
 * @param validationResult - The validation result object
 * @returns Human-readable summary string
 */
export function getValidationSummary(validationResult: ValidationResult): string {
  if (validationResult.valid && validationResult.warnings.length === 0) {
    return `✓ Sitemap is valid with ${validationResult.statistics.totalUrls} URLs`;
  }

  const parts: string[] = [];

  if (!validationResult.valid) {
    parts.push(`✗ ${validationResult.errors.length} error(s) found`);
  }

  if (validationResult.warnings.length > 0) {
    parts.push(`⚠ ${validationResult.warnings.length} warning(s)`);
  }

  if (validationResult.statistics.duplicateUrls > 0) {
    parts.push(`${validationResult.statistics.duplicateUrls} duplicate(s)`);
  }

  if (validationResult.statistics.invalidUrls > 0) {
    parts.push(`${validationResult.statistics.invalidUrls} invalid URL(s)`);
  }

  return parts.join(", ");
}
