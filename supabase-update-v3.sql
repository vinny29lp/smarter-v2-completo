-- SMARTER V2 — Update v3 (execute no Supabase SQL Editor)
-- Campos de processo seletivo
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "anotacaoInterna" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "parecerTecnico" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "entrevistaLocal" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "entrevistaLink" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS recomendacao TEXT;

-- Company: auto-cadastro pendente
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pendente BOOLEAN DEFAULT false;

-- Vacancy: slug público
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS vacancies_public_slug_key ON vacancies("publicSlug");

-- Institution: novos campos
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS cursos TEXT[] DEFAULT '{}';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS site TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- Enum PENDENTE em CompanyStatus (Postgres não deixa remover, só adicionar)
DO $$ BEGIN
  ALTER TYPE "CompanyStatus" ADD VALUE 'PENDENTE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gerar slug para vagas existentes
UPDATE vacancies
SET "publicSlug" = LOWER(REGEXP_REPLACE(titulo, '[^a-zA-Z0-9]+', '-', 'g'))
  || '-' || SUBSTRING(id FROM 1 FOR 8)
WHERE "publicSlug" IS NULL;

SELECT 'v3 OK' as resultado;
