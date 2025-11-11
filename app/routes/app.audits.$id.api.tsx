import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "~/db.server";
import { executeAudit } from "~/services/audit/auditExecutor.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const auditId = params.id;

  if (!auditId) {
    return json({ error: "Audit ID not provided" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    return json({ error: "Store not found" }, { status: 404 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit || audit.storeId !== store.id) {
    return json({ error: "Audit not found" }, { status: 404 });
  }

  // If audit is PENDING, start execution
  if (audit.status === "PENDING") {
    // Execute audit in the background
    // This will update the audit record as it progresses
    executeAudit(auditId, store.id).catch((error) => {
      console.error("Background audit execution failed:", error);
    });
  }

  // Return current audit state
  return json({
    audit: {
      id: audit.id,
      url: audit.url,
      status: audit.status,
      progress: audit.progress || 0,
      createdAt: audit.createdAt.toISOString(),
      updatedAt: audit.updatedAt.toISOString(),
      criticalIssues: audit.criticalIssues || 0,
      highIssues: audit.highIssues || 0,
      mediumIssues: audit.mediumIssues || 0,
      lowIssues: audit.lowIssues || 0,
      score: audit.score || 0,
    },
  });
}
