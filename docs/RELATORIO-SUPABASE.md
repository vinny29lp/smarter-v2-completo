# RELATORIO — FASE 5: AUDITORIA SUPABASE / CONNECTION POOLING / INDICES

**Data:** 2026-06-06
**Sprint:** Estabilidade Final

---

## 1. Configuração de Connection Pooling (`lib/prisma.ts`)

### Configuração Atual

```typescript
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  // Adiciona connection_limit=5 e pool_timeout=15 se não presentes na URL
  if (!hasLimit) extra += `connection_limit=5`;
  if (!hasTimeout) extra += `pool_timeout=15`;
  return url + extra;
}
```

### Análise

**Ponto positivo:** O singleton do Prisma está corretamente implementado — `globalForPrisma.prisma` reutilizado em dev (hot-reload) e em prod (warm container do Vercel).

**Ponto de atenção:** `connection_limit=5` aplicado via URL, mas o Supabase usa PgBouncer em modo **Transaction Pooling** na porta 6543. Nesse modo, cada query usa uma conexão do pool por apenas uma transaction — o `connection_limit` da URL controla quantas conexões paralelas o Prisma abre por instância serverless.

**Recomendações:**

| Ambiente | `DATABASE_URL` | `DIRECT_URL` | connection_limit |
|----------|----------------|--------------|-----------------|
| Vercel Serverless | `...supabase.com:6543` (PgBouncer) | `...supabase.com:5432` (direto) | 1 a 3 por função |
| Vercel Edge | Não suportado | — | — |
| Dev local | `...supabase.com:5432` | — | 5 (padrão) |

**Ação recomendada:** Ajustar `connection_limit=2` para funções serverless individuais. Com 5, em picos de 50 requests simultâneos o Supabase Free (limite de 60 conexões) pode atingir o limite.

```
connection_limit=2&pool_timeout=15
```

### Configuração DIRECT_URL

O `schema.prisma` define corretamente `directUrl = env("DIRECT_URL")` — usado para migrações (`prisma migrate`) que precisam de conexão direta (não via PgBouncer).

---

## 2. Análise de Índices do Schema Prisma

### Modelos Com Índices Adequados

| Modelo | Índices Definidos |
|--------|------------------|
| Company | franchiseId, status |
| Student | franchiseId, status, institutionId |
| Contract | franchiseId, status, companyId, studentId |
| InternshipDocument | contractId, status |
| CrmLead | franchiseId, situacao, updatedAt |
| Financial | franchiseId, status, contractId, companyId, vencimentoAt |
| AIUsageLog | franchiseId, userId, tipoUso, createdAt |

### Modelos Com FK Sem Índice Dedicado (Atenção)

Identificados 19 modelos com foreign keys que não possuem `@@index` explícito. Os mais críticos pelo volume de queries:

| Modelo | FK sem índice | Impacto |
|--------|--------------|---------|
| **User** | franchiseId, companyId | Alto — consultado em toda autenticação |
| **Vacancy** | companyId, franchiseId | Alto — listagem de vagas por empresa |
| **Application** | studentId, vacancyId | Alto — candidaturas (unique já existe, mas sem index separado) |
| **Employee** | userId, franchiseId | Médio — gestão de equipe |
| **Notification** | userId | Médio — notificações por usuário |
| **ActivityLog** | userId | Médio — logs de auditoria |
| **CrmNota** | leadId | Médio — histórico do lead |
| **CrmTask** | leadId | Médio — tarefas do lead |
| **Evaluation** | contractId | Médio — avaliações do contrato |
| **GamificationPoint** | franchiseId | Baixo — ranking de gamificação |
| **ImportLog** | franchiseId, userId | Baixo — logs de importação |

### Índices Recomendados para Adicionar ao Schema

```prisma
model User {
  @@index([franchiseId])
  @@index([companyId])
}

model Vacancy {
  @@index([companyId])
  @@index([franchiseId])
}

model Application {
  @@index([studentId])
  @@index([vacancyId])
}

model Evaluation {
  @@index([contractId])
}

model Employee {
  @@index([franchiseId])
  @@index([userId])
}

model Notification {
  @@index([userId])
  @@index([createdAt])
}

model ActivityLog {
  @@index([userId])
  @@index([createdAt])
}

model CrmNota {
  @@index([leadId])
}

model CrmTask {
  @@index([leadId])
}
```

