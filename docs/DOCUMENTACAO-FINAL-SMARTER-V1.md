# DOCUMENTAÇÃO FINAL — SMARTER ESTÁGIOS V1
**Versão:** stable-v1 | **Data de congelamento:** 02/06/2026
**Commit estável:** `1d21b71f2e36f8dd654d265b4c1db205db4cda04`
**Score de segurança:** 88/100 | **Prontidão:** Apto para produção com até 5 franqueados

---

## ÍNDICE COMPLETO DE DOCUMENTOS

Esta documentação cobre todos os aspectos técnicos e operacionais do sistema. Um desenvolvedor sem acesso ao histórico de chat pode assumir o projeto a partir daqui.

---

### 📋 VERSÃO E AMBIENTE

**[VERSAO-ESTAVEL-V1.md](./VERSAO-ESTAVEL-V1.md)**
- Commit hash da versão congelada
- Histórico de sprints e commits
- Ambiente de produção (Vercel, Supabase, URLs)
- Dependências e versões
- Score de segurança final

---

### 🏗️ ARQUITETURA

**[ARQUITETURA-SMARTER-V1.md](./ARQUITETURA-SMARTER-V1.md)**
- Visão geral da stack (Next.js + Supabase + Vercel)
- Estrutura completa de rotas (páginas e APIs)
- Componentes compartilhados e bibliotecas
- Autenticação NextAuth (JWT stateless)
- Middleware de proteção de rotas
- Integrações externas (OpenAI, Resend, Autentique)
- Fluxo de dados de uma requisição (request lifecycle)

---

### 🗄️ BANCO DE DADOS

**[BANCO-DE-DADOS-V1.md](./BANCO-DE-DADOS-V1.md)**
- 26 tabelas documentadas com finalidade e campos
- Relacionamentos entre tabelas
- Enums do sistema (UserRole, ContractStatus, etc.)
- 24 índices de performance e suas colunas
- Diagramas textuais de relacionamentos

---

### 🔐 SEGURANÇA E PERMISSÕES

**[PERMISSOES-E-SEGURANCA-V1.md](./PERMISSOES-E-SEGURANCA-V1.md)**
- 5 roles do sistema e suas capacidades
- Isolamento multi-tenant (como funciona na prática)
- Matriz completa de permissões por endpoint
- Endpoints públicos (sem autenticação — por design)
- Segurança de senhas (bcrypt, crypto.randomBytes)
- JWT e configuração de sessão
- HTTP Security Headers configurados
- Sistema de auditoria e ações registradas

---

### ⚙️ FLUXOS OPERACIONAIS

**[FLUXOS-OPERACIONAIS-V1.md](./FLUXOS-OPERACIONAIS-V1.md)**
- Cadastro de estudante (painel + auto-cadastro público)
- Cadastro de empresa (painel + auto-cadastro público)
- Processo seletivo (da vaga à aprovação)
- Criação de contrato/TCE (wizard completo)
- Geração de documentos jurídicos (11 tipos)
- Assinatura digital via Autentique
- Ativação automática do estágio
- Avaliação semestral
- Gestão financeira
- Rescisão de contrato
- Migração de estágios legados

---

### 💾 BACKUP E RECUPERAÇÃO

**[BACKUP-E-RECUPERACAO-V1.md](./BACKUP-E-RECUPERACAO-V1.md)**
- Backup automático do Supabase (diário)
- Backup manual via pg_dump
- Backup do código via GitHub
- Backup de variáveis de ambiente
- Processo de restauração do banco
- Riscos e mitigações

---

### ⏮️ ROLLBACK

**[ROLLBACK-PROCEDURE-V1.md](./ROLLBACK-PROCEDURE-V1.md)**
- Quando usar o rollback
- Opção 1: Vercel Dashboard (< 2 minutos — recomendado)
- Opção 2: Git reset + force push
- Opção 3: Git revert (mais seguro)
- Commit estável de referência
- Checklist pós-rollback
- O que NÃO é afetado (dados do banco preservados)

---

### 🚀 PROCESSO DE DEPLOY

**[PROCESSO-DEPLOY-V1.md](./PROCESSO-DEPLOY-V1.md)**
- 9 fases do processo completo de deploy seguro
- Classificação de risco por tipo de mudança
- Build local e verificações
- Convenção de commits
- Deploy preview via Pull Request
- Verificação pós-deploy
- Regras absolutas de desenvolvimento seguro

---

### 🔌 INTEGRAÇÕES EXTERNAS

**[INTEGRACOES-EXTERNAS-V1.md](./INTEGRACOES-EXTERNAS-V1.md)**
- OpenAI: funcionalidades, impacto, como substituir
- Supabase: criticidade, processo de migração
- Vercel: deploy, alternativas
- Resend/SMTP: emails, fallback, alternativas
- Autentique: assinatura digital, substituição
- Tabela de criticidade por integração

---

### ⚠️ PROBLEMAS CONHECIDOS

