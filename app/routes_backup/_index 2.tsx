import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server";

/**
 * Root Route - Entry Point for Shopify App
 *
 * This route handles two scenarios:
 * 1. Initial OAuth installation - redirects to Shopify authorization
 * 2. Embedded app loads (with 'embedded' param) - redirects to /app dashboard
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Check if this is an embedded app reload (already authenticated)
  // Shopify adds 'embedded' param when loading the app in the Admin iframe
  if (url.searchParams.get("embedded") === "1") {
    // Already authenticated, redirect to app dashboard
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");

    // Preserve shop and host params for App Bridge
    const params = new URLSearchParams();
    if (shop) params.set("shop", shop);
    if (host) params.set("host", host);

    return redirect(`/app?${params.toString()}`);
  }

  // Not embedded - this is initial OAuth installation
  // Start OAuth flow - login() will redirect to Shopify
  await login(request);

  // This line is never reached because login() throws a redirect
  return null;
}
