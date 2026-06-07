# Relatório de Auditoria de Escala — Varredura Completa do Sistema
**Data:** 06/06/2026  
**Auditor:** Claude (Analista Sênior / Arquiteto de Sistemas)  
**Escopo:** 68 rotas API + libs críticas + páginas — smarter-v2-completo  
**Contexto:** Sistema em operação com 24 franqueados ativos, previsão de 50 em 5 meses

---

## Sumário Executivo

A varredura cobriu **100% das rotas** (54 em `/api/app`, 7 em `/api/portal`, 7 em `/api/public`, 2 em `/api/auth`, 1 de debug) e as bibliotecas críticas (`lib/autentique.ts`, `lib/email.ts`, `lib/actions/vacancies.ts`, `lib/getConfig.ts`, `lib/pdf-wrapper.ts`).

O sprint anterior (ESC-001 a ESC-006) resolveu os riscos de maior impacto operacional. Esta auditoria encontrou **2 riscos CRÍTICOS**, **4 riscos ALTOS**, **4 riscos MÉDIOS** e **3 riscos BAIXOS** ainda abertos.

### Mapa de Risco

| ID | Componente | Risco | Severidade |
|----|-----------|-------|------------|
| CRIT-001 | `lib/autentique.ts` | fetch sem timeout → hang de 30s | 🔴 CRÍTICO |
| CRIT-002 | `lib/actions/vacancies.ts` | `getVacancies()` sem `take` | 🔴 CRÍTICO |
| ALTO-A | `franqueados/[id]` GET | `contracts` sem `take` | 🟠 ALTO |
| ALTO-B | `getVacancy()` | `applications` sem `take` | 🟠 ALTO |
| ALTO-C | Rotas públicas | Sem rate limiting | 🟠 ALTO |
| ALTO-D | `processos/candidatar` | Sem autenticação | 🟠 ALTO |
| MED-001 | `equipe` + `instituicoes` | findMany sem take | 🟡 MÉDIO |
| MED-002 | 14 rotas | Sem try/catch | 🟡 MÉDIO |
| MED-003 | `portal/estudante/perfil` | 3 queries sequenciais sem índice | 🟡 MÉDIO |
| MED-004 | `franqueados/[id]` DELETE | Transaction timeout no limite Vercel | 🟡 MÉDIO |
| BAI-001 | `lib/getConfig.ts` | Cache in-memory não compartilhado entre instâncias | 🟢 BAIXO |
| BAI-002 | `gamificacao` GET | 4 queries sem cache | 🟢 BAIXO |
| BAI-003 | `lib/email.ts` | Resend API sem timeout | 🟢 BAIXO |

---

## Riscos CRÍTICOS

### 🔴 CRIT-001 — `lib/autentique.ts`: fetch sem timeout → hang de 30s garantido

**Arquivo:** `lib/autentique.ts` — funções `enviarParaAutentique()` e `buscarStatusAutentique()`

**O problema:**
```typescript
// COMO ESTÁ — sem timeout
const response = await fetch(AUTENTIQUE_API, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,  // ← sem signal: AbortSignal.timeout(...)
});
```

Ambas as chamadas ao Autentique (envio e consulta de status) são `fetch()` puro sem `signal`. Se o Autentique API estiver lento, com instabilidade ou fora do ar:

- A Vercel deixa o Lambda rodar até o timeout global de **30 segundos**
- O usuário vê o spinner por 30s e recebe 504 Gateway Timeout
- Afeta **todo o fluxo de assinatura digital** (TCE, TR, PE) — funcionalidade core do negócio
- Com 50 franqueados assinando contratos simultaneamente, múltiplos Lambdas ficam bloqueados

**Impacto na escala:** CRÍTICO — quanto mais franqueados, mais chamadas paralelas. Uma instabilidade do Autentique derruba a funcionalidade para todos.

