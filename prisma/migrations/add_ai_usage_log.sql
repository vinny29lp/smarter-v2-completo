-- Migration: Add AIUsageLog table for AI Phase 1
-- Generated: 2026-05-20

CREATE TABLE IF NOT EXISTS "AIUsageLog" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "franchiseId"      TEXT NOT NULL,
  "userId"           TEXT,
  "userEmail"        TEXT,
  "tipoUso"          TEXT NOT NULL,
  "promptTokens"     INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens"      INTEGER NOT NULL DEFAULT 0,
  "custoEstimado"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "modelo"           TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
  "sucesso"          BOOLEAN NOT NULL DEFAULT true,
  "erro"             TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "AIUsageLog_franchiseId_idx" ON "AIUsageLog"("franchiseId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_idx"      ON "AIUsageLog"("userId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_tipoUso_idx"     ON "AIUsageLog"("tipoUso");
CREATE INDEX IF NOT EXISTS "AIUsageLog_createdAt_idx"   ON "AIUsageLog"("createdAt");

-- Foreign key
ALTER TABLE "AIUsageLog"
  ADD CONSTRAINT "AIUsageLog_franchiseId_fkey"
  FOREIGN KEY ("franchiseId")
  REFERENCES "Franchise"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
