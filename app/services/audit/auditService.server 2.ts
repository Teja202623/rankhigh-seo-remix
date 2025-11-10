import prisma from "~/db.server";

/**
 * Audit Service
 * Handles SEO audit creation, execution, and result storage
 */

/**
 * Start a new SEO audit for a store
 * Creates audit record
 *
 * @param storeId Store ID
 * @param url URL to audit
 * @returns Audit ID
 */
export async function startAudit(
  storeId: string,
  url: string
): Promise<string> {
  // Create audit record with PENDING status
  const audit = await prisma.audit.create({
    data: {
      url,
      storeId,
      status: "PENDING",
      progress: 0,
    },
  });

  return audit.id;
}

/**
 * Get audit by ID
 */
export async function getAudit(auditId: string, storeId: string) {
  return prisma.audit.findUnique({
    where: { id: auditId },
  });
}

/**
 * Update audit progress
 */
export async function updateAuditProgress(
  auditId: string,
  progress: number
) {
  return prisma.audit.update({
    where: { id: auditId },
    data: { progress },
  });
}

/**
 * Complete audit with results
 */
export async function completeAudit(
  auditId: string,
  results: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  }
) {
  return prisma.audit.update({
    where: { id: auditId },
    data: {
      ...results,
      status: "COMPLETED",
      completedAt: new Date(),
      progress: 100,
    },
  });
}
