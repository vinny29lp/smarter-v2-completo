# PROJECT-RECOVERY.md

Documento mestre de recuperação do projeto **smarter-v2-completo**.

Se algo der errado, **comece por aqui.**

---

## Identidade do projeto

| Campo | Valor |
|---|---|
| Nome | Smarter Estágios — Sistema multi-tenant para franquias de agentes de integração |
| Pasta local | `~/Desktop/smarter/smarter-v2-completo` |
| package.json name | `smarter-v2-backend` (nome interno) |
| Stack | Next.js 14.2.35 (App Router) + NextAuth 4 + Prisma 5 + Supabase Postgres + TypeScript 5 + Tailwind 3.4 |
| Banco em produção | Supabase: `postgres.mepocerocoknzaotrove` (região `aws-0-sa-east-1`) |
| Versão Node recomendada | 20.x (compatível com Next 14 e Prisma 5) |
| Versão npm | 10.x ou superior |

---

## Cenários de recuperação

### Cenário A — Quebrei alguma coisa e quero voltar pro estado anterior

1. **Se tem um `.tar.gz` recente em `backups/`:**
   ```bash
   cd ~/Desktop/smarter
   mv smarter-v2-completo smarter-v2-completo_QUEBRADO_$(date +%Y%m%d)
   tar -xzf smarter-v2-completo_QUEBRADO_*/backups/smarter-v2-completo_AAAA-MM-DD_HH-MM-SS.tar.gz
   cd smarter-v2-completo
   npm install
   npx prisma generate
   npm run dev
   ```

2. **Se não tem `.tar.gz` mas tem git:**
   ```bash
   cd ~/Desktop/smarter/smarter-v2-completo
   git status                   # vê o que mudou
   git stash                    # guarda as mudanças temporariamente
   git checkout main            # volta pra branch principal
   # ou: git reset --hard HEAD~1  ← desfaz último commit (CUIDADO: perde código)
   ```

3. **Se não tem nem `.tar.gz` nem git:**
   - Tem o snapshot textual dos arquivos críticos em `backups/BACKUP-STABLE-2026-05-18/`
   - Pode copiar de lá: `package.json`, `schema.prisma`, `middleware.ts`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `.env.example`
   - Para o resto do código (`/app`, `/components`, `/lib`): você tem outras versões em pastas irmãs (`smarter-v2-portais-bloco-b`, `smarter-v2-evolucao`, etc.) que podem servir de referência para reconstruir

### Cenário B — Estou em um Mac novo / formatei tudo

1. Instale Node 20.x e npm:
   ```bash
   # Via Homebrew (recomendado)
   brew install node@20
   ```

2. Restaure o projeto do backup `.tar.gz` mais recente OU clone do git:
   ```bash
   cd ~/Desktop
   mkdir -p smarter && cd smarter
   tar -xzf /caminho/do/backup.tar.gz
   # ou: git clone <repo-url> smarter-v2-completo
   cd smarter-v2-completo
   ```

3. Configure variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite .env com os valores reais
   ```

4. Instale dependências e prepare banco:
   ```bash
   npm install
   npx prisma generate
   # Para banco novo (CUIDADO: zera dados):
   # npx prisma db push
   # npx prisma db seed
   ```

5. Rode em desenvolvimento:
   ```bash
   npm run dev
   ```
   Abre em `http://localhost:3000`.

### Cenário C — Deploy quebrou na Vercel

1. Confira logs em [vercel.com → Project → Deployments → último deploy → View logs]
2. Erros comuns:
   - **`PrismaClientInitializationError`** → falta `DATABASE_URL` nas variáveis de ambiente do Vercel
   - **`NextAuthError: Missing secret`** → falta `NEXTAUTH_SECRET`
   - **`Module not found`** → algum import quebrado; rode `npm run build` localmente para reproduzir
3. Para reverter um deploy:
   - Vercel → Project → Deployments → encontre o último que funcionou → ⋯ → **Promote to Production**
4. Se nada disso resolve:
   ```bash
   cd ~/Desktop/smarter/smarter-v2-completo
   git checkout <hash-do-último-deploy-que-funcionava>
   git push origin main --force-with-lease
   ```

### Cenário D — Supabase ficou inacessível

