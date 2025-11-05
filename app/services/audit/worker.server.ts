// app/services/audit/worker.server.ts
/**
 * Audit Worker Initialization
 *
 * This file should be imported in your server entry point to initialize
 * the BullMQ worker when the application starts.
 *
 * Usage:
 * import { initWorker } from "~/services/audit/worker.server";
 *
 * In your server setup:
 * initWorker();
 */

import { initializeAuditWorker } from "./auditQueue.server";

let workerInitialized = false;

/**
 * Initialize the audit worker
 * Safe to call multiple times - will only initialize once
 */
export function initWorker() {
  if (workerInitialized) {
    console.log("[Worker] Already initialized, skipping");
    return;
  }

  try {
    initializeAuditWorker();
    workerInitialized = true;
    console.log("[Worker] Audit worker initialized successfully");
  } catch (error) {
    console.error("[Worker] Failed to initialize audit worker:", error);
  }
}

/**
 * Check if worker is initialized
 */
export function isWorkerInitialized() {
  return workerInitialized;
}
