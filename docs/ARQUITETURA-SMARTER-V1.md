# ARQUITETURA TÉCNICA — SMARTER ESTÁGIOS V1
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## 1. VISÃO GERAL

O Smarter Estágios é uma plataforma SaaS multi-tenant de gestão de estágios. A arquitetura é baseada em:

- **Next.js 14 App Router** — frontend e backend em um único repositório (fullstack monolítico serverless)
- **Supabase PostgreSQL** — banco de dados relacional gerenciado
- **Vercel** — deploy e hosting serverless
- **NextAuth.js** — autenticação com JWT stateless

```
Usuário (Browser)
      ↓ HTTPS
Vercel Edge Network
      ↓
Next.js App (Serverless Functions)
      ↓ Prisma ORM
Supabase PostgreSQL (São Paulo)
      ↓ (conforme necessário)
OpenAI API / Resend SMTP / Autentique
```

---

## 2. ESTRUTURA NEXT.JS

### App Router (pasta `app/`)
O sistema usa o **App Router** do Next.js 14, onde:
- Pastas dentro de `app/` definem rotas de página (Server Components por padrão)
- Arquivos `route.ts` dentro de `app/api/` definem Route Handlers (substituem as API Routes do Pages Router)
- O middleware (`middleware.ts` na raiz) intercepta todas as requisições antes de chegar às páginas

### Estrutura de rotas

```
app/
├── login/                     — Página de login
├── dashboard/                 — Portal do Franqueado/Franqueadora/Funcionário
│   ├── page.tsx               — Dashboard principal com KPIs
│   ├── empresas/              — CRUD de empresas parceiras
│   ├── estudantes/            — CRUD de estudantes
│   ├── contratos/             — Gestão de contratos/TCE
│   │   ├── [id]/              — Detalhe do contrato + documentos
│   │   └── novo/              — Wizard de criação
│   ├── financeiro/            — Lançamentos financeiros
│   ├── crm/                   — Pipeline de leads comerciais
│   ├── processos/             — Processos seletivos
│   ├── vagas/                 — Gestão de vagas publicadas
│   ├── instituicoes/          — IES cadastradas
│   ├── franqueados/           — Gestão de franqueados (só FRANQUEADORA)
│   ├── equipe/                — Funcionários da unidade
│   ├── assinaturas/           — Documentos enviados para assinatura digital
│   ├── configuracoes/         — Configurações do sistema
│   └── gamificacao/           — Ranking de gamificação
├── portal-empresa/            — Portal exclusivo da empresa parceira
│   ├── avaliacoes/            — Avaliação semestral do estagiário
│   ├── documentos/            — TCE e docs do contrato
│   ├── estagiarios/           — Estagiários vinculados
│   └── financeiro/            — Cobranças da empresa
├── portal-estudante/          — Portal exclusivo do estudante
│   ├── estagio/               — Dados do estágio ativo
│   ├── curriculo/             — Perfil e currículo
│   ├── disc/                  — Teste DISC comportamental
│   ├── vagas/                 — Vagas disponíveis
│   └── candidaturas/          — Candidaturas em andamento
├── cadastro/
│   ├── empresa/               — Auto-cadastro público de empresa
│   └── estudante/             — Auto-cadastro público de estudante
├── vaga/[slug]/               — Página pública de vaga
└── lead/                      — Captação de leads via link

app/api/
├── app/                       — APIs autenticadas (requerem sessão)
│   ├── admin/reset-data/      — Reset de dados (só FRANQUEADORA)
│   ├── ai/                    — Endpoints de IA (OpenAI)
│   ├── assinaturas/           — Listagem de docs aguardando assinatura
│   ├── config/                — Configurações do sistema
│   ├── contratos/             — CRUD de contratos
│   │   └── [id]/              — Editar/excluir + documentos/avaliações
│   ├── crm/                   — CRUD de leads CRM
│   ├── empresas/              — CRUD de empresas
│   ├── equipe/                — CRUD de funcionários
│   ├── estudantes/            — CRUD de estudantes
│   ├── financeiro/            — CRUD financeiro
│   ├── franqueados/           — CRUD de franqueados
│   ├── gamificacao/           — Ranking de gamificação
│   ├── instituicoes/          — CRUD de instituições
│   ├── processos/             — Processos seletivos
│   └── vagas/                 — Vagas de estágio
├── auth/
│   ├── [...nextauth]/         — Handler NextAuth
│   └── forgot-password/       — Recuperação de senha
├── portal/                    — APIs dos portais (empresa e estudante)
│   ├── empresa/               — Avaliações, solicitações
│   └── estudante/             — Perfil, currículo PDF, DISC
└── public/                    — APIs sem autenticação (cadastros públicos)
    ├── empresa/               — Auto-cadastro de empresa
    ├── estudante/             — Auto-cadastro de estudante
    ├── lead/                  — Captação de lead
    └── vaga/                  — Vagas públicas
```

