-- Jornada de fechamento de franquia (aditiva). Aplicar ANTES do deploy.
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "tokenPublico" TEXT;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "apresentacaoAbertaEm" TIMESTAMPTZ;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "visualizacoes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "cofBaixadaEm" TIMESTAMPTZ;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "cadastro" JSONB;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "cadastroEm" TIMESTAMPTZ;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "contratoDocId" TEXT;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "contratoEnviadoEm" TIMESTAMPTZ;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "contratoAssinadoEm" TIMESTAMPTZ;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "franchiseId" TEXT;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "manualEnviadoEm" TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS "franquia_leads_tokenPublico_key" ON "franquia_leads"("tokenPublico");
CREATE UNIQUE INDEX IF NOT EXISTS "franquia_leads_contratoDocId_key" ON "franquia_leads"("contratoDocId");
