import { ScoreCategory } from '../components/common/SEOScoreBreakdown';

export interface SEOMetrics {
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  totalPages: number;
  pagesWithIssues: number;
  avgLoadTime?: number;
  mobileOptimized?: number;
  hasSSL?: boolean;
  hasRobotsTxt?: boolean;
  hasSitemap?: boolean;
}

export interface SEOScoreResult {
  overallScore: number;
  categories: ScoreCategory[];
}

/**
 * Calculate SEO score from 0-100 based on various metrics
 */
export function calculateSEOScore(metrics: SEOMetrics): SEOScoreResult {
  // Category weights (must sum to 100)
  const weights = {
    technicalSEO: 35,
    contentQuality: 30,
    userExperience: 20,
    siteStructure: 15,
  };

  // Calculate Technical SEO Score (35%)
  let technicalScore = 100;
  let technicalIssues = 0;

  // Deduct points for critical issues (10 points each, max 50 points)
  const criticalPenalty = Math.min(metrics.criticalIssues * 10, 50);
  technicalScore -= criticalPenalty;
  technicalIssues += metrics.criticalIssues;

  // Deduct points for high issues (5 points each, max 30 points)
  const highPenalty = Math.min(metrics.highIssues * 5, 30);
  technicalScore -= highPenalty;
  technicalIssues += metrics.highIssues;

  // Bonus for SSL
  if (!metrics.hasSSL) {
    technicalScore -= 10;
    technicalIssues++;
  }

  // Bonus for robots.txt
  if (!metrics.hasRobotsTxt) {
    technicalScore -= 5;
    technicalIssues++;
  }

  technicalScore = Math.max(0, technicalScore);

  // Calculate Content Quality Score (30%)
  let contentScore = 100;
  let contentIssues = 0;

  // Deduct for medium issues (3 points each, max 40 points)
  const mediumPenalty = Math.min(metrics.mediumIssues * 3, 40);
  contentScore -= mediumPenalty;
  contentIssues += metrics.mediumIssues;

  // Deduct for low issues (1 point each, max 20 points)
  const lowPenalty = Math.min(metrics.lowIssues * 1, 20);
  contentScore -= lowPenalty;
  contentIssues += metrics.lowIssues;

  // Pages with issues ratio
  if (metrics.totalPages > 0) {
    const issueRatio = metrics.pagesWithIssues / metrics.totalPages;
    contentScore -= issueRatio * 30;
  }

  contentScore = Math.max(0, contentScore);

  // Calculate User Experience Score (20%)
  let uxScore = 100;
  let uxIssues = 0;

  // Page load time penalty
  if (metrics.avgLoadTime) {
    if (metrics.avgLoadTime > 5000) {
      uxScore -= 40;
      uxIssues++;
    } else if (metrics.avgLoadTime > 3000) {
      uxScore -= 20;
      uxIssues++;
    } else if (metrics.avgLoadTime > 2000) {
      uxScore -= 10;
    }
  }

  // Mobile optimization
  if (metrics.mobileOptimized !== undefined) {
    const mobileScore = metrics.mobileOptimized;
    uxScore = (uxScore + mobileScore) / 2;
    if (mobileScore < 50) uxIssues++;
  }

  uxScore = Math.max(0, uxScore);

  // Calculate Site Structure Score (15%)
  let structureScore = 100;
  let structureIssues = 0;

  // Sitemap bonus
  if (!metrics.hasSitemap) {
    structureScore -= 30;
    structureIssues++;
  }

  // Total pages consideration
  if (metrics.totalPages === 0) {
    structureScore -= 50;
    structureIssues++;
  }

  structureScore = Math.max(0, structureScore);

  // Calculate weighted overall score
  const overallScore =
    (technicalScore * weights.technicalSEO +
      contentScore * weights.contentQuality +
      uxScore * weights.userExperience +
      structureScore * weights.siteStructure) /
    100;

  const categories: ScoreCategory[] = [
    {
      name: 'Technical SEO',
      score: technicalScore,
      weight: weights.technicalSEO,
      issues: technicalIssues,
      description: 'Critical and high priority technical issues, SSL, robots.txt',
    },
    {
      name: 'Content Quality',
      score: contentScore,
      weight: weights.contentQuality,
      issues: contentIssues,
      description: 'Meta tags, descriptions, content structure, and optimization',
    },
    {
      name: 'User Experience',
      score: uxScore,
      weight: weights.userExperience,
      issues: uxIssues,
      description: 'Page speed, mobile optimization, and user engagement',
    },
    {
      name: 'Site Structure',
      score: structureScore,
      weight: weights.siteStructure,
      issues: structureIssues,
      description: 'Sitemap, navigation, internal linking, and site architecture',
    },
  ];

  return {
    overallScore: Math.round(overallScore),
    categories,
  };
}

/**
 * Get score label based on score value
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Improvement';
  return 'Poor';
}

/**
 * Get improvement suggestions based on score categories
 */
export function getImprovementSuggestions(categories: ScoreCategory[]): string[] {
  const suggestions: string[] = [];

  categories.forEach((category) => {
    if (category.score < 60) {
      switch (category.name) {
        case 'Technical SEO':
          suggestions.push('Fix critical technical issues immediately');
          suggestions.push('Enable SSL/HTTPS for your site');
          suggestions.push('Create and submit robots.txt file');
          break;
        case 'Content Quality':
          suggestions.push('Optimize meta titles and descriptions');
          suggestions.push('Fix duplicate or missing content');
          suggestions.push('Improve content structure with proper headings');
          break;
        case 'User Experience':
          suggestions.push('Optimize page load speed');
          suggestions.push('Improve mobile responsiveness');
          suggestions.push('Compress and optimize images');
          break;
        case 'Site Structure':
          suggestions.push('Create and submit XML sitemap');
          suggestions.push('Improve internal linking structure');
          suggestions.push('Organize content with proper hierarchy');
          break;
      }
    } else if (category.score < 80) {
      suggestions.push(`Continue improving ${category.name.toLowerCase()}`);
    }
  });

  return suggestions.slice(0, 5); // Return top 5 suggestions
}
