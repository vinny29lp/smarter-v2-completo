-- Migration: Abertura e Fechamento de Mês (MonthOpening, MonthClosing, UserSessionLog)
-- Generated: 2026-07-02

CREATE TABLE IF NOT EXISTS "month_openings" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "franchiseId"    TEXT NOT NULL,
  "mes"            INTEGER NOT NULL,
  "ano"            INTEGER NOT NULL,
  "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoPor"      TEXT NOT NULL,
  "metaEmpresas"   INTEGER,
  "metaLeads"      INTEGER,
  "metaContratos"  INTEGER,
  "metaVagas"      INTEGER,
  "metaEstudantes" INTEGER,
  "contasAPagar"   JSONB,
  "observacoes"    TEXT,

  CONSTRAINT "month_openings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "month_openings_franchiseId_mes_ano_key" ON "month_openings"("franchiseId", "mes", "ano");
CREATE INDEX IF NOT EXISTS "month_openings_franchiseId_idx" ON "month_openings"("franchiseId");

ALTER TABLE "month_openings"
  ADD CONSTRAINT "month_openings_franchiseId_fkey"
  FOREIGN KEY ("franchiseId")
  REFERENCES "franchises"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;


CREATE TABLE IF NOT EXISTS "month_closings" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "openingId"             TEXT NOT NULL,
  "franchiseId"           TEXT NOT NULL,
  "mes"                   INTEGER NOT NULL,
  "ano"                   INTEGER NOT NULL,
  "criadoEm"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoPor"             TEXT NOT NULL,
  "empresasCadastradas"   INTEGER NOT NULL DEFAULT 0,
  "estudantesCadastrados" INTEGER NOT NULL DEFAULT 0,
  "iesCadastradas"        INTEGER NOT NULL DEFAULT 0,
  "leadsNoMes"            INTEGER NOT NULL DEFAULT 0,
  "contratosFirmados"     INTEGER NOT NULL DEFAULT 0,
  "estagiariosAtivos"     INTEGER NOT NULL DEFAULT 0,
  "horasNoSistema"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "score"                 INTEGER NOT NULL DEFAULT 0,
  "contasConfirmadas"     BOOLEAN NOT NULL DEFAULT false,
  "contasJson"            JSONB,
  "leituraConfirmada"     BOOLEAN NOT NULL DEFAULT false,
  "leituraConfirmadaEm"   TIMESTAMP(3),
  "pdfGerado"             BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "month_closings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "month_closings_openingId_key" ON "month_closings"("openingId");
CREATE INDEX IF NOT EXISTS "month_closings_franchiseId_idx" ON "month_closings"("franchiseId");

ALTER TABLE "month_closings"
  ADD CONSTRAINT "month_closings_openingId_fkey"
  FOREIGN KEY ("openingId")
  REFERENCES "month_openings"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;


CREATE TABLE IF NOT EXISTS "user_session_logs" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "franchiseId" TEXT,
  "inicio"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fim"         TIMESTAMP(3),
  "duracaoMin"  INTEGER,

  CONSTRAINT "user_session_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_session_logs_userId_idx" ON "user_session_logs"("userId");
CREATE INDEX IF NOT EXISTS "user_session_logs_franchiseId_idx" ON "user_session_logs"("franchiseId");
CREATE INDEX IF NOT EXISTS "user_session_logs_inicio_idx" ON "user_session_logs"("inicio");
