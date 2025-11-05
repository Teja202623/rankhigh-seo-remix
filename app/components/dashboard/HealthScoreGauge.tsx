// app/components/dashboard/HealthScoreGauge.tsx
// SEO Health Score Visual Gauge (Task 58)

import { Card, BlockStack, Text, ProgressBar, Badge, Box, InlineStack } from "@shopify/polaris";

interface HealthScoreData {
  score: number;
  status: "critical" | "needs-work" | "good" | "excellent";
  breakdown: {
    baseScore: number;
    criticalPenalty: number;
    highPenalty: number;
    sitemapBonus: number;
    gscBonus: number;
  };
}

const getHealthScoreTone = (
  status: HealthScoreData["status"]
): "critical" | "warning" | "success" | "info" => {
  switch (status) {
    case "critical":
      return "critical";
    case "needs-work":
      return "warning";
    case "good":
      return "success";
    case "excellent":
      return "success";
  }
};

const getHealthScoreStatusText = (status: HealthScoreData["status"]): string => {
  switch (status) {
    case "critical":
      return "Critical - Immediate action needed";
    case "needs-work":
      return "Needs Work - Several issues to fix";
    case "good":
      return "Good - Minor improvements possible";
    case "excellent":
      return "Excellent - Keep up the great work!";
  }
};

interface HealthScoreGaugeProps {
  healthData: HealthScoreData;
}

export function HealthScoreGauge({ healthData }: HealthScoreGaugeProps) {
  const { score, status, breakdown } = healthData;

  // Get color based on status
  const getScoreColor = () => {
    switch (status) {
      case "excellent":
        return "#008060"; // Green
      case "good":
        return "#FFC453"; // Yellow
      case "needs-work":
        return "#FFA500"; // Orange
      case "critical":
        return "#D72C0D"; // Red
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          SEO Health Score
        </Text>

        {/* Circular Gauge - Using CSS for visual display */}
        <Box>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Score Circle */}
            <div
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: `conic-gradient(${getScoreColor()} ${score * 3.6}deg, #E4E5E7 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <Text variant="heading2xl" as="p" fontWeight="bold">
                  {score}
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  out of 100
                </Text>
              </div>
            </div>

            {/* Status Badge */}
            <Badge tone={getHealthScoreTone(status)} size="large">
              {getHealthScoreStatusText(status)}
            </Badge>
          </div>
        </Box>

        {/* Linear Progress Bar (Alternative view) */}
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text variant="bodyMd" as="p">
              Progress
            </Text>
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {score}%
            </Text>
          </InlineStack>
          <ProgressBar progress={score} tone={getHealthScoreTone(status) as any} />
        </BlockStack>

        {/* Score Breakdown */}
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">
            Score Breakdown
          </Text>

          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text variant="bodyMd" as="p" tone="subdued">
                  Base Score (from audit)
                </Text>
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  {breakdown.baseScore}
                </Text>
              </InlineStack>

              {breakdown.criticalPenalty > 0 && (
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="p" tone="critical">
                    Critical Issues Penalty
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold" tone="critical">
                    -{breakdown.criticalPenalty}
                  </Text>
                </InlineStack>
              )}

              {breakdown.highPenalty > 0 && (
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="p" tone="caution">
                    High Severity Penalty
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold" tone="caution">
                    -{breakdown.highPenalty}
                  </Text>
                </InlineStack>
              )}

              {breakdown.sitemapBonus > 0 && (
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="p" tone="success">
                    Sitemap Bonus
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold" tone="success">
                    +{breakdown.sitemapBonus}
                  </Text>
                </InlineStack>
              )}

              {breakdown.gscBonus > 0 && (
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="p" tone="success">
                    Search Console Bonus
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold" tone="success">
                    +{breakdown.gscBonus}
                  </Text>
                </InlineStack>
              )}
            </BlockStack>
          </Box>
        </BlockStack>

        {/* Tips based on status */}
        {status === "critical" && (
          <Box padding="300" background="bg-surface-critical" borderRadius="200">
            <Text variant="bodyMd" as="p">
              Your SEO health needs immediate attention. Focus on fixing critical issues first.
            </Text>
          </Box>
        )}

        {status === "needs-work" && (
          <Box padding="300" background="bg-surface-warning" borderRadius="200">
            <Text variant="bodyMd" as="p">
              Your SEO is on the right track but needs improvement. Check the Quick Wins section below.
            </Text>
          </Box>
        )}

        {status === "good" && (
          <Box padding="300" background="bg-surface-success" borderRadius="200">
            <Text variant="bodyMd" as="p">
              Your SEO health is good! Focus on minor optimizations to reach excellent status.
            </Text>
          </Box>
        )}

        {status === "excellent" && (
          <Box padding="300" background="bg-surface-success" borderRadius="200">
            <Text variant="bodyMd" as="p">
              Excellent work! Your SEO is in great shape. Keep monitoring and maintaining your optimizations.
            </Text>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
