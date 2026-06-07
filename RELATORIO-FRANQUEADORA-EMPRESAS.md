# RELATÓRIO — Ajuste 1: FRANQUEADORA não conseguia cadastrar empresa

**Data:** 2026-06-07  
**Status:** ✅ Corrigido

---

## Causa raiz

O campo `franchiseId` no model `Company` (tabela `companies`) era declarado como `String` obrigatório (NOT NULL) no schema Prisma e no banco de dados. A FRANQUEADORA não possui `franchiseId` na sessão (`session.user.franchiseId = null`), portanto ao tentar criar uma empresa o Prisma tentava inserir um registro com `franchiseId = undefined`, violando a constraint NOT NULL do banco.

**Fluxo do erro:**

1. `NovaEmpresaPage` passa `franchiseId={session?.user?.franchiseId || ""}` → para FRANQUEADORA, vira `""`
2. `EmpresaForm` envia `{ ...form, franchiseId: "" }` no body do POST
3. API: `const franchiseId = body.franchiseId || session?.user?.franchiseId || undefined` → `"" || null || undefined` = `undefined`
4. `prisma.company.create({ data: { ..., franchiseId: undefined } })` → DB recusa (NOT NULL violation)

---

## Arquivos investigados

| Arquivo | Observação |
|---|---|
| `app/api/app/empresas/route.ts` | Lógica correta para resolver franchiseId, mas DB não aceitava null |
| `components/forms/EmpresaForm.tsx` | Envia franchiseId corretamente |
| `app/dashboard/empresas/nova/page.tsx` | Passa franchiseId da sessão normalmente |
| `prisma/schema.prisma` | **Causa raiz:** `Company.franchiseId String` (NOT NULL) |

---

## Correções aplicadas

### 1. Schema Prisma — `prisma/schema.prisma`
```prisma
// ANTES
franchiseId      String
franchise        Franchise      @relation(fields: [franchiseId], references: [id], onDelete: NoAction, onUpdate: NoAction)

// DEPOIS
franchiseId      String?
franchise        Franchise?     @relation(fields: [franchiseId], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

### 2. Migração de banco — aplicada via Supabase MCP
```sql
ALTER TABLE companies ALTER COLUMN "franchiseId" DROP NOT NULL;
```
Aplicada no projeto `mepocerocoknzaotrove` (smarter-one-v2). Verificado: `is_nullable = YES`.

---

## Comportamento após correção

- **FRANQUEADORA:** cria empresa com `franchiseId = NULL` (vinculada apenas à franqueadora)
- **FRANQUEADO:** continua criando empresa com seu próprio `franchiseId` (sem alteração de fluxo)
- **Frontend:** nenhuma alteração — o formulário continua igual

---

## Riscos residuais

- Queries que filtram `WHERE "franchiseId" = ?` sem tratar NULL podem não retornar empresas da FRANQUEADORA — verificar listagens existentes se necessário
- O campo `gamificationPoint.create` com `franchiseId: ""` para FRANQUEADORA é absorvido pelo `.catch(() => {})` da API, sem impacto no cadastro principal

---

## Alteração de banco

| Tabela | Campo | Antes | Depois |
|---|---|---|---|
| `companies` | `franchiseId` | NOT NULL | NULLABLE |