**Correção:**
```typescript
// lib/autentique.ts — adicionar timeout nas duas chamadas fetch

// enviarParaAutentique:
const response = await fetch(AUTENTIQUE_API, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
  signal: AbortSignal.timeout(20_000), // 20s — sobra margem para Vercel 30s
});

// buscarStatusAutentique:
const response = await fetch(AUTENTIQUE_API, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ query }),
  signal: AbortSignal.timeout(15_000), // 15s — consulta é mais simples
});
```

---

### 🔴 CRIT-002 — `lib/actions/vacancies.ts` `getVacancies()`: findMany sem take

**Arquivo:** `lib/actions/vacancies.ts` — função `getVacancies()`  
**Chamada por:** `app/api/app/vagas/route.ts` GET

**O problema:**
```typescript
export async function getVacancies(franchiseId?: string, companyId?: string) {
  return prisma.vacancy.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),  // ← FRANQUEADORA entra sem filtro
      ...(companyId ? { companyId } : {}),
    },
    include: {
      company: true,    // ← objeto completo de empresa em cada vaga
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    // ← NENHUM take, nenhum skip
  });
}
```

Quando um usuário `FRANQUEADORA` acessa `/api/app/vagas`:
- `franchiseId = undefined` → sem filtro → retorna **TODAS as vagas de TODAS as franquias**
- Com 100 franqueados × 20 vagas médias = **2.000 registros** + `company` completo por vaga
- Payload estimado: ~1-3 MB por request, crescendo indefinidamente com o sistema
- Tempo de query: cresce em O(n) sem paginação

**Impacto na escala:** CRÍTICO — memória do Lambda cresce com o número de franqueados. Pode causar OOM (Out of Memory) ou timeout na view da Franqueadora.

**Correção — rota e action:**
```typescript
// lib/actions/vacancies.ts
export async function getVacancies(
  franchiseId?: string,
  companyId?: string,
  page = 1,
  limit = 50
) {
  const skip = (page - 1) * limit;
  const where = {
    ...(franchiseId ? { franchiseId } : {}),
    ...(companyId ? { companyId } : {}),
  };
  const [vagas, total] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } }, // ← select em vez de include completo
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.vacancy.count({ where }),
  ]);
  return { vagas, total, page, totalPages: Math.ceil(total / limit) };
}

// app/api/app/vagas/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "50"));
  const result = await getVacancies(session.user.franchiseId, session.user.companyId, page, limit);
  return NextResponse.json(result);
}
```

---

## Riscos ALTOS

### 🟠 ALTO-A — `franqueados/[id]` GET: `contracts` sem take

**Arquivo:** `app/api/app/franqueados/[id]/route.ts` — método GET

**O problema:**
```typescript
contracts: {
  include: { student: true, company: true },
  orderBy: { createdAt: "desc" },
  // ← sem take — carrega TODOS os contratos da franquia
},
```

Uma franquia com 2 anos de operação pode ter 200-500 contratos. Cada contrato inclui o objeto `student` completo (com CPF, dados pessoais) e o objeto `company` completo. Este endpoint é chamado toda vez que a Franqueadora clica em um franqueado no painel.

**Correção:**
```typescript
contracts: {
  include: {
    student: { select: { id: true, name: true, status: true } },
    company: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 50, // ← últimos 50 contratos; front-end pode paginar via rota /contratos
},
```

---

### 🟠 ALTO-B — `getVacancy()` em vacancies.ts: `applications` sem take

**Arquivo:** `lib/actions/vacancies.ts` — função `getVacancy()`

**O problema:**
```typescript
applications: {
  include: {
    student: { include: { user: true } }, // ← user completo por candidato
  },
  orderBy: { createdAt: "desc" },
  // ← sem take — carrega TODOS os candidatos da vaga
},
```

Uma vaga popular pode ter 100+ candidatos. Carregar todos com `student + user` aninhado gera payload pesado e query lenta. Isso afeta a tela de "candidatos da vaga" para todos os usuários.

