// app/types/audit.ts
/**
 * TypeScript Types for SEO Audit System
 *
 * Defines all interfaces and types used across the audit engine,
 * including check results, severity levels, and audit data structures.
 */

// ====================
// SEVERITY LEVELS
// ====================

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AuditStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

// ====================
// ISSUE TYPES
// ====================

export type IssueType =
  | "MISSING_META_TITLE"
  | "DUPLICATE_META_TITLE"
  | "MISSING_META_DESCRIPTION"
  | "MISSING_ALT_TEXT"
  | "BROKEN_LINK"
  | "MIXED_CONTENT"
  | "NOINDEX_PAGE"
  | "NOFOLLOW_PAGE";

// ====================
// SHOPIFY RESOURCE TYPES
// ====================

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  seo?: {
    title?: string | null;
    description?: string | null;
  };
  descriptionHtml?: string;
  images?: {
    edges: Array<{
      node: {
        id: string;
        altText?: string | null;
        url: string;
      };
    }>;
  };
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  seo?: {
    title?: string | null;
    description?: string | null;
  };
  descriptionHtml?: string;
}

export interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  bodySummary?: string;
  body?: string;
}

// ====================
// CHECK RESULT INTERFACES
// ====================

export interface CheckResult {
  type: IssueType;
  severity: IssueSeverity;
  issues: SEOIssueData[];
}

export interface SEOIssueData {
  resourceId: string; // Shopify resource ID
  resourceType: "PRODUCT" | "COLLECTION" | "PAGE";
  resourceTitle: string;
  resourceHandle: string;
  url: string;
  message: string;
  suggestion: string;
  details?: IssueDetails;
}

export interface IssueDetails {
  // For missing ALT text
  imageId?: string;
  imageUrl?: string;

  // For broken/mixed content links
  linkUrl?: string;
  linkText?: string;

  // For duplicate content
  duplicateWith?: string[];

  // Generic additional data
  [key: string]: any;
}

// ====================
// AUDIT JOB DATA
// ====================

export interface AuditJobData {
  auditId: string;
  storeId: string;
  shopDomain: string;
}

export interface AuditJobResult {
  auditId: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  overallScore: number;
}

// ====================
// AUDIT PROGRESS
// ====================

export interface AuditProgress {
  stage: "FETCHING" | "CHECKING" | "SAVING" | "COMPLETED";
  message: string;
  percentage: number;
}

// ====================
// CHECK FUNCTION TYPES
// ====================

export interface CheckContext {
  shopDomain: string;
  storeId: string;
  products: ShopifyProduct[];
  collections: ShopifyCollection[];
  pages: ShopifyPage[];
}

export type CheckFunction = (context: CheckContext) => Promise<CheckResult>;

// ====================
// AUDIT STATISTICS
// ====================

export interface AuditStatistics {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  overallScore: number;
  issuesByType: Record<IssueType, number>;
}

// ====================
// FILTER & PAGINATION
// ====================

export interface IssueFilters {
  severity?: IssueSeverity;
  type?: IssueType;
  resourceType?: "PRODUCT" | "COLLECTION" | "PAGE";
  isFixed?: boolean;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ====================
// AUDIT HISTORY
// ====================

export interface AuditHistoryItem {
  id: string;
  createdAt: Date;
  status: AuditStatus;
  overallScore: number | null;
  totalIssues: number;
  duration: number | null; // in seconds
}

// ====================
// SCORE CALCULATION
// ====================

export interface ScoreWeights {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  CRITICAL: 15,
  HIGH: 10,
  MEDIUM: 5,
  LOW: 2,
};

/**
 * Calculate SEO Score based on issue counts
 * Formula: 100 - (critical * 15) - (high * 10) - (medium * 5) - (low * 2)
 */
export function calculateSEOScore(
  criticalIssues: number,
  highIssues: number,
  mediumIssues: number,
  lowIssues: number,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): number {
  const deductions =
    criticalIssues * weights.CRITICAL +
    highIssues * weights.HIGH +
    mediumIssues * weights.MEDIUM +
    lowIssues * weights.LOW;

  const score = 100 - deductions;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// ====================
// FREE TIER LIMITS
// ====================

export const FREE_TIER_LIMITS = {
  MAX_URLS_PER_AUDIT: 50,
  HISTORY_DAYS: 30,
  MIN_AUDIT_INTERVAL_HOURS: 1,
  MAX_PRODUCTS: 50,
  MAX_COLLECTIONS: 20,
  MAX_PAGES: 20,
} as const;
