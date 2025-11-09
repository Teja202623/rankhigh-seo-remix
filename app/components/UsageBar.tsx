// app/components/UsageBar.tsx
/**
 * Usage Progress Bar Component
 *
 * Displays a visual progress bar showing usage of a quota.
 * Colors change based on usage percentage:
 * - 0-79%: Green/normal
 * - 80-99%: Yellow/warning
 * - 100%+: Red/critical
 *
 * Usage:
 * ```tsx
 * <UsageBar
 *   label="SEO Audits"
 *   used={8}
 *   limit={10}
 *   showPercentage
 * />
 * ```
 */

import { Box, Text } from "@shopify/polaris";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  showPercentage?: boolean;
  showRemaining?: boolean;
}

export function UsageBar({
  label,
  used,
  limit,
  showPercentage = true,
  showRemaining = false,
}: UsageBarProps) {
  const percentage = Math.round((used / limit) * 100);
  const remaining = Math.max(0, limit - used);

  // Determine color based on usage
  let barColor: string;
  let messageText = "";
  let showWarning = false;

  if (percentage >= 100) {
    barColor = "#c41e3a"; // Red/critical
    messageText = `You've reached your daily limit.`;
    showWarning = true;
  } else if (percentage >= 80) {
    barColor = "#f7b500"; // Yellow/warning
    messageText = `You're at ${percentage}% of your limit.`;
    showWarning = true;
  } else {
    barColor = "#5bbd3f"; // Green/success
  }

  return (
    <Box>
      <Box paddingBlockEnd="200">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {label}
          </Text>
          <div style={{ display: "flex", gap: "12px" }}>
            {showPercentage && (
              <Text as="span" variant="bodySm" tone="subdued">
                {percentage}%
              </Text>
            )}
            <Text as="span" variant="bodySm" tone="subdued">
              {used} / {limit}
            </Text>
            {showRemaining && (
              <Text as="span" variant="bodySm" tone="subdued">
                {remaining} left
              </Text>
            )}
          </div>
        </div>
      </Box>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#e5e5e5",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            backgroundColor: barColor,
            transition: "width 0.3s ease-in-out",
          }}
        />
      </div>

      {showWarning && (
        <Box paddingBlockStart="200">
          <Text as="p" variant="bodySm" tone={percentage >= 100 ? "critical" : "subdued"}>
            {messageText}
          </Text>
        </Box>
      )}
    </Box>
  );
}
