import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupportCase, getSupportMapping, sendSupportCase } from "@/lib/support/ai-workforce";
import { supportStatusMessage } from "@/lib/support/status-message";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

function nextRetry(attemptCount: number): Date {
  const minutes = Math.min(6 * 60, 5 * (2 ** Math.min(attemptCount, 6)));
  return new Date(Date.now() + minutes * 60_000);
}

async function retryPending() {
  const cases = await prisma.supportCase.findMany({
    where: { status: "PENDING", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" }, take: 20,
  });
  let sent = 0;
  for (const supportCase of cases) {
    const mapping = getSupportMapping(supportCase.franchiseId);
    if (!mapping) {
      await prisma.supportCase.update({ where: { id: supportCase.id }, data: { status: "ERROR", lastError: "not_mapped", nextRetryAt: null } });
      continue;
    }
    const result = await sendSupportCase({
      orgId: mapping.orgId, unitId: mapping.unitId, externalReference: supportCase.externalReference,
      reporterName: supportCase.reporterName, reporterEmail: supportCase.reporterEmail,
      reporterPhone: supportCase.reporterPhone || "", category: supportCase.category as "guidance" | "bug" | "access" | "integration" | "billing" | "other",
      title: supportCase.title,
      description: `${supportCase.description}\n\nObservação de retentativa: mídias não são armazenadas no Smarter e, por segurança, este reenvio contém somente o relato textual.`,
    }, { maxAttempts: 1 });
    if (result.ok) {
      await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
        status: "SENT", protocol: result.protocol, remoteStatus: result.supportCase?.status || "open",
        resolution: result.supportCase?.resolution, repairProposal: result.supportCase?.repairProposal,
        remoteUpdatedAt: result.supportCase?.updatedAt ? new Date(result.supportCase.updatedAt) : new Date(),
        remoteResolvedAt: result.supportCase?.resolvedAt ? new Date(result.supportCase.resolvedAt) : null,
        nextRetryAt: null, lastError: null, attemptCount: { increment: 1 },
      } });
      sent += 1;
    } else {
      await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
        status: result.retryable ? "PENDING" : "ERROR", lastError: result.code,
        nextRetryAt: result.retryable ? nextRetry(supportCase.attemptCount + 1) : null,
        attemptCount: { increment: 1 },
      } });
    }
  }
  return sent;
}

async function followCases() {
  const cases = await prisma.supportCase.findMany({
    where: { status: "SENT", OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lte: new Date(Date.now() - 10 * 60_000) } }] },
    orderBy: { lastCheckedAt: "asc" }, take: 40,
  });
  let updated = 0;
  let delivered = 0;
  for (const supportCase of cases) {
    const mapping = getSupportMapping(supportCase.franchiseId);
    if (!mapping) continue;
    const result = await getSupportCase(mapping, supportCase.externalReference);
    if (!result.ok) {
      if (result.code === "unauthorized") console.error("[cron/support-cases] ALERTA OPERACIONAL: token da integração de suporte ausente ou inválido.");
      await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
        lastCheckedAt: new Date(), lastError: result.code,
        ...(result.retryable ? {} : { status: "ERROR" }),
      } });
      continue;
    }
    const remote = result.supportCase;
    const statusChanged = supportCase.remoteStatus !== remote.status;
    await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
      remoteStatus: remote.status, protocol: remote.protocol, repairProposal: remote.repairProposal,
      resolution: remote.resolution, remoteUpdatedAt: new Date(remote.updatedAt),
      remoteResolvedAt: remote.resolvedAt ? new Date(remote.resolvedAt) : null,
      lastCheckedAt: new Date(), lastError: null,
    } });
    updated += 1;

    if (!supportCase.actorId || !supportCase.actorType) continue;
    if (remote.status === "resolved") {
      try {
        await prisma.liaMessage.create({ data: {
          franchiseId: supportCase.franchiseId, actorType: supportCase.actorType, actorId: supportCase.actorId,
          role: "assistant", content: supportStatusMessage(remote), supportCaseId: supportCase.id,
        } });
        delivered += 1;
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
      await prisma.supportCase.update({ where: { id: supportCase.id }, data: { resolutionDeliveredAt: new Date(), lastNotifiedStatus: "resolved" } });
    } else if (statusChanged && supportCase.lastNotifiedStatus !== remote.status) {
      await prisma.$transaction([
        prisma.liaMessage.create({ data: {
          franchiseId: supportCase.franchiseId, actorType: supportCase.actorType, actorId: supportCase.actorId,
          role: "assistant", content: supportStatusMessage(remote),
        } }),
        prisma.supportCase.update({ where: { id: supportCase.id }, data: { lastNotifiedStatus: remote.status } }),
      ]);
    }
  }
  return { updated, delivered };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const sent = await retryPending();
    const followed = await followCases();
    return NextResponse.json({ ok: true, retriedAndSent: sent, ...followed });
  } catch (error) {
    console.error("[cron/support-cases] Falha no processamento", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json({ error: "Falha ao processar chamados." }, { status: 500 });
  }
}
