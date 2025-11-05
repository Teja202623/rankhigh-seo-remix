import { Card, Text, BlockStack, ProgressBar, Badge, InlineStack, Icon } from '@shopify/polaris';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon } from '@shopify/polaris-icons';

export interface ContentMetrics {
  wordCount: number;
  readabilityScore: number;
  paragraphCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  passiveVoicePercentage: number;
  transitionWordsPercentage: number;
  subheadingsCount: number;
}

interface ContentAnalysisProps {
  content: string;
  focusKeyword?: string;
}

export default function ContentAnalysis({ content, focusKeyword }: ContentAnalysisProps) {
  // Calculate metrics from content
  const metrics = calculateContentMetrics(content, focusKeyword);

  const getScoreTone = (score: number): 'success' | 'warning' | 'critical' => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'critical';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return CheckCircleIcon;
    if (score >= 40) return InfoIcon;
    return AlertTriangleIcon;
  };

  const checks = [
    {
      label: 'Word Count',
      value: metrics.wordCount,
      target: '300-2000 words',
      score: metrics.wordCount >= 300 && metrics.wordCount <= 2000 ? 100 : metrics.wordCount < 300 ? 30 : 70,
      feedback:
        metrics.wordCount < 300
          ? 'Too short. Aim for at least 300 words.'
          : metrics.wordCount > 2000
          ? 'Very long content. Consider breaking it up.'
          : 'Good length!',
    },
    {
      label: 'Readability',
      value: `${metrics.readabilityScore}/100`,
      target: '60-80 (recommended)',
      score: metrics.readabilityScore >= 60 && metrics.readabilityScore <= 80 ? 100 : 50,
      feedback:
        metrics.readabilityScore < 60
          ? 'Text is difficult to read. Simplify sentences.'
          : metrics.readabilityScore > 80
          ? 'Text might be too simple.'
          : 'Great readability!',
    },
    {
      label: 'Sentence Length',
      value: `${metrics.avgWordsPerSentence.toFixed(1)} words/sentence`,
      target: '15-20 words',
      score: metrics.avgWordsPerSentence >= 15 && metrics.avgWordsPerSentence <= 20 ? 100 : 60,
      feedback:
        metrics.avgWordsPerSentence > 20
          ? 'Sentences are too long. Break them up.'
          : metrics.avgWordsPerSentence < 15
          ? 'Sentences are very short. Add more detail.'
          : 'Perfect sentence length!',
    },
    {
      label: 'Paragraph Structure',
      value: `${metrics.avgSentencesPerParagraph.toFixed(1)} sentences/paragraph`,
      target: '3-5 sentences',
      score: metrics.avgSentencesPerParagraph >= 3 && metrics.avgSentencesPerParagraph <= 5 ? 100 : 70,
      feedback:
        metrics.avgSentencesPerParagraph > 5
          ? 'Paragraphs are too long.'
          : metrics.avgSentencesPerParagraph < 3
          ? 'Paragraphs are too short.'
          : 'Well-structured paragraphs!',
    },
    {
      label: 'Passive Voice',
      value: `${metrics.passiveVoicePercentage.toFixed(1)}%`,
      target: 'Less than 10%',
      score: metrics.passiveVoicePercentage < 10 ? 100 : metrics.passiveVoicePercentage < 15 ? 70 : 40,
      feedback:
        metrics.passiveVoicePercentage > 15
          ? 'Too much passive voice. Use active voice.'
          : metrics.passiveVoicePercentage > 10
          ? 'Slightly high passive voice usage.'
          : 'Great use of active voice!',
    },
    {
      label: 'Transition Words',
      value: `${metrics.transitionWordsPercentage.toFixed(1)}%`,
      target: 'At least 30%',
      score: metrics.transitionWordsPercentage >= 30 ? 100 : metrics.transitionWordsPercentage >= 20 ? 70 : 40,
      feedback:
        metrics.transitionWordsPercentage < 20
          ? 'Add more transition words for better flow.'
          : metrics.transitionWordsPercentage < 30
          ? 'Good, but could use a few more transition words.'
          : 'Excellent use of transition words!',
    },
    {
      label: 'Subheadings',
      value: metrics.subheadingsCount,
      target: 'Every 300 words',
      score: metrics.subheadingsCount >= Math.floor(metrics.wordCount / 300) ? 100 : 60,
      feedback:
        metrics.subheadingsCount < Math.floor(metrics.wordCount / 300)
          ? 'Add more subheadings to break up content.'
          : 'Good use of subheadings!',
    },
  ];

  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Content Analysis
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Readability and content quality metrics
            </Text>
          </div>
          <Badge tone={getScoreTone(overallScore) as any}>
            {`Score: ${Math.round(overallScore)}/100`}
          </Badge>
        </InlineStack>

        {/* Overall Progress */}
        <div>
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm">
                Content Quality
              </Text>
              <Text as="span" variant="bodySm" fontWeight="semibold">
                {Math.round(overallScore)}%
              </Text>
            </InlineStack>
            <ProgressBar progress={overallScore} size="medium" tone={getScoreTone(overallScore) as any} />
          </BlockStack>
        </div>

        {/* Individual Checks */}
        <BlockStack gap="300">
          {checks.map((check, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: check.score >= 70 ? '#f0fdf4' : check.score >= 40 ? '#fffbeb' : '#fef2f2',
              }}
            >
              <InlineStack gap="200" blockAlign="start" wrap={false}>
                <div style={{ paddingTop: '2px' }}>
                  <Icon source={getScoreIcon(check.score)} tone={getScoreTone(check.score)} />
                </div>
                <div style={{ flex: 1 }}>
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {check.label}
                      </Text>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        {check.value}
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Target: {check.target}
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

        {focusKeyword && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <Text as="p" variant="bodySm">
              <strong>Focus Keyword:</strong> "{focusKeyword}" - Appears{' '}
              {countKeywordOccurrences(content, focusKeyword)} times
            </Text>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Calculate content metrics from text
 */
function calculateContentMetrics(content: string, focusKeyword?: string): ContentMetrics {
  if (!content) {
    return {
      wordCount: 0,
      readabilityScore: 0,
      paragraphCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      avgSentencesPerParagraph: 0,
      passiveVoicePercentage: 0,
      transitionWordsPercentage: 0,
      subheadingsCount: 0,
    };
  }

  // Word count
  const words = content.trim().split(/\s+/);
  const wordCount = words.length;

  // Sentence count
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // Paragraph count
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length || 1;

  // Averages
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;

  // Passive voice detection (simple heuristic)
  const passiveIndicators = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
  const passiveMatches = content.match(passiveIndicators) || [];
  const passiveVoicePercentage = sentenceCount > 0 ? (passiveMatches.length / sentenceCount) * 100 : 0;

  // Transition words
  const transitionWords = [
    'however',
    'therefore',
    'furthermore',
    'moreover',
    'consequently',
    'thus',
    'hence',
    'additionally',
    'meanwhile',
    'nevertheless',
    'nonetheless',
    'also',
    'besides',
    'finally',
    'firstly',
    'secondly',
  ];
  const transitionRegex = new RegExp('\\b(' + transitionWords.join('|') + ')\\b', 'gi');
  const transitionMatches = content.match(transitionRegex) || [];
  const transitionWordsPercentage = sentenceCount > 0 ? (transitionMatches.length / sentenceCount) * 100 : 0;

  // Subheadings (simple count of ## or H2-H6 tags)
  const subheadingsCount = (content.match(/^##+ /gm) || []).length + (content.match(/<h[2-6]/gi) || []).length;

  // Flesch Reading Ease (simplified calculation)
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const readabilityScore =
    wordCount > 0 && sentenceCount > 0
      ? Math.max(
          0,
          Math.min(
            100,
            206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount)
          )
        )
      : 0;

  return {
    wordCount,
    readabilityScore,
    paragraphCount,
    sentenceCount,
    avgWordsPerSentence,
    avgSentencesPerParagraph,
    passiveVoicePercentage,
    transitionWordsPercentage,
    subheadingsCount,
  };
}

/**
 * Simple syllable counter
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Count keyword occurrences
 */
function countKeywordOccurrences(content: string, keyword: string): number {
  const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}
