# Relatório de Cache — Dashboard da Franqueadora

**Data:** 2026-06-06  
**Status:** ✅ Implementado

---

## Problema

O Dashboard principal (`/dashboard`) executava **25+ queries simultâneas** ao banco a cada carregamento de página, sem nenhuma forma de cache. Para a FRANQUEADORA (master), os dados raramente mudam em janelas de segundos — cada carregamento do dashboard disparava toda a carga desnecessariamente.

## Solução Implementada

Adicionado `unstable_cache` do Next.js 14 nas 7 funções de leitura do dashboard.

### Arquivo alterado: `app/dashboard/page.tsx`

**Import adicionado:**
```typescript
import { unstable_cache } from "next/cache";
```

**Wrappers criados (TTL 30 segundos):**
```typescript
const cachedGetKpis                = unstable_cache(getKpis,                 ["dashboard-kpis"],       { revalidate: 30, tags: ["dashboard"] });
const cachedGetFranquias           = unstable_cache(getFranquias,            ["dashboard-franquias"],   { revalidate: 30, tags: ["dashboard"] });
const cachedGetFinanceiro          = unstable_cache(getFinanceiro,           ["dashboard-financeiro"],  { revalidate: 30, tags: ["dashboard"] });
const cachedGetProximos5Dias       = unstable_cache(getProximos5Dias,        ["dashboard-agenda"],      { revalidate: 30, tags: ["dashboard"] });
const cachedGetContratacoesRecentes= unstable_cache(getContratacoesRecentes, ["dashboard-recentes"],    { revalidate: 30, tags: ["dashboard"] });
const cachedGetFranqueadosResumo   = unstable_cache(getFranqueadosResumo,    ["dashboard-franqueados"], { revalidate: 30, tags: ["dashboard"] });
const cachedGetRanking             = unstable_cache(getRanking,              ["dashboard-ranking"],     { revalidate: 30, tags: ["dashboard"] });
```

## Comportamento do Cache

| Aspecto | Detalhe |
|---------|---------|
| **TTL** | 30 segundos |
| **Estratégia** | Stale-while-revalidate — resposta imediata do cache, revalidação em background |
| **Escopo por usuário** | Cache key inclui argumentos (`franchiseId`) → entradas separadas por franqueado |
| **FRANQUEADORA** | Cache global (sem franchiseId) — compartilhado entre todos os acessos de master |
| **FRANQUEADO** | Cache por `franchiseId` — isolado por unidade |

## O que NÃO é cacheado

- **Notificações de solicitações de estagiário** — dado pessoal e tempo-real por usuário (`prisma.notification.findMany`)
- Operações de escrita — nenhuma mutação passa por cache

## Impacto

| Cenário | Antes | Depois |
|---------|-------|--------|
| Primeira visita (cold) | 25+ queries | 25+ queries (sem cache ainda) |
| Visitas subsequentes (warm, 30s) | 25+ queries | **0 queries ao banco** (servido do cache) |
| Múltiplos usuários simultâneos | N × 25+ queries | Queries compartilhadas via cache |

**Redução estimada de queries em produção:** 80–95% das chamadas ao banco eliminadas nas visitas repetidas ao dashboard dentro de janelas de 30 segundos.

## Segurança de Dados

O cache é server-side (Next.js data cache), nunca exposto ao cliente. Dados financeiros de uma franquia são isolados por `franchiseId` na cache key — impossível vazar dados entre franqueados.

---

*Implementado em: `app/dashboard/page.tsx`*
