import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

/**
 * OAuth Callback Route
 *
 * This route handles the OAuth callback from Shopify after the merchant
 * approves the app installation. It completes the OAuth flow by exchanging
 * the authorization code for an access token.
 *
 * CRITICAL FLOW:
 * 1. Shopify redirects here with authorization code
 * 2. Exchange code for access token
 * 3. Create session
 * 4. Redirect to /auth/exit-iframe (breaks out of iframe context)
 * 5. /auth/exit-iframe redirects to /app (embedded in Shopify Admin)
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Complete OAuth flow and create session
  await authenticate.admin(request);

  // Extract shop and host parameters from the callback URL
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  // Build redirect URL with preserved parameters
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);

  // Redirect to exit-iframe route to break out of iframe context
  // This is required for embedded apps to properly reload in Shopify Admin
  return redirect(`/auth/exit-iframe?${params.toString()}`);
};
