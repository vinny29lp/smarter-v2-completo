# ROLLBACK PROCEDURE V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026
**PREMISSA: Rollback de código APENAS — banco de dados NÃO é restaurado.**
**Todos os dados cadastrados (estudantes, contratos, empresas) são preservados.**

---

## QUANDO USAR ESTE PROCEDIMENTO

Use quando um deploy quebrar o sistema em produção:
- Página dando erro 500
- Login não funcionando
- Funcionalidade crítica quebrada (criação de contrato, geração de documento, etc.)
- Build falhou mas foi para produção

**NÃO use quando:** o problema for de dados no banco — nesses casos ver `BACKUP-E-RECUPERACAO-V1.md`.

---

## OPÇÃO 1 — ROLLBACK VIA VERCEL (mais rápido — < 2 minutos)

Este é o método recomendado. O Vercel mantém todos os deploys anteriores prontos para ativar.

**Passo a passo:**
1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique no projeto **smarter-v2-completo**
3. Clique em **"Deployments"** (menu lateral)
4. Localize o último deploy que estava funcionando (antes da quebra)
5. Clique nos **três pontos (...)** ao lado do deploy
6. Clique em **"Promote to Production"**
7. Confirme a operação
8. Aguarde ~30 segundos
9. Teste o sistema imediatamente

**Resultado:** O sistema volta a servir o código do deploy anterior. O banco de dados NÃO é afetado — todos os dados novos são preservados.

---

## OPÇÃO 2 — ROLLBACK VIA GIT + PUSH (alternativa)

Use se precisar voltar para um commit específico e o deploy automático não funcionar.

```bash
cd smarter-v2-completo

# Ver os commits disponíveis
git log --oneline -10

# Exemplos de commits estáveis:
# 1d21b71 — Sprint Blindagem Final (versão estável V1)
# 59d15d9 — Fix Float contrato
# bfa41e2 — Sprint 02 Segurança

# Criar branch temporária do commit desejado
git checkout -b hotfix-rollback 1d21b71

# Forçar o main a apontar para esse commit
git checkout main
git reset --hard 1d21b71
git push origin main --force
```

**ATENÇÃO:** `git push --force` sobrescreve o histórico no GitHub. Use apenas em emergência.
**Após estabilizar:** Faça um novo commit com a correção adequada ao invés de manter o force push.

---

## OPÇÃO 3 — REVERT DE COMMIT ESPECÍFICO (mais seguro)

Quando apenas um arquivo ou feature específica está causando o problema:

```bash
# Identificar o commit problemático
git log --oneline

# Criar um commit de reversão (não apaga histórico)
git revert [HASH_DO_COMMIT_PROBLEMÁTICO]

# Resultado: cria novo commit desfazendo as mudanças
git push origin main
```

---

## IDENTIFICAÇÃO DE COMMIT ESTÁVEL

A versão estável V1 está no commit:
```
Hash: 1d21b71f2e36f8dd654d265b4c1db205db4cda04
Data: 02/06/2026
Tag: stable-v1 (se criada)
```

Para criar a tag de segurança:
```bash
git tag -a stable-v1 1d21b71 -m "Versão estável V1 — piloto produção — 02/06/2026"
git push origin stable-v1
```

---

## CHECKLIST PÓS-ROLLBACK

Após qualquer rollback, verificar:
- [ ] Login funcionando
- [ ] Dashboard carregando com KPIs corretos
- [ ] Listagem de contratos funcionando
- [ ] Criação de empresa funcionando
- [ ] Geração de TCE funcionando
- [ ] Nenhum erro 500 nos logs Vercel → Functions

---

## O QUE NÃO MUDA NO ROLLBACK

O rollback de código **preserva integralmente**:
- Todos os estudantes cadastrados após o deploy problemático
- Todos os contratos criados
- Todas as empresas cadastradas
- Todos os lançamentos financeiros
- Todos os logs de atividade
- Todos os documentos gerados e assinados

O banco de dados Supabase é independente do código. O rollback apenas troca qual versão do código é executada.

---

## ROLLBACK DE MIGRATION (banco) — CUIDADO

**Rollback de migration é diferente e mais perigoso.** Se uma migration adicionou uma coluna e o rollback remover essa coluna, dados nessa coluna serão perdidos.

**Procedimento seguro para migration rollback:**
1. Fazer backup completo do banco ANTES
2. Identificar o que a migration fez
3. Criar migration reversa manualmente
4. Testar em ambiente de staging
5. Aplicar em produção apenas com certeza

**Regra:** Nunca fazer rollback de migration em produção sem backup completo verificado.

---

*Smarter Estágios — Rollback Procedure V1 — 02/06/2026*