### Componentes compartilhados (`components/`)
```
components/
├── ui/           — Botões, Cards, Badges, Inputs, Modais, Tabelas
├── layout/       — Sidebar, Header, Layout principal
├── forms/        — Formulários reutilizáveis
├── ai/           — Componentes de IA (gerador de vaga, parecer técnico)
└── estudantes/   — Componentes específicos de estudante
```

### Bibliotecas de negócio (`lib/`)
```
lib/
├── auth.ts           — Configuração NextAuth (providers, callbacks, JWT)
├── prisma.ts         — Instância singleton do Prisma Client
├── audit.ts          — logAudit() + getClientIP() (fire-and-forget)
├── permissions.ts    — checkPermission() para FUNCIONARIO
├── api-schemas.ts    — Schemas Zod de validação de entrada
├── aiService.ts      — callAI() com timeout 30s e retry logic
├── email.ts          — Templates e envio de email via Nodemailer/Resend
├── autentique.ts     — Integração com API do Autentique
├── getConfig.ts      — Leitura do SystemConfig com cache em memória
├── pdf-wrapper.ts    — Wrapper HTML→PDF para puppeteer/print
├── actions/          — Server Actions do Next.js (vagas, contratos)
├── documents/        — Templates HTML de documentos jurídicos
│   ├── templates.ts  — TCE, PE, Recibo, Rescisão, etc.
│   └── validate.ts   — Validação de campos obrigatórios do TCE
└── services/         — Serviços de documentos (documentService.ts)
```

---

## 3. AUTENTICAÇÃO E SESSÃO (NextAuth)

**Estratégia:** JWT stateless (sem banco para sessões)
**Provider:** Credentials (email + senha)
**maxAge:** 30 dias
**Secret:** variável `NEXTAUTH_SECRET`

**Fluxo de login:**
1. Usuário submete email + senha
2. `authorize()` busca o User no banco por email
3. `bcrypt.compare()` valida a senha
4. Token JWT é emitido com: `{ id, role, franchiseId, companyId, studentId, permissoes }`
5. Cada requisição subsequente usa `getServerSession()` ou `getToken()` para ler o JWT sem hit no banco

**Roles:** FRANQUEADORA, FRANQUEADO, FUNCIONARIO, EMPRESA, ESTUDANTE

---

## 4. BANCO DE DADOS (Supabase/PostgreSQL)

**Host:** Supabase managed PostgreSQL
**Região:** sa-east-1 (São Paulo)
**ORM:** Prisma 5.22
**Connection:** pooled connection via `DATABASE_URL` + direct via `DIRECT_URL`

O banco é acessado exclusivamente pelo Prisma Client. Não há queries SQL diretas no código de aplicação.

---

## 5. DEPLOY (Vercel)

**Tipo:** Serverless Functions (cada Route Handler vira uma função)
**Build command:** `next build`
**Trigger:** Push para branch `main` → deploy automático em produção
**Preview:** Pull Requests geram deploy preview automático
**Rollback:** Via Vercel Dashboard → Deployments → Promote

