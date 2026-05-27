-- ============================================================
-- LIMPAR TODOS OS DADOS DE TESTE
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard
-- Navegar em: Table Editor → SQL Editor → New Query
-- ATENÇÃO: Isso deleta TODOS os dados (exceto o usuário FRANQUEADORA)
-- ============================================================

-- Deletar em ordem de dependência (filhos primeiro)
DELETE FROM "ActivityLog";
DELETE FROM "CrmTask";
DELETE FROM "CrmNota";
DELETE FROM "CrmLead";
DELETE FROM "DocumentoAssinatura";
DELETE FROM "ContratoAssinatura";
DELETE FROM "Application";
DELETE FROM "ContratoItem";
DELETE FROM "ProcessoSeletivo";
DELETE FROM "Contrato";
DELETE FROM "Financial";
DELETE FROM "Lead";
DELETE FROM "Vacancy";
DELETE FROM "Employee";
DELETE FROM "Student";
DELETE FROM "Company";
DELETE FROM "Institution";
DELETE FROM "Franchise";
DELETE FROM "User" WHERE role != 'FRANQUEADORA';

-- Verificar o que sobrou
SELECT 'User' as tabela, COUNT(*) as registros FROM "User"
UNION ALL SELECT 'Franchise', COUNT(*) FROM "Franchise"
UNION ALL SELECT 'Student', COUNT(*) FROM "Student"
UNION ALL SELECT 'Company', COUNT(*) FROM "Company"
UNION ALL SELECT 'Employee', COUNT(*) FROM "Employee";
