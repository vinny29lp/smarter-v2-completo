-- #1 Cockpit: meta mensal de contratos ativados por unidade (aditiva).
CREATE TABLE IF NOT EXISTS metas_unidade (
  id            TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "franchiseId" TEXT NOT NULL,
  mes           TEXT NOT NULL,
  contratos     INTEGER NOT NULL CHECK (contratos BETWEEN 1 AND 500),
  "definidaPor" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("franchiseId", mes)
);
ALTER TABLE metas_unidade ENABLE ROW LEVEL SECURITY;
