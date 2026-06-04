# INTEGRAÇÕES EXTERNAS V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## 1. OPENAI

| Item | Detalhe |
|------|---------|
| **Finalidade** | IA generativa para criação de textos e análise de perfis |
| **Modelo** | `gpt-4.1-mini` |
| **Autenticação** | API Key via `OPENAI_API_KEY` |
| **Arquivo** | `lib/aiService.ts` |
| **Timeout** | 30 segundos (AbortController) |
| **Rate limit** | HTTP 429 tratado com mensagem amigável |
| **Custo** | Por tokens consumidos — registrado em `ai_usage_logs` |

**Onde é utilizada:**
- `/api/app/ai/vaga-descricao` — Gerar descrição de vaga automaticamente
- `/api/app/ai/tce-atividades` — Sugerir atividades de estágio para o TCE
- `/api/app/ai/parecer` — Parecer técnico de candidato (match com vaga)
- `/api/app/ai/sugestao-testes` — Sugestão de testes para processo seletivo
- `/api/app/ai/disc-perfil` — Análise de perfil DISC do candidato

**Impacto se parar:**
- Funcionalidades de IA ficam indisponíveis com mensagem de erro amigável
- **Sistema continua funcionando** — IA é complementar, não crítica
- Criação de contratos, documentos, financeiro, etc. não são afetados

**Como substituir:**
- Trocar `OPENAI_API_KEY` por chave de outro provedor
- Ajustar o modelo em `lib/aiService.ts` (parâmetro `model`)
- Opções alternativas: Anthropic Claude API, Google Gemini, Mistral

---

## 2. SUPABASE (Banco de Dados)

| Item | Detalhe |
|------|---------|
| **Finalidade** | Banco de dados relacional (PostgreSQL) gerenciado |
| **Projeto** | `mepocerocoknzaotrove` (sa-east-1, São Paulo) |
| **Autenticação** | `DATABASE_URL` (pooler) + `DIRECT_URL` (direto) |
| **ORM** | Prisma 5.22 |
| **Arquivo** | `lib/prisma.ts` (singleton) |

**Onde é utilizado:** Em todo o sistema — todas as APIs fazem queries via Prisma ao Supabase.

**Impacto se parar:**
- **Sistema fica 100% indisponível** — banco de dados é dependência crítica
- Todas as páginas e APIs retornam erros
- SLA do Supabase: 99.9% no plano Pro

**Como substituir:**
- O Prisma abstrai o banco — pode migrar para qualquer PostgreSQL compatível
- Alternativas: Railway, PlanetScale (MySQL com ajustes), Neon, AWS RDS
- Processo: criar novo banco → rodar `prisma migrate deploy` → atualizar `DATABASE_URL`

---

## 3. VERCEL (Hosting e Deploy)

| Item | Detalhe |
|------|---------|
| **Finalidade** | Hosting serverless do Next.js + CDN global |
| **Projeto** | `prj_Ey24THXLUg242HFE6dJKxtS7XfLq` |
| **Autenticação** | Login Vercel + integração GitHub |
| **Deploy** | Automático via push para `main` |

**Onde é utilizado:** Hospeda toda a aplicação Next.js como serverless functions.

**Impacto se parar:**
- **Sistema fica 100% indisponível**
- SLA do Vercel: 99.99% no plano Pro

**Como substituir:**
- Next.js pode ser auto-hospedado em qualquer servidor Node.js
- Alternativas: Railway, Render, AWS Amplify, Docker em VPS
- Processo: `npm run build` → `npm start` em servidor próprio

---

## 4. RESEND / SMTP (Email)

| Item | Detalhe |
|------|---------|
| **Finalidade** | Envio de emails transacionais |
| **Provider primário** | Resend (API key `RESEND_API_KEY`) |
| **Provider de fallback** | Nodemailer (SMTP genérico) |
| **Arquivo** | `lib/email.ts` |

**Onde é utilizado:**
- Boas-vindas de estudante, empresa e colaborador (com credenciais)
- Recuperação de senha (forgot-password)
- Envio de cobranças financeiras
- Links de avaliação semestral

**Impacto se parar:**
- Usuários não recebem emails
- **Login ainda funciona** (senha pode ser alterada manualmente pelo franqueado)
- **Criação de contratos e documentos** não é afetada
- Novos cadastros públicos: usuário não recebe credenciais por email — risco operacional

**Como substituir:**
- Trocar `RESEND_API_KEY` por chave de outro provedor
- Alternativas: SendGrid, Mailgun, AWS SES, SMTP do Gmail/Zoho
- Ajuste mínimo em `lib/email.ts`: trocar o transport do Nodemailer

---

## 5. AUTENTIQUE (Assinatura Digital)

| Item | Detalhe |
|------|---------|
| **Finalidade** | Assinatura eletrônica de documentos jurídicos |
| **API** | GraphQL (https://app.autentique.com.br/graphql) |
| **Autenticação** | Token Bearer via `SystemConfig.autentiqueToken` |
| **Arquivo** | `lib/autentique.ts` |

**Onde é utilizado:**
- Envio de documentos para assinatura (TCE, PE, Rescisão, etc.)
- Verificação de status de assinatura
- Download de PDF assinado

**Fluxo técnico:**
1. Sistema envia documento HTML ao Autentique via GraphQL mutation
2. Autentique converte para PDF e cria links de assinatura por email
3. Sistema periodicamente verifica status via query GraphQL
4. PDF assinado disponível via `signedUrl`

**Impacto se parar:**
- **Envio para assinatura fica indisponível**
- Documentos podem ser **gerados e impressos** para assinatura física como alternativa
- Contratos já assinados: PDFs podem estar inacessíveis se `signedUrl` expirar
- Sistema continua funcionando para todo o resto

**Como substituir:**
- Alternativas brasileiras: DocuSign, ClickSign, Assine Online
- Ajuste necessário: adaptar `lib/autentique.ts` para a API do novo provedor
- Os campos `authDocId`, `signedUrl`, `signers` no `InternshipDocument` são genéricos e funcionam com qualquer provedor

---

## 6. TABELA DE CRITICIDADE

| Integração | Criticidade | Sistema sem ela |
|-----------|-------------|----------------|
| Supabase | 🔴 CRÍTICA | Indisponível totalmente |
| Vercel | 🔴 CRÍTICA | Indisponível totalmente |
| OpenAI | 🟢 BAIXA | Funciona (sem IA) |
| Resend/SMTP | 🟡 MÉDIA | Funciona (sem emails) |
| Autentique | 🟡 MÉDIA | Funciona (sem assinatura digital) |

---

*Smarter Estágios — Integrações Externas V1 — 02/06/2026*
