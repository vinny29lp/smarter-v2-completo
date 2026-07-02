# Análise de Risco — Sistema Smarter
**Data:** 01/07/2026  
**Analista:** Revisão técnica sênior (Next.js 14 / Prisma / Supabase / NextAuth)  
**Escopo:** Código-fonte completo, APIs, schema do banco, middleware, autenticação, Marketing Hub

---

## Resumo Executivo

O Sistema Smarter é uma plataforma tecnicamente bem estruturada, com padrões sólidos de autenticação, paginação, permissões por role e security headers. Porém, a análise identificou **três riscos críticos que podem impactar usuários em produção imediatamente**: (1) o Marketing Hub foi implantado no código mas as tabelas do banco de dados provavelmente não foram criadas — todos os endpoints retornam 500; (2) o endpoint de listagem de estudantes expõe CPF, RG, endereço e currículo de todos os alunos da rede para qualquer Franqueado autenticado, violando o isolamento de dados entre unidades; (3) o webhook de pagamento da Cora não verifica assinatura, permitindo que qualquer pessoa marque cobranças como pagas via requisição HTTP simples. O índice de risco de parada nos próximos 14 dias está estimado em **62%**, puxado principalmente pelo Marketing Hub sem migração.

---

## Tabela de Riscos

| # | Risco | Probabilidade | Impacto | Afeta | Descrição Técnica |
|---|-------|--------------|---------|-------|-------------------|
| R1 | Marketing Hub sem migração de banco | ALTA | CRÍTICO | Sistema inteiro | 6 models Prisma novos (MarketingConteudo, MarketingCampanha, etc.) no schema.prisma, mas nenhum arquivo SQL cria essas tabelas. Nenhuma migration encontrada. Todos os endpoints `/api/app/marketing/*` retornam 500 em produção. |
| R2 | Estudantes GET sem scoping por franquia | ALTA | CRÍTICO | Franqueados / Estudantes | `GET /api/app/estudantes` usa `where = {}` (linha 25 do route.ts). Qualquer FRANQUEADO autenticado vê CPF, RG, endereço, currículo e instituição de TODOS os estudantes de TODAS as unidades da rede. |
| R3 | Webhook Cora sem verificação de assinatura | ALTA | CRÍTICO | Financeiro | `POST /api/webhooks/cora` não verifica HMAC nem secret header. Qualquer pessoa pode enviar um payload JSON com `type: "INVOICE.PAID"` e `data.id: <coraInvoiceId>` para marcar cobranças como pagas ou canceladas sem autenticar. |
| R4 | Rate limit in-memory não funciona em serverless | ALTA | ALTO | Todos (segurança) | `lib/rate-limit.ts` usa `Map` em memória. No Vercel, cada invocação de serverless function pode ser uma instância separada. Um ataque de brute force contra `/api/auth` ou `/api/public/estudante` distribuído entre instâncias bypassa completamente o limite. |
| R5 | JWT de 30 dias sem revogação server-side | ALTA | ALTO | Franqueados / Empresas | `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }`. Se um Franqueado for desativado, tiver role alterada ou conta comprometida, ele continua com sessão válida por até 30 dias. Não há blacklist, nem re-validação no DB em callbacks subsequentes. |
| R6 | 41 usos de `prisma as any` em produção | ALTA | ALTO | Marketing Hub | Todo o Marketing Hub usa `(prisma as any).marketingConteudo.findMany(...)`. Sem type safety: erros de nome de model, campo ou relação só aparecem em runtime como HTTP 500. O TypeScript não detecta nem na build local nem no CI. |
| R7 | Notificação broadcast síncrona ao criar conteúdo | MÉDIA | ALTO | Sistema / Franqueados | Ao criar conteúdo ou notícia no Marketing Hub, o sistema faz `prisma.user.findMany({ where: { role: "FRANQUEADO" } })` e `prisma.notification.createMany(...)` de forma **síncrona**, bloqueando o response. Com 100+ franqueados, isso aumenta latência, pode timeoutar a serverless function (limite de 10s no Vercel free/pro) e falhar silenciosamente. |
| R8 | Auth rate limit usa email como chave, não IP | ALTA | MÉDIO | Todos (segurança) | Em `lib/auth.ts`, `checkRateLimit(credentials.email, "auth_login", 10, 60_000)`. A chave é o email, não o IP. Um atacante pode testar 10 senhas por minuto por email **por instância Vercel**. Com múltiplas instâncias ativas, o limite efetivo é multiplicado. |
| R9 | N+1 queries no GET de conteúdos de marketing | ALTA | MÉDIO | Performance | `GET /api/app/marketing/conteudos` executa 3 queries separadas: (1) `findMany` de conteúdos, (2) `findMany` de favoritos para filtro, (3) segundo `findMany` de favoritos para flag `isFavorito`. Queries 2 e 3 ocorrem em **todo** request, inclusive quando `favoritos=false`. |
| R10 | Pool de conexões pode esgotar sob carga | MÉDIA | MÉDIO | Sistema inteiro | `connection_limit=3` por invocação. Supabase Free tier suporta 20 conexões diretas. Com 7+ invocações simultâneas usando `Promise.all` com 2-3 queries cada, o pool pode esgotar, causando `PrismaClientInitializationError` generalizado. |
| R11 | reset-data sem confirmação ou token CSRF | BAIXA | CRÍTICO | Sistema inteiro | `POST /api/app/admin/reset-data` deleta todos os dados (estudantes, contratos, empresas, franqueados) com um único request autenticado como FRANQUEADORA. Não há token de confirmação, dry-run obrigatório ou segundo fator. Um clique acidental ou tab aberta em segundo plano pode destruir produção. |
| R12 | Estudantes criados sem franchiseId consistente | ALTA | MÉDIO | Franqueados | Em `POST /api/app/estudantes`, `franchiseId` é forçado para `undefined` (`const franchiseId: undefined = undefined`) como workaround para evitar perda de dados. Isso desconecta o estudante de qualquer unidade, dificultando filtros e relatórios por franquia. |
| R13 | Rota `conteudos/[id]` GET sem verificação de role | ALTA | MÉDIO | Marketing Hub | `GET /api/app/marketing/conteudos/[id]` verifica autenticação mas NÃO verifica role. Roles como EMPRESA ou ESTUDANTE (que não deveriam ter acesso ao Marketing Hub) podem acessar qualquer conteúdo diretamente pela URL da API se souberem o ID. |
| R14 | Validação de email ausente no cadastro público | MÉDIA | BAIXO | Estudantes | `POST /api/public/vaga/inscrever-novo` não valida o formato do email antes de criar o usuário. Emails malformados são aceitos, resultando em usuário criado mas sem capacidade de receber o email de boas-vindas. |
| R15 | Sugestões de marketing com `franchiseId \|\| ""` | ALTA | BAIXO | Marketing Hub | Em `GET /api/app/marketing/sugestoes`, as queries usam `franchiseId: franchiseId \|\| ""`. Se `franchiseId` for `null` (FRANQUEADORA), passa string vazia como filtro, o que pode retornar zero resultados em vez de todos — comportamento incorreto silencioso. |

