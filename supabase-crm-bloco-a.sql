-- SMARTER V2 — CRM Bloco A
-- Execute no Supabase SQL Editor

-- Tabela de histórico de anotações do CRM
CREATE TABLE IF NOT EXISTS crm_notas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "leadId" TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'anotacao',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Campos extras em crm_tasks (já existem mas garantir)
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS "linkReuniao" TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Campos extras em crm_leads (já existem mas garantir)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "linkReuniao" TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "enderecoReuniao" TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "reuniaoAt" TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS situacao TEXT DEFAULT 'ativo';
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "retornoAt" TIMESTAMPTZ;

SELECT 'CRM Bloco A OK' as resultado;
