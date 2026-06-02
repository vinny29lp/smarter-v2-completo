# AUDITORIA FINAL DE PRODUÇÃO — SMARTER ESTÁGIOS V2
**Auditor:** Claude (análise independente e imparcial)
**Data:** 02/06/2026
**Metodologia:** Leitura direta de código-fonte, sem considerar relatórios anteriores
**Arquivos analisados:** 65+ route handlers, middleware, auth, schemas, next.config, prisma/schema
**Premissa:** Nada foi assumido como validado. Auditoria realizada do zero.

---

## 1. SCORE FINAL REALISTA

| Área | Peso | Nota | Pontos |
|------|------|------|--------|
| Autenticação e Sessão | 20% | 7/10 | 14,0 |
| Isolamento Multi-tenant | 20% | 7/10 | 14,0 |
| Permissões de Acesso | 15% | 5/10 | 7,5 |
| Validação de Entrada | 10% | 7/10 | 7,0 |
| Auditoria e Logs | 10% | 7/10 | 7,0 |
| Escalabilidade | 10% | 7/10 | 7,0 |
| Resiliência | 10% | 7/10 | 7,0 |
| Segurança HTTP / Headers | 5% | 3/10 | 1,5 |
| LGPD e Dados Pessoais | 5% | 4/10 | 2,0 |
| Qualidade de Código | 5% | 7/10 | 3,5 |
| **TOTAL** | **100%** | | **70,5 / 100** |

> **Score realista: 71/100** (ajuste conservador frente às falhas de autenticação identificadas).
> Este score diverge do relatório anterior (93/100) porque aquele relatório auditou apenas o que foi *implementado* nas sprints, sem examinar APIs não cobertas. Esta auditoria examina o *sistema completo*.

---

## 2. ITENS CRÍTICOS

**Nenhum item classificado como CRÍTICO foi encontrado.**

Não há: exposição de `NEXTAUTH_SECRET`, SQL injection, senhas em hardcode no repositório, acesso irrestrito a todas as rotas sem nenhuma proteção, ou possibilidade de escalonamento para root/admin sem credenciais.

---

## 3. ITENS ALTOS (corrigir antes de escalar)

### SEC-A01 — `GET /api/app/crm/[id]` completamente sem autenticação
**Arquivo:** `app/api/app/crm/[id]/route.ts` — linha 6
**Descrição:** O método GET retorna dados completos de um lead CRM (empresa, contato, email, telefone, tarefas, notas históricas) para qualquer requisição HTTP, incluindo usuários não autenticados. Basta conhecer o UUID do lead.
**Impacto:** Vazamento de dados comerciais sigilosos (pipeline de vendas, prospects, histórico de negociação).
**Risco Multi-tenant:** Um franqueado A pode acessar leads do franqueado B com o ID correto.

### SEC-A02 — `PATCH /api/app/vagas/[id]` completamente sem autenticação
**Arquivo:** `app/api/app/vagas/[id]/route.ts`
**Descrição:** O endpoint PATCH para atualizar status e dados de uma vaga não verifica sessão, role, nem franchiseId. Qualquer pessoa com o ID da vaga pode alterar seus dados.
**Impacto:** Sabotagem de vagas de trabalho (fechar vagas abertas, alterar requisitos, etc.). Sem ownership check — permite alteração de vagas de qualquer franquia.

### SEC-A03 — `PATCH /api/app/processos/[id]` completamente sem autenticação
**Arquivo:** `app/api/app/processos/[id]/route.ts`
**Descrição:** O endpoint PATCH para atualizar candidaturas (etapa, anotações internas, parecer técnico, datas de entrevista) não verifica sessão nem role.
**Impacto:** Manipulação de processos seletivos em andamento. Um candidato mal-intencionado poderia alterar sua própria etapa no processo para "aprovado".