**Variáveis de ambiente configuradas no Vercel:**
`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `AUTENTIQUE_TOKEN`

---

## 6. INTEGRAÇÃO OpenAI

**SDK:** chamadas HTTP diretas via `fetch` (não usa SDK oficial)
**Modelo:** `gpt-4.1-mini` (mais rápido e barato)
**Localização:** `lib/aiService.ts`
**Timeout:** 30 segundos (AbortController)
**Rate limit:** HTTP 429 com mensagem amigável ao usuário

**Funcionalidades IA disponíveis:**
- Descrição de vaga: `/api/app/ai/vaga-descricao`
- Atividades do TCE: `/api/app/ai/tce-atividades`
- Parecer técnico de candidato: `/api/app/ai/parecer`
- Sugestão de testes: `/api/app/ai/sugestao-testes`
- Análise DISC: `/api/app/ai/disc-perfil`

Cada chamada é registrada em `AIUsageLog` com tokens consumidos e custo estimado.

---

## 7. SMTP / EMAIL (Resend + Nodemailer)

**Provider primário:** Resend (via API key `RESEND_API_KEY`)
**Fallback:** Nodemailer (SMTP genérico)
**Configuração:** `lib/email.ts` + `SystemConfig.resendApiKey`

**Emails enviados pelo sistema:**
- Boas-vindas estudante (com credenciais de acesso)
- Boas-vindas empresa (com credenciais de acesso)
- Boas-vindas colaborador/funcionário
- Recuperação de senha (forgot-password)
- Cobrança financeira (via `/api/app/financeiro/[id]/enviar-cobranca`)

---

## 8. ASSINATURA DIGITAL (Autentique)

**Provider:** Autentique (plataforma brasileira de assinatura eletrônica)
**Token:** configurado em `SystemConfig.autentiqueToken` (mascarado na UI)
**Localização:** `lib/autentique.ts`

**Fluxo de assinatura:**
1. Documento HTML é gerado e salvo em `InternshipDocument.htmlContent`
2. Usuário clica em "Enviar para Assinatura"
3. Sistema envia o documento via GraphQL API do Autentique
4. Autentique retorna um `authDocId` e links de assinatura para cada parte
5. Cada parte recebe email com link para assinar
6. Webhook ou verificação manual atualiza o status em `InternshipDocument`
7. Quando todos assinam, o PDF assinado fica disponível via `signedUrl`

---

## 9. MIDDLEWARE DE AUTENTICAÇÃO

**Arquivo:** `middleware.ts` (raiz do projeto)
**Executa em:** todas as rotas `/(dashboard|portal-empresa|portal-estudante)(/*)`

**Lógica:**
1. Lê token JWT com `getToken()` (sem hit no banco)
2. Se não autenticado → redireciona para `/login`
3. Se EMPRESA acessar `/dashboard` → redireciona para `/portal-empresa`
4. Se ESTUDANTE acessar `/dashboard` → redireciona para `/portal-estudante`
5. Se FUNCIONARIO: verifica `permissoes[]` da sessão vs rota acessada

---

## 10. FLUXO DE DADOS (REQUEST LIFECYCLE)

```
1. Browser → Vercel Edge (CDN)
2. Edge → Middleware (verifica JWT, redireciona se necessário)
3. Middleware OK → Next.js Server Component / Route Handler
4. Route Handler: getServerSession() → lê JWT (< 5ms, sem DB)
5. Route Handler: checkPermission() → verifica role/permissoes
6. Route Handler: ownership check → Prisma query com franchiseId
7. Prisma → Supabase PostgreSQL (conexão pooled)
8. Response → Browser
```

**Tempo típico por request:** 80-200ms (incluindo latência SA-EAST-1)

---

*Smarter Estágios — Arquitetura V1 — 02/06/2026*
