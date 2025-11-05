// app/services/dashboard/activityLog.server.ts
// Activity Log Service (Task 62)

import prisma from "~/db.server";
import type { ActivityLog } from "@prisma/client";

export type ActivityAction =
  | "META_UPDATED"
  | "ALT_ADDED"
  | "SITEMAP_GENERATED"
  | "AUDIT_COMPLETED"
  | "GSC_CONNECTED"
  | "SCHEMA_ADDED"
  | "BULK_META_UPDATE"
  | "BULK_ALT_UPDATE";

export interface ActivityMetadata {
  productId?: string;
  productTitle?: string;
  count?: number;
  type?: string;
  urlCount?: number;
  score?: number;
  [key: string]: any;
}

/**
 * Log an activity to the database
 * FREE Tier: Last 50 activities only (enforced at query time)
 */
export async function logActivity(
  storeId: string,
  action: ActivityAction,
  description: string,
  metadata?: ActivityMetadata
): Promise<ActivityLog> {
  return await prisma.activityLog.create({
    data: {
      storeId,
      action,
      description,
      metadata: metadata ? (metadata as any) : null,
    },
  });
}

/**
 * Get recent activities for a store
 * FREE Tier: Last 50 activities only
 */
export async function getRecentActivities(
  storeId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  return await prisma.activityLog.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50), // FREE tier limit: 50 max
  });
}

/**
 * Get activity count for a store
 */
export async function getActivityCount(storeId: string): Promise<number> {
  return await prisma.activityLog.count({
    where: { storeId },
  });
}

/**
 * Delete old activities (for cleanup)
 * Keep only last 100 activities per store
 */
export async function cleanupOldActivities(storeId: string): Promise<number> {
  // Get IDs of activities to keep (last 100)
  const activitiesToKeep = await prisma.activityLog.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true },
  });

  const idsToKeep = activitiesToKeep.map((a) => a.id);

  // Delete all activities except those to keep
  const result = await prisma.activityLog.deleteMany({
    where: {
      storeId,
      id: { notIn: idsToKeep },
    },
  });

  return result.count;
}
