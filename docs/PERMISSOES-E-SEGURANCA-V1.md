# PERMISSÕES E SEGURANÇA V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## 1. ROLES DO SISTEMA

O sistema usa 5 roles distintos, definidos no enum `UserRole`:

| Role | Descrição | Portal de acesso |
|------|-----------|-----------------|
| **FRANQUEADORA** | Admin máximo — controla toda a rede | `/dashboard` |
| **FRANQUEADO** | Admin da sua unidade franqueada | `/dashboard` |
| **FUNCIONARIO** | Colaborador com permissões granulares | `/dashboard` |
| **EMPRESA** | Empresa parceira | `/portal-empresa` |
| **ESTUDANTE** | Estagiário | `/portal-estudante` |

---

## 2. ISOLAMENTO MULTI-TENANT

Todo dado operacional tem `franchiseId`. O isolamento é garantido em duas camadas:

**Camada 1 — Middleware (frontend):**
- EMPRESA → redireciona para `/portal-empresa` se tentar acessar `/dashboard`
- ESTUDANTE → redireciona para `/portal-estudante`
- FUNCIONARIO → redireciona para `/dashboard` se tentar módulo sem permissão

**Camada 2 — API (backend):**
- Toda query de listagem filtra por `franchiseId: session.user.franchiseId`
- Toda operação sobre registro específico verifica `record.franchiseId === session.user.franchiseId`
- FRANQUEADORA é a única role que pode acessar dados de qualquer franquia

