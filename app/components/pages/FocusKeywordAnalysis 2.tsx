import { Card, Text, BlockStack, InlineStack, Badge, Icon, TextField } from '@shopify/polaris';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

export interface KeywordCheckResult {
  label: string;
  status: 'good' | 'ok' | 'bad';
  feedback: string;
}

interface FocusKeywordAnalysisProps {
  title: string;
  description: string;
  content: string;
  url: string;
  h1?: string;
  initialKeyword?: string;
}

export default function FocusKeywordAnalysis({
  title,
  description,
  content,
  url,
  h1,
  initialKeyword = '',
}: FocusKeywordAnalysisProps) {
  const [focusKeyword, setFocusKeyword] = useState(initialKeyword);

  // Perform keyword analysis
  const analysis = analyzeFocusKeyword(focusKeyword, {
    title,
    description,
    content,
    url,
    h1,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return CheckCircleIcon;
      case 'ok':
        return AlertTriangleIcon;
      case 'bad':
        return XCircleIcon;
      default:
        return AlertTriangleIcon;
    }
  };

  const getStatusTone = (status: string): 'success' | 'warning' | 'critical' => {
    switch (status) {
      case 'good':
        return 'success';
      case 'ok':
        return 'warning';
      case 'bad':
        return 'critical';
      default:
        return 'warning';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return '#10b981'; // Green
      case 'ok':
        return '#f59e0b'; // Yellow/Orange
      case 'bad':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  // Calculate overall score
  const goodCount = analysis.checks.filter((c) => c.status === 'good').length;
  const okCount = analysis.checks.filter((c) => c.status === 'ok').length;
  const badCount = analysis.checks.filter((c) => c.status === 'bad').length;
  const totalChecks = analysis.checks.length;

  const overallScore = ((goodCount * 100 + okCount * 50) / totalChecks).toFixed(0);
  const overallStatus =
    parseInt(overallScore) >= 70 ? 'good' : parseInt(overallScore) >= 40 ? 'ok' : 'bad';

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Focus Keyword Analysis
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Yoast-style traffic light analysis
            </Text>
          </div>
          {focusKeyword && (
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(overallStatus),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text as="span" variant="headingSm" fontWeight="bold">
                <span style={{ color: 'white' }}>{overallScore}</span>
              </Text>
            </div>
          )}
        </InlineStack>

        <TextField
          label="Focus Keyword"
          value={focusKeyword}
          onChange={setFocusKeyword}
          placeholder="Enter your target keyword..."
          autoComplete="off"
          helpText="The main keyword you want this page to rank for"
        />

        {focusKeyword ? (
          <>
            {/* Traffic Light Indicators */}
            <InlineStack gap="400">
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    margin: '0 auto 8px',
                    opacity: goodCount > 0 ? 1 : 0.3,
                  }}
                />
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {goodCount} Good
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    margin: '0 auto 8px',
                    opacity: okCount > 0 ? 1 : 0.3,
                  }}
                />
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {okCount} OK
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    margin: '0 auto 8px',
                    opacity: badCount > 0 ? 1 : 0.3,
                  }}
                />
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {badCount} Bad
                </Text>
              </div>
            </InlineStack>

            {/* Keyword Density */}
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
              }}
            >
              <InlineStack align="space-between">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Keyword Density
                </Text>
                <Badge tone={analysis.density >= 0.5 && analysis.density <= 2.5 ? 'success' : 'warning'}>
                  {`${analysis.density.toFixed(2)}%`}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Appears {analysis.occurrences} times in {analysis.totalWords} words (Target: 0.5-2.5%)
              </Text>
            </div>

            {/* Checks */}
            <BlockStack gap="200">
              {analysis.checks.map((check, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    border: `2px solid ${getStatusColor(check.status)}`,
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <InlineStack gap="200" blockAlign="start" wrap={false}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(check.status),
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {check.label}
                        </Text>
                        <Text as="p" variant="bodySm">
                          {check.feedback}
                        </Text>
                      </BlockStack>
                    </div>
                  </InlineStack>
                </div>
              ))}
            </BlockStack>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Text as="p" variant="bodyMd" tone="subdued">
              Enter a focus keyword above to see SEO recommendations
            </Text>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Analyze focus keyword placement and density
 */
