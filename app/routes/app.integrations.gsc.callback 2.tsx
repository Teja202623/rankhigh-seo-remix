// app/routes/app.integrations.gsc.callback.tsx
// Google Search Console OAuth 2.0 Callback Handler (Task 50)

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { handleOAuthCallback } from "~/services/gsc/gscAuth.server";
import { GSCError } from "~/types/gsc";

/**
 * Loader: Handle OAuth callback from Google
 * This route is called by Google after user grants/denies access
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle user denial
    if (error === "access_denied") {
      return redirect(
        "/app/integrations/gsc?error=access_denied&message=You denied access to Google Search Console"
      );
    }

    // Validate parameters
    if (!code || !state) {
      return redirect(
        "/app/integrations/gsc?error=invalid_callback&message=Invalid callback parameters from Google"
      );
    }

    // Exchange code for tokens and store in database
    await handleOAuthCallback(code, state, session.shop);

    // Redirect to property selection page
    return redirect("/app/integrations/gsc/select-property");
  } catch (error) {
    console.error("GSC OAuth callback error:", error);

    if (error instanceof GSCError) {
      return redirect(
        `/app/integrations/gsc?error=${error.type}&message=${encodeURIComponent(error.message)}`
      );
    }

    return redirect(
      "/app/integrations/gsc?error=unknown&message=An error occurred while connecting to Google Search Console"
    );
  }
}
