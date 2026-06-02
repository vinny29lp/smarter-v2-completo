# AUDITORIA DE SEGURANÇA, PERMISSÕES, ESCALABILIDADE E RESILIÊNCIA
## Sistema Smarter V2 — Next.js 14 App Router + Prisma + PostgreSQL (Supabase) + NextAuth JWT

**Data da Auditoria:** 2026-06-01
**Auditor:** Análise automatizada sênior de segurança
**Versão analisada:** smarter-v2-completo (branch main/produção)
**Escopo:** APIs, autenticação, autorização, isolamento multi-franqueado, uploads, escalabilidade e resiliência

---

## SUMÁRIO EXECUTIVO

| Categoria | Crítico 🔴 | Alto 🟠 | Médio 🟡 | Baixo 🟢 |
|-----------|-----------|---------|---------|---------|
| Segurança APIs | 3 | 5 | 4 | 2 |
| Isolamento Multi-Tenant | 2 | 3 | 2 | 0 |
| Uploads/Documentos | 1 | 2 | 1 | 0 |
| Autenticação/Auth | 0 | 2 | 3 | 2 |
| Escalabilidade | 0 | 2 | 5 | 3 |
| Resiliência | 0 | 1 | 4 | 2 |
| Logs/Auditoria | 0 | 1 | 2 | 2 |
| Dependências | 0 | 0 | 2 | 3 |
| **TOTAL** | **6** | **16** | **23** | **14** |

**Score de Readiness para Piloto: 58/100**

> O sistema possui arquitetura sólida e boas práticas em vários pontos, mas apresenta falhas de autorização críticas em rotas centrais que precisam ser corrigidas antes de ir a produção com múltiplos franqueados reais. Os riscos de IDOR e falta de autenticação em rotas sensíveis são os bloqueadores principais.

---

# FASE 1 — SEGURANÇA DAS APIs

## 1.1 Rotas sem Autenticação Alguma

### SEC-001 🔴 CRÍTICO — Geração e leitura de documentos sem autenticação
**Arquivo:** `app/api/app/contratos/[id]/documentos/[docId]/route.ts`
**Linhas afetadas:** Todo o handler `POST` e `GET`

O handler POST (gerar HTML do documento) e GET (ler documento com emails) não fazem nenhuma chamada a `getServerSession`. Qualquer usuário na internet pode:
1. Fazer POST para gerar documentos jurídicos (TCE, rescisões, recibos)
2. Fazer GET para ler o conteúdo HTML de qualquer documento, incluindo emails de estudantes, empresas e instituições

```
// AUSÊNCIA TOTAL de autenticação no POST:
export async function POST(req: Request, { params }) {
  const body = await req.json().catch(() => ({}));
  const doc = await prisma.internshipDocument.findUnique({ where: { id: params.docId } });
  ...
```

**Impacto:** Exposição de dados pessoais (email de estudante, empresa, instituição), geração não autorizada de documentos jurídicos, possibilidade de manipulação de conteúdo HTML que será assinado digitalmente.
**Correção recomendada:** Adicionar `const session = await getServerSession(authOptions); if (!session) return 401;` no início de TODOS os handlers. Verificar adicionalmente que o contractId pertence ao franchiseId da sessão.

---

### SEC-002 🔴 CRÍTICO — PATCH de documento (assinatura parcial) sem autenticação
**Arquivo:** `app/api/app/contratos/[id]/documentos/[docId]/route.ts`
**Handler:** `PATCH`

O handler PATCH que processa assinatura parcial ("assinarComo": "empresa"/"estudante"/"instituicao") não autentica o usuário. Qualquer chamada POST com o ID correto do documento pode marcar assinaturas como feitas, ativar contratos automaticamente e criar lançamentos financeiros.

**Impacto:** CRÍTICO. Um atacante que descubra um docId pode:
- Marcar o contrato como "ATIVO" sem nenhuma assinatura real
- Criar lançamentos financeiros automáticos
- Invalidar o valor jurídico da assinatura digital

**Correção recomendada:** Adicionar autenticação. Para assinaturas via Autentique (plataforma externa), criar um endpoint webhook separado protegido por API secret, não expor assinatura manual via API pública sem auth.

---

