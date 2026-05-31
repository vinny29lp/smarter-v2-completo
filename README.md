# Smarter One V2 — Backend Funcional

Sistema completo de gestão de estágios com banco de dados real, autenticação, permissões por perfil e geração de documentos.

> ⚠️ Esta é a versão de **homologação/backend** — separada do protótipo navegável anterior.

---

## 🚀 Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma ORM** + **PostgreSQL (Supabase)**
- **NextAuth.js** (autenticação por credenciais)
- **Tailwind CSS**
- **Server Actions** (CRUD sem API REST separada)

---

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no [Supabase](https://supabase.com) (gratuita)
- npm ou yarn

---

## 1. Instalação

```bash
# Clone ou extraia o projeto
cd smarter-v2-backend

# Instale as dependências
npm install
```

---

## 2. Configurar o arquivo `.env`

Crie o arquivo `.env` na raiz do projeto:

```env
# ── BANCO DE DADOS (Supabase) ─────────────────────────────────
# Acesse: Supabase Dashboard > Settings > Database > URI
DATABASE_URL="postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres"

# ── NEXTAUTH ──────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="coloque-aqui-uma-string-aleatoria-de-32-caracteres-minimo"

# ── SUPABASE (para storage de arquivos) ───────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[SEU_PROJETO].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[sua-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[sua-service-role-key]"

# ── SMTP (HostGator) ──────────────────────────────────────────
SMTP_HOST="mail.seudominio.com.br"
SMTP_PORT="587"
SMTP_USER="noreply@seudominio.com.br"
SMTP_PASS="sua-senha-email"
SMTP_FROM="Smarter Estágios <noreply@seudominio.com.br>"

# ── AUTHENTIQUE (assinatura digital) ─────────────────────────
AUTHENTIQUE_API_TOKEN=""
AUTHENTIQUE_WEBHOOK_SECRET=""

# ── APP ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Como obter as credenciais do Supabase:

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Escolha nome, senha do banco e região (preferencialmente São Paulo)
4. Aguarde a criação (≈ 2 minutos)
5. Vá em **Settings → Database**
6. Copie a **Connection String → URI** → cole no `DATABASE_URL`
7. Vá em **Settings → API**
8. Copie `URL` → `NEXT_PUBLIC_SUPABASE_URL`
9. Copie `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
10. Copie `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Como gerar o NEXTAUTH_SECRET:

```bash
# No terminal (Linux/Mac):
openssl rand -base64 32

# Ou use o site: https://generate-secret.vercel.app/32
```

---

## 3. Rodar as Migrations (criar tabelas)

```bash
npx prisma migrate dev --name init
```

Isso vai criar todas as 20 tabelas no banco Supabase automaticamente.

> Se preferir usar `db push` sem migrations:
> ```bash
> npx prisma db push
> ```

---

## 4. Rodar o Seed (dados de teste)

```bash
npm run db:seed
```

Isso vai criar:
- Franqueadora master
- 1 Franqueado (Smarter São Paulo)
- 1 Empresa (TechCorp Brasil)
- 1 Estudante (Ana Lima)
- 1 Vaga
- 1 Contrato de estágio completo com 11 documentos
- Leads de CRM
- Lançamentos financeiros

---

## 5. Iniciar em modo desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 6. Build para produção

```bash
npm run build
npm start
```

---

## 7. Deploy no Vercel

### Opção A — GitHub (recomendado)

1. Crie um repositório no GitHub e faça push do projeto
2. Acesse [vercel.com](https://vercel.com) → **New Project**
3. Importe o repositório do GitHub
4. Em **Environment Variables**, adicione todas as variáveis do `.env`
5. Clique em **Deploy**

### Opção B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Configurações importantes no Vercel:

- **Framework Preset:** Next.js (detectado automaticamente)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

> ⚠️ Após o primeiro deploy, rode o seed via Vercel CLI ou diretamente no Supabase SQL Editor.

---

## 8. Usuários de Teste

Após rodar o seed, use estes acessos:

| Perfil | E-mail | Senha | Acesso |
|--------|--------|-------|--------|
| **Franqueadora** | admin@smarter.com.br | smarter123 | Visão completa da rede |
| **Franqueado** | franqueado@smarter.com.br | franq123 | Apenas dados da unidade SP |
| **Empresa** | empresa@techcorp.com.br | empresa123 | Apenas TechCorp Brasil |
| **Estudante** | estudante@email.com | estud123 | Apenas dados da Ana Lima |

---

## 9. Módulos Implementados ✅

### Autenticação
- [x] Login com e-mail e senha (bcrypt)
- [x] Sessões JWT com NextAuth.js
- [x] Proteção de rotas via middleware
- [x] Redirecionamento por perfil (FRANQUEADORA, FRANQUEADO, EMPRESA, ESTUDANTE)
- [x] Logout com redirecionamento
- [x] Log de atividade no login

### Banco de Dados
- [x] Schema Prisma completo com 20+ tabelas
- [x] Migrations versionadas
- [x] Seed com dados de teste
- [x] Relacionamentos entre todas as entidades

### Permissões por Perfil
- [x] Franqueadora vê toda a rede
- [x] Franqueado vê apenas dados da sua unidade (filtro por `franchiseId`)
- [x] Empresa vê apenas seus dados (filtro por `companyId`)
- [x] Estudante vê apenas seus dados (`studentId`)
- [x] Sidebar dinâmica por perfil

### Dashboard
- [x] KPIs vindos do banco em tempo real
- [x] Alertas automáticos (contratos pendentes, cobranças vencidas)
- [x] Lista de contratos recentes
- [x] Pontuação de gamificação
- [x] Dados protegidos por perfil

### Empresas
- [x] Listagem com dados reais do banco
- [x] Contagem de contratos por empresa
- [x] Status visual (Ativa, Inativa, Atenção)
- [x] Estrutura pronta para CRUD completo (create/update/delete via Server Actions)

### Estudantes
- [x] Listagem com dados reais do banco
- [x] Perfil DISC salvo no banco
- [x] Status (Disponível, Em Estágio, etc.)
- [x] Vínculo com Instituição de Ensino
- [x] Server Actions para criar/atualizar/salvar DISC

### Contratos de Estágio
- [x] Listagem com status real
- [x] 11 documentos criados automaticamente ao criar contrato
- [x] Vínculo com estudante, empresa e instituição
- [x] Todos os campos do TCE (supervisor, orientador, seguro, horários)
- [x] Status: PENDENTE, AGUARDANDO_ASSINATURA, ATIVO, VENCIDO, FINALIZADO

### CRM
- [x] Pipeline Kanban com dados reais
- [x] Leads por franqueado
- [x] Botão WhatsApp com wa.me real
- [x] Valor negociado
- [x] Prioridade

### Financeiro
- [x] Listagem de lançamentos do banco
- [x] KPIs de entradas, saídas e pendentes calculados em tempo real
- [x] Status (PAGO, PENDENTE, VENCIDO)
- [x] Server Actions para dar baixa, cancelar, criar lançamento

### Instituições
- [x] Tabela no banco
- [x] Vínculo com estudantes e contratos

---

## 10. O Que Ainda Falta Implementar 🚧

### Documentos Reais
- [ ] Formulários de criação (empresas, estudantes, contratos)
- [ ] Geração do HTML/PDF do TCE com dados do banco
- [ ] Salvar HTML gerado no banco (`internship_documents.htmlContent`)
- [ ] Download real em PDF (usando `html2pdf` ou Puppeteer via API route)
- [ ] Botão "Gerar" que popula o banco e retorna o documento

### Assinatura Digital (Authentique)
- [ ] Integração real com API do Authentique
- [ ] `POST /documents` com o HTML do documento
- [ ] Webhook para atualizar status de assinatura
- [ ] `authDocId`, `signedUrl`, `signedAt` salvos no banco

### E-mail (SMTP HostGator)
- [ ] Envio real via Nodemailer
- [ ] Template de boas-vindas para franqueados
- [ ] Template de cobrança com QR Code Pix
- [ ] Template de notificação de assinatura

### Upload de Arquivos
- [ ] Upload real para Supabase Storage
- [ ] Logo da Smarter nos documentos
- [ ] Anexo de boletos no financeiro
- [ ] Documentos assinados escaneados

### Formulários (CRUD Completo)
- [ ] Formulário de nova empresa (página `/dashboard/empresas/nova`)
- [ ] Formulário de novo estudante
- [ ] Formulário de novo contrato (3 etapas)
- [ ] Formulário de nova vaga
- [ ] Formulário de novo lead no CRM

### DISC Completo
- [ ] Tela do teste DISC para estudante
- [ ] Cálculo e salvar no banco via `saveDiscResult()`
- [ ] Gráfico animado do resultado
- [ ] Exibir DISC no currículo e processo seletivo

### Avaliação Semestral
- [ ] Geração de link único (`/avaliacao/[token]`)
- [ ] Formulário público para empresa responder
- [ ] Salvar respostas no banco (`evaluations.respostas`)
- [ ] Geração do PDF final

### Financeiro Avançado
- [ ] QR Code Pix configurável
- [ ] Integração SMTP para envio de cobranças
- [ ] Relatório mensal por período
- [ ] Dashboard financeiro da franqueadora (todos os franqueados)

### Importação Excel/CSV
- [ ] Upload de planilha
- [ ] Parser com validação
- [ ] Preview antes de confirmar
- [ ] Importar empresas, estudantes, contratos legados

### Processo Seletivo
- [ ] Candidatura de estudante a vaga (via link público)
- [ ] Kanban de candidatos por vaga
- [ ] Agendamento de entrevista com lembrete
- [ ] Parecer técnico com DISC

---

## 🗃️ Schema do Banco

Tabelas criadas pelo Prisma:

```
users                  — Todos os usuários do sistema
franchises             — Unidades franqueadas
companies              — Empresas parceiras
institutions           — Instituições de ensino
students               — Estagiários (perfil completo)
vacancies              — Vagas de estágio
applications           — Candidaturas a vagas
contracts              — Contratos de estágio
internship_documents   — 11 documentos por contrato
evaluations            — Avaliações semestrais
crm_leads              — Pipeline CRM
crm_tasks              — Tarefas do CRM
financials             — Lançamentos financeiros
disc_tests             — Testes DISC realizados
gamification_points    — Pontuação da gamificação
activity_logs          — Log de todas as ações
notifications          — Notificações dos usuários
uploaded_files         — Arquivos enviados
```

---

## 🔧 Comandos Úteis

```bash
npm run dev              # Desenvolvimento local
npm run build            # Build de produção
npm run db:generate      # Gerar Prisma Client após mudar schema
npm run db:migrate       # Rodar migrations
npm run db:push          # Enviar schema sem migration (dev rápido)
npm run db:seed          # Popular banco com dados de teste
npm run db:studio        # Abrir Prisma Studio (interface visual do banco)
npm run db:reset         # Resetar banco e rodar seed novamente
```

---

## 📁 Estrutura do Projeto

```
smarter-v2-backend/
├── app/
│   ├── layout.tsx              # Layout raiz com SessionProvider
│   ├── page.tsx                # Redireciona para /login ou /dashboard
│   ├── providers.tsx           # NextAuth SessionProvider
│   ├── login/
│   │   └── page.tsx            # Tela de login com acesso rápido para testes
│   ├── dashboard/
│   │   ├── layout.tsx          # Layout com sidebar (protegido por sessão)
│   │   ├── page.tsx            # Dashboard com KPIs reais do banco
│   │   ├── empresas/
│   │   ├── estudantes/
│   │   ├── contratos/
│   │   ├── crm/
│   │   ├── financeiro/
│   │   └── ... (outros módulos)
│   └── api/
│       └── auth/[...nextauth]/ # API route do NextAuth
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx         # Sidebar dinâmica por perfil
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── prisma.ts               # Singleton do Prisma Client
│   ├── auth.ts                 # Configuração do NextAuth
│   └── actions/
│       ├── auth.ts             # Server Actions de autenticação
│       ├── companies.ts        # CRUD de empresas
│       ├── students.ts         # CRUD de estudantes
│       ├── contracts.ts        # CRUD de contratos
│       ├── crm.ts              # CRUD do CRM
│       └── financial.ts        # CRUD financeiro
├── prisma/
│   ├── schema.prisma           # Schema completo do banco
│   └── seed.ts                 # Seed com dados de teste
├── types/
│   └── next-auth.d.ts          # Tipos estendidos do NextAuth
├── middleware.ts               # Proteção de rotas por perfil
├── .env                        # Variáveis de ambiente (não commitar!)
├── .env.example                # Template das variáveis
└── README.md                   # Este arquivo
```

---

## 🔐 Segurança

- Senhas hasheadas com **bcrypt** (10 rounds)
- Sessões **JWT** assinadas com `NEXTAUTH_SECRET`
- Rotas protegidas via **middleware** do Next.js
- Dados filtrados por `franchiseId` / `companyId` / `studentId` em todas as queries
- Sem dados de outras unidades visíveis para franqueados
- Sem dados de outras empresas visíveis para empresas

---

## 💡 Próximos Passos Sugeridos

1. **Configure o Supabase** e rode o seed
2. **Teste o login** com os 4 perfis
3. **Implemente os formulários** de criação (empresas, estudantes, contratos)
4. **Configure o SMTP** e teste o envio de e-mail
5. **Configure o Authentique** para assinatura digital real
6. **Implemente o upload** de arquivos no Supabase Storage
7. **Adicione o DISC** completo para estudantes

---

## 📞 Suporte

Desenvolvido para **Smarter Estágios**.  
Em caso de dúvidas técnicas, entre em contato com a equipe de desenvolvimento.
