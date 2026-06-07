# RELATÓRIO — Ajuste 2: FRANQUEADORA não conseguia criar leads no CRM

**Data:** 2026-06-07  
**Status:** ✅ Corrigido

---

## Causa raiz (3 problemas encadeados)

### Problema 1 — Schema Prisma: `CrmLead.franchiseId` NOT NULL
O campo `franchiseId` no model `CrmLead` era `String` obrigatório. FRANQUEADORA sem franchiseId não conseguia criar registro no banco.

### Problema 2 — API POST: check explícito que retornava 400
```ts
// ANTES — barrava FRANQUEADORA explicitamente
const franchiseIdParaLead = session.user.franchiseId;
if (!franchiseIdParaLead) {
  return NextResponse.json(
    { error: "Usuário sem franquia vinculada. Configure a franquia do usuário administrador no painel." },
    { status: 400 }
  );
}
```

### Problema 3 — API GET: filtro com `franchiseId: ""` para FRANQUEADORA
```ts
// ANTES — FRANQUEADORA recebia lista vazia
const franchiseFilter = { franchiseId: session.user.franchiseId ?? "" };
// Para FRANQUEADORA: { franchiseId: "" } → nenhum lead encontrado
```

---

## Arquivos investigados

| Arquivo | Observação |
|---|---|
| `app/api/app/crm/route.ts` | **Causa raiz:** check explícito no POST + filtro errado no GET |
| `prisma/schema.prisma` | **Causa raiz:** `CrmLead.franchiseId String` (NOT NULL) |

---

## Correções aplicadas

### 1. Schema Prisma — `prisma/schema.prisma`
```prisma
// ANTES
franchiseId     String
franchise       Franchise @relation(fields: [franchiseId], references: [id], onDelete: NoAction, onUpdate: NoAction)

// DEPOIS
franchiseId     String?
franchise       Franchise? @relation(fields: [franchiseId], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

### 2. Migração de banco — aplicada via Supabase MCP
```sql
ALTER TABLE crm_leads ALTER COLUMN "franchiseId" DROP NOT NULL;
```
Aplicada no projeto `mepocerocoknzaotrove` (smarter-one-v2). Verificado: `is_nullable = YES`.

### 3. API CRM GET — `app/api/app/crm/route.ts`
```ts
// ANTES
const franchiseFilter = { franchiseId: session.user.franchiseId ?? "" };

// DEPOIS
const role = session.user.role;
const franchiseFilter =
  role === "FRANQUEADORA"
    ? { franchiseId: null }          // FRANQUEADORA vê seus leads (franchiseId IS NULL)
    : { franchiseId: session.user.franchiseId ?? "" };  // FRANQUEADO vê os seus
```

### 4. API CRM POST — `app/api/app/crm/route.ts`
```ts
// ANTES — barrava FRANQUEADORA
const franchiseIdParaLead = session.user.franchiseId;
if (!franchiseIdParaLead) {
  return NextResponse.json({ error: "Usuário sem franquia..." }, { status: 400 });
}

// DEPOIS — permite FRANQUEADORA com franchiseId null
const role = session.user.role;
const franchiseIdParaLead =
  role === "FRANQUEADORA" ? null : (session.user.franchiseId ?? null);
```

---

## Regra de negócio respeitada

- Leads criados pela FRANQUEADORA têm `franchiseId = NULL` — pertencem **somente à FRANQUEADORA**
- Leads da FRANQUEADORA **não aparecem** para nenhuma franquia (filtro `franchiseId = null` é exclusivo)
- FRANQUEADO continua vendo apenas seus leads (`franchiseId = seu ID`)
- Os fluxos de FRANQUEADO **não foram alterados**

---

## Riscos residuais

- Leads existentes criados por FRANQUEADORA (se houver) com `franchiseId = ""` (string vazia) não serão retornados pelo novo filtro `franchiseId = null`. São raros, pois a tela bloqueava o cadastro antes desta correção.

---

## Alteração de banco

| Tabela | Campo | Antes | Depois |
|---|---|---|---|
| `crm_leads` | `franchiseId` | NOT NULL | NULLABLE |
