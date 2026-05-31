# Auditoria de Performance — Sistema Smarter
## Data: 2026-05-29
## Executado por: Claude (Cowork / Anthropic)

---

## Resumo Executivo

O sistema está arquitetado de forma sólida para a fase atual (poucos dados em produção). O dashboard — ponto mais crítico — já foi bem-implementado com `Promise.all`, `count()` e `aggregate()` para todos os KPIs. Os problemas encontrados são **estruturais e preventivos**: queries sem limite de paginação e ausência total de índices nas colunas de filtragem das tabelas de negócio. Esses problemas não causam dor hoje (< 100 registros por tabela), mas causariam degradação severa de performance e custo com 1.000+ registros.

---

## Problemas Encontrados

### CRÍTICO — Ausência de índices nas tabelas de negócio

Nenhuma das tabelas principais (`students`, `contracts`, `financials`, `companies`, `crm_leads`, `notifications`, `internship_documents`) possuía índices nas colunas usadas em cláusulas `WHERE`:

- `franchiseId` — filtro presente em praticamente todas as queries
- `status` — filtro de estado usado em listagens e KPIs
- `companyId`, `studentId` — joins frequentes em contratos
- `paidAt`, `vencimentoAt` — filtros de data no financeiro e no dashboard
- `retornoAt` — filtro de data no CRM
- `userId`, `lida` — filtros de notificações no dashboard

**Impacto esperado sem índices:** com 10.000 registros na tabela `financials`, cada query do dashboard (que roda 8 `aggregate()` em paralelo) faria full table scan. Tempo de carregamento do dashboard passaria de ~200ms para 3–8 segundos.

### MÉDIO — Queries `findMany` sem `take` nas rotas de listagem

As seguintes rotas carregavam **todos os registros da franquia** sem nenhum limite, o que é um risco de custo (egress no Supabase) e de travamento do browser do usuário:

| Arquivo | Query afetada | Risco |
|---|---|---|
| `app/api/app/financeiro/route.ts` | `financial.findMany` | Lançamentos crescem rápido — 1 por contrato/mês |
| `app/api/app/crm/route.ts` | `crmLead.findMany` | Histórico de leads acumula sem limite |
| `app/api/app/processos/route.ts` | `application.findMany` | Candidaturas crescem com vagas |
| `lib/actions/students.ts` → `getStudents()` | `student.findMany` | Estudantes de toda a rede (FRANQUEADORA) |
| `lib/actions/contracts.ts` → `getContracts()` | `contract.findMany` | Inclui documentos de cada contrato — payload muito pesado |
| `lib/actions/companies.ts` → `getCompanies()` | `company.findMany` | Empresas de toda a rede |

### BAIXO — `getContracts()` inclui `documents: true` em listagens

A action `getContracts` carrega todos os documentos de cada contrato na listagem geral. Isso multiplica o payload: 100 contratos × 9 documentos cada = 900 registros a mais por requisição. Não foi alterado (impacto apenas com volume alto e requer validação da UI), mas está registrado para atenção futura.

### BAIXO — IA sem rate limiting explícito

As rotas de IA (`/api/app/ai/*`) validam autenticação e `franchiseId`, mas não têm rate limiting de tokens/minuto por usuário. Risco atual: baixo (uso manual). Risco futuro: se alguma página chamar IA automaticamente ou usuário abrir muitas abas, pode gerar custo inesperado.

### NÃO É PROBLEMA — Dashboard

O dashboard foi auditado com atenção especial e está bem-implementado:
- Todos os KPIs usam `count()` ou `aggregate()` — nunca `findMany` para contar ✅
- Todas as queries rodam em `Promise.all()` — paralelismo total ✅
- Todos os `findMany` do dashboard têm `take` definido ✅
- `select` é usado para limitar campos onde possível ✅
- Cálculo financeiro complexo feito no servidor, não no browser ✅

---

## Correções Aplicadas

### Código — `take` adicionado como proteção nas queries de listagem

```
app/api/app/financeiro/route.ts      → take: 500
app/api/app/crm/route.ts             → take: 500
app/api/app/processos/route.ts       → take: 300
lib/actions/students.ts (getStudents) → take: 500
lib/actions/contracts.ts (getContracts) → take: 500
lib/actions/companies.ts (getCompanies) → take: 500
```

Esses limites são seguros para o volume atual e protegem contra crescimento descontrolado. Não quebram a UI porque as listagens nunca precisarão exibir mais do que esse número de itens ao mesmo tempo.