function analyzeFocusKeyword(
  keyword: string,
  data: {
    title: string;
    description: string;
    content: string;
    url: string;
    h1?: string;
  }
): {
  occurrences: number;
  density: number;
  totalWords: number;
  checks: KeywordCheckResult[];
} {
  if (!keyword) {
    return {
      occurrences: 0,
      density: 0,
      totalWords: 0,
      checks: [],
    };
  }

  const keywordLower = keyword.toLowerCase();
  const { title, description, content, url, h1 } = data;

  // Count occurrences
  const countInText = (text: string): number => {
    const regex = new RegExp('\\b' + keywordLower + '\\b', 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  const titleOccurrences = countInText(title);
  const descriptionOccurrences = countInText(description);
  const h1Occurrences = h1 ? countInText(h1) : 0;
  const contentOccurrences = countInText(content);
  const urlOccurrences = countInText(url);

  const totalOccurrences = contentOccurrences;

  // Calculate density
  const words = content.trim().split(/\s+/);
  const totalWords = words.length;
  const density = totalWords > 0 ? (totalOccurrences / totalWords) * 100 : 0;

  // First paragraph check
  const firstParagraph = content.split(/\n\n/)[0] || '';
  const inFirstParagraph = countInText(firstParagraph) > 0;

  // Checks
  const checks: KeywordCheckResult[] = [
    {
      label: 'Keyword in SEO Title',
      status: titleOccurrences > 0 ? 'good' : 'bad',
      feedback:
        titleOccurrences > 0
          ? `Great! Keyword appears ${titleOccurrences} time(s) in the title.`
          : 'Add your focus keyword to the SEO title.',
    },
    {
      label: 'Keyword in Meta Description',
      status: descriptionOccurrences > 0 ? 'good' : 'ok',
      feedback:
        descriptionOccurrences > 0
          ? 'Perfect! Keyword is in the meta description.'
          : 'Consider adding the keyword to your meta description.',
    },
    {
      label: 'Keyword in URL',
      status: urlOccurrences > 0 ? 'good' : 'ok',
      feedback:
        urlOccurrences > 0
          ? 'Excellent! Keyword appears in the URL slug.'
          : 'Try to include the keyword in the URL for better SEO.',
    },
    {
      label: 'Keyword in H1',
      status: h1Occurrences > 0 ? 'good' : 'bad',
      feedback:
        h1Occurrences > 0
          ? 'Perfect! Keyword is in the H1 heading.'
          : 'Add your keyword to the main H1 heading.',
    },
    {
      label: 'Keyword in First Paragraph',
      status: inFirstParagraph ? 'good' : 'ok',
      feedback: inFirstParagraph
        ? 'Great! Keyword appears in the first paragraph.'
        : 'Add the keyword early in your content (first paragraph).',
    },
    {
      label: 'Keyword Density',
      status: density >= 0.5 && density <= 2.5 ? 'good' : density > 2.5 ? 'bad' : 'ok',
      feedback:
        density > 2.5
          ? `Density is too high (${density.toFixed(2)}%). Avoid keyword stuffing.`
          : density < 0.5
          ? `Density is low (${density.toFixed(2)}%). Use the keyword more naturally.`
          : `Perfect density (${density.toFixed(2)}%)! Keyword appears naturally.`,
    },
    {
      label: 'Keyword Distribution',
      status: contentOccurrences >= 3 ? 'good' : contentOccurrences >= 1 ? 'ok' : 'bad',
      feedback:
        contentOccurrences >= 3
          ? `Keyword appears ${contentOccurrences} times throughout content.`
          : contentOccurrences >= 1
          ? 'Use the keyword a few more times in your content.'
          : 'Keyword is missing from the content. Add it naturally.',
    },
  ];

  return {
    occurrences: totalOccurrences,
    density,
    totalWords,
    checks,
  };
}
