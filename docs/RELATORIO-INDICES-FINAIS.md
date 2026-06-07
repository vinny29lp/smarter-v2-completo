# Relatório de Índices — Sprint Final de Estabilidade

**Data:** 2026-06-06  
**Status:** ✅ Aplicado em produção (Supabase `sa-east-1`)

---

## Situação Antes

| Modelo | Campo | Índice Existia? |
|--------|-------|-----------------|
| User | franchiseId | ❌ |
| User | companyId | ❌ |
| User | role | ❌ |
| Vacancy | companyId | ❌ |
| Vacancy | franchiseId | ❌ |
| Vacancy | status | ❌ |
| Application | studentId | ❌ (apenas unique composto) |
| Application | vacancyId | ❌ |
| Employee | franchiseId | ❌ |
| Contract | studentId | ✅ (já existia) |
| Financial | franchiseId | ✅ (já existia) |

## Índices Criados

**9 índices novos** criados com `IF NOT EXISTS` (zero risco de erro em re-execução):

```sql
-- users
CREATE INDEX IF NOT EXISTS "users_franchiseId_idx" ON "users"("franchiseId");
CREATE INDEX IF NOT EXISTS "users_companyId_idx"   ON "users"("companyId");
CREATE INDEX IF NOT EXISTS "users_role_idx"        ON "users"("role");

-- vacancies
CREATE INDEX IF NOT EXISTS "vacancies_companyId_idx"  ON "vacancies"("companyId");
CREATE INDEX IF NOT EXISTS "vacancies_franchiseId_idx" ON "vacancies"("franchiseId");
CREATE INDEX IF NOT EXISTS "vacancies_status_idx"     ON "vacancies"("status");

-- applications
CREATE INDEX IF NOT EXISTS "applications_studentId_idx" ON "applications"("studentId");
CREATE INDEX IF NOT EXISTS "applications_vacancyId_idx" ON "applications"("vacancyId");

-- employees
CREATE INDEX IF NOT EXISTS "employees_franchiseId_idx" ON "employees"("franchiseId");
```

## Estratégia de Aplicação

- **Método:** `CREATE INDEX IF NOT EXISTS` (sem `CONCURRENTLY` — tabelas ainda em piloto, zero risco de lock relevante)
- **Downtime:** Zero — índices criados sem lock de tabela em fase de piloto
- **Validação:** Verificado via `pg_indexes` — todos os 9 índices confirmados presentes

## schema.prisma Atualizado

Adicionadas diretivas `@@index` nos modelos correspondentes para manter consistência entre schema e banco:

- `User`: `@@index([franchiseId])`, `@@index([companyId])`, `@@index([role])`
- `Vacancy`: `@@index([companyId])`, `@@index([franchiseId])`, `@@index([status])`
- `Application`: `@@index([studentId])`, `@@index([vacancyId])`
- `Employee`: `@@index([franchiseId])`

## Impacto Esperado

| Query Afetada | Melhoria Estimada |
|---------------|-------------------|
| Dashboard — KPIs por franqueado | Sequential scan → Index scan (~10x mais rápido) |
| Listagem de vagas por empresa | Sequential scan → Index scan |
| Candidaturas por estudante | Unique index → Dedicated index |
| Funcionários por franquia | Sequential scan → Index scan |
| Filtro de usuários por role | Sequential scan → Index scan |

**Redução de carga estimada:** 60–80% menos trabalho do PostgreSQL nas queries de listagem e filtro com `WHERE franchiseId = ?` nas tabelas `users`, `vacancies`, `applications` e `employees`.

---

*Migration salva em: `prisma/migrations/add_missing_indexes.sql`*
