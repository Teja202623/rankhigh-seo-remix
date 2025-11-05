import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { redirect } from "@remix-run/node";

/**
 * Exit iFrame Route - Critical for Embedded App OAuth
 *
 * This route is called after successful OAuth callback to break out of the iframe
 * and redirect the app back into the embedded Shopify Admin context.
 *
 * Flow:
 * 1. OAuth callback completes → /auth/callback
 * 2. Redirects here → /auth/exit-iframe
 * 3. This route uses App Bridge exitIframe redirect
 * 4. Final redirect → /app (embedded in Shopify Admin)
 *
 * CRITICAL: This route must exist or OAuth will fail with 404 errors.
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Ensure the shop is authenticated before proceeding
  const { session } = await authenticate.admin(request);

  // Extract shop and host from URL params
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || session.shop;
  const host = url.searchParams.get("host");

  // Build the redirect URL with required params
  const params = new URLSearchParams();
  params.set("shop", shop);
  if (host) {
    params.set("host", host);
  }

  // Redirect to the main app route with preserved parameters
  // This will load the app inside the Shopify Admin iframe
  return redirect(`/app?${params.toString()}`);
};