**Nota:** Adicionar índices requer `npx prisma migrate dev` ou `apply_migration` no Supabase. Índices em tabelas grandes devem ser criados com `CREATE INDEX CONCURRENTLY` para não travar a tabela em produção.

---

## 3. Queries Pesadas Identificadas

### 3.1 Franqueado GET — `app/api/app/franqueados/[id]/route.ts`

```typescript
prisma.franchise.findUnique({
  include: {
    users: { ... },
    companies: { ... },
    contracts: { include: { student: true, company: true }, orderBy: { createdAt: "desc" } },
    financials: { orderBy: { createdAt: "desc" }, take: 30 },
    _count: { ... }
  }
})
```

**Problema:** `contracts` sem paginação — franqueado com 200+ contratos carrega tudo de uma vez. Cada contrato inclui student + company.

**Recomendação:** Adicionar `take: 50` em contracts, ou separar em sub-rotas paginadas.

### 3.2 Empresa GET — `app/api/app/empresas/[id]/route.ts`

```typescript
prisma.company.findUnique({
  include: {
    contracts: { include: { student: true, documents: true }, orderBy: { createdAt: "desc" } },
    vacancies: { include: { _count: { ... } } },
    crmLeads: { ... take: 10 },
    financials: { ... take: 20 }
  }
})
```

**Problema:** `contracts` sem limite — empresa com muitos contratos carrega todos com documents.

**Recomendação:** `take: 20` em contracts.

### 3.3 Fechamento de Mês — `app/api/app/financeiro/fechar-mes/route.ts`

```typescript
prisma.franchise.findMany({
  where: { status: "ATIVO" },
  include: { contracts: { where: { status: "ATIVO" } } }
})
```

**Análise:** Carrega todos os contratos ativos de todas as franquias ativas. Benigno na escala atual (dezenas de franquias), mas pode ser lento com centenas.

**Recomendação:** Para escala, substituir por `_count: { contracts: ... }` em vez de carregar os objetos completos.

### 3.4 Gamificação GET — Ranking com groupBy

```typescript
prisma.gamificationPoint.groupBy({
  by: ["franchiseId"],
  _sum: { pontos: true },
  orderBy: { _sum: { pontos: "desc" } }
})
```

**Análise:** Query sem filtro de data — soma todos os pontos históricos. Com crescimento, pode ser lenta.

**Recomendação:** Adicionar `@@index([franchiseId])` no modelo GamificationPoint (ausente) e considerar cache do ranking por 5 minutos.

---

## 4. Configuração do Supabase Free vs Paid

| Recurso | Free | Pro |
|---------|------|-----|
| Conexões diretas (port 5432) | 60 | 200+ |
| PgBouncer (port 6543) | Ilimitado (transacional) | Ilimitado |
| Storage | 500 MB | 8 GB+ |
| Backup | Diário | Point-in-time |
| Max DB size | 500 MB | 8 GB |

**Recomendação:** Garantir que `DATABASE_URL` no Vercel aponte para a porta **6543** (PgBouncer) e `DIRECT_URL` para a porta **5432**.

---

## 5. Checklist de Ações Prioritárias

- [ ] Ajustar `connection_limit=2` na DATABASE_URL de produção (Vercel env vars)
- [ ] Adicionar `@@index([franchiseId])` em User, Vacancy, Employee, GamificationPoint
- [ ] Adicionar `@@index([contractId])` em Evaluation
- [ ] Adicionar `@@index([userId])` em Notification, ActivityLog, Employee
- [ ] Adicionar `take: 50` em contracts no GET de franqueado e empresa
- [ ] Verificar se DATABASE_URL usa porta 6543 (PgBouncer) no Vercel
- [ ] Verificar se DIRECT_URL usa porta 5432 no Vercel (para migrações)
- [ ] Rodar `npx prisma generate` após push do schema completo

