-- #10 candidaturas paradas: data da última mudança de etapa (backfill = criação)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "etapaChangedAt" TIMESTAMPTZ;
UPDATE applications SET "etapaChangedAt" = COALESCE("createdAt", now()) WHERE "etapaChangedAt" IS NULL;
ALTER TABLE applications ALTER COLUMN "etapaChangedAt" SET DEFAULT now();
CREATE INDEX IF NOT EXISTS applications_etapa_changed_idx ON applications (etapa, "etapaChangedAt");
-- Recrutador da Alizo: id da vaga espelhada na Alizo
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS "alizoJobId" TEXT;
CREATE INDEX IF NOT EXISTS vacancies_alizo_job_idx ON vacancies ("alizoJobId");
