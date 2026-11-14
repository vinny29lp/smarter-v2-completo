-- #27 Lixeira reversível (aditiva): guarda o JSON completo de estudantes/empresas excluídos por 90 dias.
CREATE TABLE IF NOT EXISTS lixeira (
  id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  entidade       TEXT NOT NULL,
  "entidadeId"   TEXT NOT NULL,
  nome           TEXT NOT NULL,
  "franchiseId"  TEXT,
  dados          JSONB NOT NULL,
  "excluidoPor"  TEXT,
  "expiraEm"     TIMESTAMPTZ NOT NULL,
  "restauradoEm" TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lixeira_entidade_idx ON lixeira (entidade, "restauradoEm");
CREATE INDEX IF NOT EXISTS lixeira_expira_idx ON lixeira ("expiraEm");
ALTER TABLE lixeira ENABLE ROW LEVEL SECURITY;
