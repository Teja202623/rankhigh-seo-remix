// app/services/gsc/gscAuth.server.ts
// Google Search Console OAuth 2.0 authentication service (Task 55)

import { google } from "googleapis";
import prisma from "~/db.server";
import {
  GSCTokenResponse,
  GSCProperty,
  GSCPropertyListResponse,
  GSCError,
  GSCOAuthState,
} from "~/types/gsc";

/**
 * GSC API Scopes
 * readonly: Only read access to GSC data (safe for users)
 */
const GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

/**
 * Get OAuth2 Client
 * Creates and configures Google OAuth2 client
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new GSCError(
      "AUTH_FAILED",
      "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env file.",
      500
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth URL
 * Creates authorization URL for user to grant access
 *
 * @param storeId - Store ID for state parameter
 * @returns Authorization URL and state token
 */
export async function generateAuthUrl(storeId: string): Promise<{
  url: string;
  state: string;
}> {
  const oauth2Client = getOAuth2Client();

  // Generate state parameter for CSRF protection
  const state: GSCOAuthState = {
    storeId,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
  };

  const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Request refresh token
    scope: GSC_SCOPES,
    state: stateString,
    prompt: "consent", // Force consent screen to get refresh token
  });

  return { url: authUrl, state: stateString };
}

/**
 * Verify State Parameter
 * Validates OAuth state to prevent CSRF attacks
 *
 * @param stateString - Base64 encoded state from OAuth callback
 * @returns Decoded state object
 */
export function verifyState(stateString: string): GSCOAuthState {
  try {
    const decoded = Buffer.from(stateString, "base64").toString("utf-8");
    const state: GSCOAuthState = JSON.parse(decoded);

    // Verify state is not too old (10 minutes max)
    const age = Date.now() - state.timestamp;
    if (age > 10 * 60 * 1000) {
      throw new GSCError(
        "AUTH_FAILED",
        "OAuth state expired. Please try connecting again.",
        400
      );
    }

    return state;
  } catch (error) {
    throw new GSCError(
      "AUTH_FAILED",
      "Invalid OAuth state parameter. Possible CSRF attack.",
      400
    );
  }
}

/**
 * Exchange Authorization Code for Tokens
 * Exchanges OAuth code for access and refresh tokens
 *
 * @param code - Authorization code from OAuth callback
 * @returns Token response with access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<GSCTokenResponse> {
  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new GSCError(
        "AUTH_FAILED",
        "Failed to obtain access token from Google",
        500
      );
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? undefined,
      expires_in: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : 3600,
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope || GSC_SCOPES.join(" "),
    };
  } catch (error: any) {
    console.error("[GSC Auth] Token exchange failed:", error);
    throw new GSCError(
      "AUTH_FAILED",
      `Failed to exchange authorization code: ${error.message}`,
      500
    );
  }
}

/**
 * Store GSC Tokens
 * Saves OAuth tokens to database
 *
 * @param storeId - Store ID
 * @param tokens - Token response from Google
 */
export async function storeTokens(
  storeId: string,
  tokens: GSCTokenResponse
): Promise<void> {
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.store.update({
    where: { id: storeId },
    data: {
      gscAccessToken: tokens.access_token,
      gscRefreshToken: tokens.refresh_token,
      gscTokenExpiry: expiryDate,
      gscConnected: true,
    },
  });
}

/**
 * Get Valid Access Token
 * Returns valid access token, refreshing if necessary
 *
 * @param storeId - Store ID
 * @returns Valid access token
 */
export async function getValidAccessToken(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      gscAccessToken: true,
      gscRefreshToken: true,
      gscTokenExpiry: true,
      gscConnected: true,
    },
  });

  if (!store || !store.gscConnected || !store.gscAccessToken) {
    throw new GSCError(
      "NOT_CONNECTED",
      "Google Search Console not connected. Please connect your account first.",
      401
    );
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiryWithBuffer = store.gscTokenExpiry
    ? new Date(store.gscTokenExpiry.getTime() - 5 * 60 * 1000)
    : now;

  if (now >= expiryWithBuffer) {
    // Token expired, refresh it
    console.log("[GSC Auth] Token expired, refreshing...");
    return await refreshAccessToken(storeId);
  }

  return store.gscAccessToken;
}

/**
 * Refresh Access Token
 * Refreshes expired access token using refresh token
 *
 * @param storeId - Store ID
 * @returns New access token
 */
