// app/routes/healthcheck.tsx
// Health check endpoint for Railway and monitoring

import { json } from "@remix-run/node";

/**
 * Health check endpoint
 * Returns OK if the app is running
 *
 * Used by:
 * - Railway for deployment health checks
 * - Monitoring tools
 * - Load balancers
 */
export function loader() {
  return json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
