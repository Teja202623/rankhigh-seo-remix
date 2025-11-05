// app/services/dashboard/quickWins.server.ts
// Quick Wins Generator (Task 59)

import prisma from "~/db.server";

export interface QuickWin {
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  effort: "LOW" | "MEDIUM" | "HIGH";
  actionUrl: string;
  count?: number;
}

/**
 * Generate top 3 quick wins based on current SEO status
 *
 * Simplified for FREE tier (no detailed issues tracking)
 * Based on:
 * 1. Sitemap existence
 * 2. GSC connection
 * 3. Audit score
 * 4. Critical/high issue counts
 *
 * FREE Tier: Top 3 only
 */
export async function getQuickWins(storeId: string): Promise<QuickWin[]> {
  const wins: QuickWin[] = [];

  // Fetch latest audit
  const latestAudit = await prisma.audit.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch store info
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  // Priority 1: Generate sitemap (HIGH impact if missing)
  if (!store.sitemapLastGenerated) {
    wins.push({
      title: "Generate XML sitemap",
      description: "Help search engines discover and index all your pages efficiently",
      impact: "HIGH",
      effort: "LOW",
      actionUrl: "/app/seo/sitemap",
    });
  }

  // Priority 2: Connect GSC (HIGH impact if not connected)
  if (!store.gscConnected) {
    wins.push({
      title: "Connect Google Search Console",
      description: "Track how your store appears in Google search results and identify opportunities",
      impact: "HIGH",
      effort: "LOW",
      actionUrl: "/app/integrations/gsc",
    });
  }

  // Priority 3: Fix critical issues (if audit exists and has critical issues)
  if (latestAudit && latestAudit.criticalIssues > 0) {
    wins.push({
      title: `Fix ${latestAudit.criticalIssues} critical SEO issue${latestAudit.criticalIssues > 1 ? "s" : ""}`,
      description: "Critical issues significantly harm your search engine rankings",
      impact: "HIGH",
      effort: "LOW",
      actionUrl: "/app/seo/audit",
      count: latestAudit.criticalIssues,
    });
  }

  // Priority 4: Improve meta tags
  if (wins.length < 3) {
    wins.push({
      title: "Optimize product meta tags",
      description: "Add compelling titles and descriptions to improve click-through rates",
      impact: "MEDIUM",
      effort: "LOW",
      actionUrl: "/app/seo/meta",
    });
  }

  // Priority 5: Add ALT text to images
  if (wins.length < 3) {
    wins.push({
      title: "Add ALT text to product images",
      description: "ALT text improves accessibility and helps images rank in search results",
      impact: "MEDIUM",
      effort: "LOW",
      actionUrl: "/app/seo/images",
    });
  }

  // Priority 6: Add schema markup
  if (wins.length < 3) {
    wins.push({
      title: "Add product schema markup",
      description: "Rich snippets help your products stand out in search results",
      impact: "MEDIUM",
      effort: "LOW",
      actionUrl: "/app/seo/schema",
    });
  }

  // Return top 3 only (FREE tier limit)
  return wins.slice(0, 3);
}

/**
 * Get badge tone for impact level
 */
export function getImpactTone(impact: QuickWin["impact"]): "success" | "attention" | "info" {
  switch (impact) {
    case "HIGH":
      return "success";
    case "MEDIUM":
      return "attention";
    case "LOW":
      return "info";
  }
}

/**
 * Get badge tone for effort level
 */
export function getEffortTone(effort: QuickWin["effort"]): "success" | "attention" | "warning" {
  switch (effort) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "attention";
    case "HIGH":
      return "warning";
  }
}
