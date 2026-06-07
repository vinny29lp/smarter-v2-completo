# BACKUP SUPABASE — SMARTER STABLE V1
**Data do snapshot:** 06/06/2026 — 16:14 UTC
**Projeto Supabase:** mepocerocoknzaotrove (sa-east-1, São Paulo)
**Versão do sistema:** smarter-stable-v1 (commit `71a61df`)

---

## SNAPSHOT DO BANCO NO MOMENTO DO CONGELAMENTO

### Contagens gerais

| Tabela | Registros |
|--------|-----------|
| **Estudantes** | 20 |
| **Empresas** | 4 |
| **Contratos** | 4 |
| **Usuários** | 28 |
| **Franquias** | 2 |
| **Instituições de Ensino** | 6 |
| **Lançamentos Financeiros** | 11 |
| **Leads CRM** | 9 |
| **Documentos de Estágio** | 36 |
| **Logs de Auditoria** | 191 |
| **Funcionários** | 2 |

### Breakdown por status

| Categoria | Qtd |
|-----------|-----|
| Estudantes disponíveis | 16 |
| Estudantes em estágio | 4 |
| Contratos ativos | 1 |
| Contratos pendentes | 3 |
| Empresas ativas | 4 |
| Usuários FRANQUEADORA | 1 |
| Usuários FRANQUEADO | 2 |
| Usuários FUNCIONARIO | 2 |
| Usuários EMPRESA | 3 |
| Usuários ESTUDANTE | 20 |

---

## TABELAS PRINCIPAIS DO SISTEMA

| Tabela | Finalidade |
|--------|-----------|
| `users` | Autenticação de todos os perfis |
| `franchises` | Unidades franqueadas (âncora do multi-tenant) |
| `companies` | Empresas parceiras contratantes |
| `institutions` | Instituições de ensino (IES) |
| `students` | Perfis completos dos estudantes |
| `contracts` | Contratos de estágio (TCE) |
| `internship_documents` | Documentos jurídicos por contrato |
| `evaluations` | Avaliações semestrais |
| `financials` | Lançamentos financeiros |
| `crm_leads` | Pipeline comercial |
| `employees` | Funcionários das franquias |
| `activity_logs` | Auditoria de ações |
| `system_configs` | Configurações globais (tokens, personalização) |
| `ai_usage_logs` | Consumo de IA por franquia |
| `import_logs` | Histórico de importações em massa |

---

## COMO FAZER BACKUP MANUAL (quando necessário)

### Opção 1 — Via Supabase Dashboard (mais simples)
1. Acesse [supabase.com](https://supabase.com)
2. Faça login com a conta proprietária
3. Vá em: **Project → Database → Backups**
4. Clique em **"Download backup"** ou use um ponto de restauração existente
5. O Supabase mantém backups automáticos diários (retidos por 7 dias no plano Pro)

### Opção 2 — Via pg_dump (backup completo exportado)
```bash
# Instale o pg_dump se necessário (apt install postgresql-client)
# Substitua [SENHA] pela senha do banco (disponível nas env vars da Vercel)

pg_dump "postgresql://postgres.[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  --format=custom \
  --no-acl \
  --no-owner \
  --file="backup-smarter-$(date +%Y%m%d-%H%M).dump"
```

### Opção 3 — Via Supabase CLI
```bash
npx supabase db dump \
  --project-ref mepocerocoknzaotrove \
  -f "backup-smarter-$(date +%Y%m%d).sql"
```

---

## FREQUÊNCIA DE BACKUP RECOMENDADA

| Tipo | Frequência | Responsável |
|------|-----------|-------------|
| Automático Supabase | Diário (já ativo) | Supabase |
| Manual antes de migration | Obrigatório | Dev |
| Manual antes de deploy de risco alto | Recomendado | Dev |
| Manual mensal arquivado | Recomendado | Operação |

---

## ⚠️ AVISO CRÍTICO — RESTAURAÇÃO DO BANCO

> **A restauração do banco de dados deve ser usada APENAS em caso de desastre total.**
>
> Restaurar o banco para um ponto anterior **apaga permanentemente** todos os dados
> criados depois daquele ponto — incluindo:
> - Novos estudantes cadastrados
> - Novos contratos criados
> - Novas empresas cadastradas
> - Lançamentos financeiros registrados
>
> **Em caso de sistema quebrado por deploy:**
> 👉 NÃO restaure o banco.
> 👉 Faça rollback apenas do código/deploy (ver ROLLBACK-PROCEDURE-V1.md).
> O banco permanece intacto e todos os dados são preservados.
>
> Só restaure o banco se o próprio banco estiver corrompido ou com dados deletados
> acidentalmente — e mesmo assim, faça apenas após confirmar que não há alternativa.

---

## PROCEDIMENTO DE RESTAURAÇÃO (emergência real)

**Via Supabase Dashboard:**
1. Supabase → Database → Backups
2. Selecionar ponto de restauração (mais próximo antes do problema)
3. Clicar em "Restore"
4. Aguardar (pode demorar 5-15 minutos)
5. Verificar tabelas imediatamente após

**Via pg_restore:**
```bash
pg_restore \
  --dbname="postgresql://postgres.[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" \
  --clean \
  --if-exists \
  backup-smarter-YYYYMMDD.dump
```

---

## ACESSO AO BANCO

| Item | Detalhe |
|------|---------|
| **Plataforma** | Supabase |
| **Project ID** | mepocerocoknzaotrove |
| **Região** | sa-east-1 (São Paulo) |
| **Acesso** | Via conta proprietária em supabase.com |
| **Connection strings** | Armazenadas como `DATABASE_URL` e `DIRECT_URL` nas env vars da Vercel |
| **Backup automático** | Ativo — diário, retido 7 dias |

---

*Smarter Estágios — Backup Supabase Stable V1 — 06/06/2026*
