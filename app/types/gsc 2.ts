// app/types/gsc.ts
// TypeScript interfaces for Google Search Console integration (Tasks 49-56)

/**
 * GSC OAuth Token Response
 * Received from Google OAuth token exchange
 */
export interface GSCTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // Token lifetime in seconds
  token_type: string;
  scope: string;
}

/**
 * GSC Property (Site) Information
 * Represents a verified property in Google Search Console
 */
export interface GSCProperty {
  siteUrl: string; // Property URL (e.g., "sc-domain:example.com" or "https://example.com/")
  permissionLevel: "siteOwner" | "siteFullUser" | "siteRestrictedUser" | "siteUnverifiedUser";
}

/**
 * GSC Search Analytics Query Parameters
 * Used to fetch data from GSC Search Analytics API
 */
export interface GSCSearchAnalyticsParams {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
  dimensions?: ("query" | "page" | "country" | "device" | "date")[];
  dimensionFilterGroups?: {
    filters: {
      dimension: string;
      operator: string;
      expression: string;
    }[];
  }[];
  rowLimit?: number; // Max rows to return (FREE tier: 3)
  startRow?: number; // Starting position (for pagination)
}

/**
 * GSC Query Data Point
 * Individual search query performance data
 */
export interface GSCQueryData {
  query: string; // Search query text
  clicks: number; // Number of clicks
  impressions: number; // Number of impressions
  ctr: number; // Click-through rate (0-1)
  position: number; // Average position in search results
}

/**
 * GSC Page Data Point
 * Individual page performance data
 */
export interface GSCPageData {
  pageUrl: string; // Page URL
  clicks: number; // Number of clicks
  impressions: number; // Number of impressions
  ctr: number; // Click-through rate (0-1)
  position: number; // Average position in search results
}

/**
 * GSC Aggregated Metrics
 * Overall performance metrics for a period
 */
export interface GSCMetrics {
  totalClicks: number; // Total clicks in period
  totalImpressions: number; // Total impressions in period
  averageCtr: number; // Average CTR (0-1)
  averagePosition: number; // Average position
  startDate: string; // Period start date
  endDate: string; // Period end date
}

/**
 * GSC API Response for Search Analytics
 * Raw response from Google Search Console API
 */
export interface GSCSearchAnalyticsResponse {
  rows?: {
    keys: string[]; // Values for requested dimensions
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  responseAggregationType?: string;
}

/**
 * GSC Connection Status
 * Frontend state for GSC connection
 */
export interface GSCConnectionStatus {
  connected: boolean;
  propertyUrl: string | null;
  lastSync: Date | null;
  hasValidToken: boolean;
}

/**
 * GSC Dashboard Data
 * Complete dataset for GSC dashboard display
 */
export interface GSCDashboardData {
  metrics: GSCMetrics;
  topQueries: GSCQueryData[];
  topPages: GSCPageData[];
  lastSync: Date | null;
  propertyUrl: string;
}

/**
 * GSC Error Types
 * Custom error types for GSC integration
 */
export type GSCErrorType =
  | "AUTH_FAILED" // OAuth authentication failed
  | "TOKEN_EXPIRED" // Access token expired
  | "REFRESH_FAILED" // Token refresh failed
  | "NO_PROPERTIES" // User has no GSC properties
  | "API_ERROR" // GSC API error
  | "QUOTA_EXCEEDED" // API quota exceeded
  | "INVALID_PROPERTY" // Invalid property URL
  | "NOT_CONNECTED"; // User not connected to GSC

/**
 * GSC Error
 * Custom error class for GSC operations
 */
export class GSCError extends Error {
  type: GSCErrorType;
  statusCode?: number;

  constructor(type: GSCErrorType, message: string, statusCode?: number) {
    super(message);
    this.name = "GSCError";
    this.type = type;
    this.statusCode = statusCode;
  }
}

/**
 * GSC Rate Limit Status
 * Track API usage for FREE tier limits
 */
export interface GSCRateLimitStatus {
  queriesRemaining: number; // Queries left in current period
  pagesRemaining: number; // Pages left in current period
  resetAt: Date; // When limits reset (24 hours from last fetch)
  isLimited: boolean; // Whether user hit FREE tier limits
}

/**
 * GSC Property List Response
 * Response from GSC sitesList API
 */
export interface GSCPropertyListResponse {
  siteEntry?: GSCProperty[];
}

/**
 * OAuth State Parameter
 * State passed during OAuth flow for security
 */
export interface GSCOAuthState {
  storeId: string;
  timestamp: number;
  nonce: string; // Random string for CSRF protection
}