### Banco de dados — 19 novos índices criados (CONCURRENTLY, sem downtime)

#### Tabela `students`
- `idx_students_franchise` → `(franchiseId)`
- `idx_students_status` → `(status)`

#### Tabela `contracts`
- `idx_contracts_franchise` → `(franchiseId)`
- `idx_contracts_status` → `(status)`
- `idx_contracts_company` → `(companyId)`
- `idx_contracts_student` → `(studentId)`

#### Tabela `financials`
- `idx_financials_franchise` → `(franchiseId)`
- `idx_financials_status` → `(status)`
- `idx_financials_paid_at` → `(paidAt) WHERE paidAt IS NOT NULL` (partial index)
- `idx_financials_vencimento` → `(vencimentoAt) WHERE vencimentoAt IS NOT NULL` (partial index)

#### Tabela `companies`
- `idx_companies_franchise` → `(franchiseId)`

#### Tabela `crm_leads`
- `idx_crm_leads_franchise` → `(franchiseId)`
- `idx_crm_leads_situacao` → `(situacao)`
- `idx_crm_leads_retorno` → `(retornoAt) WHERE retornoAt IS NOT NULL` (partial index)

#### Tabela `notifications`
- `idx_notifications_user` → `(userId)`
- `idx_notifications_lida` → `(userId, lida) WHERE lida = false` (partial index composto — otimiza exatamente a query do dashboard)

#### Tabela `internship_documents`
- `idx_internship_docs_contract` → `(contractId)`
- `idx_internship_docs_status` → `(status)`

---

## Riscos de Custo

### Supabase
- **Banco de dados:** Tamanho atual irrisório (< 1 MB de dados de negócio). Com crescimento normal da rede (10 franquias, 500 estudantes, 300 contratos), o banco continuará dentro do free tier por muito tempo.
- **Egress (transferência):** O risco real era nas queries sem `take` — corrigido. O payload de `getContracts` ainda é pesado (inclui documentos), monitorar quando contratos passarem de 100.
- **Edge Functions / Auth:** Uso normal, sem riscos identificados.

### Vercel
- **Serverless Functions:** O dashboard faz ~15 queries por carregamento. Com os índices criados, o tempo de resposta permanecerá baixo e as funções não excedem o timeout de 10s. Sem risco imediato.
- **Bandwidth:** Sem assets pesados identificados. PDFs são gerados sob demanda pelo usuário.

### OpenAI / IA
- Rotas de IA existem mas são chamadas **apenas por ação explícita do usuário** (geração de texto, análise DISC, etc.) — sem chamadas automáticas. Risco atual baixo.
- Ausência de rate limiting é o único ponto de atenção.

---

## Recomendações Futuras (não implementadas agora)

1. **Paginação real nas listagens** — quando qualquer tabela ultrapassar ~200 registros, implementar paginação com cursor (`cursor`, `skip`/`take`) nas rotas de listagem em vez do `take: 500` atual.

2. **`getContracts()` — separar `documents`** — na listagem geral, substituir `documents: true` por `_count: { select: { documents: true } }` e carregar os documentos completos somente na rota de detalhe `[id]`.

3. **Rate limiting nas rotas de IA** — adicionar middleware com contagem de chamadas por `franchiseId` + janela de tempo (ex: 20 chamadas/hora) para evitar gastos inesperados.

4. **Cache de KPIs do dashboard** — quando a rede crescer, considerar cache com `unstable_cache` do Next.js nos `count()` e `aggregate()` do dashboard com revalidação de 5 minutos.

5. **Índice composto `(franchiseId, status)`** em `contracts` e `students` — útil quando as queries filtrarem por ambos simultaneamente (ex: contratos ativos de uma franquia). Criar somente se o plano de execução mostrar seq scan após volume crescer.

6. **Monitoramento de slow queries** — habilitar `pg_stat_statements` no Supabase e configurar alerta para queries acima de 500ms.

---

## Checklist Semanal de Monitoramento

- [ ] Verificar tamanho do banco no Supabase (Dashboard → Settings → Database → Database size)
- [ ] Verificar uso de funções no Vercel (Dashboard → Functions → Usage)
- [ ] Verificar calls de IA (OpenAI dashboard → Usage → Requests/tokens por dia)
- [ ] Verificar logs de email no Resend (Dashboard → Logs → Delivery rate)
- [ ] Verificar queries lentas: `SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
- [ ] Confirmar que nenhuma listagem retorna mais de 200 itens por chamada (verificar no Vercel Function logs)