**Implementação:**
```typescript
// Padrão de ownership check em todos os endpoints sensíveis:
if (role !== "FRANQUEADORA") {
  const record = await prisma.X.findUnique({ where: { id }, select: { franchiseId: true } });
  if (!record || record.franchiseId !== session.user.franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

---

## 3. MATRIZ DE PERMISSÕES COMPLETA

### FRANQUEADORA
- Acesso total a todos os módulos de todas as franquias
- Única role que pode criar/editar/excluir franqueados
- Única role que pode excluir empresas e estudantes
- Única role que pode alterar configurações do sistema
- Única role que pode usar o `reset-data` endpoint
- Vê dados consolidados de toda a rede no dashboard

### FRANQUEADO
- Acesso total aos dados da **própria franquia** apenas
- Pode criar/editar/excluir empresas, estudantes, contratos da sua franquia
- Pode criar/gerenciar equipe (funcionários)
- Pode acessar financeiro, CRM, processos, vagas da sua franquia
- NÃO pode ver dados de outras franquias
- NÃO pode alterar configurações globais do sistema

### FUNCIONARIO
- Acesso restrito aos módulos definidos em `employee.permissoes[]`
- **Permissões configuráveis:** financeiro, contratos, crm, empresas, estudantes, processos, instituicoes, assinaturas
- Verificação dupla: frontend (menu ocultado) + backend API (`checkPermission()`)
- NÃO pode criar/alterar equipe
- NÃO pode excluir empresas ou estudantes
- Acesso apenas à própria franquia (ownership check igual ao FRANQUEADO)

**Módulos e suas chaves de permissão:**
| Módulo | Chave em `permissoes[]` |
|--------|------------------------|
| Financeiro | `financeiro` |
| Contratos/TCE | `contratos` |
| CRM | `crm` |
| Empresas | `empresas` |
| Estudantes | `estudantes` |
| Processos Seletivos | `processos` |
| Instituições | `instituicoes` |
| Assinaturas | `assinaturas` |
| Configurações | `configuracoes` |

### EMPRESA
- Acesso apenas ao `/portal-empresa`
- Pode ver seus estagiários ativos e contratos ativos
- Pode responder avaliações semestrais dos seus estagiários
- Pode ver cobranças financeiras emitidas para ela
- NÃO tem acesso a nenhuma API em `/api/app/*`
- Autenticação: email/senha como qualquer usuário

### ESTUDANTE
- Acesso apenas ao `/portal-estudante`
- Pode ver seus dados de estágio ativo
- Pode editar o próprio perfil/currículo
- Pode realizar o teste DISC
- Pode se candidatar a vagas públicas
- NÃO tem acesso a nenhuma API em `/api/app/*`

---

## 4. PERMISSÕES POR ENDPOINT (tabela completa)

| Endpoint | FRANQUEADORA | FRANQUEADO | FUNCIONARIO | EMPRESA | ESTUDANTE |
|----------|:---:|:---:|:---:|:---:|:---:|
| GET /api/app/empresas | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| POST /api/app/empresas | ✅ | ✅ | ✅** | ❌ | ❌ |
| GET /api/app/empresas/[id] | ✅ | ✅ própria | ✅ | ❌ | ❌ |
| PATCH /api/app/empresas/[id] | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| DELETE /api/app/empresas/[id] | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/app/estudantes | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| GET /api/app/estudantes/[id] | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| PATCH /api/app/estudantes/[id] | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| DELETE /api/app/estudantes/[id] | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/app/contratos | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| PATCH /api/app/contratos/[id] | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| DELETE /api/app/contratos/[id] | ✅ | ✅ própria | ✅ | ❌ | ❌ |
| GET /api/app/financeiro | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| POST /api/app/financeiro | ✅ | ✅ | ✅** | ❌ | ❌ |
| PATCH /api/app/financeiro/[id] | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| DELETE /api/app/financeiro/[id] | ✅ | ✅ própria | ❌ | ❌ | ❌ |
| GET /api/app/crm | ✅ | ✅ própria | ✅** | ❌ | ❌ |
| GET /api/app/crm/[id] | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| DELETE /api/app/crm/[id] | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| GET /api/app/config | ✅ | ❌ | ❌ | ❌ | ❌ |
| PATCH /api/app/config | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/app/franqueados | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/app/equipe | ✅ | ✅ própria | ❌ | ❌ | ❌ |
| POST /api/app/equipe | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /api/app/vagas/[id] PATCH | ✅ | ✅ própria | ✅ própria | ❌ | ❌ |
| POST /api/portal/empresa/avaliacoes | ❌ | ❌ | ❌ | ✅ própria | ❌ |
| GET /api/portal/estudante/perfil | ❌ | ❌ | ❌ | ❌ | ✅ próprio |

> ** = depende da permissão configurada no perfil do FUNCIONARIO

---

## 5. ENDPOINTS PÚBLICOS (sem autenticação — por design)

| Endpoint | Finalidade |
|----------|-----------|
| POST /api/public/estudante | Auto-cadastro de estudante via landing page |
| POST /api/public/empresa | Auto-cadastro de empresa via landing page |
| POST /api/public/lead | Captação de lead via formulário público |
| GET /api/public/vagas | Listagem pública de vagas abertas |
| GET /api/public/vaga/[slug] | Página pública de uma vaga específica |
| POST /api/public/vaga/inscrever | Candidatura de estudante já cadastrado |
| POST /api/public/vaga/inscrever-novo | Candidatura com cadastro simultâneo |
| POST /api/auth/forgot-password | Recuperação de senha |

---

## 6. SEGURANÇA DE SENHAS

- Algoritmo: bcrypt (10 rounds de salt)
- Senhas temporárias: `crypto.randomBytes(8)` (criptograficamente seguro)
- Senhas NÃO são retornadas em responses HTTP
- Recovery: senha temporária gerada e enviada APENAS por email
- Logs: email mascarado (`jo***@dom.com`) — senha nunca logada

---

## 7. JWT E SESSÃO

- Estratégia: JWT stateless
- maxAge: 30 dias
- Secret: `NEXTAUTH_SECRET` (variável de ambiente, mínimo 32 chars)
- Conteúdo do token: `{ id, role, franchiseId, companyId, studentId, permissoes[] }`
- Leitura: `getServerSession()` nas APIs (< 5ms, sem hit no banco)
- Middleware: `getToken()` sem banco para verificação rápida

---

## 8. HTTP SECURITY HEADERS

Configurados em `next.config.mjs` para todas as rotas:

| Header | Valor | Proteção |
|--------|-------|---------|
| X-Frame-Options | DENY | Anti-clickjacking |
| X-Content-Type-Options | nosniff | Anti-MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Privacidade de referer |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Restrição de APIs do browser |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Força HTTPS por 1 ano |

---

## 9. AUDITORIA

Ações críticas registradas em `activity_logs`:

| Ação | Quando |
|------|--------|
| LOGIN | Todo login bem-sucedido |
| EMPRESA_CRIADA | POST /api/app/empresas |
| ESTUDANTE_CRIADO | POST /api/app/estudantes |
| CONTRATO_EDITADO | PATCH /api/app/contratos/[id] |
| CONTRATO_STATUS_{X} | PATCH com mudança de status |
| CONTRATO_EXCLUIDO | DELETE /api/app/contratos/[id] |
| CRM_LEAD_CRIADO | POST /api/app/crm |
| FINANCEIRO_CRIADO | POST /api/app/financeiro |
| FINANCEIRO_BAIXA | PATCH com status PAGO |
| FINANCEIRO_REVERTIDO | PATCH action=reverter |
| FINANCEIRO_CANCELADO | PATCH com cancelado=true |
| FINANCEIRO_EDITADO | PATCH genérico |
| FINANCEIRO_EXCLUIDO | DELETE /api/app/financeiro/[id] |

IP real é capturado via `x-real-ip` (Vercel), `cf-connecting-ip` (Cloudflare), `x-forwarded-for`.

---

*Smarter Estágios — Permissões e Segurança V1 — 02/06/2026*