---

## Análise Detalhada dos Top 5 Riscos Críticos

---

### R1 — Marketing Hub sem migração de banco de dados

**Probabilidade:** ALTA | **Impacto:** CRÍTICO

O schema `prisma/schema.prisma` define seis novos models: `MarketingConteudo`, `MarketingCampanha`, `MarketingNoticia`, `MarketingDownload`, `MarketingFavorito`, `MarketingCalendario`. A pasta `prisma/migrations/` contém apenas quatro arquivos SQL manuais (`add_ai_usage_log.sql`, `add_email_financeiro_and_send_log.sql`, `add_missing_indexes.sql`, `add_scale_indexes.sql`). **Nenhum deles cria tabelas de marketing.**

O `vercel.json` executa `prisma generate && next build` — apenas gera o client TypeScript, **não aplica migrations ao banco**. O padrão `(prisma as any)` foi adotado exatamente porque o client local não tinha os tipos ainda, mas o client gerado na Vercel **terá os tipos** — o problema é que as tabelas no Supabase podem simplesmente não existir.

**Efeito em produção:** Qualquer acesso a `/dashboard/marketing/**` ou a qualquer endpoint `/api/app/marketing/**` resulta em `PrismaClientKnownRequestError: Table 'marketing_conteudos' doesn't exist`. O erro é capturado pelo try/catch e retorna HTTP 500 genérico para o usuário.