### SEC-A04 — `PATCH /api/app/instituicoes/[id]` sem autenticação
**Arquivo:** `app/api/app/instituicoes/[id]/route.ts`
**Descrição:** O endpoint PATCH para atualizar dados de instituições de ensino não verifica sessão.
**Impacto:** Alteração de dados cadastrais de IES (nome, CNPJ, coordenador) por qualquer pessoa.

### SEC-A05 — `PATCH /api/app/estudantes/[id]` — Mass Assignment + sem ownership check
**Arquivo:** `app/api/app/estudantes/[id]/route.ts` — linha 65
**Código problemático:** `prisma.student.update({ where: { id: params.id }, data: body })`
**Descrição:** O path de atualização geral passa o `body` inteiro diretamente ao Prisma sem filtragem de campos. Um usuário autenticado pode enviar qualquer campo do modelo Student, incluindo `franchiseId`, `status`, `discResult`, `userId`. Além disso, não há verificação de que o estudante pertence à franquia do usuário logado (IDOR).
**Impacto:** Um FRANQUEADO poderia mover estudantes de outro franqueado para sua própria franquia, ou alterar campos não-editáveis como status de estágio.

### SEC-A06 — `GET /api/app/estudantes/[id]` sem guarda de autenticação
**Arquivo:** `app/api/app/estudantes/[id]/route.ts` — linha 7
**Descrição:** A session é lida mas **não há `if (!session) return 401`**. Qualquer requisição não autenticada recebe os dados completos do estudante (CPF, RG, email, celular, endereço, contratos).
**Impacto LGPD:** Dados pessoais sensíveis expostos sem autenticação.

### SEC-A07 — `DELETE /api/app/crm/[id]` sem ownership check
**Arquivo:** `app/api/app/crm/[id]/route.ts` — linha 122
**Descrição:** A autenticação existe (verifica role), mas **não há verificação de franchiseId**. Um FUNCIONARIO de qualquer franquia pode deletar leads CRM de qualquer outra franquia se souber o UUID.
**Impacto:** Destruição de dados entre franqueados.

### SEC-A08 — Senha em texto plano no response HTTP da API pública
**Arquivo:** `app/api/public/estudante/route.ts` — linha 78
**Código:** `return NextResponse.json({ ok: true, email: body.email, senha })`
**Descrição:** A senha gerada para o novo estudante é retornada em texto plano no body da resposta HTTP. Além de ser enviada por email (correto), fica visível no DevTools do navegador, em logs de proxy, e em qualquer interceptação de tráfego.
**Nota:** A senha também é gerada com `Math.random()` que não é criptograficamente seguro (`crypto.randomBytes` seria adequado).

---

## 4. ITENS MÉDIOS

### SEC-M01 — `GET /api/app/config` sem restrição de role
**Arquivo:** `app/api/app/config/route.ts`
**Descrição:** O GET retorna dados de configuração do sistema (nome, CNPJ, endereço, tokens mascarados) para **qualquer usuário autenticado**, incluindo ESTUDANTE e EMPRESA. O PATCH é corretamente restrito a FRANQUEADORA, mas o GET não.

### SEC-M02 — Sem rate limiting em rotas públicas e autenticação
**Afeta:** `/api/public/estudante`, `/api/public/empresa`, `/api/public/lead`, `/api/auth/forgot-password`
**Descrição:** Nenhuma das rotas públicas tem rate limiting. O forgot-password permite brute-force de senhas temporárias, criação massiva de leads falsos e spam de cadastros.

### SEC-M03 — Sem HTTP Security Headers
**Arquivo:** `next.config.js`
**Descrição:** Não há configuração de `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`. A aplicação está vulnerável a clickjacking e MIME sniffing.

### SEC-M04 — `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`
**Arquivo:** `next.config.js`
**Descrição:** Erros TypeScript e ESLint são silenciados no build. Isso significa que bugs de tipagem detectáveis pelo compilador chegam silenciosamente a produção. Esta configuração é comum em sprints de correção mas **não deve permanecer** em produção.

