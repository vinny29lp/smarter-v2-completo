-- Felipe (TI) — fase 1: acompanhamento local dos chamados de suporte.
-- Apenas ADITIVA: nada é removido ou reescrito; chamados existentes recebem os defaults.
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeStatus" TEXT NOT NULL DEFAULT 'NOVO';
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeRisk" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeDiagnosis" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeProposal" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeChangeUrl" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeNotes" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeDecidedBy" TEXT;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeDecidedAt" TIMESTAMPTZ;
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "felipeUpdatedAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "support_cases_felipeStatus_idx" ON "support_cases"("felipeStatus");
