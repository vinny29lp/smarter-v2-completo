-- ============================================================
-- Proposta comercial (etapa intermediária entre Apresentação e Contrato/CPS)
-- Data: 2026-08-12
-- Estratégia: ADD COLUMN IF NOT EXISTS (zero downtime, seguro re-executar)
-- ============================================================

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "proposalStatus" TEXT DEFAULT 'NAO_ENVIADA';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "proposalToken" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "proposalSentAt" TIMESTAMPTZ;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "proposalViewedAt" TIMESTAMPTZ;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "proposalRespondedAt" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "companies_proposalToken_key" ON "companies"("proposalToken");