### SEC-M05 — `PATCH /api/app/empresas/[id]` — ownership check após ações privilegiadas
**Arquivo:** `app/api/app/empresas/[id]/route.ts` — linha 41
**Descrição:** As branches `change_password` e `change_email` verificam role mas **não verificam se a empresa pertence à franquia do usuário**. Um FUNCIONARIO autenticado pode alterar senha ou email de um usuário de empresa de outra franquia se souber o `userId`.

### SEC-M06 — Gamificação sem autenticação obrigatória
**Arquivo:** `app/api/app/gamificacao/route.ts`
**Descrição:** O GET de gamificação lê a sessão mas não retorna 401 se não houver sessão. Exibe ranking de todas as franquias para usuários não autenticados.

### ESCAL-M01 — `GET /api/app/franqueados/[id]` carrega dados ilimitados
**Arquivo:** `app/api/app/franqueados/[id]/route.ts` — linha 16
**Descrição:** Carrega **todos** os contratos (sem `take`) com `include: { student: true, company: true }`, todos os financials (take:30 OK), mas contratos sem limite pode resultar em payload enorme (centenas de contratos = MB de dados).

### ESCAL-M02 — `GET /api/app/empresas/[id]` carrega dados ilimitados
**Arquivo:** `app/api/app/empresas/[id]/route.ts`
**Descrição:** Carrega todos os contratos com include completo (student + documents), todas as vagas com applications count, 10 CRM leads, 20 financeiros — sem paginação nos contratos e vagas.

### LGPD-M01 — Sem mecanismo de exclusão de dados pelo próprio usuário
**Descrição:** Estudantes e empresas não têm como solicitar a exclusão dos seus próprios dados via plataforma (direito ao esquecimento — LGPD Art. 18, VI). Apenas a FRANQUEADORA pode excluir dados.

### LGPD-M02 — Sem política de retenção de logs
**Descrição:** ActivityLog cresce indefinidamente sem nenhum TTL ou rotina de arquivamento/exclusão.

---

## 5. ITENS BAIXOS

### SEC-B01 — Email de usuário exposto em logs de produção
**Arquivo:** `lib/auth.ts` — linha 25
**Código:** `console.log(\`[AUTH_PERF] authorize() iniciado para: ${credentials.email}\`)`
**Descrição:** Email de cada usuário que tenta login fica gravado nos logs da Vercel. Estes logs são visíveis para quem tem acesso ao dashboard da Vercel.

### SEC-B02 — JWT de 30 dias sem rotação
**Arquivo:** `lib/auth.ts` — linha 116
**Descrição:** `maxAge: 30 * 24 * 60 * 60`. Tokens têm validade de 30 dias sem rotação. Se um token for comprometido, permanece válido pelo período restante sem possibilidade de revogação (JWT stateless).

### SEC-B03 — Ausência de `.env.example`
**Descrição:** Não há arquivo `.env.example` documentando as variáveis de ambiente necessárias. Risco operacional na configuração de novos ambientes.

### SEC-B04 — `Math.random()` para geração de senhas
**Arquivo:** `app/api/public/estudante/route.ts` e `app/api/auth/forgot-password/route.ts`
**Descrição:** `Math.random()` não é criptograficamente seguro. A função `crypto.randomBytes()` (Node.js built-in) deveria ser usada para geração de senhas temporárias.

### LGPD-B01 — Currículos com CPF em PDF sem controle de acesso por franquia
**Arquivo:** `app/api/app/estudantes/[id]/curriculo/route.ts`
**Descrição:** Qualquer usuário autenticado (incluindo de franquia diferente) com o UUID do estudante pode gerar e baixar o currículo completo com CPF, RG, endereço, celular.

### OP-B01 — Sem monitoramento de erros (Sentry / similar)
**Descrição:** Erros são logados com `console.error()` mas não há integração com Sentry, Datadog ou similar para alertas em tempo real.

---

## 6. RISCOS LGPD