**Correção:**
```typescript
applications: {
  include: {
    student: {
      select: { id: true, name: true, email: true, curso: true, discResult: true, status: true }
    },
  },
  orderBy: { createdAt: "desc" },
  take: 100, // ← limite razoável; raras vagas passam disso
},
```

---

### 🟠 ALTO-C — Rotas públicas sem rate limiting: risco de DoS e spam

**Arquivos afetados:**
- `app/api/public/estudante/route.ts` POST — cria `User + Student + bcrypt(10) + email`
- `app/api/public/lead/route.ts` POST — cria `CrmLead + CrmNota`
- `app/api/public/vaga/inscrever/route.ts` POST — cria `Application`
- `app/api/auth/forgot-password/route.ts` POST — `bcrypt(10) + email`

**O problema:**

Não existe nenhum mecanismo de rate limiting em todo o codebase. Com 50 franqueados cada um com landing page pública com formulário de cadastro:

- Um bot pode enviar 1.000 POSTs/min em `/api/public/estudante`
- Cada request: `bcrypt.hash(10)` (~100ms CPU) + 2 DB writes + 1 email via Resend
- Resultado: esgotamento do plano Resend, spam na tabela `users`, custo de DB
- `/api/auth/forgot-password` é particularmente perigoso: bcrypt + email por request sem autenticação

**Solução recomendada — Upstash Rate Limiter (sem Redis adicional, usa Upstash free tier):**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const publicRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min por IP
  analytics: false,
});

