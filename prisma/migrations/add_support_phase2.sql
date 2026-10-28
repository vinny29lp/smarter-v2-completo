-- Fase 2 do suporte Kai/Lia -> AI Workforce. Apenas metadados e estado são
-- persistidos; base64 de imagem/áudio nunca é salvo.
ALTER TABLE "support_cases" ALTER COLUMN "reporterEmail" DROP NOT NULL;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'bug';
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "actorType" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "sourceMessageId" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "mediaConsentAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "mediaCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "remoteStatus" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "lastNotifiedStatus" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "repairProposal" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "resolution" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "remoteUpdatedAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "remoteResolvedAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "resolutionDeliveredAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMPTZ;

ALTER TABLE "lia_messages" ADD COLUMN IF NOT EXISTS "supportCaseId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "lia_messages_supportCaseId_key" ON "lia_messages"("supportCaseId");
CREATE INDEX IF NOT EXISTS "support_cases_remoteStatus_lastCheckedAt_idx" ON "support_cases"("remoteStatus", "lastCheckedAt");
CREATE INDEX IF NOT EXISTS "support_cases_nextRetryAt_idx" ON "support_cases"("nextRetryAt");
