import { Page, Layout, Card, Text } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import type { UsageStatus } from '~/services/usage.server';

interface DashboardProps {
  latestAudit?: any;
  usageStatus?: UsageStatus;
  isLoading?: boolean;
}

export default function Dashboard({
  latestAudit = null,
  usageStatus,
  isLoading = false
}: DashboardProps) {
  const navigate = useNavigate();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h1" variant="headingMd">
              Dashboard
            </Text>
            <Text as="p" variant="bodySm">
              Test page
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