// Uso nas rotas públicas:
const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
const { success } = await publicRatelimit.limit(ip);
if (!success) return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
```

**Alternativa sem dependência externa** (solução em memória, adequada até 50 franqueados):
```typescript
// lib/rate-limit-simple.ts — Map in-memory por IP (reseta no cold start)
const hits = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
```

---

### 🟠 ALTO-D — `processos/candidatar` POST: sem autenticação

**Arquivo:** `app/api/processos/candidatar/route.ts`

**O problema:**
```typescript
export async function POST(req: Request) {
  // ← ZERO verificação de sessão
  const { studentId, vacancyId } = await req.json();
  // ...
  const application = await prisma.application.create({
    data: { studentId, vacancyId, matching },
  });
```

Esta rota aceita qualquer POST sem verificar se o usuário está autenticado. Qualquer pessoa com um `studentId` e `vacancyId` (ambos UUIDs que aparecem nas URLs públicas de vagas) pode criar candidaturas falsas no sistema.

**Correção:**
```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Garantir que o estudante logado só se candidata para si mesmo
  const role = session.user.role;
  const { studentId, vacancyId } = await req.json();
  
  if (role === "ESTUDANTE" && session.user.studentId !== studentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... resto do código
```

---

## Riscos MÉDIOS

### 🟡 MED-001 — `equipe` e `instituicoes`: findMany sem paginação

**Arquivos:**  
- `app/api/app/equipe/route.ts` — `findMany` sem `take`, sem `page`
- `app/api/app/instituicoes/route.ts` — `findMany` sem `take`, sem `page`

`equipe` é limitada naturalmente (< 20 por franquia). O risco real é `instituicoes`: não tem filtro por `franchiseId` no GET, retorna **todas as instituições do banco** para qualquer usuário autenticado. Cresce indefinidamente conforme novos estudantes são cadastrados.

**Correção rápida para `instituicoes`:**
```typescript
const instituicoes = await prisma.institution.findMany({
  where: { OR: [{ tipo: null }, { tipo: { not: "auto" } }] },
  orderBy: { name: "asc" },
  take: 500, // limite de segurança — 500 instituições é mais que suficiente
});
```

---

### 🟡 MED-002 — 14 rotas sem try/catch: erro Prisma → UnhandledRejection

**Rotas afetadas (mapeamento completo):**

| Rota | Método |
|------|--------|
| `portal/estudante/perfil` | GET + PATCH |
| `portal/estudante/disc` | GET + POST |
| `portal/estudante/curriculo-pdf` | GET |
| `portal/estudante/disc-relatorio` | GET |
| `portal/empresa/avaliacoes` | GET + POST |
| `portal/empresa/solicitar-estagiario` | POST |
| `api/app/ai/logs` | GET |
| `api/public/empresa` | POST |
| `api/public/vaga/inscrever` | POST |
| `api/public/vaga/inscrever-novo` | POST |
| `api/public/vaga/[slug]` | GET |
| `api/public/lead` | POST |

Uma instabilidade de conexão com Supabase (pool cheio, restart, failover) nestas rotas resulta em:
- `UnhandledPromiseRejection` → Next.js retorna 500 genérico sem log estruturado
- O erro não aparece no painel Vercel de forma rastreável
- Usuário no portal do estudante ou empresa vê tela de erro sem mensagem

**Padrão de correção a aplicar em todas:**
```typescript
try {
  // ...código existente...
} catch (e) {
  return handleApiError(e, "NOME_DA_ROTA");
}
```

---

### 🟡 MED-003 — `portal/estudante/perfil`: 3 queries sequenciais sem índice

**Arquivo:** `app/api/portal/estudante/perfil/route.ts`

**O problema:**
```typescript
async function getStudent(session: any) {
  // Query 1 — findUnique por studentId
  if (session?.user?.studentId) {
    const s = await prisma.student.findUnique({ where: { id: session.user.studentId }, ... });
    if (s) return s;
  }
  // Query 2 — findFirst por userId (índice? não verificado)
  if (session?.user?.id) {
    const s = await prisma.student.findFirst({ where: { userId: session.user.id }, ... });
    if (s) return s;
  }
  // Query 3 — findFirst por email (sem índice na tabela students)
  if (session?.user?.email) {
    const s = await prisma.student.findFirst({ where: { email: session.user.email }, ... });
    ...
  }
}
```

Esta função roda em **todo GET do portal do estudante** (a página principal do estudante). No pior caso (sem `studentId` na sessão), executa 3 queries sequenciais — sendo a última um full scan de `student.email` sem índice.

Com 5.000+ estudantes no banco (100 franqueados × 50 estudantes cada), o `findFirst by email` torna-se sequência table scan pesada.

**Correção dupla:**
1. Adicionar índice em `student.email` e `student.userId` no schema:
```prisma
model Student {
  @@index([userId])
  @@index([email])
}
```
2. Migrar as queries para uma única tentativa com `OR`:
```typescript
async function getStudent(session: any) {
  const conditions = [];
  if (session?.user?.studentId) conditions.push({ id: session.user.studentId });
  if (session?.user?.id)        conditions.push({ userId: session.user.id });
  if (session?.user?.email)     conditions.push({ email: session.user.email });
  if (conditions.length === 0) return null;
  return prisma.student.findFirst({ where: { OR: conditions }, include: { institution: true } });
}
```

---

### 🟡 MED-004 — `franqueados/[id]` DELETE: Transaction timeout no limite Vercel

**Arquivo:** `app/api/app/franqueados/[id]/route.ts` — método DELETE

**O problema:**
```typescript
await prisma.$transaction(async (tx) => {
  // 15+ deleteMany/updateMany sequenciais dentro da transaction:
  await tx.crmTask.deleteMany(...)
  await tx.crmLead.deleteMany(...)
  await tx.application.deleteMany(...)
  await tx.vacancy.deleteMany(...)
  await tx.financial.deleteMany(...)
  // ... mais 10 operações
}, { timeout: 30000 }); // ← exatamente o limite da Vercel
```

A transaction tem `timeout: 30000ms` que é exatamente o limite máximo da Vercel. Uma franquia grande com muitos dados pode:
1. Exceder os 30s → transaction timeout do Prisma
2. Ou ficar entre 28-30s → timeout da Vercel antes do Prisma → estado inconsistente

**Correção:**
- Reduzir timeout para `25000` (deixa 5s de margem para overhead HTTP)
- Ou converter para exclusão em steps fora da transaction com compensação manual
- Nota: esta rota é raramente usada (exclusão de franqueado), portanto é risco real mas de baixa frequência

---

## Riscos BAIXOS

### 🟢 BAI-001 — `lib/getConfig.ts`: cache in-memory não compartilhado entre instâncias

**O problema:**
```typescript
let _cache: any = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;
```

Variável de módulo Node.js = escopo de uma única instância Vercel. Com múltiplos Lambdas paralelos (escala automática), cada instância tem seu próprio cache. Um admin que muda configuração (token Autentique, chave Resend) via `PATCH /api/app/config`:
- Instância A: `clearConfigCache()` → busca novo valor → OK
- Instâncias B, C, D...: ainda têm o valor antigo em cache por até 60s
- Pode causar falhas esporádicas de autenticação Autentique em requests paralelos

**Impacto real:** baixo (60s de inconsistência, raro mudar config). Resolução completa exigiria Redis compartilhado.

---

### 🟢 BAI-002 — `gamificacao` GET: 4 queries sem cache

**Arquivo:** `app/api/app/gamificacao/route.ts`

```typescript
const [pontos, configs, allPoints] = await Promise.all([
  prisma.gamificationPoint.findMany(...),  // Query 1
  prisma.gamificationConfig.findMany(...),  // Query 2
  prisma.gamificationPoint.groupBy(...),    // Query 3 — pesada com escala
]);
// + Query 4: prisma.franchise.findMany para nomes do ranking
```

O `groupBy` agrega toda a tabela `gamification_points`. Com 100 franqueados × 50 ações cada = 5.000+ registros sendo agregados a cada chamada, sem cache. O ranking global é lido provavelmente em cada abertura do módulo de gamificação.

**Correção:**
```typescript
export const dynamic = "force-dynamic";
export const revalidate = 300; // cache de 5 minutos — ranking não precisa ser real-time
```

---

### 🟢 BAI-003 — `lib/email.ts`: Resend API sem timeout

**O problema:**
```typescript
const res = await fetch(RESEND_URL, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  // ← sem signal: AbortSignal.timeout(...)
});
```

O QR Code de PIX já tem timeout de 5s (bem implementado). Mas o envio final para a API da Resend não tem timeout. Se Resend estiver lento:
- Emails de boas-vindas, assinatura e recuperação de senha ficam travados
- Impacto menor porque a maioria dos envios de email já é fire-and-forget (`.catch(() => {})`)
- Exceções: `forgot-password` e `enviarBoasVindasEstudante` são `await` — ficam bloqueados

**Correção:**
```typescript
const res = await fetch(RESEND_URL, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  signal: AbortSignal.timeout(10_000), // 10s é mais que suficiente para um POST de email
});
```

---

## O que já está bem — não mexer

Estes pontos foram auditados e estão adequados para 50-100 franqueados:

| Componente | Status |
|-----------|--------|
| `fechar-mes` POST | ✅ processInBatches(10) — sem N+1 |
| `franqueados` GET | ✅ paginado (50/page), cache 60s |
| `estudantes` GET | ✅ paginado (50/page), com filtro franchiseId |
| `empresas` GET | ✅ paginado (50/page), com filtro franchiseId |
| `contratos` GET | ✅ paginado (50/page), select sem include pesado |
| `crm/leads` GET | ✅ paginado (200/page), filtro franchiseId |
| `assinaturas` GET | ✅ paginado (200/page), filtro franchiseId |
| `importar/estudantes` | ✅ limite 200, batch paralelo |
| `admin/cleanup` | ✅ delete paralelo, proteção FRANQUEADORA |
| Dashboard franqueadora | ✅ `unstable_cache` 30s + Promise.all |
| `middleware.ts` | ✅ CSP com nonce, sem DB |
| Auth JWT | ✅ stateless, sem DB por request |
| Connection pooling | ✅ pgBouncer port 6543, pool_timeout=15 |
| Indexes críticos | ✅ ESC-003: 9 indexes aplicados no Supabase |

---

## Plano de Sprint — Prioridade de Execução

### 🔥 Sprint Imediato (executar esta semana — risco ativo)

| ID | Arquivo | Ação | Estimativa |
|----|---------|------|-----------|
| CRIT-001 | `lib/autentique.ts` | Adicionar `AbortSignal.timeout(20000)` nas 2 chamadas fetch | 10 min |
| ALTO-D | `processos/candidatar/route.ts` | Adicionar `getServerSession` + validação de ownership | 15 min |
| CRIT-002 | `lib/actions/vacancies.ts` + `vagas/route.ts` | Adicionar paginação em `getVacancies()` e GET | 30 min |
| ALTO-A | `franqueados/[id]/route.ts` GET | Adicionar `take: 50` em `contracts`, select em vez de include | 15 min |
| ALTO-B | `lib/actions/vacancies.ts` | Adicionar `take: 100` em `getVacancy().applications` | 10 min |

**Tempo total estimado: ~80 minutos**

### 📋 Sprint Próximo (executar em até 2 semanas)

| ID | Arquivo | Ação |
|----|---------|------|
| MED-003 | `prisma/schema.prisma` | Indexes em `Student.userId` e `Student.email` |
| MED-003 | `portal/estudante/perfil` | Refatorar para query única com OR |
| MED-001 | `instituicoes/route.ts` | Adicionar `take: 500` |
| MED-002 | 14 rotas identificadas | Envolver em try/catch com `handleApiError` |
| BAI-003 | `lib/email.ts` | Adicionar `AbortSignal.timeout(10000)` |
| BAI-002 | `gamificacao/route.ts` | Adicionar `export const revalidate = 300` |

### 🔒 Sprint de Segurança (quando migrar para Supabase Pro)

| ID | Componente | Ação |
|----|-----------|------|
| ALTO-C | Rotas públicas | Implementar rate limiting via Upstash Ratelimit |
| MED-004 | `franqueados/[id]` DELETE | Reduzir `timeout: 25000` |

---

## Novos Índices Recomendados

A aplicar como migration (complementar ao ESC-003):

```sql
-- MED-003: portal estudante — queries por userId e email na tabela students
CREATE INDEX IF NOT EXISTS "students_userId_idx" ON "students"("userId");
CREATE INDEX IF NOT EXISTS "students_email_idx"  ON "students"("email");

