-- Migration: add_missing_indexes
-- Data: 2026-06-06
-- Descrição: Adiciona índices faltantes para FK críticas de performance
-- Estratégia: CREATE INDEX CONCURRENTLY IF NOT EXISTS → zero downtime, sem lock de tabela

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_franchiseId_idx"
  ON "users"("franchiseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_companyId_idx"
  ON "users"("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_role_idx"
  ON "users"("role");

-- ─── vacancies ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "vacancies_companyId_idx"
  ON "vacancies"("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "vacancies_franchiseId_idx"
  ON "vacancies"("franchiseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "vacancies_status_idx"
  ON "vacancies"("status");

-- ─── applications ─────────────────────────────────────────────────────────────
-- Nota: @@unique([studentId, vacancyId]) já cria índice composto.
-- Adicionamos índice dedicado em studentId para queries de listagem por estudante.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "applications_studentId_idx"
  ON "applications"("studentId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "applications_vacancyId_idx"
  ON "applications"("vacancyId");

-- ─── employees ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "employees_franchiseId_idx"
  ON "employees"("franchiseId");
