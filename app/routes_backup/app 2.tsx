import { useEffect } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import "@shopify/polaris/build/esm/styles.css";

/**
 * App Layout Route
 *
 * This layout wraps all /app/* routes and provides:
 * - Shopify authentication
 * - App Bridge context
 * - Polaris styling
 * - Navigation menu
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Validate that we have the required API key
  if (!process.env.SHOPIFY_API_KEY) {
    throw new Error("SHOPIFY_API_KEY environment variable is not set");
  }

  return json({
    polarisTranslations: require("@shopify/polaris/locales/en.json"),
    apiKey: process.env.SHOPIFY_API_KEY,
  });
};

export default function AppLayout() {
  const { polarisTranslations, apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={polarisTranslations}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/seo/meta">Meta Editor</Link>
        <Link to="/app/seo/images">Image ALT Manager</Link>
        <Link to="/app/seo/audit">SEO Audit</Link>
        <Link to="/app/seo/sitemap">XML Sitemap</Link>
        <Link to="/app/seo/schema">Schema Markup</Link>
        <Link to="/app/integrations/gsc">Search Console</Link>
        <Link to="/app/integrations/gtm-ga4">Analytics Setup</Link>
        <Link to="/app/pages">Pages</Link>
        <Link to="/app/keywords">Keywords</Link>
        <Link to="/app/content">Content Analysis</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify embedded app bridge error boundary
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};
