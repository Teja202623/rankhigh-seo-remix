// app/services/dashboard/healthScore.server.ts
// SEO Health Score Calculator (Task 57)

import prisma from "~/db.server";

export interface HealthScoreData {
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

/**
 * Calculate SEO health score (0-100) based on audit results and store status
 *
 * Algorithm:
 * - Start with latest audit score (0-100)
 * - Subtract penalties for critical/high issues
 * - Add bonuses for sitemap and GSC connection
 * - Clamp to 0-100 range
 *
 * FREE Tier: Uses latest audit only
 */
export async function calculateHealthScore(
  storeId: string
): Promise<HealthScoreData> {
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

  // Start with base score from audit
  let baseScore = 0;
  let criticalPenalty = 0;
  let highPenalty = 0;

  if (latestAudit) {
    baseScore = latestAudit.overallScore || 0;

    // Penalties for critical issues (-5 points each)
    const criticalCount = latestAudit.criticalIssues || 0;
    criticalPenalty = criticalCount * 5;

    // Penalties for high severity issues (-2 points each)
    const highCount = latestAudit.highIssues || 0;
    highPenalty = highCount * 2;
  }

  // Bonuses
  const sitemapBonus = store.sitemapLastGenerated ? 5 : 0;
  const gscBonus = store.gscConnected ? 5 : 0;

  // Calculate final score
  let finalScore = baseScore - criticalPenalty - highPenalty + sitemapBonus + gscBonus;

  // Clamp to 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));

  // Determine status
  let status: "critical" | "needs-work" | "good" | "excellent";
  if (finalScore >= 86) {
    status = "excellent";
  } else if (finalScore >= 71) {
    status = "good";
  } else if (finalScore >= 41) {
    status = "needs-work";
  } else {
    status = "critical";
  }

  return {
    score: Math.round(finalScore),
    status,
    breakdown: {
      baseScore,
      criticalPenalty,
      highPenalty,
      sitemapBonus,
      gscBonus,
    },
  };
}

/**
 * Get status color for Polaris Badge component
 */
export function getHealthScoreTone(
  status: HealthScoreData["status"]
): "critical" | "warning" | "success" | "info" {
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
}

/**
 * Get status text
 */
export function getHealthScoreStatusText(status: HealthScoreData["status"]): string {
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
}