1. Confira em [status.supabase.com] se há incidente
2. Confira em [supabase.com/dashboard] se o projeto está pausado (planos free pausam após inatividade)
3. Se o projeto foi deletado:
   - Crie um novo projeto Supabase
   - Anote nova `DATABASE_URL` e chaves
   - Atualize `.env` local e variáveis do Vercel
   - Rode `npx prisma db push` e `npx prisma db seed`

---

## Rodar localmente — passo a passo

```bash
cd ~/Desktop/smarter/smarter-v2-completo

# 1. Variáveis de ambiente
cp .env.example .env
# Edite .env com:
#   DATABASE_URL=<URL do Supabase>
#   NEXTAUTH_SECRET=<gere com: openssl rand -base64 32>
#   NEXTAUTH_URL=http://localhost:3000

# 2. Dependências
npm install

# 3. Prisma
npx prisma generate
# Se for primeira vez (banco vazio):
# npx prisma db push    ← cria as tabelas
# npx prisma db seed    ← popula com dados iniciais

# 4. Roda
npm run dev
```

Abrir: `http://localhost:3000`

### Usuários iniciais do seed

Veja `prisma/seed.ts` para confirmar, mas tipicamente o seed cria:
- 1 usuário FRANQUEADORA (admin do sistema)
- Configuração padrão do `SystemConfig`

Login no `/login` com email + senha definidos no seed.

---

## Deploy na Vercel

### Pré-requisitos

