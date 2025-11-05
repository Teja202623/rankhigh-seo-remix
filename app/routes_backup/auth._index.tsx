import { type LoaderFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server";

/**
 * Auth Index Route - Handles /auth specifically
 *
 * This route handles direct access to /auth (without being a catch-all).
 * It's used when:
 * - OAuth needs to restart after an error
 * - App explicitly redirects to /auth for authentication
 * - Shopify package internal OAuth flows
 *
 * Unlike auth.$.tsx (catch-all), this ONLY matches /auth exactly.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Initiate OAuth flow
  await login(request);

  // This line is never reached because login() throws a redirect
  return null;
};
