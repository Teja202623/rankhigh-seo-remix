import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getUsageStatus } from "~/services/usage.server";
import prisma from "~/db.server";
import Dashboard from "~/components/dashboard/Dashboard";

/**
 * Dashboard Route (app._index.tsx)
 *
 * The main dashboard showing:
 * - SEO health overview
 * - Recent audits
 * - Quick stats
 * - Quick actions
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  // Get usage status
  const usageStatus = await getUsageStatus(store.id);

  // Get latest audit (adjust based on your Audit model)
  const latestAudit = await prisma.audit.findFirst({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  }).catch(() => null); // Handle if audit model doesn't exist yet

  return json({
    shopUrl: session.shop,
    storeId: store.id,
    usageStatus,
    latestAudit,
  });
}

export default function DashboardPage() {
  const { usageStatus, latestAudit } = useLoaderData<typeof loader>();

  // Debug log
  console.log("Dashboard data:", { usageStatus, latestAudit });

  // Render Dashboard only if we have usage status
  if (!usageStatus) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <Dashboard
      usageStatus={usageStatus}
      latestAudit={latestAudit}
      isLoading={false}
    />
  );
}
