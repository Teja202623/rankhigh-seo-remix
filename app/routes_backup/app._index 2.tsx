import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Banner, Text } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getStore, createStore } from "~/services/store.server";
import { calculateHealthScore } from "~/services/dashboard/healthScore.server";
import { getQuickWins } from "~/services/dashboard/quickWins.server";
import { getRecentActivities } from "~/services/dashboard/activityLog.server";
import prisma from "~/db.server";

// Import Dashboard Components
import { HealthScoreGauge } from "~/components/dashboard/HealthScoreGauge";
import { QuickWins } from "~/components/dashboard/QuickWins";
import { RecentAuditSummary } from "~/components/dashboard/RecentAuditSummary";
import { ActivityLog } from "~/components/dashboard/ActivityLog";

/**
 * Enhanced Dashboard Route (Tasks 57-62)
 *
 * Features:
 * - SEO Health Score with visual gauge
 * - Quick Wins section (top 3 actionable items)
 * - Recent audit summary
 * - Activity log
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  let store;
  let storeError: string | null = null;

  try {
    // Get or create store
    store = await getStore(session.shop);
    if (!store) {
      if (!session.accessToken) {
        throw new Error("Access token is required to create a store");
      }
      store = await createStore(session.shop, session.accessToken);
    }
  } catch (error) {
    console.error("Store service error:", error);
    storeError = error instanceof Error ? error.message : "Failed to load store information";
    return json({
      shopUrl: session.shop,
      store: null,
      storeError,
      healthData: null,
      quickWins: [],
      latestAudit: null,
      activities: [],
    });
  }

  // Fetch dashboard data
  const [healthData, quickWins, latestAudit, activities] = await Promise.all([
    // Health Score
    calculateHealthScore(store.id).catch(() => ({
      score: 0,
      status: "critical" as const,
      breakdown: {
        baseScore: 0,
        criticalPenalty: 0,
        highPenalty: 0,
        sitemapBonus: 0,
        gscBonus: 0,
      },
    })),

    // Quick Wins
    getQuickWins(store.id).catch(() => []),

    // Latest Audit Summary
    prisma.audit
      .findFirst({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      })
      .then((audit) => {
        if (!audit) return null;
        const totalIssues = (audit.criticalIssues || 0) + (audit.highIssues || 0) + (audit.mediumIssues || 0) + (audit.lowIssues || 0);
        return {
          id: audit.id,
          score: audit.overallScore || 0,
          totalIssues,
          criticalCount: audit.criticalIssues || 0,
          highCount: audit.highIssues || 0,
          mediumCount: audit.mediumIssues || 0,
          lowCount: audit.lowIssues || 0,
          completedAt: audit.createdAt,
          urlsScanned: audit.totalUrls || 0,
        };
      })
      .catch(() => null),

    // Recent Activities
    getRecentActivities(store.id, 10).catch(() => []),
  ]);

  return json({
    shopUrl: session.shop,
    store,
    storeError,
    healthData,
    quickWins,
    latestAudit,
    activities,
  });
}

export default function Dashboard() {
  const { shopUrl, store, storeError, healthData, quickWins, latestAudit, activities } =
    useLoaderData<typeof loader>();

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome to RankHigh SEO for ${shopUrl}`}
      primaryAction={{
        content: "Run SEO Audit",
        url: "/app/seo/audit",
      }}
    >
      <Layout>
        {/* Error Handling */}
        {storeError && (
          <Layout.Section>
            <Banner title="Store Service Error" tone="critical">
              <Text as="p" variant="bodyMd">
                {storeError}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Some features may not work correctly. Please refresh the page or contact support if
                this persists.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {store && !store.isActive && (
          <Layout.Section>
            <Banner title="Store is Inactive" tone="warning">
              <Text as="p" variant="bodyMd">
                Your store is currently inactive. Please reactivate your subscription to continue
                using RankHigh SEO.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Dashboard Content - 2 Column Layout */}
        <Layout.Section>
          <Layout>
            {/* Left Column */}
            <Layout.Section variant="oneThird">
              {/* SEO Health Score (Task 57 & 58) */}
              {healthData && <HealthScoreGauge healthData={healthData} />}
            </Layout.Section>

            {/* Right Column */}
            <Layout.Section>
              {/* Quick Wins (Task 59) */}
              <QuickWins quickWins={quickWins as any} />
            </Layout.Section>

            {/* Full Width Row */}
            <Layout.Section>
              <Layout>
                <Layout.Section variant="oneHalf">
                  {/* Recent Audit Summary (Task 60) */}
                  <RecentAuditSummary audit={latestAudit as any} />
                </Layout.Section>

                <Layout.Section variant="oneHalf">
                  {/* Activity Log (Task 62) */}
                  <ActivityLog activities={activities as any} />
                </Layout.Section>
              </Layout>
            </Layout.Section>
          </Layout>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
