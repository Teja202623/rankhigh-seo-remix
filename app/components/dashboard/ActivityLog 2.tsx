// app/components/dashboard/ActivityLog.tsx
// Recent Activity Log (Task 62)

import { Card, BlockStack, Text, Box, InlineStack, EmptyState, Icon } from "@shopify/polaris";
import {
  EditIcon,
  ImageIcon,
  FileIcon,
  SearchIcon,
  CheckIcon,
  CodeIcon,
} from "@shopify/polaris-icons";
import type { ActivityLog as ActivityLogType } from "@prisma/client";

interface ActivityLogProps {
  activities: ActivityLogType[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case "META_UPDATED":
      case "BULK_META_UPDATE":
        return EditIcon;
      case "ALT_ADDED":
      case "BULK_ALT_UPDATE":
        return ImageIcon;
      case "SITEMAP_GENERATED":
        return FileIcon;
      case "AUDIT_COMPLETED":
        return CheckIcon;
      case "GSC_CONNECTED":
        return SearchIcon;
      case "SCHEMA_ADDED":
        return CodeIcon;
      default:
        return CheckIcon;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Recent Activity
        </Text>

        {activities.length === 0 ? (
          <EmptyState
            heading="No recent activity"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text variant="bodyMd" as="p" tone="subdued">
              Start optimizing your SEO to see activity here
            </Text>
          </EmptyState>
        ) : (
          <BlockStack gap="0">
            {activities.map((activity, index) => (
              <Box
                key={activity.id}
                padding="300"
                borderBlockStartWidth={index > 0 ? "025" : undefined}
                borderColor="border-secondary"
              >
                <InlineStack gap="300" blockAlign="start">
                  <Box>
                    <Icon source={getActivityIcon(activity.action)} />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodyMd" as="p">
                      {activity.description}
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      {formatTimeAgo(new Date(activity.createdAt))}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        )}

        {/* FREE tier note */}
        {activities.length > 0 && (
          <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
            <Text variant="bodyMd" as="p" tone="subdued">
              FREE Tier: Showing last {activities.length} activities (max 50)
            </Text>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
