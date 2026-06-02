# TESTES DE SEGURANÇA FINAL — Smarter Estágios V2
**Versão:** 1.0 | **Data:** 02/06/2026
**Metodologia:** Testes manuais documentados — executar após cada deploy em produção.
**Base URL:** Substituir `[BASE]` por `https://sistema.smarterestagios.com.br` (ou ambiente de teste).

---

## RESULTADO ESPERADO POR CATEGORIA

| Status | Significado |
|--------|------------|
| ✅ PASS | Resposta correta de segurança |
| ❌ FAIL | Falha de segurança — corrigir imediatamente |
| ⚠️ WARN | Comportamento inesperado — investigar |

---

## BLOCO 1 — Usuário não autenticado tenta acessar APIs privadas

**Objetivo:** Confirmar que todas as APIs `/api/app/*` retornam 401 sem sessão.

### Teste 1.1 — GET de estudante sem sessão
```bash
curl -X GET "[BASE]/api/app/estudantes/qualquer-uuid" -H "Accept: application/json"
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.2 — GET de lead CRM sem sessão
```bash
curl -X GET "[BASE]/api/app/crm/qualquer-uuid" -H "Accept: application/json"
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.3 — PATCH de vaga sem sessão
```bash
curl -X PATCH "[BASE]/api/app/vagas/qualquer-uuid" \
  -H "Content-Type: application/json" \
  -d '{"status":"INATIVA"}'
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.4 — PATCH de processo seletivo sem sessão
```bash
curl -X PATCH "[BASE]/api/app/processos/qualquer-uuid" \
  -H "Content-Type: application/json" \
  -d '{"etapa":"aprovado"}'
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.5 — PATCH de instituição sem sessão
```bash
curl -X PATCH "[BASE]/api/app/instituicoes/qualquer-uuid" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacked University"}'
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.6 — GET de configuração sem sessão
```bash
curl -X GET "[BASE]/api/app/config" -H "Accept: application/json"
```
**Resultado esperado:** `{"error":"Unauthorized"}` com HTTP 401
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 1.7 — Dashboard sem sessão
Abrir no navegador: `[BASE]/dashboard`
**Resultado esperado:** Redirecionamento para `/login`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 2 — Isolamento Multi-Tenant (Franqueado A não acessa dados do B)

**Pré-requisito:** Ter dois franqueados cadastrados (A e B) com dados distintos.
Fazer login como Franqueado A antes de cada teste deste bloco.

### Teste 2.1 — Franqueado A tenta acessar empresa do Franqueado B via URL
```
GET [BASE]/api/app/empresas/[ID_EMPRESA_DO_B]
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.2 — Franqueado A tenta acessar estudante do Franqueado B
```
GET [BASE]/api/app/estudantes/[ID_ESTUDANTE_DO_B]
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.3 — Franqueado A tenta editar contrato do Franqueado B
```bash
curl -X PATCH "[BASE]/api/app/contratos/[ID_CONTRATO_DO_B]" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_franqueado_A]" \
  -d '{"status":"CANCELADO"}'
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.4 — Franqueado A tenta acessar lead CRM do Franqueado B
```
GET [BASE]/api/app/crm/[ID_LEAD_DO_B]
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.5 — Franqueado A tenta excluir lead do Franqueado B
```bash
curl -X DELETE "[BASE]/api/app/crm/[ID_LEAD_DO_B]" \
  -H "Cookie: [cookie_sessao_franqueado_A]"
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.6 — Franqueado A tenta alterar vaga do Franqueado B
```bash
curl -X PATCH "[BASE]/api/app/vagas/[ID_VAGA_DO_B]" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_franqueado_A]" \
  -d '{"status":"INATIVA"}'
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 2.7 — Franqueado A tenta editar estudante do B com mass assignment
```bash
curl -X PATCH "[BASE]/api/app/estudantes/[ID_ESTUDANTE_DO_B]" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_franqueado_A]" \
  -d '{"franchiseId":"[FRANCHISE_ID_DO_A]","name":"Hackeado"}'
```
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 3 — Permissões de Funcionário

**Pré-requisito:** Ter um FUNCIONARIO cadastrado SEM permissão de financeiro.

### Teste 3.1 — Funcionário sem permissão tenta acessar financeiro via API
```
GET [BASE]/api/app/financeiro
```
(com sessão do FUNCIONARIO sem permissão financeiro)
**Resultado esperado:** HTTP 403 `{"error":"Acesso negado. Sem permissão para este módulo."}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 3.2 — Funcionário sem permissão tenta criar lançamento financeiro
```bash
curl -X POST "[BASE]/api/app/financeiro" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_funcionario_sem_financeiro]" \
  -d '{"descricao":"Teste","tipo":"entrada","valor":100,"categoria":"Teste"}'
```
**Resultado esperado:** HTTP 403
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 3.3 — Funcionário sem permissão de CRM tenta criar lead
```bash
curl -X POST "[BASE]/api/app/crm" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_funcionario_sem_crm]" \
  -d '{"empresa":"Teste Ltda"}'
```
**Resultado esperado:** HTTP 403
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 4 — Isolamento por Role (Empresa e Estudante)

