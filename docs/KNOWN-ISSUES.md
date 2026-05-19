# KNOWN-ISSUES.md

Issues conhecidos do projeto **smarter-v2-completo**.

Este arquivo será expandido nas próximas etapas (auditoria de rotas/APIs/build). Por ora, lista apenas o que já foi identificado durante a Etapa 1 (Backup).

---

## 🚨 Segurança — ALTA PRIORIDADE

### S-001 — Credenciais reais em `.env.vercel`

**Arquivo:** `.env.vercel` (raiz do projeto)

**Problema:** Contém em texto puro:
- Senha do banco Supabase (`smarter-one-v2`)
- `NEXTAUTH_SECRET` (`9ccz7uzZHAG1pONBnOF3wu8NnHhBsmarter2025prod`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave anon — ok no client, mas idealmente não versionar)
- `DATABASE_URL` completa com host, usuário, senha

**Risco:** O `.gitignore` não inclui `.env.vercel` (só `.env`, `.env.local`, etc). Se você fez `git add .` ou `git push` alguma vez, esses segredos foram para o GitHub e estão visíveis para qualquer um com acesso ao repositório (público ou privado).

**Ações imediatas:**
1. Adicionar `.env.vercel` ao `.gitignore`
2. Verificar se está commitado: `git log --all --full-history -- .env.vercel`
3. Se estiver: **rotacionar todos os segredos** (gerar novo `NEXTAUTH_SECRET`, mudar senha do banco no Supabase, atualizar variáveis no Vercel)
4. Limpar do histórico do git: `git filter-branch` ou `BFG Repo-Cleaner`

---

## ⚠️ Configuração

### C-001 — `lucide-react` em versão antiga ou incorreta

**Arquivo:** `package.json` linha 21

**Atual:** `"lucide-react": "^1.11.0"`

**Problema:** A versão atual de `lucide-react` no npm vai de 0.0.1 até 0.500+. Versão `1.11.0` é provavelmente do projeto antigo (ou typo). Ícones modernos não estarão disponíveis.

**Sugerido:** Atualizar para versão mais recente:
```bash
npm install lucide-react@latest
```

**Risco:** Pode quebrar imports se ícones renomeados. Testar antes de mergear.

### C-002 — `NEXTAUTH_SECRET` padrão no `.env.example`

**Arquivo:** `.env.example` linha 7

**Atual:** `NEXTAUTH_SECRET="smarter-secret-change-in-production-min32chars"`

**Problema:** Se alguém clonar e usar como `.env` sem trocar, o secret fica público.

**Sugerido:** Trocar para placeholder mais explícito:
```
NEXTAUTH_SECRET="GERAR_COM_openssl_rand_base64_32"
```

---

## 📁 Organização

### O-001 — Múltiplas versões do projeto no Mac

Identificadas pelo menos 10 pastas distintas:
- `~/Desktop/smarter/smarter-v2-completo` ← versão ATUAL (esta)
- `~/Desktop/smarter/smarter-v2-backup-antes-dashboard-portais`
- `~/Desktop/Sistema Smarter NOVO/smarter-v2-final`
- `~/Downloads/smarter-v2-backend`, `smarter-v2-backend 2`, `smarter-v2-backend 3`
- `~/Downloads/smarter-v2-portais-bloco-b`
- `~/Downloads/smarter-v2-evolucao`
- `~/Downloads/smarter-v2-novos-modulos`
- `~/Downloads/smarter-v2-estabilizacao`
- `~/Downloads/smarter-v2-bloco-operacao`
- `~/Downloads/smarter-v2-crm-bloco-a`

**Risco:** Editar a versão errada. Confusão sobre qual é a fonte da verdade.

**Sugerido:** Após gerar backup `.tar.gz` da atual:
1. Mover todas as versões antigas para disco externo
2. Manter apenas `smarter-v2-completo` ativa
3. Adicionar nota no README dizendo "Esta é a versão ativa"

### O-002 — SQL files na raiz

**Arquivos:** `supabase-setup.sql`, `supabase-seed.sql`

Estão na raiz do projeto. Idealmente em `/sql/` para organização. Mover quando confirmar que não há referências hard-coded para esses paths.

### O-003 — `test-login.js` na raiz

**Arquivo:** `test-login.js`

Aparente arquivo de teste manual na raiz. Mover para `/scripts/` ou deletar se não for mais usado.

---

## 🔧 A investigar (próximas etapas)

Itens que precisam de inspeção mais profunda nas próximas sessões:

- [ ] **APIs sem auth check** — algum endpoint público que deveria ser privado?
- [ ] **Server Actions sem validação Zod** — alguma ação que aceita input sem validar?
- [ ] **Rotas órfãs** — páginas em `/app` que não são linkadas em nenhum menu?
- [ ] **Imports quebrados** — `npm run build` deve mostrar
- [ ] **Tipos TypeScript loose** — uso de `any` ou `as unknown as` que pode esconder bugs
- [ ] **Migrations Prisma desincronizadas** — `npx prisma migrate status`
- [ ] **`SystemConfig` single-row** — o pattern `@default("default")` é incomum; investigar como é criado/atualizado
- [ ] **Tratamento de erro server-side** — algum endpoint expõe stack trace?
- [ ] **Performance: queries N+1** — listagens com many-to-many sem `include`/`select` apropriado
- [ ] **Branding multi-tenant** — `SystemConfig` é global; mas franquias podem precisar do próprio branding

---

## Como contribuir com este arquivo

Quando encontrar um bug ou problema:
1. Adicione uma seção nova com ID (S-XXX para segurança, B-XXX para bug, P-XXX para performance, etc.)
2. Inclua: arquivo, problema, risco, sugestão
3. Marque como `RESOLVIDO` quando corrigir (não delete o item — vira histórico)