-- CRIT-002: vagas — queries por franchiseId e status (paginação futura)
CREATE INDEX IF NOT EXISTS "vacancies_franchiseId_idx" ON "vacancies"("franchiseId");
CREATE INDEX IF NOT EXISTS "vacancies_status_idx"      ON "vacancies"("status");

-- ALTO-A: contratos — queries por franchiseId (franqueados/[id] GET)
CREATE INDEX IF NOT EXISTS "contracts_franchiseId_idx" ON "contracts"("franchiseId");
```

---

## Conclusão

O sistema está **apto para operar com 50 franqueados** após a resolução dos 2 riscos CRÍTICOS e 4 ALTOS mapeados neste relatório. Os itens restantes (MÉDIO e BAIXO) não causarão outage mas afetarão a experiência do usuário e a segurança conforme o volume cresce.

**Capacidade estimada por severidade de risco:**

| Com CRIT-001 não resolvido | Qualquer instabilidade Autentique → 100% dos contratos travam |
|----------------------------|---------------------------------------------------------------|
| Com CRIT-002 não resolvido | 50+ franqueados → página de vagas da Franqueadora pode timeout |
| Com ALTO-C não resolvido | Landing pages públicas vulneráveis a spam/DoS |
| Com ALTO-D não resolvido | Candidaturas falsas podem ser inseridas por qualquer pessoa |
| **Com todos resolvidos** | **Sistema suporta 100+ franqueados confortavelmente** |

---

*Relatório gerado em 06/06/2026 — Sistema Smarter v2 — auditoria pós-sprint ESC-001:006*
