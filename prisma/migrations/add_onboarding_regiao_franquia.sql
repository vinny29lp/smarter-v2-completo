-- Onboarding guiado da Lia + região de atuação da franquia (aditiva, sem apagar nada).
-- Franquias existentes ficam com onboardingObrigatorio=false (não são bloqueadas).
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "regioesAtuacao" JSONB;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "onboardingObrigatorio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "onboardingPassos" JSONB;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS "onboardingConcluidoEm" TIMESTAMPTZ;
