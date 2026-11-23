-- Trilha dos 30 contratos: registro de visitas (aditiva). Aplicar ANTES do deploy.
CREATE TABLE IF NOT EXISTS "visitas_empresa" (
  "id" TEXT PRIMARY KEY,
  "franchiseId" TEXT NOT NULL,
  "userId" TEXT,
  "crmLeadId" TEXT,
  "empresa" TEXT NOT NULL,
  "resultado" TEXT NOT NULL DEFAULT 'apresentou',
  "observacao" TEXT,
  "visitadaEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "visitas_empresa_franchiseId_visitadaEm_idx" ON "visitas_empresa"("franchiseId","visitadaEm");
ALTER TABLE "visitas_empresa" ENABLE ROW LEVEL SECURITY;
