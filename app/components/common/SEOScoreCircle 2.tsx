import { Card, Text, BlockStack } from '@shopify/polaris';
import { useMemo } from 'react';

interface SEOScoreCircleProps {
  score: number; // 0-100
  size?: number;
  showLabel?: boolean;
  label?: string;
}

export default function SEOScoreCircle({
  score,
  size = 120,
  showLabel = true,
  label = 'SEO Score'
}: SEOScoreCircleProps) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#2E7D32'; // Green
    if (score >= 60) return '#F9A825'; // Yellow/Amber
    if (score >= 40) return '#F57C00'; // Orange
    return '#C62828'; // Red
  };

  const getScoreTone = (score: number): 'success' | 'warning' | 'critical' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const color = getScoreColor(score);
  const tone = getScoreTone(score);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="32"
          fontWeight="bold"
          fill={color}
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {Math.round(score)}
        </text>
      </svg>
      {showLabel && (
        <div style={{ marginTop: '8px' }}>
          <Text as="p" variant="bodyMd" fontWeight="semibold" tone={tone as any}>
            {label}
          </Text>
        </div>
      )}
    </div>
  );
}