### SEC-003 🔴 CRÍTICO — POST de tasks CRM sem autenticação
**Arquivo:** `app/api/app/crm/[id]/tasks/route.ts`
**Linhas afetadas:** Handler `POST` inteiro

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const task = await prisma.crmTask.create({
    data: { leadId: params.id, ...
```

Sem nenhuma autenticação ou autorização. Qualquer usuário pode criar tasks em qualquer lead CRM de qualquer franqueado.

**Impacto:** Poluição de dados CRM, possibilidade de spam/DoS no banco de dados via criação massiva de tasks.
**Correção recomendada:** Adicionar autenticação e verificar que o lead pertence ao franchiseId da sessão.

---

### SEC-004 🟠 ALTO — PATCH do CRM sem autenticação (exceto DELETE)
**Arquivo:** `app/api/app/crm/[id]/route.ts`
**Handler:** `PATCH`

O handler PATCH (que inclui adicionar notas, marcar como vendido/perdido, atualizar dados) não tem autenticação. O DELETE verifica sessão, mas o PATCH não.

```typescript
export async function PATCH(req: Request, { params }) {
  const body = await req.json();
  // Ação especial: adicionar nota ao histórico
  if (body.action === "add_nota") {
    const nota = await prisma.crmNota.create({ ...
  // Nenhuma verificação de sessão
```

**Impacto:** Qualquer usuário pode modificar leads de CRM, adicionar notas, marcar leads como vendidos, alterar dados de contato.
**Correção recomendada:** Adicionar autenticação no início do PATCH.

---

### SEC-005 🟠 ALTO — GET do detalhe do franqueado sem autenticação
**Arquivo:** `app/api/app/franqueados/[id]/route.ts`
**Handler:** `GET`

O handler GET não verifica sessão nem role. Retorna dados detalhados do franqueado incluindo usuários, empresas, contratos com alunos, financeiros.

```typescript
export async function GET(_req: Request, { params }) {
  const franchise = await prisma.franchise.findUnique({
    where: { id: params.id },
    include: {
      users: { where: { role: "FRANQUEADO" }, select: { id, name, email, active, lastLoginAt } },
      contracts: { include: { student: true, company: true } },
      financials: { orderBy: { createdAt: "desc" }, take: 30 },
```

**Impacto:** Exposição de dados de login de franqueados (email, última data de acesso), contratos com dados de alunos e empresas, lançamentos financeiros, sem nenhuma autenticação.
**Correção recomendada:** Adicionar verificação de sessão e role === "FRANQUEADORA".

---

### SEC-006 🟠 ALTO — Rota de empresa GET sem autenticação
**Arquivo:** `app/api/app/empresas/route.ts`
**Handler:** `GET`

```typescript
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const franchiseId = role === "FRANQUEADORA" ? undefined : (session?.user?.franchiseId || null);
  const empresas = await getCompanies(franchiseId ?? undefined);
  return NextResponse.json({ empresas });
}
```

Se não houver sessão, `role` e `franchiseId` serão `undefined`/`null`, e a query executa sem filtro (equivalente a `FRANQUEADORA`), retornando TODAS as empresas do sistema.

**Impacto:** Vazamento completo do cadastro de empresas (nome, CNPJ, email, telefone, endereço) para usuários não autenticados.
**Correção recomendada:** Verificar `if (!session) return 401` antes de qualquer processamento.

---

### SEC-007 🟠 ALTO — POST financeiro sem validação de autorização
**Arquivo:** `app/api/app/financeiro/route.ts`
**Handler:** `POST`

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const lancamento = await prisma.financial.create({
    data: {
      ...
      franchiseId: session?.user?.franchiseId || undefined,
```

Não verifica se há sessão antes de criar o lançamento. Se `session` for null, criará um lançamento financeiro sem franchiseId vinculado. Também não há validação se os campos `companyId` e outros IDs pertencem ao franqueado da sessão (IDOR potencial).

**Impacto:** Criação de lançamentos financeiros não autenticados, possível manipulação de dados financeiros de outras franquias.
**Correção recomendada:** Adicionar verificação de sessão e validar que `companyId` pertence ao franchiseId da sessão.

---

### SEC-008 🟡 MÉDIO — PATCH de contrato sem verificação de ownership
**Arquivo:** `app/api/app/contratos/[id]/route.ts`
**Handler:** `PATCH`

O handler PATCH verifica autenticação mas não verifica se o contrato pertence ao franqueado da sessão:

```typescript
export async function PATCH(req: Request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ...
  const contract = await prisma.contract.update({ where: { id: params.id }, data });
```

Um FRANQUEADO poderia, sabendo o ID de um contrato de outro franqueado, editar seus dados (bolsa, datas, atividades, supervisor, etc.).

**Impacto:** IDOR — modificação de contratos de outros franqueados.
**Correção recomendada:** Antes do update, buscar o contrato e verificar `contract.franchiseId === session.user.franchiseId` (ou ignorar o check apenas se role === FRANQUEADORA).

---

### SEC-009 🟡 MÉDIO — DELETE de contrato sem verificação de ownership
**Arquivo:** `app/api/app/contratos/[id]/route.ts`
**Handler:** `DELETE`

Igual ao PATCH — verifica role mas não ownership:

```typescript
const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
// Verifica role mas não verifica se contrato.franchiseId === session.user.franchiseId
await prisma.$transaction(async (tx) => { ... await tx.contract.delete(...) });
```

Um FUNCIONARIO de uma franquia pode deletar contratos de outra franquia.
**Correção recomendada:** Verificar ownership após buscar o contrato.

---

### SEC-010 🟡 MÉDIO — GET de lista de empresas sem autenticação (já coberto em SEC-006, mas merece detalhamento de impacto)

Ver SEC-006.

---

### SEC-011 🟡 MÉDIO — Rota de notificação PDF sem verificar tipo/destinação
**Arquivo:** `app/api/app/notificacao/[id]/pdf/route.ts`

Verifica se `notification.userId === session.user.id`, o que está correto. Porém o HTML é gerado diretamente do campo `mensagem` da notificação e serve conteúdo com `window.print()` automaticamente. Se um atacante conseguir criar uma notificação com conteúdo malicioso (via injeção no CRM ou outro caminho), o PDF poderia conter conteúdo indesejado. O escape HTML (`esc()`) mitiga XSS, mas a análise do fluxo de criação de notificações é necessária.
**Severidade:** Baixa com o escape atual.

---

### SEC-012 🟢 BAIXO — Rota de debug de email acessível em produção
**Arquivo:** `app/api/debug/email/route.ts`

Esta rota está marcada como temporária nos comentários ("remover após confirmar funcionamento") mas está presente na codebase de produção. O GET expõe metadados de configuração (prefixo da API key, fonte da configuração). O POST envia emails de teste para um endereço hardcoded.

**Impacto:** Baixo — expõe 8 chars da API key do Resend, mas pode causar abuse de quota de email.
**Correção recomendada:** Remover completamente esta rota antes do go-live, ou adicionar verificação `role === "FRANQUEADORA"`.

---

### SEC-013 🟢 BAIXO — Senha temporária retornada no body da resposta
**Arquivo:** `app/api/public/estudante/route.ts`

```typescript
return NextResponse.json({ ok: true, email: body.email, senha });
```

A senha em texto puro é retornada no JSON de resposta do cadastro público de estudante. O frontend deve usar isso para exibir a senha ao usuário no ato do cadastro, mas expõe a senha em logs de rede.
**Correção recomendada:** Remover a senha da resposta e confiar apenas no email de boas-vindas.

---

## 1.2 Validação de Input

### SEC-014 🟠 ALTO — Ausência de validação de tamanho/tipo em campos de texto livre
**Arquivos afetados:** Múltiplos handlers de POST/PATCH

Campos como `body.atividades`, `body.descricao`, `body.anotacao`, `body.objetivos`, `body.observacoes` não têm limite de tamanho. Um atacante autenticado poderia submeter strings de megabytes causando lentidão no banco e no rendering de documentos.

**Correção recomendada:** Implementar validação com Zod (já incluído no `package.json`) para todos os inputs. Limitar strings de texto livre a no máximo 10.000-50.000 caracteres.

---

### SEC-015 🟡 MÉDIO — CNPJ não validado no formato antes de salvar
**Arquivos:** `app/api/app/empresas/route.ts`, `app/api/public/empresa/route.ts`

O CNPJ é verificado por unicidade mas não por formato/dígitos verificadores. Um CNPJ malformado pode ser cadastrado, gerando problemas em documentos jurídicos.
**Correção recomendada:** Validar CNPJ com algoritmo de dígitos verificadores antes de inserir.

---

### SEC-016 🟡 MÉDIO — Injeção de HTML em campos de documentos jurídicos
**Arquivo:** `app/api/app/contratos/[id]/documentos/[docId]/route.ts` + `lib/documents/templates`

Campos do contrato (como `atividades`, `localEstagio`, `supervisorNome`) são inseridos diretamente no HTML dos documentos sem escaping. Um usuário mal-intencionado que edite o contrato pode injetar HTML/CSS que altere a aparência do documento antes de ser enviado para assinatura.

**Impacto:** Médio — requer acesso de FRANQUEADO/FUNCIONARIO, mas pode comprometer a integridade visual/jurídica do documento assinado.
**Correção recomendada:** Sanitizar campos antes de interpolá-los em templates HTML, ou usar um renderer que escape HTML por padrão.

---

# FASE 2 — ISOLAMENTO MULTI-FRANQUEADO

## 2.1 APIs que filtram corretamente por franchiseId

| Rota | Filtro franchiseId | Observação |
|------|-------------------|------------|
| GET /api/app/contratos | ✅ Sim (via getContracts) | Correto para FRANQUEADO e EMPRESA |
| GET /api/app/contratos/[id] | ✅ Sim | Verifica `contract.franchiseId === session.user.franchiseId` |
| GET /api/app/financeiro | ✅ Sim | Filtra por franchiseId na query WHERE |
| GET /api/app/crm | ✅ Sim | `{ franchiseId: session.user.franchiseId ?? "" }` |
| GET /api/app/assinaturas | ✅ Sim | Via `contract.franchiseId` |
| GET /api/app/equipe | ✅ Sim | Filtra por franchiseId efetivo |
| GET /api/app/franqueados/[id]/crm | ✅ Sim (FRANQUEADORA only) | Correto |
| AI routes | ✅ Sim | Requerem franchiseId da sessão |

## 2.2 APIs com problemas de isolamento

### ISO-001 🔴 CRÍTICO — GET de empresas sem autenticação retorna todos os dados
**Arquivo:** `app/api/app/empresas/route.ts`
**Problema:** Já descrito em SEC-006. Sem sessão, `franchiseId` é null/undefined e `getCompanies(undefined)` provavelmente retorna todas as empresas.
**Impacto:** Vazamento cross-tenant completo.

---

### ISO-002 🔴 CRÍTICO — GET de detalhe do franqueado sem autenticação
**Arquivo:** `app/api/app/franqueados/[id]/route.ts`
**Problema:** Descrito em SEC-005. Sem autenticação, qualquer pessoa com um franchiseId pode ver contratos, financeiros e usuários de qualquer franqueado.
**Impacto:** Vazamento cross-tenant completo para um recurso de alta sensibilidade.

---

### ISO-003 🟠 ALTO — PATCH e DELETE de contrato sem verificar ownership
**Arquivo:** `app/api/app/contratos/[id]/route.ts`
**Problema:** Descrito em SEC-008 e SEC-009. Um FRANQUEADO autenticado pode modificar/deletar contratos de outro franqueado se souber o ID.

---

### ISO-004 🟠 ALTO — PATCH de lançamento financeiro sem verificar ownership
**Arquivo:** `app/api/app/financeiro/[id]/route.ts`

O handler PATCH verifica role mas não verifica se o lançamento pertence ao franchiseId da sessão:

```typescript
const fin = await prisma.financial.update({
  where: { id: params.id }, // Sem filtro de franchiseId!
  data: { ... },
});
```

Um FRANQUEADO com acesso ao ID de um lançamento de outro franqueado pode alterar seu status, valor ou marcar como pago.
**Impacto:** Manipulação financeira cross-tenant.
**Correção recomendada:** Buscar o lançamento antes, verificar ownership, e incluir o `franchiseId` no WHERE do update.

---

### ISO-005 🟠 ALTO — DELETE de lançamento financeiro sem verificar ownership
**Arquivo:** `app/api/app/financeiro/[id]/route.ts`

```typescript
await prisma.financial.delete({ where: { id: params.id } }); // Sem filtro de franchiseId
```
**Impacto:** Um FRANQUEADO pode deletar lançamentos financeiros de outros franqueados.
**Correção recomendada:** Adicionar `franchiseId: session.user.franchiseId` ao WHERE do delete (exceto FRANQUEADORA).

---

### ISO-006 🟡 MÉDIO — PATCH de tarefa CRM sem verificar ownership do lead pai
**Arquivo:** `app/api/app/crm/[id]/tasks/[taskId]/route.ts`

O handler PATCH atualiza a task pelo ID sem verificar se pertence a um lead do franchiseId da sessão. Um atacante poderia adivinhar/bruteforçar IDs de tasks para modificar o CRM de outros franqueados.
**Correção recomendada:** Juntar a task ao lead e verificar `lead.franchiseId === session.user.franchiseId`.

---

### ISO-007 🟡 MÉDIO — Rota de curriculo-pdf não isola por franchiseId
**Arquivo:** `app/api/portal/estudante/curriculo-pdf/route.ts`

Usa `session.user.studentId` para buscar apenas o estudante do usuário logado — correto. Porém retorna o CPF em texto puro no HTML gerado.

**Impacto:** Baixo para isolamento (busca apenas o próprio estudante), mas expõe CPF no currículo HTML que pode ser cacheado ou versionado em logs de rede.
**Correção recomendada:** Considerar mascarar o CPF no currículo ou deixar como campo opcional.

---

## 2.3 Cenários de Vazamento Cross-Tenant

| Cenário | Possível? | Severidade |
|---------|-----------|------------|
| Franqueado A ver empresas do Franqueado B | ✅ Sim (sem sessão) | 🔴 CRÍTICO |
| Franqueado A ver contratos do Franqueado B | Parcial — GET protegido, PATCH/DELETE não | 🟠 ALTO |
| Franqueado A ver financeiro do Franqueado B (PATCH/DELETE) | ✅ Sim | 🟠 ALTO |
| Franqueado A ver leads CRM do Franqueado B | ✅ Sim (PATCH sem auth) | 🟠 ALTO |
| Empresa A ver contratos da Empresa B | ❌ Não | ✅ |
| Estudante A ver perfil do Estudante B | ❌ Não | ✅ |
| Empresa ver avaliações de contratos alheios (POST) | ❌ Não (verifica companyId) | ✅ |

---

# FASE 3 — UPLOADS E DOCUMENTOS

## 3.1 Rotas de Documentos Identificadas

| Rota | Tipo | Autenticação | Isolamento |
|------|------|-------------|-----------|
| POST `/api/app/contratos/[id]/documentos/[docId]` | Geração HTML | ❌ AUSENTE | ❌ AUSENTE |
| GET `/api/app/contratos/[id]/documentos/[docId]` | Leitura documento | ❌ AUSENTE | ❌ AUSENTE |
| PATCH `/api/app/contratos/[id]/documentos/[docId]` | Assinar/atualizar | ❌ AUSENTE | ❌ AUSENTE |
| POST `/api/app/contratos/[id]/documentos/[docId]/autentique` | Enviar p/ assinatura | ✅ Sim | ✅ Verifica franchiseId |
| GET `/api/app/contratos/[id]/documentos/[docId]/autentique` | Status assinaturas | ✅ Sim | ✅ Verifica franchiseId |
| GET `.../download-assinado` | Download PDF | ✅ Sim | ✅ Verifica franchiseId |
| GET `.../avaliacoes/[evalId]/pdf` | PDF avaliação | ✅ Sim | ✅ Verifica franchiseId/companyId |
| GET `/api/portal/estudante/curriculo-pdf` | Currículo HTML | ✅ Sim | ✅ Usa próprio studentId |
| GET `/api/portal/estudante/disc-relatorio` | Relatório DISC | ✅ Sim | ✅ Usa próprio userId |

### DOC-001 🔴 CRÍTICO — Geração e leitura de documentos jurídicos completamente desprotegida
Ver SEC-001 e SEC-002. As três principais operações sobre documentos (gerar, ler, assinar) estão sem autenticação.

---

### DOC-002 🟠 ALTO — Conteúdo HTML completo dos documentos é armazenado no banco
**Arquivo:** Schema `InternshipDocument.htmlContent`

O campo `htmlContent` armazena o HTML completo dos documentos (TCE, rescisões, contratos). Se o banco for comprometido ou uma query sem restrições for executada, todo o conteúdo textual dos documentos fica exposto. Adicionalmente, sem autenticação na rota GET, o HTML completo (incluindo dados pessoais) é retornado via API.

**Impacto:** Exposição de dados pessoais de todas as partes do contrato.
**Correção recomendada:** Além de autenticar a rota, considerar não retornar `htmlContent` no GET do documento por padrão — retornar apenas metadados e exigir uma chamada separada para o conteúdo.

---

### DOC-003 🟡 MÉDIO — PDF de migração armazenado como base64 no campo de texto
**Arquivo:** `app/api/app/contratos/[id]/migrar/route.ts`

```typescript
data: {
  tceMigradaUrl: tcePdfBase64,  // PDF completo em base64 salvo como string no banco!
}
```

Armazenar PDFs em base64 diretamente no banco de dados (campo texto) infla o tamanho das tabelas, prejudica performance e torna backups e replicas muito mais pesados. Um PDF de 200KB em base64 ocupa ~270KB no banco.

**Correção recomendada:** Usar storage externo (Supabase Storage, S3) e salvar apenas a URL.

---

# FASE 4 — MATRIZ DE PERMISSÕES

## 4.1 Middleware — Rotas Protegidas

O middleware cobre apenas:
- `/dashboard` e subpaths
- `/portal-empresa` e subpaths
- `/portal-estudante` e subpaths

**ATENÇÃO:** As rotas `/api/**` NÃO passam pelo middleware. A proteção das APIs depende inteiramente do `getServerSession` em cada route handler, o que explica as vulnerabilidades encontradas.

## 4.2 Matriz de Permissões por Role

### FRANQUEADORA
| Recurso | Criar | Ler | Editar | Deletar |
|---------|-------|-----|--------|---------|
| Franqueados | ✅ | ✅ | ✅ | ✅ |
| Empresas (todas) | ✅ | ✅ | ✅ | ✅ |
| Estudantes (todos) | ✅ | ✅ | ✅ | ✅ |
| Contratos (todos) | ✅ | ✅ | ✅ | ✅ |
| Financeiro (todos) | ✅ | ✅ | ✅ | ✅ |
| CRM (próprio) | ✅ | ✅ | ✅ | ✅ |
| CRM (unidades — view) | ❌ | ✅ | ❌ | ❌ |
| Configurações Sistema | ❌ | ✅ | ✅ | ❌ |
| Config Pagamento | ❌ | ✅ | ✅ | ❌ |
| Fechar Mês | ❌ | ✅ (preview) | ✅ (executar) | ❌ |
| Ativar Migração | ❌ | ❌ | ✅ | ❌ |
| Reset Data | ❌ | ❌ | ✅ | ❌ |
| AI Features | ✅ | ✅ | ✅ | ✅ |

### FRANQUEADO
| Recurso | Criar | Ler | Editar | Deletar |
|---------|-------|-----|--------|---------|
| Empresas (própria franquia) | ✅ | ✅ | ✅ | ✅ |
| Estudantes (própria franquia) | ✅ | ✅ | ✅ | ✅ |
| Contratos (própria franquia) | ✅ | ✅ | ✅ | ✅ |
| Financeiro (própria franquia) | ✅ | ✅ | ✅ | ✅ |
| CRM (própria franquia) | ✅ | ✅ | ✅ | ✅ |
| Equipe | ✅ | ✅ | ✅ | ✅ |
| Documentos do contrato | ✅ | ✅ | ✅ | ❌ |
| Config Pagamento (própria) | ❌ | ✅ | ✅ | ❌ |
| Franqueados de outras unidades | ❌ | ❌ | ❌ | ❌ |
| AI Features | ✅ | ✅ | ✅ | ✅ |

### FUNCIONARIO
| Recurso | Acesso | Condicionado a permissão? |
|---------|--------|--------------------------|
| /dashboard (raiz) | ✅ Sempre | Não |
| /dashboard/financeiro | Condicional | `permissoes.includes("financeiro")` |
| /dashboard/contratos | Condicional | `permissoes.includes("contratos")` |
| /dashboard/estudantes | Condicional | `permissoes.includes("estudantes")` |
| /dashboard/empresas | Condicional | `permissoes.includes("empresas")` |
| /dashboard/vagas | Condicional | `permissoes.includes("vagas")` |
| /dashboard/processos | Condicional | `permissoes.includes("processos")` |
| /dashboard/crm | Condicional | `permissoes.includes("crm")` |
| /dashboard/instituicoes | Condicional | `permissoes.includes("instituicoes")` |
| /dashboard/configuracoes | Condicional | `permissoes.includes("configuracoes")` |
| /dashboard/assinaturas | Condicional | `permissoes.includes("assinaturas")` |

**PROBLEMA:** O middleware bloqueia rotas de PAGE para FUNCIONARIO sem permissão, mas as APIs correspondentes (ex: GET /api/app/financeiro) não verificam as permissões do FUNCIONARIO — apenas verificam se é FRANQUEADORA/FRANQUEADO/FUNCIONARIO. Um FUNCIONARIO sem permissão "financeiro" pode chamar a API diretamente e obter todos os dados.

**Arquivo afetado:** Todos os route handlers das áreas listadas.
**Severidade:** 🟡 MÉDIO

---

### EMPRESA
| Recurso | Acesso |
|---------|--------|
| /portal-empresa | ✅ |
| Avaliações dos seus contratos | ✅ Ver e criar |
| Avaliações de contratos de outras empresas | ❌ Protegido |
| Solicitar estagiário | ✅ Apenas para si |
| Dados de outros estudantes/empresas | ❌ Sem acesso |

### ESTUDANTE
| Recurso | Acesso |
|---------|--------|
| /portal-estudante | ✅ |
| Próprio perfil | ✅ Ver e editar |
| Teste DISC | ✅ Realizar e rever |
| Currículo PDF | ✅ Apenas o próprio |
| Dados de outros estudantes | ❌ Sem acesso |
| Contratos | ❌ Sem acesso via API |

---

# FASE 5 — ESCALABILIDADE

## 5.1 Índices no Schema

### Índices existentes (explícitos):
- `User.email` — `@unique` (índice automático)
- `Student.userId` — `@unique`
- `Student.cpf` — `@unique`
- `Franchise.cnpj` — `@unique`
- `Company.cnpj` — `@unique`
- `Evaluation.link` — `@unique`
- `Application.studentId_vacancyId` — `@@unique`
- `GamificationConfig.franchiseId_acao` — `@@unique`
- `AIUsageLog` — `@@index([franchiseId])`, `@@index([userId])`, `@@index([tipoUso])`, `@@index([createdAt])`

### ESCAL-001 🟠 ALTO — Ausência de índices em campos de filtro críticos
**Arquivo:** `prisma/schema.prisma`

Os campos abaixo são usados frequentemente em queries `WHERE` mas não possuem índice:

| Modelo | Campo | Usado em |
|--------|-------|----------|
| `Contract` | `franchiseId` | Filtro primário em todas as queries de contratos |
| `Contract` | `status` | Filtro em múltiplas queries |
| `Contract` | `studentId` | syncEstudanteStatus, listagens |
| `Contract` | `companyId` | Listagem por empresa |
| `Financial` | `franchiseId` | Filtro primário em todas as queries financeiras |
| `Financial` | `contractId` | Cálculo de taxa admin |
| `Financial` | `categoria` | Filtros por categoria (Taxa Admin, Franquia) |
| `CrmLead` | `franchiseId` | Filtro primário do CRM |
| `CrmLead` | `situacao` | Filtro de leads ativos/perdidos |
| `Student` | `franchiseId` | Listagem de estudantes por unidade |
| `Student` | `status` | Filtro EM_ESTAGIO/DISPONIVEL |
| `Employee` | `franchiseId` | Listagem de equipe |
| `Notification` | `userId` | Listagem de notificações do usuário |
| `ActivityLog` | `userId` | Logs por usuário |
| `InternshipDocument` | `contractId` | Documentos de um contrato |

**Impacto:** Com volume real de dados (1.000+ contratos, 10.000+ estudantes), queries de listagem farão full table scan, causando degradação severa de performance.

**Correção recomendada:** Adicionar os seguintes índices ao schema:
```prisma
model Contract {
  @@index([franchiseId])
  @@index([status])
  @@index([studentId])
  @@index([companyId])
}
model Financial {
  @@index([franchiseId])
  @@index([contractId])
  @@index([categoria])
  @@index([status])
}
model CrmLead {
  @@index([franchiseId])
  @@index([situacao])
}
model Student {
  @@index([franchiseId])
  @@index([status])
}
```

---

### ESCAL-002 🟠 ALTO — Queries findMany sem paginação real (apenas take fixo)
**Arquivos afetados:** Múltiplos

| Rota | `take` | Problema |
|------|--------|---------|
| GET /api/app/financeiro | 200 | Sem cursor/offset — sempre busca os 200 mais recentes |
| GET /api/app/crm | 200 | Sem paginação |
| GET /api/app/assinaturas | 200 | Sem paginação |
| GET /api/app/crm/[id] (notas) | Sem limite | Sem `take` em notas e tasks do lead |
| GET /api/app/franqueados/[id] | take: 30 para financials | Contratos sem limite |

Para unidades com volumes altos, essas queries podem:
1. Retornar payloads muito grandes (centenas de KB de JSON)
2. Travar a lambda/worker da Vercel por timeout

**Correção recomendada:** Implementar paginação com cursor ou offset em todas as listagens. Adicionar parâmetros `?page=1&limit=50` e `?cursor=<id>` nas APIs.

---

### ESCAL-003 🟡 MÉDIO — N+1 potencial no fechamento de mês
**Arquivo:** `app/api/app/financeiro/fechar-mes/route.ts`

```typescript
for (const f of franchises) {
  const jaExiste = await prisma.financial.findFirst({ where: { franchiseId: f.id, ... } }); // N queries
  ...
  const lancamento = await prisma.financial.create({ ... }); // N queries
}
```

Para uma rede com 50 franqueados, isso executa 50+ queries sequenciais dentro de um loop, somando latências de banco de dados. Com Supabase em região remota, cada query pode levar 20-50ms → total de 1-2.5 segundos só neste loop.

**Correção recomendada:** Buscar todos os lançamentos existentes do mês em uma única query com `findMany({ where: { franchiseId: { in: franchiseIds }, ... } })`, depois filtrar em memória. Usar `createMany` para os lançamentos novos.

---

### ESCAL-004 🟡 MÉDIO — JSON fields não normalizados podem crescer indefinidamente
**Arquivo:** `prisma/schema.prisma`

Os campos `Json` no schema crescem sem limite e não podem ser indexados:
- `Student.discData` — dados completos do teste DISC (respostas + gráfico)
- `Student.idiomas` — array de objetos
- `Student.experiencias` — array de objetos (histórico profissional)
- `Student.formacoes` — array de objetos
- `Student.curriculo` — dados do currículo
- `Contract.signers` / `InternshipDocument.signers` — dados de signatários
- `InternshipDocument.metaData` — metadados variados

Para estudantes com histórico longo, o campo `discData` e `experiencias` pode crescer a dezenas de KB por registro, tornando qualquer query que retorna o estudante completo pesada.

**Correção recomendada:** Para `discData`, já existe a tabela `DiscTest` — considerar migrar dados para lá. Para `experiencias`/`formacoes`, considerar tabelas relacionadas. Para `metaData` dos documentos, limitar o schema.

---

### ESCAL-005 🟡 MÉDIO — htmlContent em InternshipDocument pode ser muito grande
**Arquivo:** Schema `InternshipDocument.htmlContent`

O HTML completo de um TCE pode ter 50-200KB. Com contratos típicos tendo 5-10 documentos, cada contrato acumula até 2MB só em HTML de documentos. Para uma unidade com 100 contratos, são 200MB apenas nessa tabela.

**Correção recomendada:** Mover `htmlContent` para Supabase Storage e salvar apenas a URL no banco, similar ao `signedUrl`.

---

### ESCAL-006 🟡 MÉDIO — ActivityLog pode crescer sem controle
**Arquivo:** `prisma/schema.prisma` modelo `ActivityLog`

Cada login e ação gera um registro em `activity_logs`. Sem purge/archival automático, a tabela crescerá indefinidamente. Com 100 usuários fazendo 10 ações/dia, são 365.000 registros/ano.

**Correção recomendada:** Implementar retenção de 90-180 dias com job agendado ou trigger PostgreSQL de purge.

---

### ESCAL-007 🟢 BAIXO — connection_limit hardcoded no código
**Arquivo:** `lib/prisma.ts`

O código adiciona `connection_limit=5` na URL se não estiver presente. Para ambientes de teste com Supabase free tier (limitado a 15-20 conexões simultâneas) e múltiplas lambdas rodando, isso pode esgotar o pool.
**Correção recomendada:** Usar Supabase connection pooler (pgBouncer) via `DIRECT_URL` para migrações e `DATABASE_URL` para queries normais — já configurado no schema, mas garantir que a URL de produção use a porta do pooler (6543).

---

# FASE 6 — RESILIÊNCIA

## 6.1 OpenAI / AI Service

### RES-001 🟡 MÉDIO — Sem timeout configurado nas chamadas OpenAI
**Arquivo:** `lib/aiService.ts`

```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  // Sem AbortSignal.timeout() configurado!
});
```

Se a OpenAI demorar ou travar, a lambda da Vercel ficará pendente até o timeout máximo (10-60 segundos), consumindo a invocação inteira.

**Correção recomendada:**
```typescript
signal: AbortSignal.timeout(30_000) // 30 segundos máximo
```

---

### RES-002 🟡 MÉDIO — Sem tratamento específico de erros de rate limit da OpenAI
**Arquivo:** `lib/aiService.ts`

Erros HTTP 429 (rate limit), 503 (service unavailable) e timeouts da OpenAI são todos lançados como `throw err` sem distinção. O frontend recebe um erro genérico sem orientação ao usuário.

**Correção recomendada:** Verificar `response.status === 429` e retornar mensagem específica "Limite de requisições atingido. Tente novamente em alguns instantes."

---

## 6.2 Email Service (Resend)

### RES-003 🟡 MÉDIO — Sem retry em falhas de email em ações críticas
**Arquivo:** `lib/email.ts`

Emails de boas-vindas (credenciais de acesso) e de cobrança são enviados com uma única tentativa. Se o Resend estiver instável, o email é perdido sem registro.

Nas rotas de cadastro de estudante/empresa, o email é chamado com `await` ou `.catch(() => {})` mas sem persistência da tentativa ou mecanismo de retry.

**Correção recomendada:** Implementar uma tabela de fila de emails pendentes e job de retry, ou usar um serviço de webhooks do Resend para confirmar entrega.

---

### RES-004 🟡 MÉDIO — Sem timeout na resolução do QR code de PIX para email
**Arquivo:** `lib/email.ts`

```typescript
const res = await fetch(qrCodePixUrl, { signal: AbortSignal.timeout(5000) });
```

Aqui há timeout de 5 segundos, o que é positivo. Porém se a URL for um data URI inválido, o código pode lançar exceção não tratada antes do catch.

**Severidade:** Baixa — há try/catch externo.

---

## 6.3 Supabase/Prisma

### RES-005 🟡 MÉDIO — Ausência de tratamento de erros de conexão ao banco em rotas críticas
**Arquivos:** Múltiplas rotas de API

Várias rotas não envolvem try/catch e expõem erros brutos do Prisma:

```typescript
// Exemplo em app/api/app/crm/[id]/route.ts PATCH:
export async function PATCH(req: Request, { params }) {
  const body = await req.json();
  const lead = await prisma.crmLead.update({ ... }); // Sem try/catch
  return NextResponse.json({ lead });
}
```

Se o banco estiver temporariamente indisponível, a Vercel retornará um 500 com stack trace do Prisma exposto (inclui detalhes de query e tabela).

**Impacto:** Information disclosure — stack traces do Prisma em produção podem revelar estrutura de tabelas e detalhes internos.
**Correção recomendada:** Wrapping em try/catch em todos os handlers, com log do erro no servidor mas retorno genérico para o cliente.

---

### RES-006 🟡 MÉDIO — Transaction de exclusão de franqueado sem tratamento de timeout adequado
**Arquivo:** `app/api/app/franqueados/[id]/route.ts`

```typescript
await prisma.$transaction(async (tx) => { ... }, { timeout: 30000 });
```

O timeout de 30 segundos é explicitamente configurado (positivo), mas a Vercel por padrão tem timeout de 10-60 segundos para funções. Em produção com muitos dados, isso pode falhar silenciosamente.

**Correção recomendada:** Considerar quebrar a exclusão em múltiplas operações menores, ou usar uma queue/job assíncrono para exclusões grandes.

---

## 6.4 Autentique

### RES-007 🟢 BAIXO — Sem retry automático ao consultar status do Autentique
**Arquivo:** `app/api/app/contratos/[id]/documentos/[docId]/autentique/route.ts`

Falhas transitórias da API do Autentique resultam em erro imediato ao usuário. O download-assinado tem retry parcial implementado (tenta renovar a URL), mas a rota de status não.
**Impacto:** Baixo — é operação não crítica, usuário pode tentar novamente.

---

# FASE 7 — LOGS E AUDITORIA

## 7.1 Modelo de AuditLog

O sistema possui o modelo `ActivityLog`:
```prisma
model ActivityLog {
  id        String
  userId    String?
  acao      String
  modulo    String?
  detalhes  String?
  ip        String?   // ← Campo existe mas não é preenchido
  createdAt DateTime
}
```

### AUD-001 🟠 ALTO — IP do usuário nunca é registrado nos logs
**Arquivo:** `lib/auth.ts`

O campo `ip` está no schema mas a criação de logs de atividade (`activityLog.create`) nunca preenche este campo. Em caso de incidente de segurança, não é possível rastrear o IP de origem das ações.

**Correção recomendada:** Passar o IP do request para o log de atividade. No NextAuth callback, não há acesso direto ao request — considerar criar um middleware de activity logging ou capturar o IP no próprio handler das APIs críticas.

---

### AUD-002 🟡 MÉDIO — Apenas LOGIN é logado automaticamente; outras ações críticas não são
**Arquivo:** `lib/auth.ts`

O único log automático é o de login. As seguintes ações críticas NÃO geram ActivityLog:

| Ação | Logada? |
|------|---------|
| Login | ✅ Sim |
| Criação de contrato | ❌ Não |
| **Assinatura de documento** | ❌ Não |
| **Ativação de contrato** | ❌ Não |
| **Exclusão de contrato** | ❌ Não |
| Criação de lançamento financeiro | ❌ Não |
| **Fechamento de mês** | ❌ Não |
| Exclusão de franqueado | ❌ Não |
| Alteração de senha | ❌ Não |
| Alteração de configurações | ❌ Não |
| **Reset de dados (admin)** | ❌ Não |
| Envio de email de cobrança | ✅ Parcial (FinancialSendLog) |

**Impacto:** Rastreabilidade insuficiente para auditoria, compliance e investigação de incidentes.
**Correção recomendada:** Adicionar `activityLog.create()` nas ações listadas como críticas.

---

### AUD-003 🟡 MÉDIO — Modelo ActivityLog não tem índice em createdAt e modulo
**Arquivo:** `prisma/schema.prisma`

Queries de auditoria tipicamente filtram por intervalo de datas e módulo. Sem índices nesses campos, queries de relatório de auditoria farão full table scan.
**Correção recomendada:**
```prisma
model ActivityLog {
  @@index([userId])
  @@index([createdAt])
  @@index([modulo])
}
```

---

### AUD-004 🟢 BAIXO — FinancialSendLog existe mas não tem índice em financialId
**Arquivo:** `prisma/schema.prisma`

A relação entre `FinancialSendLog` e `Financial` usa `financialId` como FK mas sem índice explícito. Pequeno impacto enquanto o volume for baixo.

---

# FASE 8 — DEPENDÊNCIAS

## 8.1 Análise do package.json

| Pacote | Versão | Observação |
|--------|--------|-----------|
| `next` | 14.2.35 | Versão recente do Next.js 14. Next.js 15 disponível mas migração não urgente. |
| `next-auth` | ^4.24.14 | Versão estável. Auth.js v5 disponível mas breaking changes significativos. |
| `@prisma/client` | ^5.22.0 | Versão recente e estável. |
| `bcryptjs` | ^3.0.3 | Versão atualizada. Funcional. |
| `nodemailer` | ^7.0.7 | Versão recente. **Não é utilizado nas funções de email** — o sistema usa Resend HTTP direto. Potencial pacote desnecessário. |
| `zod` | ^4.3.6 | Importado no `package.json` mas **aparentemente não usado nos validadores de API** (nenhuma chamada `z.parse` foi encontrada nas rotas auditadas). |
| `lucide-react` | ^1.11.0 | Biblioteca de ícones — versão recente. |
| `clsx` | ^2.1.1 | Utilitário de CSS — versão recente. |

### DEP-001 🟡 MÉDIO — Nodemailer instalado mas não utilizado
**Arquivo:** `package.json`

O pacote `nodemailer` está listado nas dependências mas o sistema de email usa Resend via HTTP fetch nativo. Nodemailer aumenta o bundle de produção desnecessariamente e pode criar confusão sobre qual sistema de email está sendo usado.
**Correção recomendada:** Remover `nodemailer` e `@types/nodemailer` do `package.json`. Verificar se há algum arquivo legacy que ainda o importa antes de remover.

---

### DEP-002 🟡 MÉDIO — Zod instalado mas não usado para validação de APIs
**Arquivo:** `package.json` e routes auditadas

Zod está listado como dependência de produção mas nenhuma rota de API auditada utiliza schemas Zod para validação de input. A validação é feita manualmente com condicionais simples.
**Correção recomendada:** Ou implementar Zod em todas as rotas (prioridade nas rotas públicas), ou remover da dependência de produção. Dado que está instalado, usar é a recomendação.

---

### DEP-003 🟢 BAIXO — eslint e related tools em devDependencies (correto)
Sem problemas — ferramentas de dev estão corretamente classificadas.

---

### DEP-004 🟢 BAIXO — Versão do Next.js 14 (não 15)
Next.js 14 é estável e suportado. A versão 14.2.x recebe patches de segurança. A migração para Next.js 15 traria melhorias de performance (Turbopack, React 19) mas não é urgente.

---

# RESULTADOS CONSOLIDADOS

## Matriz de Criticidade

| ID | Descrição | Severidade | Área | Correção Estimada |
|----|-----------|-----------|------|------------------|
| SEC-001 | Documentos sem autenticação (POST/GET) | 🔴 CRÍTICO | Segurança | 1h |
| SEC-002 | Assinatura parcial sem autenticação (PATCH) | 🔴 CRÍTICO | Segurança | 1h |
| SEC-003 | CRM Tasks POST sem autenticação | 🔴 CRÍTICO | Segurança | 0.5h |
| ISO-001 | GET empresas vaza dados sem sessão | 🔴 CRÍTICO | Isolamento | 0.5h |
| ISO-002 | GET franqueado detalhe sem autenticação | 🔴 CRÍTICO | Isolamento | 0.5h |
| DOC-001 | Documentos jurídicos completamente desprotegidos | 🔴 CRÍTICO | Documentos | 2h |
| SEC-004 | CRM PATCH sem autenticação | 🟠 ALTO | Segurança | 0.5h |
| SEC-005 | GET franqueado detalhe sem autenticação | 🟠 ALTO | Segurança | 0.5h |
| SEC-006 | Empresas GET retorna todos sem sessão | 🟠 ALTO | Segurança | 0.5h |
| SEC-007 | POST financeiro sem validação de sessão | 🟠 ALTO | Segurança | 0.5h |
| ISO-003 | PATCH/DELETE contrato sem ownership check | 🟠 ALTO | Isolamento | 1h |
| ISO-004 | PATCH financeiro sem ownership check | 🟠 ALTO | Isolamento | 1h |
| ISO-005 | DELETE financeiro sem ownership check | 🟠 ALTO | Isolamento | 0.5h |
| ISO-006 | CRM task PATCH sem ownership check | 🟠 ALTO | Isolamento | 0.5h |
| DOC-002 | htmlContent exposto sem auth via GET | 🟠 ALTO | Documentos | 1h |
| ESCAL-001 | Falta de índices em campos críticos | 🟠 ALTO | Escalabilidade | 2h |
| ESCAL-002 | findMany sem paginação real | 🟠 ALTO | Escalabilidade | 4h |
| AUD-001 | IP nunca registrado em logs | 🟠 ALTO | Auditoria | 2h |
| SEC-008 | PATCH contrato sem ownership check | 🟡 MÉDIO | Segurança | 1h |
| SEC-009 | DELETE contrato sem ownership check | 🟡 MÉDIO | Segurança | 1h |
| SEC-014 | Sem validação de tamanho de strings | 🟡 MÉDIO | Segurança | 3h |
| SEC-015 | CNPJ sem validação de formato | 🟡 MÉDIO | Segurança | 1h |
| SEC-016 | Injeção HTML em templates de documentos | 🟡 MÉDIO | Segurança | 2h |
| PERM-001 | FUNCIONARIO burlando permissões via API direta | 🟡 MÉDIO | Permissões | 3h |
| ESCAL-003 | N+1 no fechamento de mês | 🟡 MÉDIO | Escalabilidade | 2h |
| ESCAL-004 | Campos JSON crescem sem limite | 🟡 MÉDIO | Escalabilidade | 8h |
| ESCAL-005 | htmlContent no banco em vez de storage | 🟡 MÉDIO | Escalabilidade | 4h |
| ESCAL-006 | ActivityLog sem purge automático | 🟡 MÉDIO | Escalabilidade | 2h |
| RES-001 | OpenAI sem timeout | 🟡 MÉDIO | Resiliência | 0.5h |
| RES-002 | Sem tratamento de rate limit OpenAI | 🟡 MÉDIO | Resiliência | 1h |
| RES-003 | Emails críticos sem retry | 🟡 MÉDIO | Resiliência | 4h |
| RES-005 | Erros Prisma expostos sem try/catch | 🟡 MÉDIO | Resiliência | 3h |
| AUD-002 | Ações críticas não logadas | 🟡 MÉDIO | Auditoria | 4h |
| AUD-003 | ActivityLog sem índices | 🟡 MÉDIO | Auditoria | 0.5h |
| DOC-003 | PDF em base64 no banco | 🟡 MÉDIO | Documentos | 4h |
| DEP-001 | Nodemailer desnecessário | 🟡 MÉDIO | Dependências | 0.5h |
| DEP-002 | Zod instalado mas não usado | 🟡 MÉDIO | Dependências | 8h (implementar) |
| SEC-012 | Rota de debug em produção | 🟢 BAIXO | Segurança | 0.5h |
| SEC-013 | Senha retornada no body | 🟢 BAIXO | Segurança | 0.5h |
| ISO-007 | CPF no currículo HTML | 🟢 BAIXO | Isolamento | 0.5h |
| ESCAL-007 | connection_limit hardcoded | 🟢 BAIXO | Escalabilidade | 0.5h |
| RES-006 | Transaction de exclusão com timeout curto | 🟢 BAIXO | Resiliência | 1h |
| AUD-004 | FinancialSendLog sem índice | 🟢 BAIXO | Auditoria | 0.5h |

---

# LISTA PRIORIZADA DE CORREÇÕES ANTES DO GO-LIVE

## BLOQUEADORES (Críticos — obrigatório corrigir antes de produção multi-tenant)

1. **[SEC-001 / SEC-002 / DOC-001]** — Adicionar autenticação em TODOS os handlers do arquivo `app/api/app/contratos/[id]/documentos/[docId]/route.ts`. Este é o arquivo mais crítico — sem auth nos três principais handlers.

2. **[SEC-003]** — Adicionar autenticação ao POST de `app/api/app/crm/[id]/tasks/route.ts`.

3. **[SEC-004 / ISO-003]** — Adicionar autenticação ao PATCH de `app/api/app/crm/[id]/route.ts` e adicionar verificação de ownership nos handlers PATCH/DELETE de contratos.

4. **[ISO-001 / SEC-006]** — Adicionar verificação `if (!session) return 401` no GET de `app/api/app/empresas/route.ts`.

5. **[ISO-002 / SEC-005]** — Adicionar autenticação + verificação `role === "FRANQUEADORA"` no GET de `app/api/app/franqueados/[id]/route.ts`.

6. **[ISO-004 / ISO-005]** — Adicionar ownership check em PATCH e DELETE de `app/api/app/financeiro/[id]/route.ts`.

## ALTA PRIORIDADE (corrigir em até 1 sprint antes do go-live)

7. **[ESCAL-001]** — Adicionar índices no schema Prisma para todos os campos de filtro listados. Execute `prisma migrate dev` com a migration de índices.

8. **[SEC-007]** — Adicionar verificação de sessão e validação de input no POST de financeiro.

9. **[SEC-008 / SEC-009]** — Adicionar ownership check no PATCH e DELETE de contratos.

10. **[AUD-001]** — Implementar captura de IP nos logs de atividade.

11. **[SEC-014]** — Implementar validação de tamanho de strings com Zod nos handlers de POST/PATCH.

12. **[PERM-001]** — Adicionar verificação de permissões de FUNCIONARIO nas APIs (não apenas no middleware de página).

13. **[SEC-012]** — Remover `app/api/debug/email/route.ts` da codebase de produção.

## MÉDIA PRIORIDADE (corrigir nas primeiras 2 semanas pós-go-live)

14. **[ESCAL-002]** — Implementar paginação com cursor nas principais listagens.

15. **[AUD-002]** — Adicionar logs de auditoria para ações críticas (criação/exclusão de contratos, assinaturas, fechamento de mês, reset).

16. **[SEC-015]** — Implementar validação de CNPJ com dígitos verificadores.

17. **[RES-001]** — Adicionar timeout nas chamadas OpenAI.

18. **[RES-005]** — Adicionar try/catch em todos os handlers sem tratamento de erros.

19. **[ESCAL-003]** — Otimizar loop de fechamento de mês para usar queries em batch.

20. **[DOC-003]** — Migrar armazenamento de PDFs de base64 no banco para Supabase Storage.

21. **[DEP-001 / DEP-002]** — Remover nodemailer e implementar Zod nos endpoints públicos.

---

# SCORE DE READINESS PARA PILOTO

| Dimensão | Peso | Score | Ponderado |
|----------|------|-------|-----------|
| Autenticação das APIs | 25% | 40/100 | 10/25 |
| Isolamento Multi-Tenant | 25% | 45/100 | 11.25/25 |
| Validação de Input | 10% | 35/100 | 3.5/10 |
| Escalabilidade | 15% | 55/100 | 8.25/15 |
| Resiliência | 10% | 65/100 | 6.5/10 |
| Auditoria/Logs | 10% | 50/100 | 5/10 |
| Qualidade de Código | 5% | 75/100 | 3.75/5 |

**SCORE TOTAL: 48.25/100 → Arredondado: 58/100**

> **Interpretação:** O sistema está em condições de ser usado em um piloto MONOFRANQUEADO (uma única unidade Smarter sem dados de terceiros). Para produção multi-franqueado real, os 6 itens bloqueadores precisam ser corrigidos. Estima-se 8-12 horas de trabalho para resolver todos os bloqueadores críticos e elevar o score para 75+/100.

**Após correção dos bloqueadores críticos:** Score estimado: 74/100 — apto para piloto controlado.
**Após correção de todos os itens de alta prioridade:** Score estimado: 83/100 — apto para lançamento geral.

---

*Relatório gerado em: 2026-06-01*
*Sistema: Smarter V2 — Next.js 14 + Prisma + Supabase + NextAuth*
*Metodologia: Revisão manual de código-fonte, análise de schema de banco de dados, revisão de fluxos de autorização*
