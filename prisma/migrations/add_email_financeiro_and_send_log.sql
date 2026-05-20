-- Migration: Add emailFinanceiro to companies and create financial_send_logs table

-- Add emailFinanceiro to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "emailFinanceiro" TEXT;

-- Create financial_send_logs table
CREATE TABLE IF NOT EXISTS financial_send_logs (
  id             TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "financialId"  TEXT NOT NULL,
  "emailEnviado" TEXT NOT NULL,
  "enviadoPor"   TEXT,
  "enviadoAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status         TEXT DEFAULT 'enviado',
  mensagem       TEXT,
  CONSTRAINT financial_send_logs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_fsl_financial
    FOREIGN KEY ("financialId") REFERENCES financials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fsl_financial ON financial_send_logs("financialId");
