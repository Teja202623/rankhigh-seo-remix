import { Card, Text, BlockStack, ProgressBar, InlineStack, Badge } from '@shopify/polaris';

export interface ScoreCategory {
  name: string;
  score: number;
  weight: number;
  issues: number;
  description: string;
}

interface SEOScoreBreakdownProps {
  categories: ScoreCategory[];
}

export default function SEOScoreBreakdown({ categories }: SEOScoreBreakdownProps) {
  const getScoreTone = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getScoreProgress = (score: number): 'complete' | 'partiallyComplete' | 'incomplete' => {
    if (score >= 80) return 'complete';
    if (score >= 60) return 'partiallyComplete';
    return 'incomplete';
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Score Breakdown
        </Text>
        <BlockStack gap="300">
          {categories.map((category) => (
            <div key={category.name}>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {category.name}
                    </Text>
                    <Badge tone={getScoreTone(category.score) as any}>
                      {`${Math.round(category.score)}/100`}
                    </Badge>
                    {category.issues > 0 && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        {category.issues} issue{category.issues !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </InlineStack>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Weight: {category.weight}%
                  </Text>
                </InlineStack>
                <ProgressBar
                  progress={category.score}
                  size="small"
                  tone={getScoreTone(category.score) as any}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  {category.description}
                </Text>
              </BlockStack>
            </div>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