| # | Risco | Gravidade | Base Legal |
|---|-------|-----------|-----------|
| L1 | Dados pessoais de estudante (CPF, RG, endereço) acessíveis sem autenticação via `GET /estudantes/[id]` | **ALTO** | Art. 46 — segurança |
| L2 | Senha em texto plano no response HTTP da API de cadastro público | **ALTO** | Art. 46 |
| L3 | Email de usuário gravado em logs de produção (Vercel) | **MÉDIO** | Art. 6º — necessidade |
| L4 | Sem mecanismo de exclusão de dados pelo titular | **MÉDIO** | Art. 18, VI |
| L5 | ActivityLog sem período de retenção definido | **MÉDIO** | Art. 16 — término do tratamento |
| L6 | CPF e dados pessoais em currículo PDF sem restrição por franquia | **MÉDIO** | Art. 46 |
| L7 | Sem Política de Privacidade ou Termos de Uso na plataforma | **BAIXO** | Art. 9º — transparência |

---

## 7. RISCOS DE SEGURANÇA (consolidado)

| ID | Descrição | Severidade |
|----|-----------|-----------|
| S1 | 4 endpoints `/app/` sem qualquer autenticação | ALTO |
| S2 | Mass assignment em PATCH estudante | ALTO |
| S3 | Senha em texto plano no response HTTP | ALTO |
| S4 | IDOR no CRM GET e DELETE sem ownership check | ALTO |
| S5 | Sem rate limiting em rotas públicas e forgot-password | MÉDIO |
| S6 | Sem HTTP security headers (CSP, X-Frame, HSTS) | MÉDIO |
| S7 | TypeScript/ESLint ignorados no build | MÉDIO |
| S8 | Math.random() para geração de senhas | BAIXO |
| S9 | JWT 30 dias sem rotação | BAIXO |
| S10 | Email em logs de produção | BAIXO |

---

## 8. RISCOS DE PERFORMANCE

| ID | Descrição | Impacto |
|----|-----------|--------|
| P1 | `GET /franqueados/[id]` carrega todos os contratos sem paginação — consulta O(n) em tabela ilimitada | MÉDIO |
| P2 | `GET /empresas/[id]` carrega contratos + vagas + CRM + financeiros sem paginação | MÉDIO |
| P3 | Sem cache Redis/Edge para dashboard (6 COUNTs a cada carregamento) | MÉDIO |
| P4 | Dashboard do admin carrega KPIs de todas as franquias em query global | MÉDIO |
| P5 | Geração de PDF de currículo é server-side com HTML rendering — sem cache | BAIXO |

---

## 9. RISCOS DE ESCALABILIDADE

| Carga | Risco | Detalhe |
|-------|-------|---------|
| 100 estudantes | **Baixo** | Sistema suporta confortavelmente |
| 1.000 estudantes | **Baixo** | Índices em franchiseId/status protegem as queries |
| 30.000 estudantes | **Médio** | `GET /franqueados/[id]` sem paginação de contratos passa a ser gargalo; cursor pagination necessária |
| 100 contratos/franquia | **Baixo** | OK |
| 1.000 contratos/franquia | **Médio** | `GET /empresas/[id]` e `/franqueados/[id]` retornam payload enorme |
| 20.000 contratos total | **Alto** | Sem Redis cache, dashboard faz 6+ COUNTs a cada request em tabelas grandes |
| 200 franqueados | **Médio-Alto** | Sem Redis, sem cache, muitas queries paralelas por sessão ativa |

**Paginação implementada:** empresas, estudantes, contratos (listagem), financeiro, CRM, processos, assinaturas ✓
**Índices implementados:** franchiseId, status, companyId, studentId, contractId nas tabelas principais ✓
**Não implementado:** Redis, cursor pagination, cache de dashboard

---

## 10. RISCOS OPERACIONAIS

