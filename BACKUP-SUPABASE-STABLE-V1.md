# BACKUP SUPABASE — SMARTER STABLE V1

**Data do Backup:** 2026-06-06  
**Projeto Supabase:** smarter-one-v2  
**Projeto ID:** mepocerocoknzaotrove  
**Região:** sa-east-1 (São Paulo)  
**Status do Projeto:** ACTIVE_HEALTHY  
**Versão PostgreSQL:** 17.6.1.111  
**Git Tag de Referência:** smarter-stable-v1  
**Commit de Referência:** 71a61df  

---

## 📊 CONTAGENS ATUAIS DAS ENTIDADES PRINCIPAIS

| Tabela | Registros |
|--------|-----------|
| **users** | 28 |
| **students** | 20 |
| **companies** | 4 |
| **contracts** | 4 |
| **franchises** | 2 |
| **institutions** | 6 |
| **financials** | 11 |
| **crm_leads** | 9 |
| **crm_notas** | 3 |
| **internship_documents** | 36 |
| **activity_logs** | 191 |
| **gamification_points** | 18 |
| **financial_send_logs** | 15 |
| **notifications** | 3 |
| **vacancies** | 3 |
| **applications** | 1 |
| **evaluations** | 1 |
| **employees** | 2 |
| **crm_tasks** | 0 |
| **disc_tests** | 0 |
| **uploaded_files** | 0 |
| **gamification_configs** | 0 |
| **system_configs** | 0 |
| **ai_usage_logs** | 0 |
| **import_logs** | 0 |

**Total de tabelas no schema public:** 26  
**Total de usuários cadastrados:** 28  
**Total de estudantes:** 20  
**Total de empresas:** 4  
**Total de contratos/TCEs:** 4  

---

## 🗂️ LISTA COMPLETA DAS TABELAS PRINCIPAIS

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `users` | Usuários do sistema (todos os perfis) | ✅ Ativo |
| `students` | Estudantes estagiários | ✅ Ativo |
| `companies` | Empresas concedentes de estágio | ✅ Ativo |
| `contracts` | Contratos/TCEs de estágio | ✅ Ativo |
| `franchises` | Franquias/unidades do sistema | ✅ Ativo |
| `institutions` | Instituições de ensino | ✅ Ativo |
| `financials` | Lançamentos financeiros | ✅ Ativo |
| `crm_leads` | Leads do CRM comercial | ✅ Ativo |
| `crm_tasks` | Tarefas do CRM | ✅ Ativo |
| `crm_notas` | Notas do CRM | ✅ Ativo |
| `internship_documents` | Documentos de estágio | ✅ Ativo |
| `evaluations` | Avaliações de estágio | ✅ Ativo |
| `notifications` | Notificações do sistema | ✅ Ativo |
| `activity_logs` | Logs de atividade/auditoria | ✅ Ativo |
| `gamification_points` | Pontos de gamificação | ✅ Ativo |
| `gamification_configs` | Configurações de gamificação | ✅ Ativo |
| `financial_send_logs` | Logs de envio de cobranças | ✅ Ativo |
| `ai_usage_logs` | Logs de uso da IA | ✅ Ativo |
| `disc_tests` | Testes DISC dos estudantes | ✅ Ativo |
| `vacancies` | Vagas de estágio | ✅ Ativo |
| `applications` | Candidaturas às vagas | ✅ Ativo |
| `employees` | Funcionários internos | ✅ Ativo |
| `uploaded_files` | Arquivos enviados | ✅ Ativo |
| `system_configs` | Configurações do sistema | ✅ Ativo |
| `import_logs` | Logs de importação | ⚠️ RLS desativado |
| `_prisma_migrations` | Histórico de migrações Prisma | ✅ Ativo |

---

## ⚠️ AVISO DE SEGURANÇA

A tabela `import_logs` está com **Row Level Security (RLS) desativado**. Isso significa que está totalmente exposta às roles `anon` e `authenticated`. Para ativar:

```sql
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
```

> **ATENÇÃO:** Ativar RLS sem políticas bloqueia todo acesso à tabela. Defina as políticas necessárias antes de ativar em produção.

---

## 💾 COMO EXPORTAR BACKUP COMPLETO (via Supabase Dashboard)

1. Acesse [supabase.com](https://supabase.com) → faça login
2. Selecione o projeto **smarter-one-v2**
3. No menu lateral, vá em **Settings** → **Database**
4. Procure a seção **Backups**
5. Clique em **Download backup** para baixar o dump completo do PostgreSQL
6. Alternativamente, use **Point in Time Recovery** para restaurar a um momento específico

> **Supabase mantém backups automáticos diários.** Planos pagos têm mais histórico disponível.

### Exportação manual via CLI (alternativa):

```bash
# Instalar Supabase CLI se necessário
npm install -g supabase

# Exportar dump do banco
supabase db dump --project-ref mepocerocoknzaotrove -f backup-smarter-$(date +%Y%m%d).sql
```

---

## 🔄 COMO RESTAURAR O BANCO (APENAS EM DESASTRE TOTAL)

> **⚠️ AVISO CRÍTICO:** A restauração do banco de dados **APAGA TODOS OS CADASTROS NOVOS** feitos após a data do backup. Esta operação é irreversível. Execute somente como último recurso.

### Passos para restauração:

1. **Confirme que realmente não há outra solução** — migrações, rollbacks de código, correções pontuais são preferíveis
2. Acesse [supabase.com](https://supabase.com) → projeto **smarter-one-v2**
3. Vá em **Settings** → **Database** → **Backups**
4. Selecione o backup mais próximo do estado desejado
5. Clique em **Restore** e confirme
6. Aguarde a conclusão (pode levar vários minutos)
7. Após restauração, rode as migrações pendentes do Prisma:

```bash
cd "/Users/viniciusmiranda/Desktop/Sistema smarter/smarter-v2-completo"
npx prisma migrate deploy
```

### ⚠️ CONSEQUÊNCIAS DA RESTAURAÇÃO:

- Todos os usuários criados após o backup serão perdidos
- Todos os contratos gerados após o backup serão perdidos
- Todos os dados financeiros após o backup serão perdidos
- Documentos no Storage do Supabase podem ficar órfãos
- **NÃO RESTAURAR O BANCO apenas por bugs de código** — nesses casos, use rollback de deploy (veja GUIA-ROLLBACK-E-DEPLOY-SMARTER-STABLE-V1.pdf)

---

## 🏷️ REFERÊNCIAS DA VERSÃO CONGELADA

| Item | Valor |
|------|-------|
| Git Tag | `smarter-stable-v1` |
| Commit Hash | `71a61df` |
| Branch | `main` |
| Repositório | `github.com/vinny29lp/smarter-v2-completo` |
| Data do Congelamento | 2026-06-06 |
| Vercel Project | smarter-v2-completo |

---

*Gerado automaticamente durante o congelamento oficial da versão Smarter Stable V1 em 2026-06-06.*
