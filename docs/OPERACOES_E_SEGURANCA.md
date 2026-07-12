# OPERAÇÕES E SEGURANÇA — Sistema Smarter

> **Público-alvo:** qualquer pessoa ou agente de IA que for mexer neste sistema.
> **Objetivo:** entender a arquitetura, diagnosticar erros, subir atualizações **sem quebrar
> nada que já funciona**, e conhecer as camadas de segurança que protegem os dados das unidades.
>
> **Leia isto ANTES de editar código, rodar migration ou fazer deploy.**
> Última auditoria de segurança/escala: **10/07/2026** (hardening adicional aplicado em **11/07/2026** — ver seção 7).

---

## 0. Regras de ouro (o que NUNCA fazer)

1. **NUNCA restaure/importe backup do banco para corrigir um bug de código.** Bug de código
   se corrige no código e faz deploy. Restaurar banco = perder tudo que entrou depois do
   snapshot (contratos, financeiro, cadastros das unidades). Ver `docs/ROLLBACK-PROCEDURE-V1.md`.
2. **NUNCA rode migration destrutiva** (`DROP`, `ALTER ... DROP COLUMN`, `prisma migrate reset`,
   `prisma db push` com perda de dados) em produção sem backup confirmado + checklist da seção 5.
3. **NUNCA versione segredos.** Nada de `.env`, chaves, senhas ou tokens em commit. O `.gitignore`
   já cobre `.env*`. Se um segredo vazar, **rotacione** (não só apague do histórico).
4. **NUNCA remova a checagem de sessão/role/franquia** de uma rota de API "pra facilitar".
   Isso é o que separa os dados de uma unidade da outra. Ver seção 3.
5. **NUNCA confie em ID vindo do corpo da requisição** para decidir de quem é o dado.
   Sempre resolva o dono no servidor a partir da sessão. (Foi exatamente a causa do IDOR
   crítico corrigido em 10/07/2026 — ver seção 3.1.)
6. **NUNCA desative RLS** de uma tabela sensível no Supabase (ver seção 3.4).

---

## 1. Arquitetura geral

| Camada | Tecnologia | Observação |
|--------|-----------|------------|
| Framework | **Next.js 14 (App Router)** | Rotas de API em `app/api/**/route.ts` |
| Hospedagem | **Vercel** (região `gru1` — São Paulo) | Serverless. Deploy automático no push da `main` |
| ORM | **Prisma 5** | `lib/prisma.ts` (singleton). Schema em `prisma/schema.prisma` |
| Banco | **Supabase Postgres** (`mepocerocoknzaotrove`, sa-east-1) | Acesso via **pooler** (porta 6543) |
| Auth | **NextAuth** (JWT, credenciais) | `lib/auth.ts`. Sessão de 8h |
| Storage | **Supabase Storage** (bucket `marketing-assets`) | Uploads de marketing |
| E-mail | **Resend** / SMTP | `lib/email.ts` |
| Pagamentos | **Cora** (boleto + PIX) | `lib/cora/*`, webhook em `app/api/webhooks/cora` |
| Assinatura | **Autentique** | `lib/autentique.ts` |
| IA | **OpenAI** | `lib/aiService.ts` |

### Perfis de acesso (roles)
`FRANQUEADORA` (admin global) · `FRANQUEADO` (dono de unidade) · `FUNCIONARIO` (equipe da unidade,
com permissões por módulo) · `EQUIPE` (equipe da franqueadora) · `EMPRESA` (portal da empresa) ·
`ESTUDANTE` (portal do estudante).

### Modelo multi-tenant (MUITO IMPORTANTE)
- A **âncora do isolamento é `franchiseId`**. Empresas, contratos, financeiro, vagas, processos,
  leads de CRM pertencem a **uma** franquia e **não podem** ser vistos/alterados por outra.
- **Exceção proposital:** `students` são um **pool global** (`franchiseId = null`, "ligados ao Admin").
  Todas as unidades enxergam todos os estudantes. É decisão de arquitetura — não é bug. (Tem
  implicação de LGPD; ver seção 6.)