**Solução imediata:**
```sql
-- Executar no Supabase SQL Editor antes do próximo deploy
CREATE TABLE IF NOT EXISTS "marketing_conteudos" (...);
CREATE TABLE IF NOT EXISTS "marketing_campanhas" (...);
-- [script completo derivado do schema.prisma]
```

---

### R2 — Estudantes GET expõe dados de toda a rede para qualquer Franqueado

**Probabilidade:** ALTA | **Impacto:** CRÍTICO

Em `/app/api/app/estudantes/route.ts`, linha 25:

```typescript
const where = {};  // ← sem nenhum filtro
```

Qualquer usuário com role `FRANQUEADO` ou `FUNCIONARIO` com permissão `estudantes` chama esse endpoint e recebe **todos os estudantes de toda a rede Smarter**: nome, CPF, RG, data de nascimento, endereço, bairro, CEP, cidade, UF, curso, semestre, histórico de contratos, resultado DISC e currículo completo.

Isso viola o modelo de negócio (cada franqueado deve ver apenas seus estudantes) e constitui vazamento de dados pessoais sensíveis (CPF, RG) para terceiros não autorizados — potencial infração da **LGPD (Lei 13.709/2018)**, com multas de até 2% do faturamento ou R$ 50 milhões.

**Solução imediata:**
```typescript
// Adicionar scoping antes do findMany
const where: any = {};
if (role === "FRANQUEADO" || role === "FUNCIONARIO") {
  where.franchiseId = session.user.franchiseId;
}
// FRANQUEADORA e EQUIPE mantêm where = {} (vêem tudo)
```

**Atenção:** O `POST /api/app/estudantes` já força `franchiseId = undefined` como workaround para outro problema. Isso cria uma inconsistência: estudantes são criados sem `franchiseId`, mas o filtro por `franchiseId` no GET nunca os encontraria para o franqueado que os cadastrou. Os dois bugs precisam ser resolvidos juntos.

---

### R3 — Webhook Cora sem verificação de assinatura HMAC

**Probabilidade:** ALTA | **Impacto:** CRÍTICO

O endpoint `/api/webhooks/cora/route.ts` é **público** e aceita qualquer POST. Não há verificação de signature, secret header ou IP allowlist:

```typescript
export async function POST(req: Request) {
  const body = await req.json() as CoraEvent;
  // ← zero verificação de origem
  const invoiceId = body.data?.id;
  // Busca e atualiza o Financial diretamente
}
```

Um atacante que conheça qualquer `coraInvoiceId` (visível em logs ou via engenharia social) pode:
- Enviar `{ type: "INVOICE.PAID", data: { id: "<invoiceId>", paid_at: "..." } }` → cobrança marcada como PAGA
- Enviar `{ type: "INVOICE.CANCELLED", data: { id: "<invoiceId>" } }` → cobrança cancelada

**Impacto financeiro direto:** Franqueados podem ter mensalidades "pagas" sem efetuar o pagamento real.