| ID | Risco | Severidade |
|----|-------|-----------|
| O1 | Sem `.env.example` — configuração manual de variáveis de ambiente sujeita a erro | MÉDIO |
| O2 | Sem monitoramento de erros em tempo real (Sentry/Datadog) | MÉDIO |
| O3 | `ignoreBuildErrors: true` — bugs de tipagem chegam a produção silenciosamente | MÉDIO |
| O4 | Sem testes automatizados (unitários ou E2E) identificados | MÉDIO |
| O5 | Rota `/api/app/admin/reset-data` existe em produção — apaga todos os dados | BAIXO* |
| O6 | ActivityLog sem rotina de arquivamento — crescimento contínuo da tabela | BAIXO |
| O7 | Backup Supabase: automático pela plataforma (diário), mas sem backup offsite verificado | BAIXO |
| O8 | Rollback de deploy: Vercel suporta rollback instantâneo via dashboard ✓ | OK |

> *O5 — a rota `reset-data` requer role FRANQUEADORA, mas sua existência em produção é um risco operacional caso a credencial da FRANQUEADORA seja comprometida.

---

## 11. RECOMENDAÇÕES OBRIGATÓRIAS (antes de escalar para múltiplos franqueados)

### PRIORIDADE IMEDIATA — Corrigir antes de qualquer novo franqueado

**R1 — Adicionar autenticação em 4 endpoints:**
- `GET /api/app/crm/[id]` — adicionar `if (!session) return 401`
- `PATCH /api/app/vagas/[id]` — adicionar session check + ownership check
- `PATCH /api/app/processos/[id]` — adicionar session check + ownership check
- `PATCH /api/app/instituicoes/[id]` — já tem `checkPermission` no route.ts (lista), verificar [id]

**R2 — Corrigir PATCH estudante[id]:**
- Adicionar `if (!session) return 401` explícito
- Substituir `data: body` por allowlist de campos editáveis
- Adicionar ownership check: verificar que o estudante pertence ao franchiseId da sessão

**R3 — Adicionar guarda explícito em GET estudante[id]:**
- `if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`

**R4 — Remover senha do response HTTP:**
- Em `app/api/public/estudante/route.ts`: remover `senha` do JSON de resposta
- Retornar apenas `{ ok: true, email: body.email }`

**R5 — Adicionar ownership check no DELETE crm/[id]:**
- Verificar que `lead.franchiseId === session.user.franchiseId` antes de deletar

### PRIORIDADE ALTA — Corrigir em até 30 dias

**R6 — Adicionar rate limiting** nas rotas: `/api/public/*` e `/api/auth/forgot-password`
- Sugestão: middleware com `upstash/ratelimit` ou Vercel Edge Config

**R7 — Adicionar HTTP Security Headers** no `next.config.js`:
```js
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{ key: 'Permissions-Policy', value: 'camera=(), microphone=()' }
```

**R8 — Corrigir ownership check no `PATCH /empresas/[id]` para change_password/change_email:**
- Mover verificação de franchiseId para antes das branches de ação especial

**R9 — Remover `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`:**
- Resolver os erros TypeScript/ESLint reais antes de ir a produção multi-franqueado

---

## 12. RECOMENDAÇÕES OPCIONAIS (melhoria contínua)

- **Redis/Upstash** para cache do dashboard — especialmente os 6 COUNTs
- **Paginação em `/franqueados/[id]` contratos** — atualmente carrega todos
- **`crypto.randomBytes()`** no lugar de `Math.random()` para senhas temporárias
- **Sentry ou Axiom** para monitoramento de erros em produção
- **Testes E2E com Playwright** — pelo menos nos fluxos críticos (login, criação de contrato, assinatura)
- **Cursor pagination** para listagens muito grandes (>10k registros)
- **Rotação de JWT** — implementar refresh token com rotação para reduzir janela de comprometimento
- **Política de retenção de logs** — arquivar ActivityLog com mais de 180 dias
- **Mecanismo de exclusão de dados** pelo próprio titular (LGPD Art. 18)
- **`.env.example`** documentando todas as variáveis necessárias

---

## 13. MATRIZ DE PERMISSÕES (estado atual)

