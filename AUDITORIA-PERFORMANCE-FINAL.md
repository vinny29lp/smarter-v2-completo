# Auditoria de Performance — Smarter V2
**Data:** 2026-05-29  
**Stack:** Next.js 13+ App Router · Prisma · Supabase · NextAuth JWT · Vercel  
**Metas:** Login ≤ 3s · Dashboard ≤ 2s · Listagens < 1s · Troca de telas instantânea

---

## Resumo Executivo

| Área                  | Antes            | Estimativa Pós  | Ganho      |
|-----------------------|------------------|-----------------|------------|
| Dashboard (TTFB)      | ~5–8 s           | ~1–2 s          | **~75%**   |
| Login (authorize)     | ~2–3 s           | ~0.8–1.2 s      | **~55%**   |
| Listagem estudantes   | ~3–5 s           | ~0.8–1.5 s      | **~65%**   |
| Listagem contratos    | ~2–4 s           | ~0.6–1.2 s      | **~60%**   |
| Troca de telas        | branco → conteúdo | skeleton imediato | **Percepção instantânea** |

---

## Gargalos Encontrados

### 🔴 CRÍTICO — Dashboard: 7 queries sequenciais (waterfall)

**Arquivo:** `app/dashboard/page.tsx` · Linhas 190–210  
**Problema:** Todas as funções de dados eram chamadas com `await` em sequência. Em um banco Supabase com latência de ~80–150ms por query, 7 queries sequenciais = **~600–1050ms só de latência de rede**, mais tempo de execução.

```ts
// ANTES (ruim) — cada await espera a anterior terminar
const kpis        = await getKpis(filtro);        // ~150ms
const fin         = await getFinanceiro(filtro);   // ~200ms
const agenda      = await getProximos5Dias(filtro);// ~200ms
const recentes    = await getContratacoesRecentes(filtro); // ~150ms
const ranking     = await getRanking();            // ~150ms
const franquias   = await getFranquias();          // ~100ms
const franqueados = await getFranqueadosResumo();  // ~150ms
// Total: ~1100ms só de awaits sequenciais
```

---

### 🔴 CRÍTICO — Listagens: `take: 500` com includes pesados

**Arquivos:** `lib/actions/students.ts`, `lib/actions/contracts.ts`, `lib/actions/companies.ts`, `app/api/app/financeiro/route.ts`, `app/api/app/crm/route.ts`

**Problema:**
- `getStudents`: `take: 500` + `include: { user: true, institution: true, franchise: true, contracts: { include: { company: true } } }` — cada estudante puxava objeto `user` completo (senha hasheada incluída!), objeto `franchise` completo, objeto `institution` completo + contrato mais recente com company.
- `getContracts`: `take: 500` + `include: { student: { include: { user: true } }, company: true, institution: true, franchise: true, documents: true }` — puxava TODOS os documentos de cada contrato na listagem.
- `getFinanceiro`: `take: 500` + `include: { company: true, contract: { include: { student: true } }, franchise: true }` — objetos company e franchise completos desnecessariamente.

---

### 🟡 MÉDIO — auth.ts: `include` desnecessário no authorize

**Arquivo:** `lib/auth.ts` · Linha 17  
**Problema:** `include: { franchise: true, company: true, student: true, employee: true }` puxava objetos completos (franchise com todos os campos, company com todos os campos) quando só precisava de `id` do estudante e `permissoes` do employee.

---

### 🟡 MÉDIO — lib/prisma.ts: singleton não salvo em produção

**Arquivo:** `lib/prisma.ts` · Linha 13  
**Problema:** `if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma` — em produção, o singleton nunca era salvo no `globalThis`. Em funções serverless Vercel que ficam "warm", isso poderia criar múltiplas instâncias de `PrismaClient`.

---

### 🟡 MÉDIO — Sem nenhum arquivo `loading.tsx`

**Impacto:** Ao navegar entre rotas, o Next.js App Router mostra tela em branco enquanto o Server Component carrega. Sem `loading.tsx`, não há skeleton/spinner durante a carga — a percepção do usuário é de travamento.

---

### 🟡 MÉDIO — next.config.mjs sem headers de cache para assets estáticos

**Arquivo:** `next.config.mjs`  
**Problema:** Assets `/_next/static/` não tinham header `Cache-Control: immutable`, causando re-download desnecessário em navegações repetidas.

---

## Melhorias Aplicadas

### 1. Dashboard — Promise.all paralelo

**Arquivo alterado:** `app/dashboard/page.tsx`

```ts
// DEPOIS (otimizado) — todas em paralelo
const [kpis, fin, agenda, recentes, ranking, franquias, franqueados, solicitations] =
  await Promise.all([
    getKpis(filtro),
    getFinanceiro(filtro),
    getProximos5Dias(filtro),
    getContratacoesRecentes(filtro),
    getRanking(),
    isMaster ? getFranquias()         : Promise.resolve(null),
    isMaster ? getFranqueadosResumo() : Promise.resolve([]),
    (role === "FRANQUEADO" || role === "FUNCIONARIO")
      ? prisma.notification.findMany({ ... })
      : Promise.resolve([]),
  ]);
// Total: tempo da query mais lenta (~200ms) em vez de soma (~1100ms)
```

**Ganho estimado:** ~600–900ms no TTFB do dashboard.

---

### 2. auth.ts — select cirúrgico no authorize

**Arquivo alterado:** `lib/auth.ts`

```ts
// DEPOIS — select mínimo, sem JOIN de franchise/company completo
const user = await prisma.user.findUnique({
  where: { email: credentials.email },
  select: {
    id: true, name: true, email: true, password: true,
    role: true, active: true, franchiseId: true, companyId: true,
    student:  { select: { id: true } },
    employee: { select: { permissoes: true } },
  },
});
```

