import {
  Card,
  Text,
  BlockStack,
  Button,
  InlineStack,
  TextField,
  Select,
  Badge,
  Icon,
  Spinner,
  Banner,
} from '@shopify/polaris';
import { MagicIcon, RefreshIcon, DuplicateIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface AISuggestion {
  type: 'title' | 'description' | 'content' | 'headline';
  text: string;
  score: number;
  reasoning: string;
}

interface AIContentSuggestionsProps {
  currentTitle?: string;
  currentDescription?: string;
  currentContent?: string;
  focusKeyword?: string;
  onGenerate?: (type: string, context: any) => Promise<AISuggestion[]>;
  onApply?: (type: string, text: string) => void;
}

export default function AIContentSuggestions({
  currentTitle,
  currentDescription,
  currentContent,
  focusKeyword,
  onGenerate,
  onApply,
}: AIContentSuggestionsProps) {
  const [suggestionType, setSuggestionType] = useState<'title' | 'description' | 'content' | 'headline'>('title');
  const [tone, setTone] = useState('professional');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!onGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const context = {
        currentTitle,
        currentDescription,
        currentContent,
        focusKeyword,
        tone,
      };

      const results = await onGenerate(suggestionType, context);
      setSuggestions(results);
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleApply = (suggestion: AISuggestion) => {
    if (onApply) {
      onApply(suggestion.type, suggestion.text);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge tone="success">Excellent</Badge>;
    if (score >= 75) return <Badge tone="success">Good</Badge>;
    if (score >= 60) return <Badge tone="warning">Fair</Badge>;
    return <Badge tone="critical">Needs Work</Badge>;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <InlineStack gap="200" blockAlign="center">
              <Icon source={MagicIcon} tone="info" />
              <Text as="h2" variant="headingMd">
                AI Content Suggestions
              </Text>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Generate SEO-optimized content with GPT-4
            </Text>
          </div>
          <Badge tone="info">Powered by OpenAI</Badge>
        </InlineStack>

        {/* Generation Controls */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
          }}
        >
          <BlockStack gap="300">
            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Content Type"
                  options={[
                    { label: 'Meta Title', value: 'title' },
                    { label: 'Meta Description', value: 'description' },
                    { label: 'Headline Ideas', value: 'headline' },
                    { label: 'Content Outline', value: 'content' },
                  ]}
                  value={suggestionType}
                  onChange={(value) => setSuggestionType(value as any)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Tone"
                  options={[
                    { label: 'Professional', value: 'professional' },
                    { label: 'Friendly', value: 'friendly' },
                    { label: 'Casual', value: 'casual' },
                    { label: 'Formal', value: 'formal' },
                    { label: 'Persuasive', value: 'persuasive' },
                    { label: 'Educational', value: 'educational' },
                  ]}
                  value={tone}
                  onChange={setTone}
                />
              </div>
            </InlineStack>

            {focusKeyword && (
              <Banner tone="info">
                Using focus keyword: <strong>{focusKeyword}</strong>
              </Banner>
            )}

            <Button
              variant="primary"
              onClick={handleGenerate}
              loading={isLoading}
              icon={RefreshIcon}
              fullWidth
            >
              Generate {suggestionType === 'title' ? 'Titles' : suggestionType === 'description' ? 'Descriptions' : 'Ideas'}
            </Button>
          </BlockStack>
        </div>

        {/* Error State */}
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spinner size="large" />
            <Text as="p" variant="bodyMd" tone="subdued">
              Generating AI suggestions...
            </Text>
          </div>
        )}

        {/* Suggestions */}
        {!isLoading && suggestions.length > 0 && (
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              Suggestions ({suggestions.length})
            </Text>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="start">
                    <div style={{ flex: 1 }}>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {suggestion.text}
                      </Text>
                    </div>
                    {getScoreBadge(suggestion.score)}
                  </InlineStack>

                  <Text as="p" variant="bodySm" tone="subdued">
                    {suggestion.reasoning}
                  </Text>

                  <InlineStack gap="200">
                    {onApply && (
                      <Button size="slim" onClick={() => handleApply(suggestion)}>
                        Apply
                      </Button>
                    )}
                    <Button size="slim" icon={DuplicateIcon} onClick={() => handleCopy(suggestion.text)}>
                      Copy
                    </Button>
                  </InlineStack>
                </BlockStack>
              </div>
            ))}
          </BlockStack>
        )}

        {/* Empty State */}
        {!isLoading && suggestions.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Icon source={MagicIcon} />
            <Text as="p" variant="bodyMd" tone="subdued">
              Click "Generate" to get AI-powered content suggestions
            </Text>
          </div>
        )}

        {/* Tips */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
          }}
        >
          <BlockStack gap="200">
            <Text as="h4" variant="headingXs" fontWeight="semibold">
              Tips for Better AI Suggestions:
            </Text>
            <ul style={{ marginLeft: '20px', fontSize: '13px' }}>
              <li>Set a focus keyword for more targeted results</li>
              <li>Provide existing content for context-aware improvements</li>
              <li>Try different tones to find the right voice for your audience</li>
              <li>Generate multiple times to explore different angles</li>
            </ul>
          </BlockStack>
        </div>
      </BlockStack>
    </Card>
  );
}

/**
 * Mock AI generation function (to be replaced with actual OpenAI integration)
 */
export async function mockAIGenerate(
  type: string,
  context: any
): Promise<AISuggestion[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const keyword = context.focusKeyword || 'your product';

  if (type === 'title') {
    return [
      {
        type: 'title',
        text: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Complete Guide for 2025`,
        score: 92,
        reasoning: 'Includes keyword, year for freshness, and power word "Complete"',
      },
      {
        type: 'title',
        text: `How to Master ${keyword} in 30 Days`,
        score: 88,
        reasoning: 'Action-oriented with specific timeframe creates urgency',
      },
      {
        type: 'title',
        text: `${keyword} Best Practices: Expert Tips & Tricks`,
        score: 85,
        reasoning: 'Establishes authority with "Expert" and promises actionable content',
      },
    ];
  }

  if (type === 'description') {
    return [
      {
        type: 'description',
        text: `Discover everything you need to know about ${keyword}. Our comprehensive guide covers best practices, tips, and expert strategies to help you succeed.`,
        score: 90,
        reasoning: 'Clear value proposition with benefit-driven language under 160 chars',
      },
      {
        type: 'description',
        text: `Learn ${keyword} from industry experts. Step-by-step tutorials, proven strategies, and real-world examples to accelerate your results.`,
        score: 87,
        reasoning: 'Emphasizes credibility and practical application',
      },
    ];
  }

  return [];
}