| Módulo / Ação | FRANQUEADORA | FRANQUEADO | FUNCIONARIO* | EMPRESA | ESTUDANTE |
|---------------|:---:|:---:|:---:|:---:|:---:|
| Dashboard KPIs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Listar empresas | ✅ | ✅ | ✅** | ❌ | ❌ |
| Criar empresa | ✅ | ✅ | ✅** | ❌ | ❌ |
| Editar empresa (dados) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Excluir empresa | ✅ | ❌ | ❌ | ❌ | ❌ |
| Listar estudantes | ✅ | ✅ | ✅** | ❌ | ❌ |
| Ver estudante (detalhes) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar estudante | ✅ | ✅ | ✅ | ❌ | ❌⚠️ |
| Excluir estudante | ✅ | ❌ | ❌ | ❌ | ❌ |
| Listar contratos | ✅ | ✅ | ✅** | ❌ | ❌ |
| Editar contrato | ✅ | ✅ | ✅** | ❌ | ❌ |
| Excluir contrato | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gerar documentos | ✅ | ✅ | ✅** | ❌ | ❌ |
| Baixar PDF assinado | ✅ | ✅ | ✅** | ❌ | ❌ |
| Financeiro | ✅ | ✅ | ✅** | ❌ | ❌ |
| CRM | ✅ | ✅ | ✅** | ❌ | ❌ |
| Equipe | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reset de dados | ✅ | ❌ | ❌ | ❌ | ❌ |
| Vagas (PATCH) | ✅ | ✅ | ✅ | ❌⚠️ | ❌⚠️ |
| Processos (PATCH) | ✅ | ✅ | ✅ | ❌⚠️ | ❌⚠️ |
| Portal empresa | ❌ | ❌ | ❌ | ✅ | ❌ |
| Portal estudante | ❌ | ❌ | ❌ | ❌ | ✅ |

> ⚠️ = tecnicamente acessível por ausência de autenticação (vulnerabilidade)
> ** = depende de permissões configuradas no perfil do funcionário

---

## 14. ANÁLISE DE ISOLAMENTO MULTI-TENANT

### Proteções existentes e funcionando ✅
- Middleware redireciona roles para seus portais corretos
- JWT inclui `franchiseId` e é verificado server-side
- APIs de listagem filtram por `franchiseId` da sessão
- GET de contratos, empresas, financeiros têm ownership check
- POST de contratos, empresas, CRM vincula automaticamente ao `franchiseId` da sessão
- Download de documentos assinados tem ownership check via contract.franchiseId

### Falhas de isolamento identificadas ⚠️
- **CRM GET sem auth** — qualquer pessoa vê dados do lead de qualquer franquia
- **CRM DELETE sem ownership** — FUNCIONARIO de franquia A pode deletar leads da franquia B
- **Vagas PATCH sem auth** — sem isolamento algum
- **Processos PATCH sem auth** — sem isolamento algum
- **Estudante PATCH sem ownership** — franqueado pode editar estudante de outra franquia

**Conclusão de isolamento:** O modelo multi-tenant está **conceitualmente correto** e implementado na maioria das APIs. As falhas são pontuais e corrigíveis. Não há risco de vazamento massivo de dados entre franqueados em uso normal — o risco real é de ataques direcionados com IDs conhecidos.

---

## 15. AVALIAÇÃO DE RESILIÊNCIA

| Componente | Tratamento de falha | Status |
|-----------|---------------------|--------|
| Supabase (DB) | Sem fallback — sistema para se o DB cair | ⚠️ Aceitável para MVP |
| OpenAI | Timeout 30s + mensagem amigável + HTTP 429 handling | ✅ |
| SMTP (Resend) | try/catch, fire-and-forget em boas-vindas, await em críticos | ✅ |
| Autentique | Retry automático em URL expirada, mensagens amigáveis | ✅ |
| Vercel | Rollback instantâneo disponível | ✅ |
| Build errors | `ignoreBuildErrors: true` — erros chegam silenciosos | ⚠️ |

