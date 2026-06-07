# RELATÓRIO — Ajuste 3: Busca inteligente no formulário de contrato

**Data:** 2026-06-07  
**Status:** ✅ Implementado

---

## Problema original

O formulário de criação de contrato (`NovoContratoPage` + `ContratoForm`) carregava **toda a base** de estudantes, empresas e instituições antes de renderizar a página:

```ts
// ANTES — carregava tudo no servidor
const [students, companies, institutions] = await Promise.all([
  getStudents(),                              // todos os estudantes
  getCompanies(fid),                          // todas as empresas da franquia
  prisma.institution.findMany({ orderBy: { name: "asc" } }),  // todas as instituições
]);
```

Com grande volume de dados isso travava o carregamento da página e sobrecarregava o banco.

---

## Solução implementada

### 3 novas rotas de busca com filtro case-insensitive e limite de 10 resultados

**1. `GET /api/app/estudantes/buscar?q=texto`**  
Arquivo: `app/api/app/estudantes/buscar/route.ts`
- Busca por: `name`, `cpf`, `email`
- Respeita `franchiseId` do usuário (FRANQUEADORA vê todos)
- Retorna: `{ estudantes: [{ id, name, cpf, email, curso }] }`

**2. `GET /api/app/empresas/buscar?q=texto`**  
Arquivo: `app/api/app/empresas/buscar/route.ts`
- Busca por: `name` (nome fantasia), `razaoSocial`, `cnpj`
- Respeita `franchiseId` do usuário
- Retorna: `{ empresas: [{ id, name, razaoSocial, cnpj, cidade, uf, setor }] }`

**3. `GET /api/app/instituicoes/buscar?q=texto`**  
Arquivo: `app/api/app/instituicoes/buscar/route.ts`
- Busca por: `name`, `cnpj`
- Sem filtro de franquia (instituições são compartilhadas)
- Retorna: `{ instituicoes: [{ id, name, cnpj, cidade, uf }] }`

Cada rota usa `contains` com `mode: "insensitive"` e `take: 10`. Busca só é disparada com mínimo de 2 caracteres.

---

### Componente `Autocomplete` — `components/forms/ContratoForm.tsx`

Substituiu os 3 `<select>` do Passo 1 do formulário. Características:
- **Debounce de 300ms** — só busca após parar de digitar
- **Mínimo 2 caracteres** para disparar a busca
- **Dropdown** com até 10 resultados, fechado ao clicar fora
- **Botão ×** para limpar a seleção
- **Estado interno** separado: `query` (texto exibido) vs ID guardado no `form.studentId/companyId/institutionId`
- Seleção persiste corretamente ao navegar entre etapas do formulário

---

### `NovoContratoPage` simplificado — `app/dashboard/contratos/novo/page.tsx`

```ts
// ANTES — carregava toda a base
import { getStudents } from "@/lib/actions/students";
import { getCompanies } from "@/lib/actions/companies";
const [students, companies, institutions] = await Promise.all([...]);
<ContratoForm ... students={students} companies={companies} institutions={institutions} />

// DEPOIS — sem carregamento prévio
<ContratoForm franchiseId={fid || ""} />
```

A interface de props do `ContratoForm` foi simplificada de `{ franchiseId, students, companies, institutions }` para `{ franchiseId }`.

---

## Arquivos alterados

| Arquivo | Tipo de alteração |
|---|---|
| `app/api/app/estudantes/buscar/route.ts` | **Criado** |
| `app/api/app/empresas/buscar/route.ts` | **Criado** |
| `app/api/app/instituicoes/buscar/route.ts` | **Criado** |
| `components/forms/ContratoForm.tsx` | **Reescrito** (selects → autocomplete) |
| `app/dashboard/contratos/novo/page.tsx` | **Simplificado** (removido preload) |

---

## Sem alteração de banco

Nenhuma migração necessária. As novas rotas apenas lêem dados existentes.

---

## Riscos residuais

- Nenhum impacto nos contratos existentes
- Lógica de criação de contrato (`createContract`) permanece idêntica — só mudou como o usuário seleciona estudante/empresa/instituição
- O formulário pode ser futuramente melhorado com cache local (SWR/React Query) para evitar buscas repetidas ao digitar o mesmo texto
