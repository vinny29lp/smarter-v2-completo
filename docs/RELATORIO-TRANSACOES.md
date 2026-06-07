# RELATORIO — FASE 1: TRANSACOES ATOMICAS

**Data:** 2026-06-06
**Sprint:** Estabilidade Final

---

## Resumo

Duas rotas críticas foram corrigidas para garantir atomicidade nas operações de banco de dados.

---

## 1. `app/api/app/contratos/[id]/documentos/[docId]/autentique/route.ts` — Handler GET

### Problema Identificado

No bloco `if (status.allSigned && document.status !== "ASSINADO")`, múltiplas operações Prisma eram executadas de forma independente:

1. `prisma.contract.update` (status → ATIVO ou INATIVO)
2. `prisma.student.update` (status → EM_ESTAGIO ou DISPONIVEL)
3. `prisma.financial.findFirst` + `prisma.financial.create` (taxa admin)
4. `prisma.financial.updateMany` (cancelar cobranças na rescisão)
5. `prisma.internshipDocument.update` (status → ASSINADO, atualiza signers/signedUrl)

**Risco:** Falha em qualquer operação intermediária deixava o banco em estado inconsistente. Por exemplo: contrato marcado ATIVO mas documento permanecia como ENVIADO_ASSINATURA, ou estudante atualizado mas taxa admin não criada.

### Solução Aplicada

Todas as operações do bloco `allSigned` envolvidas em `prisma.$transaction(async (tx) => { ... })`.

- `tx.contract.update` — ativar/inativar contrato
- `tx.student.update` — atualizar status do estudante
- `tx.financial.findFirst` + `tx.financial.create` — lançar taxa de administração
- `tx.financial.updateMany` — cancelar cobranças na rescisão (dia ≤ 10)
- `tx.internshipDocument.update` — **incluído dentro da transaction** (updateData final)

O caminho não-allSigned (apenas atualização de signers/signedUrl) continua fora da transaction pois é operação única sem risco de inconsistência.

### Resultado

```
ANTES: 5 operações independentes — risco de estado parcial
DEPOIS: 1 transaction atômica — tudo ou nada
```

---

## 2. `app/api/app/estudantes/importar/route.ts` — Handler POST

### Problema Identificado

No loop `for (const row of estudantes)`, para cada estudante eram feitos dois creates independentes:

```typescript
const user = await prisma.user.create({ ... }); // passo 1
await prisma.student.create({ userId: user.id, ... }); // passo 2
```

**Risco:** Se `prisma.student.create` falhasse após `prisma.user.create` ter sucesso, ficaria um registro `User` órfão no banco (sem Student associado), causando:
- Login impossível para o usuário (role ESTUDANTE sem perfil)
- Dados sujos na tabela `users`
- Duplicidade na próxima tentativa de importação (email já existe)

### Solução Aplicada

Substituídos os dois creates por `prisma.$transaction(async (tx) => { ... })` interativa (necessária pois `student.create` depende do `user.id` gerado):

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  await tx.student.create({ userId: user.id, ... });
});
```

O `catch` externo do loop captura falhas da transaction e registra no `resultado.erros`, mantendo o comportamento de importação parcial (continua processando os demais estudantes).

### Resultado

```
ANTES: user criado + student falha → usuário órfão no banco
DEPOIS: transaction atômica — ou ambos criados, ou nenhum
```

---

## Impacto

| Arquivo | Handlers | Tipo de Transaction | Status |
|---------|----------|---------------------|--------|
| autentique/route.ts | GET | Interactive ($transaction async) | APLICADO |
| importar/route.ts | POST | Interactive ($transaction async) | APLICADO |

---

## Observações

- A transaction do autentique usa `{ timeout: 30000 }` implícito do Prisma (padrão 5s). Para operações com múltiplos updates, pode ser necessário aumentar: `prisma.$transaction(async (tx) => {...}, { timeout: 15000 })` se houver timeouts em produção.
- A transaction de importação está dentro de um `try/catch` no loop, garantindo que a falha de um estudante não interrompe a importação dos demais.