### Teste 4.1 — Empresa tenta acessar dashboard admin
Fazer login como EMPRESA e tentar acessar: `[BASE]/dashboard`
**Resultado esperado:** Redirecionamento para `/portal-empresa`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 4.2 — Empresa tenta acessar API de contratos
```
GET [BASE]/api/app/contratos
```
(com sessão de EMPRESA)
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 4.3 — Estudante tenta acessar dados de outro estudante
```
GET [BASE]/api/app/estudantes/[ID_DE_OUTRO_ESTUDANTE]
```
(com sessão de ESTUDANTE — middleware bloqueia acesso ao `/dashboard`, mas testar API diretamente)
**Resultado esperado:** HTTP 403 (estudante não pertence à franquia do viewer)
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 4.4 — Estudante tenta acessar portal-empresa
Fazer login como ESTUDANTE e tentar: `[BASE]/portal-empresa`
**Resultado esperado:** Redirecionamento para `/portal-estudante`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 5 — Documentos e Avaliações

### Teste 5.1 — Download de documento assinado sem autenticação
```bash
curl -X GET "[BASE]/api/app/contratos/[ID]/documentos/[DOC_ID]/download-assinado"
```
**Resultado esperado:** HTTP 401 `{"error":"Unauthorized"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 5.2 — Empresa tenta avaliar contrato de outra empresa
```bash
curl -X POST "[BASE]/api/portal/empresa/avaliacoes" \
  -H "Content-Type: application/json" \
  -H "Cookie: [cookie_sessao_empresa_A]" \
  -d '{"contratoId":"[CONTRATO_DA_EMPRESA_B]","respostas":{}}'
```
**Resultado esperado:** HTTP 404 `{"error":"Contrato não encontrado"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 5.3 — Currículo de estudante não acessível por franqueado de outra rede
```
GET [BASE]/api/app/estudantes/[ID_ESTUDANTE_DO_B]/curriculo
```
(com sessão do Franqueado A)
**Resultado esperado:** HTTP 403 `{"error":"Forbidden"}`
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 6 — API Pública (cadastro de estudante/empresa)

### Teste 6.1 — Cadastro público de estudante não retorna senha no response
```bash
curl -X POST "[BASE]/api/public/estudante" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste Segurança","email":"teste.seg.9999@example.com","curso":"Teste"}'
```
**Resultado esperado:** `{"ok":true,"email":"teste.seg.9999@example.com"}` — **SEM campo `senha`**
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

### Teste 6.2 — Forgot password não confirma existência de email
```bash
curl -X POST "[BASE]/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"email-que-nao-existe@example.com"}'
```
**Resultado esperado:** `{"ok":true}` (mesmo email inexistente — não revela informação)
**Resultado obtido:** _______
**Status:** ☐ PASS ☐ FAIL

---

## BLOCO 7 — Security Headers HTTP

### Teste 7.1 — Verificar headers de segurança
```bash
curl -I "[BASE]/login"
```
Verificar presença de:
- [ ] `x-frame-options: DENY`
- [ ] `x-content-type-options: nosniff`
- [ ] `strict-transport-security: max-age=31536000; includeSubDomains; preload`
- [ ] `referrer-policy: strict-origin-when-cross-origin`
- [ ] `permissions-policy: camera=(), microphone=(), geolocation=()`

**Status:** ☐ PASS ☐ FAIL

---

## RESUMO DE EXECUÇÃO

| Bloco | Total Testes | PASS | FAIL | Data Execução | Executor |
|-------|-------------|------|------|---------------|---------|
| 1 — Unauthenticated | 7 | | | | |
| 2 — Multi-tenant | 7 | | | | |
| 3 — Permissões Func | 3 | | | | |
| 4 — Role isolation | 4 | | | | |
| 5 — Documentos | 3 | | | | |
| 6 — API Pública | 2 | | | | |
| 7 — HTTP Headers | 1 | | | | |
| **TOTAL** | **27** | | | | |

**Critério de aprovação:** 0 FAILs no Bloco 1 e 2. Máximo 1 FAIL nos demais blocos.

---

*Documento gerado — Sprint Final de Blindagem — Smarter Estágios V2 — 02/06/2026*