- `FRANQUEADORA` e `EQUIPE` enxergam a rede toda. `FRANQUEADO`/`FUNCIONARIO` só a própria unidade.

---

## 2. Como funcionam os crons (cobrança recorrente e manutenção)

Configurados em `vercel.json`. Todos aceitam `Authorization: Bearer $CRON_SECRET` (Vercel Cron)
**ou** sessão `FRANQUEADORA` autenticada. **Se `CRON_SECRET` não estiver setado na Vercel, os
crons falham com 403** — confira essa env antes de confiar na automação.

| Cron | Quando | O que faz |
|------|--------|-----------|
| `/api/cron/fechar-mes` | dia 23, 05h BRT | Gera as cobranças de Franquia (mensalidade + R$13/estagiário ativo) da competência do mês seguinte |
| `/api/cron/emitir-boletos` | dia 2, 08h BRT | Emite o boleto Cora das cobranças do mês e envia e-mail à unidade |
| `/api/cron/verificar-boletos-cora` | diário, 07h BRT | Consulta a Cora e dá baixa nos boletos pagos |
| `/api/cron/lembretes-atraso` | diário, 08h BRT | Marca PENDENTE→VENCIDO, envia lembrete a cada 5 dias, detecta inadimplência 30+ dias |
| `/api/app/admin/cleanup` | domingo, 03h | Remove logs de auditoria 90+ dias e notificações lidas 30+ dias |

**Idempotência:** `fechar-mes` deduplica por `franchiseId + competencia` (não roda duas cobranças
para a mesma competência). **Sempre teste com `?dryRun=true` antes de rodar manualmente.**
Desde 11/07/2026 essa dedup também é garantida por um índice único parcial no banco
(`financials_franquia_competencia_unique`, categoria=Franquia e não cancelado) — mesmo em
race condition ou reexecução simultânea do cron, a segunda tentativa falha por violação de
constraint em vez de criar cobrança duplicada.

---

## 3. Camadas de segurança

### 3.1 Autenticação e sessão (`lib/auth.ts`, `middleware.ts`)
- NextAuth com **JWT**, sessão de **8 horas** (`maxAge`). Cookies `httpOnly` + `SameSite=lax`
  (protege contra CSRF em mutações cross-site) — mantido pelo NextAuth por padrão.
- Senhas com **bcrypt**. Rate limit de **10 tentativas/min por e-mail** no login.
- O JWT revalida a cada 1h se o usuário ainda está `active` (desativou → derruba na próxima hora).
- **Nunca** logue e-mail/CPF/senha em texto claro. O login já mascara o e-mail nos logs.

### 3.2 Autorização por rota — o padrão obrigatório
Toda rota de API que lê/escreve dado de uma unidade **deve**:
1. `const session = await getServerSession(authOptions); if (!session) return 401;`
2. `checkPermission(session, "<modulo>")` para FUNCIONARIO/EQUIPE (ver `lib/permissions.ts`);
3. **Escopo de franquia** — comparar o dono do registro com a sessão:

```ts
const role = session.user.role || "";
if (role !== "FRANQUEADORA" && registro.franchiseId !== session.user.franchiseId) {
  return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
}
```

Rotas de referência que fazem certo: `empresas/[id]`, `contratos/[id]`, `crm/[id]`,
`vagas/[id]`, `processos/[id]`. **Copie esse padrão** ao criar uma rota nova.

> **Regra de ouro:** para descobrir de quem é o dado, use a **sessão** + o **ID da URL**.
> Nunca use um `userId`/`franchiseId` que veio no corpo (body) para decidir permissão —
> ele é controlado pelo atacante.

### 3.3 Headers e CSP (`middleware.ts`)
- **Content-Security-Policy com nonce por request** (`script-src 'self' 'nonce-…' 'strict-dynamic'`).
  Isso bloqueia scripts injetados (XSS) mesmo que dado do usuário caia num HTML sem escape —
  é a rede de proteção das rotas que geram PDF/HTML (currículo, CPS, solicitação de vaga).
  **Não afrouxe a CSP** (não adicione `'unsafe-inline'` em `script-src`).

