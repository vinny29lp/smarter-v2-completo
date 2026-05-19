-- ============================================================
-- SMARTER ONE V2 — Schema Update
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. User: último acesso
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;

-- 2. CRM: campos para agenda e reunião
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "linkReuniao" TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "enderecoReuniao" TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "reuniaoAt" TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS situacao TEXT DEFAULT 'ativo';

-- 3. CRM Tasks: campos de reunião
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS "linkReuniao" TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS endereco TEXT;

-- 4. Financial: recorrência
ALTER TABLE financials ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false;
ALTER TABLE financials ADD COLUMN IF NOT EXISTS "diaVencimento" INTEGER;

-- 5. Student: currículo expandido
ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS portfolio TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS experiencias JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS formacoes JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS objetivos TEXT;

-- 6. GamificationConfig: pontuação configurável
CREATE TABLE IF NOT EXISTS gamification_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "franchiseId" TEXT REFERENCES franchises(id),
  acao TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("franchiseId", acao)
);

-- 7. Inserir configurações padrão de gamificação
INSERT INTO gamification_configs ("franchiseId", acao, pontos, ativo) VALUES
(NULL, 'login_diario', 10, true),
(NULL, 'vaga_publicada', 200, true),
(NULL, 'empresa_cadastrada', 300, true),
(NULL, 'contrato_criado', 400, true),
(NULL, 'lead_convertido', 500, true),
(NULL, 'documento_assinado', 150, true),
(NULL, 'followup_crm', 50, true),
(NULL, 'estudante_aprovado', 300, true)
ON CONFLICT ("franchiseId", acao) DO NOTHING;

-- 8. Número automático de contrato (sequence)
CREATE SEQUENCE IF NOT EXISTS contract_numero_seq START 1;

SELECT 'Schema atualizado com sucesso!' as resultado;
