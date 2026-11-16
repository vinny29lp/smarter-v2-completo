-- Integração completa Smarter <-> Alizo (apenas ADITIVA; nada é removido ou reescrito).
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "alizoSyncStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "alizoSyncedAt" TIMESTAMPTZ;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "alizoLastError" TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "alizoTemplateVersion" TEXT;

ALTER TABLE alizo_eventos ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'processado';
ALTER TABLE alizo_eventos ADD COLUMN IF NOT EXISTS "erro" TEXT;
ALTER TABLE alizo_eventos ADD COLUMN IF NOT EXISTS "tentativas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alizo_eventos ADD COLUMN IF NOT EXISTS "payload" JSONB;

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "alizoPausado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "alizoCandidateId" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "alizoStatus" TEXT;

-- Uma unidade da Alizo só pode estar ligada a UMA franquia/matriz (evita vínculo duplicado).
CREATE UNIQUE INDEX IF NOT EXISTS alizo_unidades_alizo_unit_id_key ON alizo_unidades ("alizoUnitId");
CREATE INDEX IF NOT EXISTS alizo_eventos_status_idx ON alizo_eventos ("status");
CREATE UNIQUE INDEX IF NOT EXISTS applications_alizo_candidate_id_key ON applications ("alizoCandidateId") WHERE "alizoCandidateId" IS NOT NULL;
