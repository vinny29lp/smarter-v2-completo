-- Tráfego Pago (Meta/Google Ads) no Marketing Hub: campanhas geridas pelo
-- funcionário de Tráfego Pago do Alizo (AI Workforce OS), sincronizadas via
-- API de parceiro escopada (POST/PATCH /api/partners/campaigns).
-- Puramente aditivo: nova coluna em tabela existente + nova tabela.

-- 1) Escopo por capability nos tokens de parceiro já existentes (mesma tabela
--    usada por /api/partners/leads), sem precisar de uma segunda tabela de tokens.
--    Backfill: tokens já emitidos continuam funcionando como token de CRM.
ALTER TABLE "partner_api_tokens"
  ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY['crm']::TEXT[];

UPDATE "partner_api_tokens" SET "scopes" = ARRAY['crm']::TEXT[] WHERE "scopes" = '{}';

-- 2) Campanhas de tráfego pago. franchiseId nulo = campanha da rede/franqueadora,
--    mesmo padrão de escopo usado em crm_leads (franchiseId nulo = franqueadora).
CREATE TABLE IF NOT EXISTS "marketing_trafego_pago" (
  "id"                 TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "franchiseId"        TEXT,
  "plataforma"         TEXT NOT NULL,
  "nomeCampanha"       TEXT NOT NULL,
  "externalCampaignId" TEXT,
  "objetivo"           TEXT,
  "orcamentoDiario"    DOUBLE PRECISION,
  "gastoTotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impressoes"         INTEGER NOT NULL DEFAULT 0,
  "cliques"            INTEGER NOT NULL DEFAULT 0,
  "leadsGerados"       INTEGER NOT NULL DEFAULT 0,
  "cpl"                DOUBLE PRECISION,
  "roas"               DOUBLE PRECISION,
  "status"             TEXT NOT NULL DEFAULT 'ativa',
  "dataInicio"         TIMESTAMPTZ,
  "dataFim"            TIMESTAMPTZ,
  "lastSyncedAt"       TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "marketing_trafego_pago_plataforma_externalCampaignId_key"
    UNIQUE ("plataforma", "externalCampaignId")
);

CREATE INDEX IF NOT EXISTS "marketing_trafego_pago_franchiseId_idx" ON "marketing_trafego_pago"("franchiseId");
CREATE INDEX IF NOT EXISTS "marketing_trafego_pago_status_idx" ON "marketing_trafego_pago"("status");