1. Conta Vercel: [vercel.com](https://vercel.com)
2. Repositório git (GitHub/GitLab/Bitbucket)
3. Banco Supabase já criado e migrado

### Passos

1. **Conectar repositório:**
   - Vercel Dashboard → Add New → Project → Import Git Repository

2. **Configurar projeto:**
   - Framework Preset: `Next.js` (autodetectado)
   - Root Directory: `.` (raiz)
   - Build Command: `next build` (autodetectado)
   - Output Directory: `.next` (autodetectado)
   - Install Command: `npm install`

3. **Variáveis de ambiente (Settings → Environment Variables):**

   **OBRIGATÓRIAS:**
   ```
   DATABASE_URL                    = postgresql://...:6543/postgres?pgbouncer=true
   DIRECT_URL                      = postgresql://...:5432/postgres
   NEXTAUTH_URL                    = https://seu-dominio.vercel.app
   NEXTAUTH_SECRET                 = <openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL             = https://seu-dominio.vercel.app
   ```

   **OPCIONAIS (storage Supabase, email, assinatura):**
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://[projeto].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJh...
   SUPABASE_SERVICE_ROLE_KEY       = eyJh...  (NUNCA expor no client)
   SMTP_HOST                       = mail.seudominio.com.br
   SMTP_PORT                       = 587
   SMTP_USER                       = noreply@seudominio.com.br
   SMTP_PASS                       = ...
   SMTP_FROM                       = "Smarter Estagios <noreply@seudominio.com.br>"
   AUTHENTIQUE_API_TOKEN           = ...
   AUTHENTIQUE_WEBHOOK_SECRET      = ...
   ```

4. **Deploy:**
   - Clique em "Deploy"
   - Primeiro build leva ~3-5 min
   - Quando terminar, o site fica em `https://[projeto]-[hash].vercel.app`

5. **Domínio próprio (opcional):**
   - Settings → Domains → Add → seu-dominio.com.br
   - Vercel mostra os DNS records (A ou CNAME) que você adiciona no painel do registro do domínio
   - Após propagação (5-30 min), o domínio funciona

### Rotina pós-deploy

Sempre que fizer push pra branch principal, Vercel faz deploy automático.

Para preview de Pull Request: cada PR gera um deploy de preview com URL única.

---

## Variáveis de ambiente — referência completa

### DATABASE_URL e DIRECT_URL

Supabase tem duas connection strings:
- **DATABASE_URL** (pgbouncer, porta 6543): para consultas runtime (mais robusta)
- **DIRECT_URL** (porta 5432): para migrations Prisma

Ambas em: Supabase Dashboard → Settings → Database → Connection String.

### NEXTAUTH_SECRET

Mínimo 32 caracteres. Gere com:
```bash
openssl rand -base64 32
```

**NUNCA reutilize o mesmo secret entre dev e produção.**

### Storage Supabase

Se for usar upload de arquivos (logos, fotos), criar bucket no Supabase Storage e configurar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (uso público, ok no client)
- `SUPABASE_SERVICE_ROLE_KEY` (uso server-only, NUNCA no client)

### SMTP HostGator

Para envio de emails transacionais (notificações, recuperação de senha).

### Authentique

Para assinatura digital de contratos/TCEs.

---

## Dependências críticas — versões fixadas

```
next:           14.2.35   ← App Router, Server Actions
next-auth:     ^4.24.14   ← JWT, Credentials provider
@prisma/client: ^5.22.0
prisma:         ^5.22.0
react:           ^18
react-dom:       ^18
typescript:      ^5
tailwindcss:    ^3.4.1
zod:            ^4.3.6
bcryptjs:       ^3.0.3
lucide-react:   ^1.11.0   ⚠️  VERSÃO ANTIGA (atual é 0.4+); pode precisar atualizar pra usar ícones modernos
clsx:           ^2.1.1
```

⚠️ **Nota sobre lucide-react `^1.11.0`:** essa versão é muito antiga (a numeração nova vai de 0.1 a 0.500+). Talvez tenha entrado errado no package.json. Verificar em Etapa 5.

---

## Rotas principais do sistema

| Rota | Quem acessa | Descrição |
|---|---|---|
| `/login` | Todos (público) | Tela de login |
| `/dashboard` | FRANQUEADO + FRANQUEADORA | Dashboard administrativo |
| `/dashboard/estudantes` | idem | Lista de estudantes |
| `/dashboard/empresas` | idem | Lista de empresas |
| `/dashboard/contratos` | idem | Lista e gestão de contratos |
| `/portal-empresa` | EMPRESA | Portal da empresa cliente |
| `/portal-estudante` | ESTUDANTE | Portal do estudante |
| `/api/auth/[...nextauth]` | Sistema | Endpoints NextAuth |

Middleware (`middleware.ts`) faz redirecionamento por role automaticamente.

---

## Riscos e advertências (lidos durante esta auditoria)

🚨 **`.env.vercel` contém credenciais reais e NÃO está no `.gitignore`** — pode estar versionado no GitHub. Ações sugeridas:
1. Adicionar `.env.vercel` ao `.gitignore` AGORA
2. Se já estiver versionado: rotacionar `NEXTAUTH_SECRET`, senha do Supabase, e quaisquer outras chaves expostas
3. Usar `git filter-branch` ou `BFG Repo-Cleaner` para remover histórico

🚨 **Múltiplas versões do projeto no Mac** — `smarter-v2-completo`, `smarter-v2-backend`, `smarter-v2-portais-bloco-b`, `smarter-v2-evolucao`, etc. Risco de editar a versão errada. Recomendação: arquivar as versões antigas (mover para disco externo ou `legacy/`).

⚠️ **Sem testes automatizados** — não vi `jest`, `vitest`, `playwright` no `package.json`. Etapa 4 precisará ser feita manualmente ou adicionar framework de testes.

⚠️ **`lucide-react ^1.11.0`** — versão suspeita, ver nota acima.

---

## Próximos passos (próximas sessões)

| Etapa | O que entrega |
|---|---|
| 2 — Inventário | `SYSTEM-MAP.md` com todas rotas/APIs/dependências/integrações |
| 3 — Organização | Refatorar `components/`, `lib/`, `services/`, mover legados |
| 4 — Teste funcional | Validar fluxos no Chrome real, listar bugs |
| 5 — Correções | Corrigir bugs encontrados, sem inventar features |
| 6 — Produção | Validar build, env vars, segurança |
| 7 — Beta | Deploy + monitoramento + 1º franqueado |

Cada uma é uma sessão própria. Quando começar, traga este `PROJECT-RECOVERY.md` aberto.

---

## Contatos / acessos

| Recurso | Onde |
|---|---|
| Email da conta | viniciusmfp29@gmail.com |
| Supabase | https://supabase.com/dashboard/project/mepocerocoknzaotrove |
| Vercel | https://vercel.com (login com mesmo email) |
| Sistema de assinatura | https://app.authentique.com.br (se usado) |

Salve este documento. Em produção, mantenha uma cópia também no Google Drive ou Notion.
