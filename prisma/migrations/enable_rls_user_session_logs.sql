-- Fecha exposição de user_session_logs via API pública do Supabase (chave anon).
-- Aditivo: o role do app (Prisma) tem BYPASSRLS, então continua lendo/gravando normalmente
-- (o login registra sessão nesta tabela). Sem policy = acesso anônimo bloqueado (retorna vazio),
-- mesmo padrão das tabelas sensíveis (students, contracts, financials, etc.).
-- Auditoria de segurança 10/07/2026 — item 2.
ALTER TABLE public.user_session_logs ENABLE ROW LEVEL SECURITY;