### 3.4 RLS no Supabase
- As tabelas sensíveis (`students`, `contracts`, `financials`, `companies`, `franchises`,
  `users`, `institutions`, evaluations, documents, applications, etc.) **têm RLS ativo** e
  retornam vazio para a chave anônima pública. **Confirmado em 10/07/2026.**
- O app acessa dados via Prisma (role `postgres`, que ignora RLS) — então a segurança dos dados
  no app vem da **seção 3.2**, não do RLS. O RLS protege contra acesso direto pela API REST do
  Supabase usando a `anon key` (que é pública, vai no bundle do browser).
- `user_session_logs` recebeu RLS em 10/07/2026 (aplicado no Supabase, ver seção 7). Restam
  sem RLS: `marketing_conteudos`, `marketing_calendario` — conteúdo público, ok.

### 3.5 Uploads
- `marketing/upload` → Supabase Storage (persistente). Valida tipo e tamanho. OK.
- `upload-arquivo` → migrado em 11/07/2026 para Supabase Storage (bucket `marketing-assets`,
  pasta `sistema/`), mesmo padrão do `marketing/upload`. Antes gravava em `public/uploads`
  (não persiste em serverless — arquivo sumia no próximo redeploy). Usado por Configurações
  (assinatura do responsável + documentos de IES).

### 3.6 Segredos
- Nenhum `.env` está no git (confirmado). `.gitignore` cobre `.env*`.
- Chaves usadas: `NEXTAUTH_SECRET`, `DATABASE_URL`/`DIRECT_URL`, `CRON_SECRET`, `CORA_*`,
  `OPENAI_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTHENTIQUE_API_TOKEN`.
  Todas via `process.env`, nenhuma hardcoded.

---

## 4. Diagnóstico de erros comuns

| Sintoma | Causa provável | Como investigar / resolver |
|---------|----------------|----------------------------|
| Página branca / 500 numa rota | Exceção não tratada | Ver logs na Vercel. Rotas devem usar `handleApiError` (`lib/api-response.ts`). Rodar `npx tsc --noEmit` |
| Timeout / "connection pool" sob carga | Pool do Prisma esgotado | `lib/prisma.ts` usa `connection_limit=3` (ajustável via env `PRISMA_POOL_SIZE`). Com o pooler + `pgbouncer=true`, é seguro; se persistir, subir para 5 e monitorar |
| "prepared statement already exists" | `pgbouncer=true` faltando na `DATABASE_URL` | Confirmar que a URL do pooler (6543) termina com `?pgbouncer=true` |
| Cron não roda (403) | `CRON_SECRET` não setado na Vercel | Setar a env; o cron aceita `Authorization: Bearer $CRON_SECRET` |
| Boleto não dá baixa | Webhook Cora falhou | O cron `verificar-boletos-cora` (diário) é a rede de segurança — consulta a Cora e concilia |
| Estudante/empresa "não encontrado" p/ um FRANQUEADO | Escopo de franquia (correto!) | Só a FRANQUEADORA vê a rede toda. Não "conserte" removendo o filtro |
| Erro de unicidade num cadastro | Constraint violada (CNPJ/e-mail) | Diferenciar qual campo violou pelo `err.meta.target`, não assumir |

**Saúde do sistema em tempo real:** `GET /api/app/saude` (só FRANQUEADORA/EQUIPE-saude) — latência do
banco, contagens, status de deploy/e-mail, semáforos de capacidade.

---

## 5. Checklist de deploy seguro (NÃO pule)

Antes de subir qualquer atualização para produção:

1. **`npx tsc --noEmit`** — zero erros de tipo.
2. **`npm run build`** localmente — o build tem que passar.
3. **Revisar migrations:** houve mudança em `prisma/schema.prisma`?
   - As migrations aqui são **arquivos `.sql` manuais** em `prisma/migrations/`, aplicados à mão
     no Supabase — **não é o fluxo padrão do `prisma migrate`**. Isso significa risco de *drift*
     (schema do código ≠ banco). Ao mudar o schema: escreva o `.sql` correspondente, aplique no
     Supabase (SQL Editor) e confirme com `prisma db pull` que o schema bate. **Nunca** rode
     `prisma migrate reset`/`db push` destrutivo em produção.
   - Toda mudança de schema deve ser **aditiva** (nova coluna nullable, nova tabela). Renomear/
     remover coluna exige migração em 2 passos (adicionar novo → migrar dados → remover velho).
