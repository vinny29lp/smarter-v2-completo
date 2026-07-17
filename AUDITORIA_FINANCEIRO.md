# Auditoria do Módulo Financeiro — Sistema Smarter
**Data:** 02/07/2026  
**Escopo:** Taxa de Desenvolvimento (Franqueadora → Franqueados)  
**Stack:** Next.js 14 · Prisma · Supabase

---

## Arquivos Analisados

| Arquivo | Função |
|---|---|
| `app/api/app/financeiro/route.ts` | GET (listagem paginada) + POST (criar lançamento) |
| `app/api/app/financeiro/fechar-mes/route.ts` | **Núcleo do faturamento mensal** — gera cobranças |
| `app/api/app/financeiro/gerar-cobranca-cora/route.ts` | Cria lançamento + boleto Cora + email |
| `app/api/app/financeiro/[id]/route.ts` | PATCH (editar/baixa/reverter) + DELETE |
| `app/api/app/financeiro/marcar-vencidos/route.ts` | Auto-marcação PENDENTE→VENCIDO |
| `app/dashboard/financeiro/page.tsx` | Painel financeiro (franqueadora + franqueado) |
| `app/portal-empresa/financeiro/page.tsx` | Painel da empresa empregadora |
| `prisma/schema.prisma` | Modelos Financial, Franchise, Contract |

---

## ✅ O que está implementado e funcionando

### 1. Cálculo R$200 + R$13/estagiário ativo
**Implementado em:** `fechar-mes/route.ts` (linhas 47–63 no GET e 115–136 no POST)

```typescript
const ativos = f.contracts.length;          // contratos com status: "ATIVO"
const taxaAdmin = ativos * 13;              // R$13 por estagiário ativo
const mensalidade = (f.cobrarMensalidade ?? true) ? (f.mensalidade ?? 200) : 0;
const total = mensalidade + taxaAdmin;
```

O cálculo está correto. Adicionalmente, o schema Prisma mostra que o modelo `Franchise` possui:
- `mensalidade Float? @default(200)` — valor configurável por unidade
- `cobrarMensalidade Boolean @default(true)` — flag para isentar unidades

Isso permite personalizar a mensalidade por franqueado, o que é mais flexível que hardcodar R$200.

---

### 2. Lançamento aparece no financeiro do Franqueado como conta a pagar
**Implementado em:** `page.tsx` (linhas 671–739) com seção dedicada

O registro criado pelo `fechar-mes` tem `franchiseId: f.id` e `categoria: "Franquia"`. O painel do franqueado detecta isso e exibe uma seção exclusiva intitulada **"🏛️ Taxa de Desenvolvimento de Rede"**.

