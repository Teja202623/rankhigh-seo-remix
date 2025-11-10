import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "~/db.server";

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

  // Simulate audit progression
  let updatedAudit = audit;

  if (audit.status === "PENDING") {
    // Move from pending to in-progress
    updatedAudit = await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "RUNNING",
        progress: 10,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else if (audit.status === "RUNNING") {
    // Simulate progress
    const newProgress = Math.min(audit.progress + Math.floor(Math.random() * 25), 100);

    if (newProgress >= 100) {
      // Simulation: Generate random audit results
      updatedAudit = await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: "COMPLETED",
          progress: 100,
          score: Math.floor(Math.random() * 30 + 70), // 70-100
          criticalIssues: Math.floor(Math.random() * 3),
          highIssues: Math.floor(Math.random() * 5),
          mediumIssues: Math.floor(Math.random() * 8),
          lowIssues: Math.floor(Math.random() * 12),
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      updatedAudit = await prisma.audit.update({
        where: { id: auditId },
        data: {
          progress: newProgress,
          updatedAt: new Date(),
        },
      });
    }
  }

  return json({
    audit: {
      id: updatedAudit.id,
      url: updatedAudit.url,
      status: updatedAudit.status,
      progress: updatedAudit.progress || 0,
      createdAt: updatedAudit.createdAt.toISOString(),
      updatedAt: updatedAudit.updatedAt.toISOString(),
      criticalIssues: updatedAudit.criticalIssues || 0,
      highIssues: updatedAudit.highIssues || 0,
      mediumIssues: updatedAudit.mediumIssues || 0,
      lowIssues: updatedAudit.lowIssues || 0,
      score: updatedAudit.score || 0,
    },
  });
}
