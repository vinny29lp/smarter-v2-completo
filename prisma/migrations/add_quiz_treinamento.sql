-- Quiz do treinamento inicial (aditiva, sem destruir nada). Aplicar ANTES do deploy do código.
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "quizObrigatorio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "quizAprovadoEm" TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS "treinamento_tentativas" (
  "id" TEXT PRIMARY KEY,
  "franchiseId" TEXT NOT NULL REFERENCES "franchises"("id") ON DELETE CASCADE,
  "userId" TEXT,
  "acertos" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "aprovado" BOOLEAN NOT NULL,
  "respostas" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "treinamento_tentativas_franchiseId_createdAt_idx" ON "treinamento_tentativas"("franchiseId","createdAt");
ALTER TABLE "treinamento_tentativas" ENABLE ROW LEVEL SECURITY;
