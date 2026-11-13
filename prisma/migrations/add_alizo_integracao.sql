-- Integração interna Smarter ⇄ AlizoAI (aditiva): mapeamento unidade↔Alizo, idempotência de webhook e id do lead na Alizo.
CREATE TABLE IF NOT EXISTS alizo_unidades (
  id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "franchiseKey" TEXT NOT NULL UNIQUE,   -- id da franquia, ou 'MATRIZ' (Franqueadora)
  "alizoUnitId"  TEXT NOT NULL,
  nome           TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS alizo_eventos (
  id          TEXT PRIMARY KEY,          -- id do evento da Alizo (deduplicação)
  tipo        TEXT NOT NULL,
  "unitId"    TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alizo_eventos_created_idx ON alizo_eventos ("createdAt");
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "alizoLeadId" TEXT;
CREATE INDEX IF NOT EXISTS crm_leads_alizo_idx ON crm_leads ("alizoLeadId");
ALTER TABLE alizo_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE alizo_eventos ENABLE ROW LEVEL SECURITY;
INSERT INTO alizo_unidades ("franchiseKey", "alizoUnitId", nome)
VALUES ('MATRIZ', '37983900-56f6-4210-b0a3-3757a5c6e796', 'Smarter Matriz')
ON CONFLICT ("franchiseKey") DO NOTHING;
