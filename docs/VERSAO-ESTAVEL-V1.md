# VERSÃO ESTÁVEL V1 — SMARTER ESTÁGIOS
**Status:** CONGELADA — Versão Piloto Oficial
**Data de congelamento:** 02/06/2026
**Nome da versão:** smarter-stable-v1

---

## IDENTIFICAÇÃO DO COMMIT ESTÁVEL

| Campo | Valor |
|-------|-------|
| **Hash completo** | `1d21b71f2e36f8dd654d265b4c1db205db4cda04` |
| **Hash curto** | `1d21b71` |
| **Branch** | `main` |
| **Data do commit** | 2026-06-02 15:51 UTC |
| **Mensagem** | `security: sprint blindagem final — 8 altos + 7 médios corrigidos, headers HTTP, score 71→88` |
| **Repositório** | `https://github.com/vinny291p/smarter-v2-completo` |

---

## HISTÓRICO DA VERSÃO

| Commit | Data | Descrição |
|--------|------|-----------|
| `0b18a67` | 01/06/2026 | Sprint 01 — Auth + ownership em 12 APIs (score 58→79) |
| `bfa41e2` | 01/06/2026 | Sprint 02 — Paginação, permissões, auditoria, índices, Zod, timeout IA (score 79→88) |
| `59d15d9` | 01/06/2026 | Fix — String vazia em campos Float ao editar contrato |
| **`1d21b71`** | **02/06/2026** | **Sprint Blindagem Final — 8 altos + 7 médios corrigidos (score 88/100) ← VERSÃO ESTÁVEL** |

---

## AMBIENTE DE PRODUÇÃO

| Componente | Detalhe |
|-----------|---------|
| **Plataforma de deploy** | Vercel (Serverless) |
| **URL de produção** | https://sistema.smarterestagios.com.br |
| **Projeto Vercel** | `prj_Ey24THXLUg242HFE6dJKxtS7XfLq` |
| **Banco de dados** | Supabase PostgreSQL — projeto `mepocerocoknzaotrove` (sa-east-1, São Paulo) |
| **Node.js runtime** | 20.x (Vercel managed) |
| **Framework** | Next.js 14.2.35 (App Router) |

---

## VERSÃO DO SCHEMA PRISMA

**Versão Prisma Client:** `^5.22.0`
**Generator:** `prisma-client-js`
**Provider:** `postgresql`

**Modelos definidos (26 total):**
User, Franchise, Company, Institution, Student, Vacancy, Application, Contract, InternshipDocument, Evaluation, CrmLead, CrmNota, CrmTask, Financial, FinancialSendLog, DiscTest, GamificationConfig, GamificationPoint, ActivityLog, Notification, UploadedFile, Employee, SystemConfig, AIUsageLog, ImportLog

**Migrations aplicadas em produção:**
- Migration base (criação inicial do schema)
- `sprint02_indexes_camel` — 24 índices adicionados nas tabelas principais
- Campos de migração no Contract (`origem`, `migradoEm`, `migradoPor`, `migradoPorNome`, `tceMigradaUrl`)
- Tabela `import_logs` criada

---

## DEPENDÊNCIAS PRINCIPAIS

| Pacote | Versão |
|--------|--------|
| next | 14.2.35 |
| next-auth | ^4.24.14 |
| @prisma/client | ^5.22.0 |
| bcryptjs | ^3.0.3 |
| zod | ^4.3.6 |
| nodemailer | ^7.0.7 |
| lucide-react | ^1.11.0 |
| tailwindcss | ^3.4.1 |
| typescript | ^5 |

---

## SCORE DE SEGURANÇA NA VERSÃO ESTÁVEL

| Sprint | Score |
|--------|-------|
| Pré-desenvolvimento | ~50/100 |
| Sprint 01 (auth) | 79/100 |
| Sprint 02 (segurança avançada) | 88/100 |
| Sprint Blindagem Final | **88/100** |

**Itens críticos:** 0
**Itens altos:** 0
**Itens médios restantes:** 3 (rate limiting, ignoreBuildErrors, paginação em /franqueados/[id])
**Itens baixos restantes:** 2 (JWT rotation, Sentry)

---

## DECLARAÇÃO DE CONGELAMENTO

Esta versão foi declarada estável para piloto controlado com até 5 franqueados reais.

Antes de novos deploys, seguir o procedimento em `PROCESSO-DEPLOY-V1.md`.
Para restaurar esta versão em caso de emergência, ver `ROLLBACK-PROCEDURE-V1.md`.

**Tag Git recomendada para criar:**
```bash
git tag -a stable-v1 1d21b71 -m "Versão estável V1 — piloto produção — 02/06/2026"
git push origin stable-v1
```

---

*Smarter Estágios — Versão Estável V1 — 02/06/2026*
