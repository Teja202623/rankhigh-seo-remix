/**
 * Shared TypeScript types for RankHigh SEO
 */

export interface AuditRun {
  id: string;
  storeId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  score: number | null;
  issuesFound: number;
  issuesFixed: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  totalUrls: number;
  completed: number;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SEOIssue {
  id: string;
  auditId: string;
  pageId: string | null;
  page?: {
    handle: string;
  };
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  fixed: boolean;
  fixedAt: Date | null;
  canAutoFix: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  storeId: string;
  url: string;
  handle: string;
  type: 'page' | 'product' | 'collection' | 'blog' | 'article';
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesWithAlt: number;
  status: 'active' | 'draft' | 'archived';
  seoScore: number | null;
  lastScanned: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Keyword {
  id: string;
  storeId: string;
  keyword: string;
  targetUrl: string | null;
  searchVolume: number | null;
  difficulty: number | null;
  currentPosition: number | null;
  bestPosition: number | null;
  trackingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaMarkup {
  id: string;
  storeId: string;
  type: string;
  name: string;
  data: any;
  status: 'active' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  storeId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: Date;
}
