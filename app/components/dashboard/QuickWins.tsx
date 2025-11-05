// app/components/dashboard/QuickWins.tsx
// Quick Wins Section (Task 59)

import { Card, BlockStack, Text, Badge, Button, Box, InlineStack, EmptyState } from "@shopify/polaris";

interface QuickWin {
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  effort: "LOW" | "MEDIUM" | "HIGH";
  actionUrl: string;
  count?: number;
}

const getImpactTone = (impact: QuickWin["impact"]): "success" | "attention" | "info" => {
  switch (impact) {
    case "HIGH":
      return "success";
    case "MEDIUM":
      return "attention";
    case "LOW":
      return "info";
  }
};

const getEffortTone = (effort: QuickWin["effort"]): "success" | "attention" | "warning" => {
  switch (effort) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "attention";
    case "HIGH":
      return "warning";
  }
};

interface QuickWinsProps {
  quickWins: QuickWin[];
}

export function QuickWins({ quickWins }: QuickWinsProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text variant="headingMd" as="h2">
            Quick Wins
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            High-impact, low-effort improvements to boost your SEO
          </Text>
        </BlockStack>

        {quickWins.length === 0 ? (
          <EmptyState
            heading="No quick wins available"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text variant="bodyMd" as="p" tone="subdued">
              Run an SEO audit to discover optimization opportunities
            </Text>
          </EmptyState>
        ) : (
          <BlockStack gap="300">
            {quickWins.map((win, index) => (
              <Box
                key={index}
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <InlineStack align="space-between" blockAlign="start" gap="400">
                  <BlockStack gap="300">
                    {/* Title and count */}
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingSm" as="h3" fontWeight="semibold">
                        {win.title}
                      </Text>
                      {win.count && (
                        <Badge tone="info">{String(win.count)}</Badge>
                      )}
                    </InlineStack>

                    {/* Description */}
                    <Text variant="bodyMd" as="p" tone="subdued">
                      {win.description}
                    </Text>

                    {/* Impact and Effort badges */}
                    <InlineStack gap="200">
                      <Badge tone={getImpactTone(win.impact)}>
                        {`Impact: ${win.impact}`}
                      </Badge>
                      <Badge tone={getEffortTone(win.effort)}>
                        {`Effort: ${win.effort}`}
                      </Badge>
                    </InlineStack>
                  </BlockStack>

                  {/* Action button */}
                  <Button url={win.actionUrl} variant="primary">
                    Fix Now
                  </Button>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        )}

        {/* FREE tier note */}
        {quickWins.length > 0 && (
          <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
            <InlineStack gap="200" blockAlign="center">
              <Badge tone="info">FREE Tier</Badge>
              <Text variant="bodyMd" as="p" tone="subdued">
                Showing top 3 quick wins. Upgrade for unlimited insights.
              </Text>
            </InlineStack>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