export async function refreshAccessToken(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      gscRefreshToken: true,
    },
  });

  if (!store || !store.gscRefreshToken) {
    throw new GSCError(
      "REFRESH_FAILED",
      "No refresh token found. Please reconnect your Google Search Console account.",
      401
    );
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: store.gscRefreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new GSCError(
        "REFRESH_FAILED",
        "Failed to refresh access token",
        500
      );
    }

    // Update tokens in database
    const expiryDate = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await prisma.store.update({
      where: { id: storeId },
      data: {
        gscAccessToken: credentials.access_token,
        gscTokenExpiry: expiryDate,
      },
    });

    console.log("[GSC Auth] Token refreshed successfully");
    return credentials.access_token;
  } catch (error: any) {
    console.error("[GSC Auth] Token refresh failed:", error);

    // If refresh fails, disconnect GSC
    await disconnectGSC(storeId);

    throw new GSCError(
      "REFRESH_FAILED",
      "Failed to refresh access token. Please reconnect your Google Search Console account.",
      401
    );
  }
}

/**
 * Get GSC Properties
 * Fetches list of verified GSC properties for user
 *
 * @param storeId - Store ID
 * @returns Array of GSC properties
 */
export async function getGSCProperties(
  storeId: string
): Promise<GSCProperty[]> {
  const accessToken = await getValidAccessToken(storeId);

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const webmasters = google.webmasters({ version: "v3", auth: oauth2Client });

  try {
    const response = await webmasters.sites.list();
    const data = response.data as GSCPropertyListResponse;

    if (!data.siteEntry || data.siteEntry.length === 0) {
      throw new GSCError(
        "NO_PROPERTIES",
        "No verified properties found in Google Search Console. Please verify your website first.",
        404
      );
    }

    return data.siteEntry;
  } catch (error: any) {
    console.error("[GSC Auth] Failed to fetch properties:", error);

    if (error instanceof GSCError) {
      throw error;
    }

    throw new GSCError(
      "API_ERROR",
      `Failed to fetch GSC properties: ${error.message}`,
      500
    );
  }
}

/**
 * Set GSC Property
 * Sets the selected GSC property for the store
 *
 * @param storeId - Store ID
 * @param propertyUrl - GSC property URL
 */
export async function setGSCProperty(
  storeId: string,
  propertyUrl: string
): Promise<void> {
  await prisma.store.update({
    where: { id: storeId },
    data: {
      gscPropertyUrl: propertyUrl,
    },
  });
}

/**
 * Disconnect GSC
 * Removes GSC connection and tokens
 *
 * @param storeId - Store ID
 */
export async function disconnectGSC(storeId: string): Promise<void> {
  await prisma.store.update({
    where: { id: storeId },
    data: {
      gscAccessToken: null,
      gscRefreshToken: null,
      gscTokenExpiry: null,
      gscConnected: false,
      gscPropertyUrl: null,
      gscLastSync: null,
    },
  });

  // Optional: Clean up old GSC data
  await prisma.gSCQuery.deleteMany({ where: { storeId } });
  await prisma.gSCPage.deleteMany({ where: { storeId } });
  await prisma.gSCMetric.deleteMany({ where: { storeId } });
}

/**
 * Get GSC Connection Status
 * Returns current GSC connection status
 *
 * @param storeId - Store ID
 * @returns Connection status
 */
export async function getConnectionStatus(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      gscConnected: true,
      gscPropertyUrl: true,
      gscLastSync: true,
      gscTokenExpiry: true,
    },
  });

  if (!store) {
    return {
      connected: false,
      propertyUrl: null,
      lastSync: null,
      hasValidToken: false,
    };
  }

  const hasValidToken = store.gscTokenExpiry
    ? new Date() < store.gscTokenExpiry
    : false;

  return {
    connected: store.gscConnected,
    propertyUrl: store.gscPropertyUrl,
    lastSync: store.gscLastSync,
    hasValidToken,
  };
}

/**
 * Handle OAuth Callback
 * Complete wrapper for OAuth callback handling
 *
 * @param code - Authorization code from Google
 * @param state - State parameter for CSRF protection
 * @param shopUrl - Shop URL to find store
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  shopUrl: string
): Promise<void> {
  // Verify state
  const stateData = verifyState(state);

  // Find store by shop URL
  const store = await prisma.store.findUnique({
    where: { shopUrl },
  });

  if (!store) {
    throw new GSCError("AUTH_FAILED", "Store not found", 404);
  }

  // Verify state matches store
  if (stateData.storeId !== store.id) {
    throw new GSCError("AUTH_FAILED", "Invalid state parameter", 400);
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);

  // Store tokens
  await storeTokens(store.id, tokens);
}

/**
 * Get Properties (alias for getGSCProperties)
 */
export const getProperties = getGSCProperties;

/**
 * Select Property (alias for setGSCProperty)
 */
export const selectProperty = setGSCProperty;
