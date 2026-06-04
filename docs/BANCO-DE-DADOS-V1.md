# BANCO DE DADOS V1 — SMARTER ESTÁGIOS
**Banco:** PostgreSQL via Supabase | **ORM:** Prisma 5.22 | **Data:** 02/06/2026
**Projeto Supabase:** mepocerocoknzaotrove (sa-east-1)

---

## VISÃO GERAL — 26 TABELAS

```
users ←→ franchise ←→ company ←→ contracts ←→ internship_documents
  ↓           ↓                       ↓
students    employees               evaluations
  ↓                                   ↓
applications ←→ vacancies           financials
  ↓                                   ↓
disc_tests                        financial_send_logs

crm_leads ←→ crm_notas
          ←→ crm_tasks

institutions ←→ students
             ←→ contracts

activity_logs
notifications
system_configs
ai_usage_logs
gamification_configs / gamification_points
import_logs
uploaded_files
```

---

## TABELAS DETALHADAS

### 1. `users` — Usuários do sistema

**Finalidade:** Autenticação e identidade de todos os perfis do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK gerada pelo banco |
| name | String | Nome completo |
| email | String UNIQUE | Email de login |
| password | String | Hash bcrypt (10 rounds) |
| role | Enum UserRole | FRANQUEADORA / FRANQUEADO / FUNCIONARIO / EMPRESA / ESTUDANTE |
| active | Boolean | Se o usuário pode fazer login |
| franchiseId | String? | FK → franchises (para FRANQUEADO/FUNCIONARIO) |
| companyId | String? | FK → companies (para EMPRESA) |
| lastLoginAt | DateTime? | Último acesso |
| createdAt / updatedAt | DateTime | Timestamps |

**Relacionamentos:** 1:1 com Student, 1:1 com Employee, N:1 com Franchise, N:1 com Company
**Índices:** email (UNIQUE)

---

### 2. `franchises` — Franqueados

**Finalidade:** Representa cada unidade franqueada. É a âncora principal do isolamento multi-tenant.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| name | String | Nome da unidade |
| razaoSocial | String? | Razão social |
| cnpj | String? UNIQUE | CNPJ |
| responsavel | String | Nome do responsável |
| email | String | Email da unidade |
| status | Enum FranchiseStatus | ATIVO / INATIVO / ATENCAO |
| mensalidade | Float? | Valor da mensalidade cobrada |
| cobrarMensalidade | Boolean | Se a mensalidade está ativa |

**Relacionamentos:** 1:N com Users, Companies, Students, Contracts, Financials, CrmLeads, Vacancies, Employees
**Observação:** Toda entidade de dados operacional tem `franchiseId` para isolamento.

---

### 3. `companies` — Empresas parceiras

**Finalidade:** Empresas que abrem vagas e recebem estagiários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| name / razaoSocial | String | Nome fantasia e razão social |
| cnpj | String UNIQUE | CNPJ |
| email / telefone | String | Contato |
| status | Enum CompanyStatus | ATIVA / INATIVA / ATENCAO / PENDENTE |
| franchiseId | String | FK → franchises |
| pendente | Boolean? | Se veio do auto-cadastro público e aguarda aprovação |
| emailFinanceiro | String? | Email alternativo para cobranças |

**Índices:** franchiseId, status
**Relacionamentos:** N:1 Franchise, 1:N Contracts, 1:N Vacancies, 1:N CrmLeads, 1:N Financials, 1:N Users

---

### 4. `institutions` — Instituições de Ensino (IES)

**Finalidade:** Universidades e faculdades vinculadas aos estágios (parte obrigatória do TCE).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| name | String | Nome da IES |
| cnpj | String? | CNPJ |
| coordenador / cargoCoord | String? | Supervisor acadêmico |
| cursos | String[] | Lista de cursos disponíveis |

**Observação:** Instituições são **compartilhadas na rede** — não têm franchiseId. Um estudante de qualquer franquia pode pertencer a uma mesma IES.

---

### 5. `students` — Estudantes

**Finalidade:** Perfil completo do estudante estagiário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| userId | String UNIQUE | FK → users (1:1) |
| name / cpf / rg | String | Dados pessoais |
| dataNasc / sexo | | Dados pessoais |
| email / celular / telefone | String | Contato |
| endereco / bairro / cidade / uf / cep | String? | Endereço |
| curso / periodo / previsaoConclusao | String? | Dados acadêmicos |
| institutionId | String? | FK → institutions |
| franchiseId | String? | FK → franchises |
| status | Enum StudentStatus | DISPONIVEL / EM_PROCESSO / EM_ESTAGIO / FINALIZADO / INATIVO |
| discResult | String? | Perfil DISC (D/I/S/C) |
| discData | Json? | Dados completos do teste DISC |
| curriculo | Json? | Experiências e formações estruturadas |
| habilidades | String[] | Lista de habilidades |
| linkedin / portfolio | String? | Redes profissionais |

**Índices:** franchiseId, status, institutionId

---

