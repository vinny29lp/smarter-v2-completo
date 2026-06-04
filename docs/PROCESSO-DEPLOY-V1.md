# PROCESSO DE DEPLOY V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## VISÃO GERAL

O deploy é totalmente automatizado via Vercel:
- Push para `main` → build automático → produção
- Pull Request → build automático → preview URL

O processo abaixo descreve o fluxo **seguro** para atualizações que vão a produção.

---

## FASE 1 — ANTES DE DESENVOLVER

1. **Confirmar o objetivo:** O que exatamente será alterado? Listar arquivos que serão modificados.
2. **Classificar o risco:**
   - 🟢 Baixo: correção de bug pontual, texto, estilo
   - 🟡 Médio: nova funcionalidade isolada, nova API
   - 🔴 Alto: mudança em auth, banco, fluxo principal, schema
3. **Para mudanças ALTAS:** fazer backup manual do banco antes de começar.

---

## FASE 2 — DESENVOLVIMENTO

**Regras de desenvolvimento seguro:**
- NÃO editar múltiplos módulos ao mesmo tempo em branches de risco
- NÃO misturar correções de bug com novas features no mesmo commit
- Testar localmente antes de qualquer push: `npm run dev`
- Para mudanças no banco: rodar `npx prisma migrate dev` localmente e revisar a migration gerada

```bash
# Ambiente local
npm install
npx prisma generate
npm run dev
```

---

## FASE 3 — BUILD LOCAL (opcional mas recomendado para mudanças médias/altas)

```bash
npx prisma generate
npm run build
```

Verificar:
- [ ] Build finaliza sem erro fatal
- [ ] Nenhum "Module not found" ou erro de import
- [ ] Warnings TypeScript documentados (não críticos por enquanto — `ignoreBuildErrors: true`)

---

## FASE 4 — COMMIT E PUSH

**Convenção de mensagens de commit:**
```
tipo: descrição curta (módulo afetado)

Exemplos:
fix: corrigir erro de tipagem ao editar contrato (contratos/[id])
feat: adicionar campo de CEP no cadastro de estudante
security: adicionar ownership check em vagas/[id]
docs: atualizar PROCESSO-DEPLOY-V1.md
refactor: extrair função de validação para utils.ts
```

**Processo:**
```bash
git add [arquivos específicos]
git commit -m "tipo: descrição"
git push origin main
```

**NUNCA fazer:**
- `git add .` sem revisar o que foi adicionado
- `git push --force` fora de emergência de rollback
- Commit com senha, token ou secret no código

---

## FASE 5 — DEPLOY PREVIEW (Pull Request — opcional para mudanças altas)

Para mudanças de risco alto, criar um Pull Request ao invés de commitar direto no main:

```bash
git checkout -b feature/nome-da-feature
# fazer o desenvolvimento
git push origin feature/nome-da-feature
# Abrir Pull Request no GitHub
```

O Vercel criará automaticamente uma **URL de preview** para o PR (ex: `smarter-v2-abc123.vercel.app`).

**Validação no preview:**
- [ ] Login funciona
- [ ] Feature nova funciona como esperado
- [ ] Nenhum módulo existente foi quebrado
- [ ] Testar os fluxos críticos (contrato, documento, financeiro)

---

## FASE 6 — HOMOLOGAÇÃO (para mudanças altas)

Antes de mergear para `main`, testar no preview:
1. Login com usuário real de homologação
2. Criar um contrato de teste completo
3. Gerar um TCE
4. Verificar financeiro
5. Confirmar que emails são enviados

---

## FASE 7 — PRODUÇÃO

**Via push direto (mudanças baixas/médias):**
```bash
git push origin main
# Deploy automático inicia imediatamente
# Aguardar 3-5 minutos
# Verificar em: vercel.com/dashboard → Deployments
```

**Via merge do PR (mudanças altas):**
1. Aprovar o PR no GitHub
2. Fazer merge para `main`
3. Vercel detecta o merge e inicia o build
4. Aguardar conclusão

---

## FASE 8 — VERIFICAÇÃO PÓS-DEPLOY

Imediatamente após o deploy:
- [ ] Vercel → Deployments → confirmar status "Ready"
- [ ] Acessar a URL de produção
- [ ] Fazer login com usuário real
- [ ] Verificar dashboard com KPIs
- [ ] Testar a funcionalidade que foi alterada
- [ ] Checar Vercel → Functions → verificar ausência de erros 500

**Monitorar nas primeiras 2 horas:** qualquer erro inesperado nos logs da Vercel.

---

## FASE 9 — ROLLBACK (se necessário)

Ver procedimento completo em `ROLLBACK-PROCEDURE-V1.md`.

**Resumo rápido:**
1. Vercel Dashboard → Deployments → selecionar deploy anterior → "Promote to Production"
2. Aguardar 30 segundos
3. Verificar que o sistema voltou ao normal

---

## REGRAS ABSOLUTAS

1. **Nunca fazer deploy sem testar localmente primeiro** (exceto hotfixes de texto/segurança simples)
2. **Nunca alterar o schema Prisma sem fazer backup do banco antes**
3. **Nunca commitar secrets, tokens ou senhas** — usar `.gitignore` e variáveis de ambiente
4. **Nunca fazer `git push --force` no `main` sem necessidade emergencial**
5. **Sempre seguir a convenção de commits** para manter o histórico legível

---

*Smarter Estágios — Processo de Deploy V1 — 02/06/2026*
