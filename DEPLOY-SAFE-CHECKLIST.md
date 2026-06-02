# DEPLOY-SAFE-CHECKLIST — Smarter Estágios V2
**Versão:** 1.0 | **Data:** 02/06/2026
**Uso:** Executar este checklist antes de qualquer deploy em produção.

---

## ⚙️ NOTA SOBRE `ignoreBuildErrors` e `ignoreDuringBuilds`

O `next.config.mjs` contém:
```js
eslint:     { ignoreDuringBuilds: true }
typescript: { ignoreBuildErrors: true  }
```

**Por que estão ativos?**
Durante o desenvolvimento acelerado das sprints de segurança, alguns tipos TypeScript em componentes de UI e nas actions do Prisma geraram warnings que não afetam o runtime mas impediam o build. Para evitar bloqueio de deploy em produção, estas flags foram mantidas.

**Riscos:**
- Erros de tipagem chegam silenciosamente a produção.
- Sem barreira de qualidade no CI.

**Plano para remover com segurança:**
1. Rodar `npm run build` localmente SEM as flags e coletar todos os erros.
2. Corrigir erros TypeScript por arquivo (priorizar arquivos de API).
3. Rodar `npx eslint . --ext .ts,.tsx` e corrigir warnings críticos.
4. Remover as flags do `next.config.mjs`.
5. Configurar CI (GitHub Actions) para rodar build com TypeScript strict.
**Prazo recomendado:** Sprint seguinte à estabilização do piloto com os primeiros franqueados.

---

## ✅ CHECKLIST PRÉ-DEPLOY

### 1. Código
- [ ] `git status` — sem arquivos modificados não commitados
- [ ] `git log --oneline -5` — confirmar commits corretos no branch main
- [ ] Nenhum `console.log` com dados sensíveis adicionado recentemente

### 2. Build local (recomendado antes de push)
```bash
cd smarter-v2-completo
npx prisma generate
npm run build
```
- [ ] Build finaliza sem erro fatal (warnings TypeScript são esperados por enquanto)
- [ ] Nenhum erro de módulo não encontrado

### 3. Banco de dados (Supabase)
```bash
npx prisma migrate status
```
- [ ] Todas as migrations estão aplicadas (`Applied`)
- [ ] Nenhuma migration pendente (`Not applied`)
- [ ] Índices críticos presentes (verificar via Supabase SQL Editor):
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('contracts','students','companies','financials','crm_leads')
ORDER BY tablename, indexname;
```

### 4. Variáveis de Ambiente (Vercel Dashboard → Settings → Environment Variables)
Variáveis obrigatórias em produção:

| Variável | Obrigatória | Descrição |
|----------|------------|-----------|
| `DATABASE_URL` | ✅ | Connection string Supabase (pooler) |
| `DIRECT_URL` | ✅ | Connection string Supabase (direct) |
| `NEXTAUTH_SECRET` | ✅ | Chave JWT — mínimo 32 chars aleatórios |
| `NEXTAUTH_URL` | ✅ | URL pública do sistema (ex: https://sistema.smarterestagios.com.br) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Mesma URL pública — usada no frontend |
| `OPENAI_API_KEY` | ✅ | Chave da OpenAI para IA |
| `RESEND_API_KEY` | ⚠️ | Chave Resend para emails — sistema funciona sem ela (emails falham silenciosamente) |
| `AUTENTIQUE_TOKEN` | ⚠️ | Token Autentique para assinaturas — funciona sem ele (assinatura desativada) |

- [ ] `DATABASE_URL` configurado e acessível
- [ ] `NEXTAUTH_SECRET` configurado (não é o valor padrão/exemplo)
- [ ] `NEXTAUTH_URL` aponta para a URL de produção correta
- [ ] `OPENAI_API_KEY` configurado

### 5. Rotas críticas — testar após deploy
Abrir no navegador (substitua o domínio):

- [ ] `https://[dominio]/login` — página de login carrega
- [ ] `https://[dominio]/dashboard` — redireciona para login se não autenticado
- [ ] `https://[dominio]/api/app/config` — retorna 401/403 se não autenticado como FRANQUEADORA
- [ ] `https://[dominio]/api/app/crm/qualquer-id-aqui` — retorna 401 se não autenticado
- [ ] `https://[dominio]/api/app/vagas/qualquer-id-aqui` — retorna 401 se não autenticado (PATCH)

### 6. Verificação de headers de segurança
Após deploy, verificar via `curl -I https://[dominio]/login`:
- [ ] `x-frame-options: DENY` presente
- [ ] `x-content-type-options: nosniff` presente
- [ ] `strict-transport-security` presente
- [ ] `referrer-policy: strict-origin-when-cross-origin` presente

Ou usar: https://securityheaders.com

### 7. Rollback (se algo der errado)
```
Vercel Dashboard → Deployments → Selecionar deploy anterior → Promote to Production
```
Rollback é instantâneo. Tempo estimado: < 30 segundos.

---

## 🚨 SINAIS DE ALERTA PÓS-DEPLOY

Monitorar nos primeiros 30 minutos:
- [ ] Vercel → Functions → verificar erros 500 inesperados
- [ ] Supabase → Logs → verificar queries falhando
- [ ] Testar login com usuário real
- [ ] Testar criação de contrato (fluxo principal)
- [ ] Testar geração de documento (TCE)

---

## 📋 HISTÓRICO DE DEPLOYS

| Data | Commit | Descrição | Resultado |
|------|--------|-----------|-----------|
| 01/06/2026 | `0b18a67` | Sprint 01 — Segurança auth+ownership 12 APIs | ✅ OK |
| 01/06/2026 | `bfa41e2` | Sprint 02 — Paginação, permissões FUNC, auditoria, índices, Zod, timeout IA | ✅ OK |
| 01/06/2026 | `59d15d9` | Fix — String vazia em campos Float (auxTransporte) | ✅ OK |
| 02/06/2026 | `(pendente)` | Sprint Blindagem Final — 14 correções de segurança + headers | 🔄 Em progresso |

---

*Última atualização: 02/06/2026 — Sprint Final de Blindagem*
