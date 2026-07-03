-- ============================================================
-- BUG-001: Regra do dia 23 para ativação de estagiários
-- Data: 2026-07-02
-- Estratégia: ADD COLUMN IF NOT EXISTS + backfill (zero downtime, seguro re-executar)
-- ============================================================

ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "ativadoEm" TIMESTAMPTZ;
UPDATE "contracts" SET "ativadoEm" = "createdAt" WHERE status = 'ATIVO' AND "ativadoEm" IS NULL;
