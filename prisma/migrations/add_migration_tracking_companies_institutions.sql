-- Rastreio de migração do sistema antigo para Empresas e Instituições.
-- Puramente aditivo: colunas nullable com default seguro, mesmo padrão usado
-- em contracts (origem/migradoEm/migradoPor/migradoPorNome).
-- Empresas migradas (origem='MIGRADO') passam a ser visíveis para todas as
-- unidades, mesmo com franchiseId nulo — ver app/api/app/empresas/route.ts.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "origem" TEXT DEFAULT 'NORMAL';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "migradoEm" TIMESTAMPTZ;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "migradoPor" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "migradoPorNome" TEXT;

ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "origem" TEXT DEFAULT 'NORMAL';
ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "migradoEm" TIMESTAMPTZ;
ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "migradoPor" TEXT;
ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "migradoPorNome" TEXT;
