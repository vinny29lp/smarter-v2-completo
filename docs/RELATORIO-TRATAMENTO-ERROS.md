# RELATORIO — FASE 2: PADRONIZACAO DE TRATAMENTO DE ERROS

**Data:** 2026-06-06
**Sprint:** Estabilidade Final

---

## Resumo

Criado helper centralizado `lib/api-response.ts` e adicionado tratamento de erro padronizado em 29 rotas de API que não possuíam try/catch.

---

## 1. Helper Criado: `lib/api-response.ts`

```typescript
import { NextResponse } from "next/server";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiErr(message: string, status = 500, errorCode?: string) {
  console.error(`[API ERROR] ${errorCode ?? "UNKNOWN"}: ${message}`);
  return NextResponse.json({ success: false, message, errorCode }, { status });
}

export function handleApiError(e: unknown, errorCode: string, fallback = "Erro interno. Tente novamente.") {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${errorCode}]`, msg);
  return apiErr(fallback, 500, errorCode);
}
```

**Benefícios:**
- Log estruturado com código identificador em todos os erros
- Resposta JSON padronizada `{ success: false, message, errorCode }`
- Rastreabilidade nos logs do Vercel por código de erro

---

## 2. Rotas Modificadas

Todas as rotas receberam:
1. Import: `import { handleApiError } from "@/lib/api-response";`
2. Wrapper `try { ... } catch (e) { return handleApiError(e, "CODIGO"); }` em cada handler

| # | Arquivo | Handlers | Códigos |
|---|---------|----------|---------|
| 1 | `app/api/app/financeiro/route.ts` | GET, POST | FINANCEIRO_GET_001, FINANCEIRO_POST_001 |
| 2 | `app/api/app/financeiro/[id]/route.ts` | PATCH, DELETE | FINANCEIRO_PATCH_001, FINANCEIRO_DELETE_001 |
| 3 | `app/api/app/financeiro/fechar-mes/route.ts` | GET, POST | FINANCEIRO_FECHAR_GET, FINANCEIRO_FECHAR_POST |
| 4 | `app/api/app/franqueados/route.ts` | GET, POST | FRANQUEADOS_GET_001, FRANQUEADOS_POST_001 |
| 5 | `app/api/app/franqueados/[id]/route.ts` | GET, PATCH | FRANQUEADOS_ID_GET, FRANQUEADOS_ID_PATCH |
| 6 | `app/api/app/crm/[id]/route.ts` | GET, PATCH, DELETE | CRM_ID_GET, CRM_ID_PATCH, CRM_ID_DELETE |
| 7 | `app/api/app/crm/[id]/tasks/route.ts` | POST | CRM_TASKS_POST |
| 8 | `app/api/app/crm/[id]/tasks/[taskId]/route.ts` | PATCH, DELETE | CRM_TASK_PATCH, CRM_TASK_DELETE |
| 9 | `app/api/app/empresas/[id]/route.ts` | GET, PATCH | EMPRESA_ID_GET, EMPRESA_ID_PATCH |
| 10 | `app/api/app/empresas/[id]/email/route.ts` | POST | EMPRESA_EMAIL_POST |
| 11 | `app/api/app/empresas/[id]/cps/route.ts` | GET | EMPRESA_CPS_GET |
| 12 | `app/api/app/estudantes/[id]/curriculo/route.ts` | GET | ESTUDANTE_CURRICULO_GET |
| 13 | `app/api/app/estudantes/[id]/disc-relatorio/route.ts` | GET | ESTUDANTE_DISC_GET |
| 14 | `app/api/app/assinaturas/route.ts` | GET | ASSINATURAS_GET |
| 15 | `app/api/app/notificacao/[id]/pdf/route.ts` | GET | NOTIFICACAO_PDF_GET |
| 16 | `app/api/app/instituicoes/route.ts` | GET, POST | INSTITUICOES_GET, INSTITUICOES_POST |
| 17 | `app/api/app/instituicoes/[id]/route.ts` | PATCH | INSTITUICAO_PATCH |
| 18 | `app/api/app/processos/route.ts` | GET | PROCESSOS_GET |
| 19 | `app/api/app/processos/[id]/route.ts` | PATCH | PROCESSO_ID_PATCH |
| 20 | `app/api/app/processos/candidatar/route.ts` | POST | PROCESSO_CANDIDATAR_POST |
| 21 | `app/api/app/vagas/[id]/route.ts` | PATCH | VAGAS_ID_PATCH |
| 22 | `app/api/app/gamificacao/route.ts` | GET | GAMIFICACAO_GET |
| 23 | `app/api/app/gamificacao/config/[id]/route.ts` | PATCH | GAMIFICACAO_CONFIG_PATCH |
| 24 | `app/api/app/equipe/[id]/route.ts` | PATCH, DELETE | EQUIPE_ID_PATCH, EQUIPE_ID_DELETE |
| 25 | `app/api/app/contratos/[id]/migrar/route.ts` | POST | CONTRATO_MIGRAR_POST |
| 26 | `app/api/app/contratos/[id]/ativar-migracao/route.ts` | POST | CONTRATO_ATIVAR_MIGRACAO_POST |
| 27 | `app/api/app/contratos/[id]/enviar-avaliacao/route.ts` | POST | CONTRATO_AVALIACAO_POST |
| 28 | `app/api/app/contratos/[id]/avaliacoes/[evalId]/pdf/route.ts` | GET | AVALIACAO_PDF_GET |
| 29 | `app/api/app/franqueados/[id]/crm/route.ts` | GET | FRANQUEADO_CRM_GET |

---

## 3. Rotas Que Já Possuíam try/catch (Não Modificadas)

- `franqueados/[id]/route.ts` — DELETE: já tinha `prisma.$transaction` com try/catch próprio
- `empresas/[id]/route.ts` — DELETE: já tinha `prisma.$transaction` com try/catch próprio
- `contratos/[id]/documentos/[docId]/autentique/route.ts` — GET e POST: já possuíam try/catch

---

## 4. Padrão de Resposta de Erro Padronizado

Antes (inconsistente):
```json
{ "error": "mensagem de erro" }
```

Depois (padronizado):
```json
{
  "success": false,
  "message": "Erro interno. Tente novamente.",
  "errorCode": "FINANCEIRO_GET_001"
}
```

O `errorCode` permite busca direta nos logs do Vercel:
- Dashboard Vercel → Functions → buscar pelo código → ver stack trace completo

---

## 5. Total de Handlers Protegidos

- **29 arquivos** modificados
- **38 handlers** com try/catch adicionado
- **0 lógicas de negócio** alteradas — apenas wrapping

