-- Campos editáveis do contrato de franquia por lead (aditiva).
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "contratoRegiao" TEXT;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "contratoFormaPagamento" TEXT;
ALTER TABLE "franquia_leads" ADD COLUMN IF NOT EXISTS "linkExpiraEm" TIMESTAMPTZ;