4. **Autorização:** toda rota nova que toca dado de unidade tem os 3 passos da seção 3.2?
5. **Segredos:** nenhum `.env`/chave no diff (`git diff --staged`).
6. **Teste o caminho crítico** afetado (contrato, financeiro, cadastro) num ambiente/preview.
7. Deploy = **push na `main`** (Vercel builda e publica). Acompanhe o build na Vercel.
8. **Rollback:** se quebrar, reverta o commit e faça push (a Vercel republica). Ver
   `docs/ROLLBACK-PROCEDURE-V1.md`. **NÃO** mexa no banco para "consertar" bug de código.

---

## 6. Backup e recuperação de dados

- **Onde:** Supabase, projeto `mepocerocoknzaotrove`. Ver `docs/BACKUP-SUPABASE-STABLE-V1.md`
  e `docs/BACKUP-E-RECUPERACAO-V1.md`.
- **⚠️ Confirmar no painel do Supabase (Settings → Database → Backups):** qual é o plano e se
  **PITR (Point-in-Time Recovery)** está ativo. Para operar como sistema único de produção com
  40 unidades, o recomendado é ter **backup diário + PITR**. Se o projeto estiver no plano free,
  não há PITR e a janela de backup é limitada — **isso deve ser resolvido antes de desativar o
  sistema antigo.** (Não altere o plano sem aprovação — envolve custo.)
- Exportação manual periódica (defesa extra): `pg_dump` via `DIRECT_URL` (porta 5432).

---

## 7. Histórico de hardening (auditoria 10/07/2026)

Corrigido e commitado (aditivo, sem quebrar comportamento legítimo):
- **IDOR crítico** em `estudantes/[id]` (change_password/change_email): passou a resolver o
  `userId` a partir do estudante da URL, ignorando `body.userId`. Antes permitia trocar a senha
  de qualquer usuário (inclusive FRANQUEADORA) → account takeover.
- **Escopo de franquia** adicionado em `empresas/[id]/email`, `empresas/[id]/cps` (GET/PATCH),
  `empresas/[id]/solicitacoes` (GET) e `.../solicitacoes/[solId]` (GET/PATCH).
- `.gitignore` reforçado para cobrir `.env*`.

Recomendações que exigem aprovação/mudança em produção (ver relatório da auditoria):
RLS em `user_session_logs`; validação de assinatura/consulta do webhook Cora; constraint única
para o fechamento mensal; migração de `upload-arquivo` para Supabase Storage; confirmação do
plano de backup/PITR do Supabase.

## 8. Hardening adicional (11/07/2026)

Corrigido e commitado (aditivo, sem quebrar comportamento legítimo):
- **Webhook Cora não confia mais no payload.** `app/api/webhooks/cora/route.ts` trata o corpo do
  POST como gatilho; antes de alterar qualquer lançamento, reconsulta o status real do boleto na
  Cora via `consultarBoleto()` (mTLS, mesma função do cron `verificar-boletos-cora`). Um webhook
  forjado não consegue mais mudar estado financeiro. Não tocou em `lib/cora/`.
- **Constraint única no banco para o fechamento mensal** — ver seção 2. Verificado 0 duplicatas
  antes de aplicar; teste de inserção duplicada bloqueado corretamente pelo índice.
- **`upload-arquivo` migrado para Supabase Storage** — ver seção 3.5.

Pendente/decisão do usuário:
- Confirmação do plano de backup/PITR do Supabase (envolve custo — não avaliado nesta rodada).
- Stash local `temp-cora` com ~10 arquivos de mudanças não relacionadas (senha gerada com
  `crypto.randomBytes`, escopo de `franquia-crm` restrito a FRANQUEADORA, cálculo de recesso
  proporcional em rescisão, advisory lock em número de contrato, painel de alertas no dashboard)
  ficou de uma sessão anterior travada — não avaliado nem aplicado nesta rodada, aguardando
  decisão do usuário sobre o que fazer com ele.
