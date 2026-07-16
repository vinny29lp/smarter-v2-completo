-- Consentimento de compartilhamento do estudante com parceiros externos
-- (ex.: integração com o AI Workforce OS via /api/partners/candidates).
-- Puramente aditivo: colunas nullable com default seguro.
-- Todo estudante existente permanece "unknown" (sem consentimento) até que
-- exista um fluxo de opt-in real — isso NÃO é criado por esta migration.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "partnerConsentStatus" TEXT DEFAULT 'unknown';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "partnerConsentAt" TIMESTAMPTZ;