### 6. `vacancies` — Vagas de estágio

**Finalidade:** Vagas publicadas pelas empresas, visíveis nos portais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| titulo / funcao / area | String | Dados da vaga |
| bolsa | Float | Valor da bolsa |
| auxTransporte | Float? | Auxílio transporte |
| cargaHoraria / chDiaria | Int? | Horas |
| status | Enum VacancyStatus | ABERTA / PAUSADA / ENCERRADA |
| companyId | String | FK → companies |
| franchiseId | String | FK → franchises |
| publicSlug | String? | Slug para página pública `/vaga/[slug]` |
| discDesejado | String? | Perfil DISC ideal para a vaga |

---

### 7. `applications` — Candidaturas

**Finalidade:** Relaciona estudantes a vagas no processo seletivo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| studentId | String | FK → students |
| vacancyId | String | FK → vacancies |
| etapa | String | inscritos / triagem / entrevista / aprovado / reprovado |
| matching | Int? | Score de compatibilidade DISC (0-100) |
| anotacao | String? | Anotação visível ao candidato |
| anotacaoInterna | String? | Anotação interna (não visível ao candidato) |
| parecerTecnico | String? | Parecer técnico do recrutador |
| entrevistaAt | DateTime? | Data/hora da entrevista |
| recomendacao | String? | Aprovado / Reprovado / Em análise |

**Constraint:** `UNIQUE(studentId, vacancyId)` — um estudante não pode se candidatar duas vezes à mesma vaga.

---

### 8. `contracts` — Contratos de estágio (TCE)

**Finalidade:** O contrato é o objeto central do sistema. Vincula estudante + empresa + IES + franquia e gera todos os documentos jurídicos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| numero | String? | Número sequencial do contrato |
| studentId / companyId / institutionId | String | FKs |
| franchiseId | String | FK — isolamento multi-tenant |
| bolsa | Float | Valor da bolsa do estudante |
| valorEmpresa | Float? | Valor cobrado da empresa (taxa admin) |
| auxTransporte | Float? | Auxílio transporte |
| dataInicio / dataFim | DateTime | Período do estágio |
| status | Enum ContractStatus | PENDENTE / AGUARDANDO_ASSINATURA / ATIVO / VENCIDO / FINALIZADO / SUSPENSO / INATIVO |
| chDiaria / chSemanal | Int? | Carga horária |
| supervisor* / coord* | String? | Dados do supervisor e coordenador |
| tipoEstagio | String? | Obrigatório / Não Obrigatório |
| origem | String? | NORMAL / MIGRACAO |
| migrado* | | Campos de rastreamento de migração |

**Índices:** franchiseId, status, companyId, studentId

---

### 9. `internship_documents` — Documentos do contrato

**Finalidade:** Armazena cada documento jurídico vinculado ao contrato.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | PK |
| contractId | String | FK → contracts |
| tipo | String | tce / pe / rpb / tr / rr / rec / re / ta / cps / as / pt |
| titulo | String | Nome do documento |
| status | Enum DocStatus | NAO_GERADO / RASCUNHO / GERADO / ENVIADO_ASSINATURA / ASSINADO / CANCELADO |
| htmlContent | String? | HTML gerado do documento |
| signedUrl | String? | URL do PDF assinado (Autentique) |
| authDocId | String? | ID do documento no Autentique |
| signers | Json? | Status de assinatura de cada parte |

**Tipos de documento:**
- `tce` — Termo de Compromisso de Estágio (principal)
- `pe` — Plano de Estágio
- `rpb` — Recibo de Pagamento de Bolsa
- `tr` — Termo de Rescisão
- `rr` — Recibo de Rescisão
- `rec` — Termo de Recesso
- `re` — Relatório de Estágio
- `ta` — Termo Aditivo
- `cps` — Contrato de Prestação de Serviços
- `as` — Avaliação Semestral
- `pt` — Parecer Técnico

**Índices:** contractId, status

---

### 10. `evaluations` — Avaliações semestrais

**Finalidade:** Registro das avaliações do estagiário feitas pela empresa supervisora.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| contractId | String | FK → contracts |
| tipo | String | semestral / final |
| respostas | Json? | Respostas do formulário |
| status | String | pendente / respondido |
| respondidoAt | DateTime? | Data da resposta |
| link | String? UNIQUE | Link único para avaliação anônima |

---

### 11. `crm_leads` — Leads comerciais

**Finalidade:** Pipeline de prospecção de novas empresas parceiras.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| empresa / contato | String | Dados do prospect |
| etapa | String | novo_lead / contato / proposta / negociacao / fechado |
| situacao | String | ativo / pausado / perdido / vendido |
| prioridade | String | alta / media / baixa |
| valorNegociado | Float? | Valor negociado |
| retornoAt / reuniaoAt | DateTime? | Datas de follow-up |
| franchiseId | String | FK — isolamento por franquia |
| convertido | Boolean? | Se virou cliente |

**Índices:** franchiseId, situacao, updatedAt