O KPI "Contas a Pagar" do franqueado usa:
```typescript
lancamentos.filter(l => l.status === "PENDENTE" && (
  l.tipo === "saida" || isFranquia(l)  // isFranquia = l.categoria === "Franquia"
))
```
Ou seja, mesmo que o `tipo` varie (ver Bug #2 abaixo), o lançamento entra corretamente como conta a pagar por causa da categoria.

---

### 3. Franqueadora vê os lançamentos como "A Receber"
**Implementado em:** `page.tsx` (linhas 210–218 para KPI e 741–896 para tabela)

O KPI `aReceber` da franqueadora usa:
```typescript
lancamentos.filter(l => l.status === "PENDENTE" && (
  l.tipo === "entrada" || isFranquia(l)
))
```
O `||` garante que lançamentos de `categoria: "Franquia"` sempre entram como recebível, independente do `tipo`. A seção "Cobrança de Franquias" exibe valores em verde com botões "Dar Baixa", "Cobrar" e "Boleto Cora". ✓

---

### 4. Regra do dia 23 como GATILHO de disponibilidade
**Implementado em:** `fechar-mes/route.ts` (linha 82) e `page.tsx` (linha 175, 767–769)

```typescript
// API: rejeita chamadas antes do dia 23
if (dia < 23 && !force) {
  return NextResponse.json({ error: `Fechamento disponível apenas no dia 23 ou após...` }, { status: 400 });
}
// Frontend: botão desabilitado antes do dia 23
disabled={fechandoMes || !podeFecha}
```
O botão exibe `"Disponível dia 23 (hoje: X)"` quando antecipado. Há ainda um link de "Forçar agora (admin)" com `?force=true` para testes.

---

### 5. Proteção contra fechamento duplicado no mesmo mês
**Implementado em:** `fechar-mes/route.ts` (linhas 100–112)

```typescript
const jaFechadosNesteMes = await prisma.financial.findMany({
  where: {
    franchiseId: { in: franchises.map(f => f.id) },
    categoria: "Franquia",
    createdAt: { gte: inicioDia, lte: fimDia },
  },
});
const jaFechadosSet = new Set(jaFechadosNesteMes.map(j => j.franchiseId));
```
Se o botão for clicado duas vezes no mesmo mês, franqueados que já têm cobrança gerada são pulados com `reason: "Já fechado este mês"`. ✓

---

### 6. Preview antes do fechamento
O `GET /api/app/financeiro/fechar-mes` retorna uma prévia com todos os valores calculados por franqueado, sem criar nenhum registro. O frontend exibe isso na tabela "Próxima cobrança" antes que o fechamento seja executado.

---

### 7. Geração de boleto Cora + email automático
**Implementado em:** `gerar-cobranca-cora/route.ts`

Fluxo completo: cria lançamento → chama API da Cora → salva `coraInvoiceId` + `linkPagamento` + `chavePix` no lançamento → envia email para a unidade → registra em `FinancialSendLog`. Rollback incluído: se a Cora rejeitar, o lançamento é apagado para evitar órfãos no banco.

---

### 8. Auto-marcação de vencidos
**Implementado em:** `marcar-vencidos/route.ts`

Ao carregar o painel (`useEffect`), o sistema chama `PATCH /financeiro/marcar-vencidos` em fire-and-forget, que marca todos os `PENDENTE` com `vencimentoAt < hoje` como `VENCIDO`. ✓

---

### 9. Processamento em batch (performance)
Evita timeout da Vercel com 100+ franqueados usando batches de 10 paralelos:
```typescript
await processInBatches(franchises, 10, async (f) => { ... });
```

---

## ❌ O que está FALTANDO ou com lógica INCORRETA

---

### BUG CRÍTICO #1 — A regra do dia 23 para estagiários ativados tardiamente NÃO está implementada

**Gravidade: 🔴 CRÍTICA**

**O que a regra exige:**
- Estagiário ativado até o dia 23 do mês X → cobrado no fechamento do mês X (vencimento em mês X+1)
- Estagiário ativado após o dia 23 do mês X → pula o fechamento do mês X; cobrado só no fechamento do mês X+1

**O que o código faz hoje:**
```typescript
// fechar-mes/route.ts — linha 93-98
const franchises = await prisma.franchise.findMany({
  where: { status: "ATIVO" },
  include: {
    contracts: { where: { status: "ATIVO" } },  // ← sem filtro por data!
  },
});
```

O `fechar-mes` conta **todos** os contratos com `status: "ATIVO"` no momento da execução, sem verificar QUANDO o contrato se tornou ativo. Se um franqueado ativar um estagiário no dia 25 e o fechamento rodar nesse mesmo dia 25, esse estagiário **já seria cobrado no próximo mês** — violando a regra.

**Raiz do problema adicional:** O modelo `Contract` não possui um campo `ativadoEm DateTime?`. O status muda para "ATIVO" via:
1. Assinatura de documento (`contratos/[id]/documentos/[docId]/route.ts`, linha 222)
2. Webhook do Autentique (`autentique/route.ts`, linha 201)
3. Ativação de migração (`ativar-migracao/route.ts`, linha 26)

Nenhum desses registra a data exata da ativação em um campo dedicado. O único proxy disponível seria o `updatedAt` do contrato, mas esse campo muda a cada edição.

**Como corrigir:**

**Passo 1:** Adicionar campo ao schema Prisma:
```prisma
model Contract {
  ...
  ativadoEm    DateTime?   @db.Timestamptz(6)  // data em que status virou ATIVO
  ...
}
```

**Passo 2:** Preencher o campo ao ativar:
```typescript
// Em todos os lugares que fazem status: "ATIVO"
data: { status: "ATIVO", ativadoEm: new Date() }
```

**Passo 3:** Atualizar o `fechar-mes` para respeitar a regra:
```typescript
// Corte: dia 23 do mês atual
const dataCorte23 = new Date(hoje.getFullYear(), hoje.getMonth(), 23, 23, 59, 59);

contracts: {
  where: {
    status: "ATIVO",
    OR: [
      { ativadoEm: null },                    // contratos antigos sem data (inclui todos)
      { ativadoEm: { lte: dataCorte23 } },    // ativados até dia 23 do mês atual
    ],
  },
},
```

**Passo 4 (migração):** Para contratos já existentes sem `ativadoEm`, preencher com `createdAt` como aproximação:
```sql
UPDATE contracts SET "ativadoEm" = "createdAt" WHERE status = 'ATIVO' AND "ativadoEm" IS NULL;
```

---

### BUG CRÍTICO #2 — Inconsistência no campo `tipo` entre os dois endpoints de geração

**Gravidade: 🔴 CRÍTICA (dados inconsistentes no banco)**

| Endpoint | `tipo` criado |
|---|---|
| `fechar-mes/route.ts` (linha 143) | `"saida"` |
| `gerar-cobranca-cora/route.ts` (linha 52) | `"entrada"` |

Ambos criam registros de "Taxa de Desenvolvimento" para o mesmo propósito, mas com `tipo` oposto. Isso gera dados contraditórios no banco: dois lançamentos de Franquia para a mesma unidade podem ter tipos diferentes dependendo de qual botão foi usado.

**Por que não quebra hoje:** Os KPIs usam `||` com `isFranquia(l)` como override, então o `tipo` é irrelevante para os cálculos. Mas:
- Relatórios futuros ou queries SQL diretas no Supabase terão resultados erráticos
- A lógica de `RowActions` (linha 518) mostra o botão "Boleto Cora" apenas para `l.tipo === "entrada"` — o que significa que cobranças criadas via `fechar-mes` (tipo: "saida") NÃO mostram o botão "Boleto Cora" na tabela geral (embora apareçam corretamente na seção dedicada de Franquias)

**Como corrigir:**

Em `fechar-mes/route.ts`, trocar `tipo: "saida"` por `tipo: "entrada"`:
```typescript
// fechar-mes/route.ts — linha 138-149
const lancamento = await prisma.financial.create({
  data: {
    ...
    tipo: "entrada",   // ← corrigir de "saida" para "entrada"
    ...
  }
});
```

A lógica de KPI já trata `categoria === "Franquia"` como despesa para o franqueado e receita para a franqueadora, independente do `tipo`. Padronizar como `"entrada"` reflete melhor a perspectiva do sistema (é uma cobrança a receber pela franqueadora).

---

### BUG IMPORTANTE #3 — Franqueado pode excluir cobranças de "Taxa de Desenvolvimento"

**Gravidade: 🟠 ALTA (impacto na integridade financeira)**

Em `[id]/route.ts` (linha 88–122), o `DELETE` permite que qualquer FRANQUEADO delete **qualquer** lançamento vinculado à sua unidade, incluindo os de `categoria: "Franquia"` gerados pela Franqueadora:

```typescript
// Sem verificação de categoria — franqueado pode deletar a própria cobrança!
if (role !== "FRANQUEADORA") {
  const record = await prisma.financial.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
  if (!record || record.franchiseId !== franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
await prisma.financial.delete({ where: { id: params.id } });
```

Um franqueado poderia simplesmente apagar a cobrança de Taxa de Desenvolvimento da sua tela, eliminando a conta a pagar.

**Como corrigir:**
```typescript
// Adicionar em DELETE, após o ownership check:
if (role !== "FRANQUEADORA") {
  const record = await prisma.financial.findUnique({
    where: { id: params.id },
    select: { franchiseId: true, categoria: true },
  });
  if (!record || record.franchiseId !== franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (record.categoria === "Franquia") {
    return NextResponse.json({
      error: "Cobranças de rede (Taxa de Desenvolvimento) só podem ser excluídas pela Franqueadora.",
    }, { status: 403 });
  }
}
```

O mesmo deve ser verificado no `PATCH` para prevenir que o franqueado edite o valor da cobrança.

---

### BUG IMPORTANTE #4 — Não há automação (cron job) para o fechamento mensal

**Gravidade: 🟠 ALTA (risco operacional)**

O fechamento mensal é **100% manual**: a Franqueadora deve entrar no painel todo mês e clicar em "Fechar Mês". A pasta `/api/cron/` existe (tem `lembretes-atraso` e `verificar-boletos-cora`), mas não há cron de fechamento.

Se a Franqueadora esquecer de clicar, as cobranças do mês não são geradas, os franqueados não veem nada a pagar, e a receita da rede fica sem registro.

**Como implementar:**

Criar `app/api/cron/fechar-mes/route.ts`:
```typescript
// Configurar no vercel.json como cron: "0 8 23 * *" (às 8h do dia 23 de cada mês)
export async function GET(req: Request) {
  // Verificar Authorization: Bearer CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Redirecionar para a lógica de fechar-mes com force=true (pois já verificamos o dia pelo cron)
  // ... mesma lógica do POST de fechar-mes
}
```

No `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/fechar-mes", "schedule": "0 8 23 * *" }]
}
```

---

### PROBLEMA MENOR #5 — A descrição do lançamento não menciona "Taxa de Desenvolvimento"

**Gravidade: 🟡 MÉDIA (inconsistência terminológica)**

O requisito diz que o lançamento deve aparecer com descrição **"Taxa de Desenvolvimento"**. A descrição gerada hoje é:

```
"Sistema R$200 + 3 estag. (R$39) — Unidade X — junho 2026"
```

O título da seção no painel do franqueado é "🏛️ Taxa de Desenvolvimento de Rede", mas a `descricao` do registro em si não contém esse termo. Se o franqueado pesquisar por "Taxa de Desenvolvimento" em um extrato bancário ou relatório, não vai encontrar.

**Correção simples em `fechar-mes/route.ts`:**
```typescript
// De:
const descricao = `${partes.join(" + ")} — ${f.name} — ${mesRef}`;
// Para:
const descricao = `Taxa de Desenvolvimento — ${partes.join(" + ")} — ${f.name} — ${mesRef}`;
// Resultado: "Taxa de Desenvolvimento — Sistema R$200 + 3 estag. (R$39) — Unidade X — junho 2026"
```

---

### PROBLEMA MENOR #6 — Paginação de 50 registros pode ocultar cobranças antigas

**Gravidade: 🟡 MÉDIA**

A API `GET /api/app/financeiro` tem limit padrão de 50:
```typescript
const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
```

O frontend carrega sem parâmetro adicional:
```typescript
fetch("/api/app/financeiro").then(r => r.json()).then(d => setLancamentos(d.lancamentos || []))
```

Uma Franqueadora com histórico de 12+ meses e muitos lançamentos pode não ver cobranças de Franquia antigas na seção "Cobrança de Franquias", pois os 50 registros mais recentes podem não cobrir todo o histórico. O painel não possui paginação na UI.

**Solução:** Fazer uma query dedicada para lançamentos de Franquia sem paginação, separada da query geral:
```typescript
// Nova chamada separada para cobranças de franquia (sem limite restritivo)
fetch("/api/app/financeiro?categoria=Franquia&limit=200")
```
Ou criar um endpoint dedicado `/api/app/financeiro/franquias` que retorna apenas os de `categoria: "Franquia"`.

---

## Resumo Executivo

| # | Problema | Gravidade | Status |
|---|---|---|---|
| 1 | Regra do dia 23 para novos estagiários não implementada | 🔴 CRÍTICO | Ausente |
| 2 | Inconsistência de `tipo` entre `fechar-mes` e `gerar-cobranca-cora` | 🔴 CRÍTICO | Bug de dados |
| 3 | Franqueado pode deletar cobranças de Taxa de Desenvolvimento | 🟠 ALTA | Falha de autorização |
| 4 | Sem cron job — fechamento 100% manual | 🟠 ALTA | Risco operacional |
| 5 | Descrição do lançamento não diz "Taxa de Desenvolvimento" | 🟡 MÉDIA | Nomenclatura |
| 6 | Paginação de 50 pode ocultar cobranças antigas | 🟡 MÉDIA | UX/UI |

**Funcionando corretamente:**
- Cálculo R$200 + R$13/estagiário ✅
- Lançamento visível no financeiro do Franqueado como conta a pagar ✅
- Franqueadora vê como "A Receber" ✅
- Bloqueio do botão antes do dia 23 ✅
- Idempotência (proteção contra fechamento duplo no mês) ✅
- Preview antes do fechamento ✅
- Geração de boleto Cora + email automático ✅
- Auto-marcação de vencidos ✅

---

## Ordem de Prioridade de Correções

1. **Bug #3** (exclusão indevida) → correção de 5 linhas, impacto imediato na segurança dos dados
2. **Bug #2** (tipo inconsistente) → correção de 1 linha em `fechar-mes`, mas requer decisão sobre dados históricos
3. **Bug #1** (regra do dia 23) → requer migração de schema + atualização dos endpoints de ativação de contrato
4. **Bug #4** (cron job) → novo arquivo, configuração Vercel
5. **Bug #5** (nomenclatura) → 1 linha de código
6. **Bug #6** (paginação) → refatoração da chamada de dados no frontend
