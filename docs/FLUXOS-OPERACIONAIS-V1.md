# FLUXOS OPERACIONAIS V1 — SMARTER ESTÁGIOS
**Versão:** stable-v1 | **Data:** 02/06/2026

---

## 1. CADASTRO DE ESTUDANTE

**Via painel (FRANQUEADO/FUNCIONARIO):**
1. Acessa `/dashboard/estudantes/novo`
2. Preenche dados pessoais, acadêmicos, habilidades
3. POST `/api/app/estudantes` → cria `User` (role=ESTUDANTE) + `Student`
4. Email de boas-vindas enviado com credenciais
5. Status inicial: `DISPONIVEL`

**Via auto-cadastro público:**
1. Acessa `/cadastro/estudante` (landing page)
2. Preenche formulário
3. POST `/api/public/estudante` → cria `User` + `Student`
4. Email com credenciais enviado (senha gerada com `crypto.randomBytes`)
5. Status inicial: `DISPONIVEL` | Franquia: vinculada automaticamente

---

## 2. CADASTRO DE EMPRESA

**Via painel:**
1. Acessa `/dashboard/empresas/nova`
2. Preenche CNPJ, dados de contato, responsável
3. POST `/api/app/empresas` → cria `Company` + `User` (role=EMPRESA) + acesso ao portal
4. Email de boas-vindas enviado à empresa
5. Status inicial: `ATIVA`

**Via auto-cadastro público:**
1. Acessa `/cadastro/empresa`
2. POST `/api/public/empresa` → cria `Company` com `status=PENDENTE` + lead CRM automático
3. Franqueado visualiza no painel e aprova/ativa manualmente

---

## 3. PROCESSO SELETIVO

1. FRANQUEADO cria uma vaga: POST `/api/app/vagas`
2. Vaga publicada com `status=ABERTA` e `publicSlug`
3. Estudantes se candidatam via portal ou página pública `/vaga/[slug]`
4. Candidatura criada em `Application` com `etapa=inscritos`
5. Recrutador acessa `/dashboard/processos` e avança etapas:
   - inscritos → triagem → entrevista → aprovado / reprovado
6. Para aprovado: inicia criação do contrato

---

## 4. CRIAÇÃO DE CONTRATO / TCE

1. FRANQUEADO acessa `/dashboard/contratos/novo`
2. Wizard em etapas: seleciona estudante → empresa → IES → datas → financeiro → supervisor → coordenador
3. POST `/api/app/contratos` → cria `Contract` + 8 documentos padrão (InternshipDocument) com status `NAO_GERADO`
4. Status do contrato: `PENDENTE`
5. Estudante tem status atualizado para `EM_PROCESSO` (se havia contrato ativo anterior, permanece `EM_ESTAGIO`)

**Documentos criados automaticamente:**
TCE, Plano de Estágio, Recibo de Bolsa, Termo de Rescisão, Recibo de Rescisão, Termo de Recesso, Relatório de Realização, Contrato de Prestação de Serviços

---

## 5. GERAÇÃO DO PLANO DE ESTÁGIO / DOCUMENTOS

1. FRANQUEADO acessa `/dashboard/contratos/[id]` → aba "Documentos"
2. Clica em "Gerar" em qualquer documento
3. POST `/api/app/contratos/[id]/documentos/[docId]` → template HTML renderizado com dados do contrato
4. HTML salvo em `InternshipDocument.htmlContent`
5. Status → `GERADO`
6. Usuário pode pré-visualizar o HTML como PDF no browser (via `wrapParaPDF`)

---

## 6. ASSINATURAS DIGITAIS (Autentique)

1. Após gerar o documento, usuário clica em "Enviar para Assinatura"
2. POST `/api/app/contratos/[id]/documentos/[docId]/autentique`
3. Sistema envia HTML ao Autentique via GraphQL API
4. Autentique retorna `authDocId` e links individuais para cada parte
5. Cada signatário (estudante, empresa, IES) recebe email com link de assinatura
6. FRANQUEADO pode verificar status: GET retorna status atualizado do Autentique
7. Quando todos assinam:
   - `InternshipDocument.status = ASSINADO`
   - `InternshipDocument.signedUrl` = URL do PDF assinado
8. Se for o TCE: contrato muda para `status=ATIVO` automaticamente

---

## 7. ATIVAÇÃO DO ESTÁGIO

Acontece automaticamente quando o TCE é 100% assinado:
1. `Contract.status` → `ATIVO`
2. `Student.status` → `EM_ESTAGIO`
3. Lançamento automático de Taxa de Administração criado em `financials`

Também pode ser ativado manualmente pelo FRANQUEADO via PATCH no contrato.

---

## 8. AVALIAÇÃO SEMESTRAL

1. FRANQUEADO acessa contrato → clica em "Enviar Avaliação"
2. POST `/api/app/contratos/[id]/enviar-avaliacao` → envia email à empresa com link único
3. Responsável da empresa acessa `/portal-empresa/avaliacoes`
4. Preenche o formulário de avaliação do estagiário
5. POST `/api/portal/empresa/avaliacoes` → cria `Evaluation` com `status=respondido`
6. FRANQUEADO pode visualizar no painel do contrato

---

## 9. FINANCEIRO

**Lançamento manual:**
1. FRANQUEADO acessa `/dashboard/financeiro` → "Novo Lançamento"
2. POST `/api/app/financeiro` → cria `Financial`

**Lançamento automático:**
- Taxa de Administração: criada quando TCE é assinado (valor = `valorEmpresa` do contrato)

**Gestão:**
- Dar baixa: PATCH `/api/app/financeiro/[id]` com `{ status: "PAGO" }`
- Enviar cobrança: POST `/api/app/financeiro/[id]/enviar-cobranca` → email para empresa/franqueado
- Cobranças de Franquia (mensalidade de rede): apenas FRANQUEADORA pode dar baixa

**Fechar mês:**
- POST `/api/app/financeiro/fechar-mes` → gera lançamentos recorrentes do próximo mês

---

## 10. RESCISÃO DE CONTRATO

1. FRANQUEADO acessa contrato ativo → gera "Termo de Rescisão" (tipo `tr`)
2. Preenche: último dia, motivo, tipo de rescisão
3. Gera o documento (POST `/api/app/contratos/[id]/documentos/[docId]` com tipo `tr`)
4. Envia para assinatura via Autentique
5. Após assinatura:
   - `Contract.status` → `INATIVO`
   - `Student.status` → `DISPONIVEL` (se não tiver outros contratos ativos)
6. Gera Recibo de Rescisão (tipo `rr`) separadamente

---

## 11. MIGRAÇÃO DE ESTÁGIO

**Para contratos existentes antes do sistema:**
1. FRANQUEADO acessa `/dashboard/estudantes/[id]` → aba Migração (ou módulo específico)
2. Preenche dados do contrato legado (empresa, datas, valores)
3. POST `/api/app/contratos/[id]/migrar` → cria contrato com `origem=MIGRACAO`
4. Sistema marca campos de rastreamento (`migradoEm`, `migradoPor`, `migradoPorNome`)
5. Upload opcional do TCE original digitalizado (`tceMigradaUrl`)

**Importação em massa via Excel:**
1. Download do template Excel
2. Preenchimento com dados dos estudantes
3. Upload via `/dashboard/estudantes` → "Importar"
4. POST `/api/app/estudantes/importar` → processa arquivo
5. Resultado registrado em `ImportLog`

---

*Smarter Estágios — Fluxos Operacionais V1 — 02/06/2026*
