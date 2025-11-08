import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Button,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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

  // TODO: Set up database and replace with real data
  // For now, return stub data so the app can load
  const stats = {
    totalPages: 0,
    totalKeywords: 0,
    criticalIssues: 0,
    overallScore: 0,
  };

  return json({
    shopUrl: session.shop,
    stats,
    latestAudit: null as { status: string; createdAt: string } | null,
  });
}

export default function Dashboard() {
  const { shopUrl, stats, latestAudit } = useLoaderData<typeof loader>();

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
        <Layout.Section>
          <BlockStack gap="500">
            {/* Welcome Card */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  🎉 Welcome to RankHigh SEO!
                </Text>
                <Text as="p" variant="bodyMd">
                  Your Shopify SEO app is successfully installed and ready to use.
                  This is a placeholder dashboard - all 35 features will be migrated
                  in the coming weeks.
                </Text>
              </BlockStack>
            </Card>

            {/* Quick Stats */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Quick Stats
                </Text>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        SEO Score
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {stats.overallScore}
                      </Text>
                      <Badge tone={stats.overallScore > 80 ? "success" : stats.overallScore > 60 ? "attention" : "critical"}>
                        {stats.overallScore > 80 ? "Excellent" : stats.overallScore > 60 ? "Good" : "Needs Work"}
                      </Badge>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Pages Tracked
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {stats.totalPages}
                      </Text>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Keywords
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {stats.totalKeywords}
                      </Text>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Critical Issues
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {stats.criticalIssues}
                      </Text>
                      <Badge tone={stats.criticalIssues === 0 ? "success" : "critical"}>
                        {stats.criticalIssues === 0 ? "None" : "Fix Now"}
                      </Badge>
                    </BlockStack>
                  </Card>
                </div>
              </BlockStack>
            </Card>

            {/* Latest Audit */}
            {latestAudit && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Latest Audit
                  </Text>
                  <InlineStack align="space-between">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd">
                        Status: <Badge tone={latestAudit.status === "COMPLETED" ? "success" : "info"}>{latestAudit.status}</Badge>
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {new Date(latestAudit.createdAt).toLocaleString()}
                      </Text>
                    </BlockStack>
                    <Button url="/app/seo/audit">View Details</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <InlineStack gap="300">
                  <Button url="/app/seo/audit">Run SEO Audit</Button>
                  <Button url="/app/pages">Manage Pages</Button>
                  <Button url="/app/keywords">Track Keywords</Button>
                  <Button url="/app/settings">Settings</Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Migration Status */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  📋 Migration Status
                </Text>
                <Text as="p" variant="bodyMd">
                  ✅ Week 1: Foundation Complete (Auth, Database, Redis)<br/>
                  ⏳ Week 2: Component Migration (In Progress)<br/>
                  ⏳ Week 3-5: Feature Migration (Pending)<br/>
                  ⏳ Week 6: Testing & Launch (Pending)
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