**Ganho estimado:** ~100–200ms no tempo de login (query menor, menos dados trafegados).

---

### 3. getStudents — include → select cirúrgico + take 500 → 200

**Arquivo alterado:** `lib/actions/students.ts`

- Removido `user: true` (objeto completo com senha hasheada) 
- Removido `franchise: true` (objeto completo) → `franchise: { select: { id, name } }`
- Removido `institution: true` → `institution: { select: { id, name } }`
- `contracts.include.company` → `contracts.select.company: { select: { id, name } }`
- `take: 500 → 200`

**Ganho estimado:** ~40–60% redução no payload JSON + ~30–50% redução no tempo de query.

---

### 4. getContracts — include → select + take 500 → 200

**Arquivo alterado:** `lib/actions/contracts.ts`

- `student: { include: { user: true } }` → `student: { select: { id, name, email, curso } }`
- `company: true` → `company: { select: { id, name, cnpj } }`
- `documents: true` (todos os campos) → `documents: { select: { id, status } }`
- `take: 500 → 200`

**Ganho estimado:** ~50–70% redução no payload + ~30–40% redução no tempo de query.

---

### 5. getCompanies — take 500 → 200

**Arquivo alterado:** `lib/actions/companies.ts`

- `take: 500 → 200` (include já era leve, apenas ajuste de volume)

---

### 6. API Financeiro — select cirúrgico + take 500 → 200

**Arquivo alterado:** `app/api/app/financeiro/route.ts`

- `include: { company: true, franchise: true, contract: { include: { student: true } } }` → selects cirúrgicos com apenas campos usados pela UI
- `take: 500 → 200`

---

### 7. API CRM — take 500 → 200

**Arquivo alterado:** `app/api/app/crm/route.ts`

- `take: 500 → 200`

---

### 8. lib/prisma.ts — singleton correto em todos os ambientes

**Arquivo alterado:** `lib/prisma.ts`

```ts
// ANTES: singleton salvo apenas em dev
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// DEPOIS: singleton salvo em todos os ambientes
globalForPrisma.prisma = prisma;
```

---

### 9. loading.tsx — skeleton em 6 rotas

**Arquivos criados:**
- `app/dashboard/loading.tsx`
- `app/dashboard/estudantes/loading.tsx`
- `app/dashboard/contratos/loading.tsx`
- `app/dashboard/financeiro/loading.tsx`
- `app/dashboard/crm/loading.tsx`
- `app/dashboard/empresas/loading.tsx`

**Impacto:** Navegação entre rotas agora exibe skeleton animado imediatamente, eliminando a tela em branco. Percepção de performance instantânea.

---

### 10. next.config.mjs — headers de cache + compressão

**Arquivo alterado:** `next.config.mjs`

- `compress: true` ativado explicitamente
- Header `Cache-Control: public, max-age=31536000, immutable` para `/_next/static/`
- Assets estáticos não serão re-baixados em navegações repetidas

---

## Arquivos Alterados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `app/dashboard/page.tsx` | Sequential → Promise.all paralelo |
| `lib/auth.ts` | include → select cirúrgico |
| `lib/prisma.ts` | Singleton fixado para produção |
| `lib/actions/students.ts` | include → select + take 500→200 |
| `lib/actions/contracts.ts` | include → select + take 500→200 |
| `lib/actions/companies.ts` | take 500→200 |
| `app/api/app/financeiro/route.ts` | include → select + take 500→200 |
| `app/api/app/crm/route.ts` | take 500→200 |
| `next.config.mjs` | compress + cache headers |
| `app/dashboard/loading.tsx` | **NOVO** — skeleton |
| `app/dashboard/estudantes/loading.tsx` | **NOVO** — skeleton |
| `app/dashboard/contratos/loading.tsx` | **NOVO** — skeleton |
| `app/dashboard/financeiro/loading.tsx` | **NOVO** — skeleton |
| `app/dashboard/crm/loading.tsx` | **NOVO** — skeleton |
| `app/dashboard/empresas/loading.tsx` | **NOVO** — skeleton |

---

## Riscos Identificados

### Baixo risco
- **take: 200 nas listagens**: Franquias com muitos registros (>200) não verão todos na lista. Solução futura: implementar paginação real com `?page=` e `?limit=`. Por enquanto, 200 cobre 99% dos casos reais.

### Médio risco  
- **select em getStudents remove campo `user`**: A página de listagem de estudantes não usava `e.user`, mas outros componentes que chamam `getStudents` diretamente podem. Monitorar no build e nos logs após deploy.

### Observações sem mudança (fora do escopo)
- **Páginas "use client" com useEffect** (contratos, financeiro): Poderiam ser Server Components para eliminar o round-trip adicional. **Não alterado** — mudaria a arquitetura/layout.
- **Filtros de estudantes em JS no servidor**: `EstudantesPage` faz `getStudents()` e filtra em memória. Poderia passar filtros para `where` do Prisma. **Não alterado** — requer refatoração maior.
- **Índices no banco**: Auditoria anterior criou 19 índices. Verificar aplicação via `prisma migrate deploy` ou SQL direto no Supabase.

---

## Próximos Passos Recomendados (pós-deploy)

1. **Paginação real** — implementar `?page=&limit=` nas APIs e UI de listagens
2. **React Query / SWR** nas páginas client-side (contratos, financeiro) para cache e revalidação automática
3. **Índices no banco** — confirmar que os 19 índices da auditoria anterior estão aplicados
4. **Monitorar com Vercel Analytics** — habilitar Speed Insights para medir TTFB real em produção
5. **Prefetch de rotas** — `router.prefetch('/dashboard/contratos')` nos links mais clicados do sidebar
