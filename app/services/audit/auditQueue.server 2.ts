// app/services/audit/auditQueue.server.ts
/**
 * BullMQ Queue Worker System for SEO Audits
 *
 * Manages background processing of SEO audits using Redis and BullMQ.
 * Handles job creation, processing, progress tracking, and error recovery.
 *
 * Features:
 * - Automatic retry logic for failed jobs
 * - Progress tracking with percentage updates
 * - Job timeout protection (10 minutes)
 * - Concurrency control (1 audit per store at a time)
 * - Database status synchronization
 */

import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "~/db.server";
import type { AuditJobData, AuditJobResult } from "~/types/audit";
import { processAudit } from "./auditService.server";

// ====================
// REDIS CONNECTION
// ====================

const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (error) => {
  console.error("[AuditQueue] Redis connection error:", error);
});

redisConnection.on("connect", () => {
  console.log("[AuditQueue] Redis connected successfully");
});

// ====================
// QUEUE SETUP
// ====================

const QUEUE_NAME = "seo-audits";

export const auditQueue = new Queue<AuditJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 second delay, doubles each retry
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

// ====================
// WORKER SETUP
// ====================

let auditWorker: Worker<AuditJobData, AuditJobResult> | null = null;

/**
 * Initialize the BullMQ worker for processing audit jobs
 * Should be called once on application startup
 */
export function initializeAuditWorker() {
  // Prevent multiple worker initialization
  if (auditWorker) {
    console.warn("[AuditQueue] Worker already initialized");
    return auditWorker;
  }

  auditWorker = new Worker<AuditJobData, AuditJobResult>(
    QUEUE_NAME,
    async (job: Job<AuditJobData>) => {
      const { auditId, storeId, shopDomain } = job.data;

      console.log(
        `[AuditQueue] Processing audit ${auditId} for store ${shopDomain}`
      );

      try {
        // Update audit status to RUNNING
        await prisma.audit.update({
          where: { id: auditId },
          data: {
            status: "RUNNING",
            startedAt: new Date(),
          },
        });

        // Update job progress - Fetching data
        await job.updateProgress({ stage: "FETCHING", percentage: 10 });

        // Execute the audit
        const result = await processAudit(auditId, shopDomain, (progress) => {
          // Update job progress during audit execution
          job.updateProgress(progress);
        });

        // Update job progress - Completed
        await job.updateProgress({ stage: "COMPLETED", percentage: 100 });

        console.log(
          `[AuditQueue] Audit ${auditId} completed successfully with score ${result.overallScore}`
        );

        return result;
      } catch (error) {
        console.error(`[AuditQueue] Audit ${auditId} failed:`, error);

        // Update audit status to FAILED
        await prisma.audit.update({
          where: { id: auditId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
          },
        });

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process one audit at a time to avoid overwhelming Shopify API
      limiter: {
        max: 5, // Max 5 jobs per...
        duration: 60000, // ...60 seconds (rate limiting)
      },
    }
  );

  // ====================
  // EVENT HANDLERS
  // ====================

  auditWorker.on("completed", async (job: Job<AuditJobData, AuditJobResult>) => {
    console.log(
      `[AuditQueue] Job ${job.id} completed for audit ${job.data.auditId}`
    );

    // Result is already saved by processAudit, but we can log it here
    if (job.returnvalue) {
      console.log(
        `[AuditQueue] Audit results - Score: ${job.returnvalue.overallScore}, Issues: ${job.returnvalue.totalIssues}`
      );
    }
  });

  auditWorker.on("failed", async (job: Job<AuditJobData> | undefined, error: Error) => {
    if (!job) return;

    console.error(
      `[AuditQueue] Job ${job.id} failed for audit ${job.data.auditId}:`,
      error.message
    );

    // If this was the final attempt, ensure audit is marked as FAILED
    if (job.attemptsMade >= job.opts.attempts!) {
      await prisma.audit.update({
        where: { id: job.data.auditId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
    }
  });

  auditWorker.on("active", (job: Job<AuditJobData>) => {
    console.log(
      `[AuditQueue] Job ${job.id} started processing audit ${job.data.auditId}`
    );
  });

  auditWorker.on("stalled", (jobId: string) => {
    console.warn(`[AuditQueue] Job ${jobId} has stalled`);
  });

  auditWorker.on("error", (error: Error) => {
    console.error("[AuditQueue] Worker error:", error);
  });

  console.log("[AuditQueue] Worker initialized successfully");

  return auditWorker;
}

// ====================
// QUEUE OPERATIONS
// ====================

/**
 * Add a new audit job to the queue
 * @param auditData - Data for the audit job
 * @returns Job ID
 */
export async function queueAudit(auditData: AuditJobData): Promise<string> {
  const job = await auditQueue.add("process-audit", auditData, {
    jobId: `audit-${auditData.auditId}`, // Prevent duplicate jobs for same audit
  });

  console.log(
    `[AuditQueue] Queued audit ${auditData.auditId} with job ID ${job.id}`
  );

  return job.id!;
}

/**
 * Get the status of an audit job
 * @param auditId - The audit ID
 * @returns Job status and progress
 */
export async function getAuditJobStatus(auditId: string) {
  const jobId = `audit-${auditId}`;
  const job = await auditQueue.getJob(jobId);

  if (!job) {
    return { status: "NOT_FOUND", progress: null };
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    status: state,
    progress,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Check if a store can run a new audit
 * Enforces FREE tier limit: max 1 audit per hour
 */
export async function canRunAudit(storeId: string): Promise<{
  allowed: boolean;
  reason?: string;
  nextAllowedTime?: Date;
}> {
  // Check for running audits
  const runningAudit = await prisma.audit.findFirst({
    where: {
      storeId,
      status: { in: ["PENDING", "RUNNING"] },
    },
  });

  if (runningAudit) {
    return {
      allowed: false,
      reason: "An audit is already running for this store",
    };
  }

  // Check last completed audit (FREE tier: 1 hour minimum between audits)
  const lastAudit = await prisma.audit.findFirst({
    where: {
      storeId,
      status: "COMPLETED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (lastAudit) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (lastAudit.createdAt > oneHourAgo) {
      const nextAllowedTime = new Date(
        lastAudit.createdAt.getTime() + 60 * 60 * 1000
      );

      return {
        allowed: false,
        reason: "Please wait 1 hour between audits (FREE tier limit)",
        nextAllowedTime,
      };
    }
  }

  return { allowed: true };
}

/**
 * Cancel a running audit job
 */
export async function cancelAudit(auditId: string): Promise<boolean> {
  const jobId = `audit-${auditId}`;
  const job = await auditQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();

  // Update audit status
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
    },
  });

  console.log(`[AuditQueue] Cancelled audit ${auditId}`);

  return true;
}

/**
 * Clean up old jobs from the queue
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldJobs(): Promise<void> {
  // Remove completed jobs older than 24 hours
  await auditQueue.clean(86400000, 100, "completed");

  // Remove failed jobs older than 7 days
  await auditQueue.clean(604800000, 100, "failed");

  console.log("[AuditQueue] Cleaned up old jobs");
}

/**
 * Gracefully shutdown the worker
 * Should be called on application shutdown
 */
export async function shutdownAuditWorker(): Promise<void> {
  if (auditWorker) {
    await auditWorker.close();
    console.log("[AuditQueue] Worker shut down gracefully");
  }

  await redisConnection.quit();
  console.log("[AuditQueue] Redis connection closed");
}