---

### 12. `crm_notas` — Histórico de notas do CRM

**Finalidade:** Timeline de interações com o lead.
**Cascade:** Deletadas automaticamente quando o lead é excluído.

---

### 13. `crm_tasks` — Tarefas do CRM

**Finalidade:** Atividades agendadas para o lead (ligação, email, reunião).

---

### 14. `financials` — Lançamentos financeiros

**Finalidade:** Controle de cobranças e pagamentos (taxa admin, mensalidade de rede, outros).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| descricao | String | Descrição do lançamento |
| tipo | String | entrada / saida |
| valor | Float | Valor em R$ |
| categoria | String? | Taxa Admin / Franquia / Outros |
| status | Enum FinancialStatus | PENDENTE / PAGO / VENCIDO / CANCELADO |
| vencimentoAt | DateTime? | Data de vencimento |
| recorrente | Boolean? | Se é cobrança recorrente mensal |
| diaVencimento | Int? | Dia do mês para vencimento |
| franchiseId / companyId / contractId | String? | FKs opcionais |

**Índices:** franchiseId, status, contractId, companyId, vencimentoAt

---

### 15. `financial_send_logs` — Log de envio de cobranças

**Finalidade:** Rastreia quais cobranças foram enviadas por email e quando.

---

### 16. `employees` — Funcionários da franquia

**Finalidade:** Funcionários com acesso ao sistema com permissões granulares.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| userId | String UNIQUE | FK → users (1:1) |
| franchiseId | String | FK → franchises |
| cargo | String? | Cargo do funcionário |
| permissoes | String[] | Lista de módulos: `["financeiro","crm","contratos",...]` |

**Permissões disponíveis:** financeiro, contratos, crm, empresas, estudantes, processos, instituicoes, assinaturas, configuracoes

---

### 17. `disc_tests` — Testes DISC

**Finalidade:** Histórico de testes comportamentais DISC realizados pelo estudante.

---

### 18. `activity_logs` — Logs de auditoria

**Finalidade:** Rastreia ações críticas no sistema (quem fez o quê e quando).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| userId | String? | FK → users |
| acao | String | LOGIN / EMPRESA_CRIADA / CONTRATO_EDITADO / etc. |
| modulo | String? | empresas / contratos / financeiro / etc. |
| detalhes | String? | Contexto da ação |
| ip | String? | IP real do usuário |

**Índices:** userId, createdAt, modulo

---

### 19. `system_configs` — Configurações globais

**Finalidade:** Registro único (id="default") com todas as configurações da plataforma: dados da empresa franqueadora, tokens de integração, personalização visual.

---

### 20. `ai_usage_logs` — Logs de uso de IA

**Finalidade:** Rastreia cada chamada à OpenAI com tokens consumidos e custo estimado.

**Índices:** franchiseId, userId, tipoUso, createdAt

---

### 21. `import_logs` — Logs de importação

**Finalidade:** Rastreia importações em massa de estudantes via Excel.

---

### 22-24. Gamificação (`gamification_configs`, `gamification_points`, `notifications`)

Tabelas para o sistema de pontuação e ranking de franqueados, além de notificações in-app.

---

### 25. `uploaded_files` — Arquivos enviados

**Finalidade:** Rastreia uploads de arquivos (currículos, documentos) com URL e referência.

---

## ENUMS DEFINIDOS

| Enum | Valores |
|------|---------|
| UserRole | FRANQUEADORA, FRANQUEADO, FUNCIONARIO, EMPRESA, ESTUDANTE |
| FranchiseStatus | ATIVO, INATIVO, ATENCAO |
| CompanyStatus | ATIVA, INATIVA, ATENCAO, PENDENTE |
| StudentStatus | DISPONIVEL, EM_PROCESSO, EM_ESTAGIO, FINALIZADO, INATIVO |
| VacancyStatus | ABERTA, PAUSADA, ENCERRADA |
| ContractStatus | PENDENTE, AGUARDANDO_ASSINATURA, ATIVO, VENCIDO, FINALIZADO, SUSPENSO, INATIVO |
| DocStatus | NAO_GERADO, RASCUNHO, GERADO, ENVIADO_ASSINATURA, AGUARDANDO_ASSINATURA, ASSINADO, CANCELADO |
| FinancialStatus | PENDENTE, PAGO, VENCIDO, CANCELADO |

---

## ÍNDICES DE PERFORMANCE (24 índices)

| Tabela | Coluna indexada |
|--------|----------------|
| companies | franchiseId, status |
| students | franchiseId, status, institutionId |
| contracts | franchiseId, status, companyId, studentId |
| internship_documents | contractId, status |
| crm_leads | franchiseId, situacao, updatedAt |
| financials | franchiseId, status, contractId, companyId, vencimentoAt |
| activity_logs | userId, createdAt, modulo |
| ai_usage_logs | franchiseId, userId, tipoUso, createdAt |

---

*Smarter Estágios — Banco de Dados V1 — 02/06/2026*
