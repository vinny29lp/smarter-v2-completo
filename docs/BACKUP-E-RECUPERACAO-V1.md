# BACKUP E RECUPERAÇÃO V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## 1. FONTES DE DADOS

| Fonte | O que contém | Responsável pelo backup |
|-------|-------------|------------------------|
| **GitHub** | Todo o código-fonte | Você (via commits) + GitHub |
| **Supabase** | Banco de dados (tabelas, registros) | Supabase (automático) + você |
| **Supabase Storage** | Arquivos enviados (se houver) | Supabase |
| **Vercel** | Configurações de deploy, env vars | Vercel |
| **SystemConfig** | Configurações do sistema (tokens, personalização) | Banco de dados |

---

## 2. BACKUP DO CÓDIGO (GitHub)

**Status atual:** Automático — todo `git push` cria backup versionado no GitHub.

**O repositório GitHub é o backup principal do código.** Cada commit é um ponto de restauração.

**Procedimento manual adicional (recomendado mensalmente):**
```bash
# Clonar o repositório completo em pasta local ou HD externo
git clone https://github.com/vinny291p/smarter-v2-completo.git smarter-backup-$(date +%Y%m%d)
```

**Frequência recomendada:** Automático a cada push (contínuo).

---

## 3. BACKUP DO BANCO DE DADOS (Supabase)

### 3a. Backup automático do Supabase
O Supabase faz **backup automático diário** do banco de dados no plano Pro. Estes backups ficam retidos por 7 dias na interface do Supabase.

**Verificar em:** Supabase Dashboard → Project → Database → Backups

### 3b. Backup manual via pg_dump (recomendado antes de grandes mudanças)
```bash
# Instalar psql/pg_dump se necessário
# DIRECT_URL está no .env — substitua aqui

pg_dump "postgresql://postgres:[SENHA]@db.mepocerocoknzaotrove.supabase.co:5432/postgres" \
  --format=custom \
  --file=backup-smarter-$(date +%Y%m%d-%H%M).dump

# Para restaurar:
pg_restore --dbname="postgresql://..." backup-smarter-YYYYMMDD-HHMM.dump
```

### 3c. Backup via Supabase CLI
```bash
supabase db dump --db-url "postgresql://..." -f backup-$(date +%Y%m%d).sql
```

**Frequência recomendada:**
- Backup automático Supabase: diário (já ativo)
- Backup manual antes de qualquer migration: obrigatório
- Backup manual mensal em arquivo local: recomendado

**Retenção recomendada:** 30 dias para backups recentes, 1 por mês para histórico de 1 ano.

---

## 4. BACKUP DO STORAGE (Arquivos)

O sistema usa URLs externas para documentos assinados (Autentique gera e hospeda os PDFs). Arquivos enviados manualmente ficam em `uploaded_files` com URL.

**Se o Supabase Storage estiver em uso:**
```bash
# Via Supabase CLI
supabase storage ls
supabase storage download [bucket] ./backup-storage-$(date +%Y%m%d)/
```

**Frequência recomendada:** Semanal se houver uploads ativos.

---

## 5. BACKUP DOS DOCUMENTOS ASSINADOS (Autentique)

Os PDFs assinados ficam hospedados no Autentique. Os links (`signedUrl`) ficam salvos no banco em `InternshipDocument.signedUrl`.

**Risco:** Se o Autentique ficar indisponível, os PDFs ficam inacessíveis temporariamente.

**Mitigação recomendada (próxima sprint):** Baixar o PDF assinado e salvar no Supabase Storage no momento em que o documento é assinado, para ter cópia própria.

---

## 6. BACKUP DE VARIÁVEIS DE AMBIENTE

As variáveis de ambiente ficam no Vercel Dashboard. **Não ficam no código** por segurança.

**Procedimento de backup:**
1. Acesse Vercel Dashboard → Project → Settings → Environment Variables
2. Copie todos os valores para um gerenciador de senhas seguro (Bitwarden, 1Password, etc.)
3. Nunca salve em arquivo de texto sem criptografia

**Variáveis críticas para guardar:**
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY`
- `RESEND_API_KEY` (ou credenciais SMTP)
- `AUTENTIQUE_TOKEN`

---

## 7. RESTAURAÇÃO DO BANCO

### Caso: banco corrompido ou dados perdidos acidentalmente

**Opção 1 — Via Supabase Dashboard (mais simples):**
1. Supabase Dashboard → Database → Backups
2. Selecionar ponto de restauração
3. Clicar em "Restore"
4. Aguardar (pode demorar alguns minutos)
5. Testar o sistema imediatamente após

**Opção 2 — Via pg_restore:**
```bash
pg_restore \
  --dbname="postgresql://postgres:[SENHA]@db.mepocerocoknzaotrove.supabase.co:5432/postgres" \
  --clean \
  --if-exists \
  backup-smarter-YYYYMMDD.dump
```

**ATENÇÃO:** Restaurar o banco para um ponto anterior apaga dados criados após esse ponto (novos estudantes, contratos, etc.). Por isso o procedimento de rollback de código NÃO restaura o banco — ver `ROLLBACK-PROCEDURE-V1.md`.

---

## 8. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Perda acidental de dados via DELETE | Baixa | Alto | Backup diário Supabase |
| Falha do Supabase | Muito Baixa | Alto | SLA do Supabase (99.9%); fallback: backup manual |
| Perda de acesso ao GitHub | Muito Baixa | Médio | Clone local atualizado |
| Perda de tokens/secrets | Baixa | Alto | Gerenciador de senhas |
| Falha do Autentique com docs assinados inacessíveis | Baixa | Médio | Download imediato após assinatura (pendência) |

---

*Smarter Estágios — Backup e Recuperação V1 — 02/06/2026*