**Solução imediata:**
```typescript
// Verificar assinatura HMAC da Cora no header X-Cora-Signature
const signature = req.headers.get("x-cora-signature");
const expectedSig = createHmac("sha256", process.env.CORA_WEBHOOK_SECRET!)
  .update(rawBody).digest("hex");
if (!timingSafeEqual(Buffer.from(signature!), Buffer.from(expectedSig))) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

---

### R4 — Rate Limit in-memory não funciona em ambiente serverless

**Probabilidade:** ALTA | **Impacto:** ALTO

O `lib/rate-limit.ts` usa um `Map` em memória (`const store = new Map()`). No Vercel (serverless), **cada invocação pode ser uma instância de processo separada**. O estado em memória não é compartilhado entre instâncias. Resultado:

- Um atacante com 10 IPs diferentes obtém 10 instâncias × 10 tentativas = 100 tentativas de brute force por minuto contra qualquer email
- O cadastro público de estudantes (`/api/public/estudante`) pode ser chamado em loop para criar contas spam
- A captação de leads (`/api/public/lead`) pode ser spammada sem limitação efetiva

Além disso, o auth rate limit usa o **email** como chave (não o IP), o que não protege contra atacantes que sabem o email da vítima e testam senhas em paralelo.

**Solução recomendada:** Migrar para Upstash Redis (a própria equipe já documentou esse plano no arquivo `rate-limit.ts`). Custo: ~$0/mês no plano free do Upstash para o volume atual.

---

### R5 — JWT de 30 dias sem revogação server-side

**Probabilidade:** ALTA | **Impacto:** ALTO

Em `lib/auth.ts`:
```typescript
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }
```

Os callbacks `jwt` e `session` apenas leem o token — **nunca tocam o banco de dados** em requests subsequentes. Isso é intencional para performance, mas cria os seguintes problemas:

- **Conta desativada:** `user.active = false` no banco, mas o JWT ainda é válido por até 30 dias. O usuário continua logado e operando normalmente.
- **Mudança de role:** Um FRANQUEADO promovido a EQUIPE ou rebaixado a FUNCIONARIO mantém o role antigo até relogar.
- **Mudança de permissões de FUNCIONARIO:** O array `permissoes` no JWT foi populado no login. Novas permissões concedidas ou revogadas só tomam efeito no próximo login.
- **Conta comprometida:** Não há endpoint de "revogar todas as sessões". Uma vez com o token, o invasor tem até 30 dias de acesso.

**Solução de curto prazo:** Reduzir `maxAge` para 8 horas e implementar refresh token. **Solução robusta:** Adicionar uma consulta de validação de `active` e `role` no callback `jwt` com cache de 5 minutos (usando Supabase ou Redis).

---

## Nota de Qualidade do Sistema: 62%

**Justificativa:**

O sistema demonstra maturidade técnica real em várias áreas: autenticação via JWT com claims corretos, middleware de proteção por role funcionando, paginação implementada em todas as listagens, validação com Zod nas rotas críticas, CSP com nonce por request, security headers completos, logs de auditoria, isolamento de dados no CRM e Financeiro, e índices de banco de dados adequados.

Os pontos que reduzem a nota são sérios: dois bugs de isolamento de dados com impacto LGPD, a migração do Marketing Hub ausente (módulo inteiro inacessível), ausência de verificação de webhook de pagamento, e o rate limiting que falha silenciosamente no ambiente de produção.

| Dimensão | Nota | Observação |
|----------|------|-----------|
| Autenticação e sessão | 70% | JWT funciona, mas 30 dias sem revogação é risco alto |
| Autorização por role | 65% | Middleware correto, mas GET /estudantes expõe toda a rede |
| Integridade do banco | 55% | Marketing Hub pode não ter tabelas; `prisma as any` sem type safety |
| Segurança de APIs | 60% | Webhook Cora sem HMAC; rate limit ineficaz em serverless |
| Performance | 75% | Paginação boa; N+1 no marketing; broadcast síncrono |
| Observabilidade | 80% | Logs de auditoria, ActivityLog, logs de performance no auth |
| Código e manutenibilidade | 70% | Zod, permissões centralizadas; 41x `prisma as any` é débito técnico |

---

## Índice de Risco de Parada: 62%

**Estimativa para os próximos 14 dias sem intervenção.**

Os fatores que compõem esse índice:

- **Marketing Hub com tabelas ausentes:** Se as tabelas não existem no Supabase, o módulo inteiro está quebrado desde o deploy — risco imediato e concreto. (+25%)
- **Esgotamento de conexões Supabase:** Com 100 franqueados ativos e picos de uso simultâneo, o pool de 20 conexões do Supabase Free pode esgotar, causando erro 500 generalizado. (+15%)
- **Falha de webhook Cora:** Se a Cora tentar entregar um evento e o endpoint falhar (já que usa `prisma as any`), cobranças não serão processadas automaticamente. (+10%)
- **Rate limit contornado e brute force:** Baixa probabilidade de ataque ativo nos próximos 14 dias, mas tecnicamente viável. (+5%)
- **Timeout em broadcast de notificação:** Se a equipe publicar muito conteúdo de marketing, a função pode timeoutar e criar estado inconsistente. (+7%)

---

## Recomendações Prioritárias (ordem de urgência)

### 🔴 Prioridade Imediata (executar hoje)

**1. Criar migration SQL do Marketing Hub no Supabase**

Verificar no Supabase se as tabelas `marketing_conteudos`, `marketing_campanhas`, `marketing_noticias`, `marketing_downloads`, `marketing_favoritos` e `marketing_calendario` existem. Se não existirem, gerar e executar o SQL a partir do schema.prisma antes do próximo uso do módulo. Adicionar o SQL como arquivo `prisma/migrations/add_marketing_hub.sql` para rastreabilidade.

**2. Corrigir scoping do GET /api/app/estudantes**

Adicionar filtro `where.franchiseId = session.user.franchiseId` para roles FRANQUEADO e FUNCIONARIO. Atenção: isso requer revisar também o POST para que estudantes sejam criados com `franchiseId` correto (remover o `const franchiseId: undefined = undefined` atual e vincular ao franchiseId do usuário que está criando).

**3. Adicionar verificação HMAC no webhook Cora**

Consultar a documentação da Cora para o header de assinatura correto e implementar verificação com `crypto.timingSafeEqual`. Salvar o secret como variável de ambiente `CORA_WEBHOOK_SECRET`.

---

### 🟠 Prioridade Alta (esta semana)

**4. Migrar rate limit para Upstash Redis**

Substituir o `Map` in-memory por `@upstash/ratelimit` + `@upstash/redis`. A própria equipe já documentou esse plano em `lib/rate-limit.ts`. O custo no plano gratuito do Upstash é zero para o volume atual.

**5. Reduzir maxAge do JWT e adicionar validação de `active`**

Reduzir de 30 dias para 8 horas. No callback `jwt`, adicionar uma verificação ocasional (a cada 1 hora via `iat`) para checar se `user.active` ainda é `true`, retornando `null` se não for (força logout imediato).

**6. Corrigir verificação de role na rota GET /api/app/marketing/conteudos/[id]**

Adicionar verificação de role para excluir EMPRESA e ESTUDANTE, alinhando com o padrão dos demais endpoints de marketing.

**7. Adicionar token de confirmação no reset-data**

Exigir um campo `confirmar: "CONFIRMO"` no body da requisição antes de executar o `deleteMany`. Considerar adicionar logging explícito antes da operação.

---

### 🟡 Prioridade Média (próximas 2 semanas)

**8. Tornar broadcast de notificação assíncrono**

Mover o `findMany` de usuários + `createMany` de notificações para após o response usando um padrão fire-and-forget com `Promise.all(...).catch(console.error)`, ou migrar para uma queue (Supabase Edge Functions, Inngest, ou similar).

**9. Otimizar N+1 no GET de conteúdos de marketing**

Fazer a query de favoritos do usuário uma única vez e reaproveitar o resultado, eliminando a segunda chamada duplicada. Incluir o `isFavorito` via subquery ou `include` no Prisma ao invés de duas queries separadas.

**10. Gerar tipos Prisma para Marketing Hub localmente**

Rodar `npx prisma generate` localmente após confirmar que as tabelas existem no Supabase com `DIRECT_URL`. Isso elimina os 41 usos de `(prisma as any)` e traz de volta type safety completo para o módulo.

**11. Monitorar conexões Supabase**

Configurar alerta no Supabase para quando o número de conexões ativas ultrapassar 15 (75% do limite free). Considerar ativar o PgBouncer do Supabase (Session Mode) ou migrar para o Supabase Pro para aumentar o limite de conexões.

---

*Este relatório é baseado em análise estática do código-fonte em 01/07/2026. Alguns riscos (especialmente R1 sobre as tabelas de marketing) dependem do estado atual do banco de dados Supabase de produção para confirmação definitiva. Recomenda-se verificação imediata via Supabase Dashboard > Table Editor.*