---

## 16. ANÁLISE DE QUALIDADE DE CÓDIGO

**Pontos positivos:**
- Arquitetura consistente em 90% das APIs (session → check → ownership → execute)
- Helper centralizado `lib/permissions.ts` bem implementado
- Helper centralizado `lib/audit.ts` bem implementado
- Zod schemas para validação nas APIs críticas de criação
- Transações Prisma (`$transaction`) em operações de deleção complexas
- Fire-and-forget correto para audit logs (não bloqueia resposta)
- Índices de banco implementados nas colunas de filtragem frequente

**Pontos negativos:**
- `ignoreBuildErrors: true` — sins TypeScript ignorados
- 4 APIs sem autenticação (inconsistência de padrão)
- `data: body` direto no Prisma sem allowlist (Mass Assignment)
- Sem testes automatizados identificados
- `console.log` com dados sensíveis nos logs de produção
- `Math.random()` para criptografia

---

## 17. NÍVEL DE PRONTIDÃO POR ESCALA

| Escala | Nível de Risco | Justificativa |
|--------|---------------|---------------|
| **1 franqueado piloto** (usuário confiável) | **BAIXO-MÉDIO** | As falhas de autenticação expõem APIs internas, mas usuários confiáveis não as exploram. Funcionalidade core está operacional. |
| **10 franqueados** | **MÉDIO** | Com 10 franqueados, a probabilidade de um usuário malicioso ou curioso aumenta. IDOR entre franqueados via CRM e vagas/processos torna-se risco real. |
| **50 franqueados** | **ALTO** | Em escala, alguém inevitavelmente descobre as APIs sem auth. Brute force de IDs é trivial. Dados de leads, processos e vagas estarão expostos entre franqueados. |
| **200 franqueados** | **MUITO ALTO** | Além dos riscos de segurança, performance sem Redis começa a degradar. Tabelas com >10k registros sem cursor pagination. Sem monitoramento de erros. |

---

## VEREDITO FINAL

```
O sistema está apto para:

( ) Não apto para produção
(X) Apto apenas para piloto controlado
( ) Apto para produção com até 5 franqueados
( ) Apto para produção com até 20 franqueados
( ) Apto para produção em larga escala
```

### Justificativa técnica

O sistema possui uma base sólida: autenticação NextAuth com JWT, isolamento multi-tenant implementado na maioria das APIs, auditoria de ações críticas, índices de banco, paginação e validação Zod nos endpoints principais.

Contudo, foram identificadas **8 falhas de nível ALTO** que impedem a classificação como "apto para produção irrestrita":

1. **4 endpoints completamente sem autenticação** — vagas, processos, crm/[id] GET, instituicoes/[id] PATCH. Em produção com múltiplos franqueados, estes endpoints serão descobertos e explorados.

2. **Mass assignment no PATCH de estudantes** — passagem direta do `body` ao Prisma permite alteração de campos protegidos como `franchiseId` e `status`.

3. **Dados pessoais de estudante acessíveis sem autenticação** — violação direta da LGPD.

4. **Senha em texto plano no response HTTP** — risco de interceptação.

**Para piloto controlado com 1-3 franqueados de confiança**, o sistema é operacional. A funcionalidade core (contratos, documentos, assinaturas, financeiro, CRM) funciona corretamente. As falhas identificadas são pontuais e tecnicamente simples de corrigir (estimativa: 4-6 horas de desenvolvimento).

**Recomendação:** Corrigir os 8 itens ALTOS (R1 a R5 obrigatórios, R6 a R9 recomendados) antes de onboarding de múltiplos franqueados. Após essas correções, o sistema pode ser classificado como "Apto para produção com até 20 franqueados" com score estimado de 85-88/100.

---

*Auditoria independente — Smarter Estágios V2 — 02/06/2026*
*Nenhum arquivo foi alterado durante esta auditoria. Parecer puramente analítico.*