**[KNOWN-ISSUES-V1.md](./KNOWN-ISSUES-V1.md)**
- 8 limitações documentadas com nível de risco
- Melhorias futuras identificadas
- Riscos médios restantes da auditoria de segurança
- Itens opcionais para roadmap

---

### 🗺️ ROADMAP

**[ROADMAP-SMARTER.md](./ROADMAP-SMARTER.md)**
- Curto prazo (30-60 dias): segurança, estabilidade, onboarding
- Médio prazo (60-180 dias): cache, busca, produto, IA
- Longo prazo (6-18 meses): BI, multi-produto, infraestrutura
- Estado atual de todos os módulos

---

### 🛡️ AUDITORIA DE SEGURANÇA

**[../AUDITORIA-FINAL-PRODUCAO-V2.md](../AUDITORIA-FINAL-PRODUCAO-V2.md)**
- Score: 88/100 (pós-blindagem)
- 0 itens críticos, 0 itens altos
- 3 médios restantes documentados
- Veredito: Apto para produção com até 5 franqueados

**[../AUDITORIA-FINAL-PRODUCAO.md](../AUDITORIA-FINAL-PRODUCAO.md)**
- Auditoria V1 (base de referência pré-blindagem)
- Score: 71/100
- 8 itens altos identificados (todos corrigidos)

---

### ✅ CHECKLISTS E TESTES

**[../DEPLOY-SAFE-CHECKLIST.md](../DEPLOY-SAFE-CHECKLIST.md)**
- Checklist completo pré-deploy
- Verificação de variáveis de ambiente
- Verificação de migrations
- Verificação de rotas críticas pós-deploy

**[../TESTES-SEGURANCA-FINAL.md](../TESTES-SEGURANCA-FINAL.md)**
- 27 testes de segurança em 7 blocos
- Testes de autenticação, isolamento, permissões, documentos
- Formulários para preenchimento de resultados

---

### 📊 RELATÓRIO DE BLINDAGEM

**[../RELATORIO-BLINDAGEM-PRODUCAO.md](../RELATORIO-BLINDAGEM-PRODUCAO.md)**
- Lista completa de arquivos alterados na Sprint de Blindagem
- Todos os riscos corrigidos com detalhamento técnico
- Ownership checks adicionados
- Security headers implementados
- Score antes/depois

---

## GUIA RÁPIDO PARA NOVO DESENVOLVEDOR

### "Preciso entender o sistema rapidamente"
→ Leia: ARQUITETURA-SMARTER-V1.md → BANCO-DE-DADOS-V1.md → PERMISSOES-E-SEGURANCA-V1.md

### "Preciso fazer uma mudança segura"
→ Leia: PROCESSO-DEPLOY-V1.md → DEPLOY-SAFE-CHECKLIST.md

### "O sistema quebrou em produção"
→ Leia: ROLLBACK-PROCEDURE-V1.md (Opção 1 — Vercel Dashboard)

### "Preciso entender o fluxo de criação de contratos"
→ Leia: FLUXOS-OPERACIONAIS-V1.md (seções 4, 5, 6, 7)

### "Preciso configurar o sistema do zero"
→ Leia: INTEGRACOES-EXTERNAS-V1.md + VERSAO-ESTAVEL-V1.md (seção de variáveis de ambiente)

### "Quero saber o que tem para melhorar"
→ Leia: KNOWN-ISSUES-V1.md + ROADMAP-SMARTER.md

---

## STACK TÉCNICA RESUMIDA

```
Frontend + Backend:  Next.js 14.2.35 (App Router, TypeScript)
Banco de dados:      PostgreSQL via Supabase (Prisma 5.22)
Autenticação:        NextAuth.js 4 (JWT stateless)
Validação:           Zod 4 (schemas nas APIs críticas)
Senhas:              bcryptjs (10 rounds) + crypto.randomBytes
Estilo:              Tailwind CSS 3
Ícones:              Lucide React
Deploy:              Vercel (serverless, auto-deploy via GitHub)
IA:                  OpenAI gpt-4.1-mini
Email:               Resend + Nodemailer
Assinatura digital:  Autentique
```

---

## ACESSO AO SISTEMA

| Perfil | URL | Credenciais |
|--------|-----|------------|
| FRANQUEADORA | https://sistema.smarterestagios.com.br/login | Configurado na implantação |
| FRANQUEADO | https://sistema.smarterestagios.com.br/login | Criado pela FRANQUEADORA |
| EMPRESA | https://sistema.smarterestagios.com.br/login | Enviado por email no cadastro |
| ESTUDANTE | https://sistema.smarterestagios.com.br/login | Enviado por email no cadastro |

---

*Esta documentação foi gerada automaticamente como parte da Sprint de Congelamento e Documentação da Versão Estável V1 do Smarter Estágios — 02/06/2026.*

*Para reportar problemas ou sugerir melhorias, abrir issue no GitHub: https://github.com/vinny291p/smarter-v2-completo*
