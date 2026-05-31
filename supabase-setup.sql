-- ============================================================
-- SMARTER ONE V2 — Setup Supabase (PostgreSQL compatível)
-- ============================================================

-- ENUMS (usando DO $$ para verificar antes de criar)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('FRANQUEADORA','FRANQUEADO','EMPRESA','ESTUDANTE','FUNCIONARIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FranchiseStatus" AS ENUM ('ATIVO','INATIVO','ATENCAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyStatus" AS ENUM ('ATIVA','INATIVA','ATENCAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentStatus" AS ENUM ('DISPONIVEL','EM_PROCESSO','EM_ESTAGIO','FINALIZADO','INATIVO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VacancyStatus" AS ENUM ('ABERTA','PAUSADA','ENCERRADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM ('PENDENTE','AGUARDANDO_ASSINATURA','ATIVO','VENCIDO','FINALIZADO','SUSPENSO','INATIVO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DocStatus" AS ENUM ('NAO_GERADO','RASCUNHO','GERADO','ENVIADO_ASSINATURA','AGUARDANDO_ASSINATURA','ASSINADO','CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialStatus" AS ENUM ('PENDENTE','PAGO','VENCIDO','CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FRANCHISES
CREATE TABLE IF NOT EXISTS franchises (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "razaoSocial" TEXT,
  cnpj TEXT UNIQUE,
  responsavel TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  endereco TEXT,
  cep TEXT,
  status "FranchiseStatus" DEFAULT 'ATIVO',
  mensalidade FLOAT DEFAULT 200,
  plano TEXT DEFAULT 'completo',
  pontuacao INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- INSTITUTIONS
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "razaoSocial" TEXT,
  cnpj TEXT,
  tipo TEXT,
  email TEXT,
  telefone TEXT,
  coordenador TEXT,
  "cargoCoord" TEXT,
  cidade TEXT,
  uf TEXT,
  endereco TEXT,
  cep TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (sem FK companyId ainda, adicionamos depois)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role "UserRole" DEFAULT 'ESTUDANTE',
  active BOOLEAN DEFAULT true,
  "franchiseId" TEXT REFERENCES franchises(id),
  "companyId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "razaoSocial" TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  setor TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  responsavel TEXT,
  "cargoResponsavel" TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT,
  site TEXT,
  status "CompanyStatus" DEFAULT 'ATIVA',
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Agora adiciona FK de companyId em users
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_users_company
    FOREIGN KEY ("companyId") REFERENCES companies(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  "dataNasc" TIMESTAMPTZ,
  sexo TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  curso TEXT,
  periodo TEXT,
  semestre TEXT,
  "previsaoConclusao" TEXT,
  "institutionId" TEXT REFERENCES institutions(id),
  "franchiseId" TEXT REFERENCES franchises(id),
  "discResult" TEXT,
  "discData" JSONB,
  curriculo JSONB,
  habilidades TEXT[] DEFAULT '{}',
  idiomas JSONB,
  observacoes TEXT,
  status "StudentStatus" DEFAULT 'DISPONIVEL',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- VACANCIES
CREATE TABLE IF NOT EXISTS vacancies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo TEXT NOT NULL,
  area TEXT,
  descricao TEXT,
  requisitos TEXT,
  beneficios TEXT,
  modalidade TEXT DEFAULT 'Presencial',
  bolsa FLOAT NOT NULL,
  "auxTransporte" FLOAT,
  "cargaHoraria" INTEGER DEFAULT 30,
  "chDiaria" INTEGER DEFAULT 6,
  horario TEXT,
  cidade TEXT,
  uf TEXT,
  endereco TEXT,
  "discDesejado" TEXT,
  status "VacancyStatus" DEFAULT 'ABERTA',
  "companyId" TEXT NOT NULL REFERENCES companies(id),
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES students(id),
  "vacancyId" TEXT NOT NULL REFERENCES vacancies(id),
  etapa TEXT DEFAULT 'inscritos',
  matching INTEGER,
  anotacao TEXT,
  "entrevistaAt" TIMESTAMPTZ,
  status TEXT DEFAULT 'ativo',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("studentId","vacancyId")
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero TEXT,
  "studentId" TEXT NOT NULL REFERENCES students(id),
  "companyId" TEXT NOT NULL REFERENCES companies(id),
  "institutionId" TEXT REFERENCES institutions(id),
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  bolsa FLOAT NOT NULL,
  "valorEmpresa" FLOAT,
  "auxTransporte" FLOAT,
  beneficios TEXT,
  vencimento INTEGER DEFAULT 5,
  "dataInicio" TIMESTAMPTZ NOT NULL,
  "dataFim" TIMESTAMPTZ NOT NULL,
  atividades TEXT,
  "localEstagio" TEXT,
  cidade TEXT,
  uf TEXT,
  "chDiaria" INTEGER DEFAULT 6,
  "chSemanal" INTEGER DEFAULT 30,
  "diasSemana" TEXT DEFAULT 'Segunda a Sexta',
  "horarioInicio" TEXT DEFAULT '08:00',
  "horarioFim" TEXT DEFAULT '14:00',
  intervalo INTEGER DEFAULT 60,
  "supervisorNome" TEXT,
  "supervisorCargo" TEXT,
  "supervisorEmail" TEXT,
  "supervisorTel" TEXT,
  "supervisorAssina" BOOLEAN DEFAULT false,
  "coordNome" TEXT,
  "coordCargo" TEXT,
  "coordEmail" TEXT,
  "coordTel" TEXT,
  "apoliceSeguro" TEXT,
  seguradora TEXT,
  "tipoEstagio" TEXT DEFAULT 'Nao Obrigatorio',
  status "ContractStatus" DEFAULT 'PENDENTE',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- INTERNSHIP DOCUMENTS
CREATE TABLE IF NOT EXISTS internship_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contractId" TEXT NOT NULL REFERENCES contracts(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  status "DocStatus" DEFAULT 'NAO_GERADO',
  "htmlContent" TEXT,
  "pdfUrl" TEXT,
  "signedUrl" TEXT,
  "signedAt" TIMESTAMPTZ,
  signers JSONB,
  "authDocId" TEXT,
  "metaData" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- EVALUATIONS
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contractId" TEXT NOT NULL REFERENCES contracts(id),
  tipo TEXT DEFAULT 'semestral',
  link TEXT UNIQUE,
  respostas JSONB,
  atividades TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  "respondidoAt" TIMESTAMPTZ,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- CRM LEADS
CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  empresa TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  etapa TEXT DEFAULT 'novo_lead',
  prioridade TEXT DEFAULT 'media',
  "valorNegociado" FLOAT,
  "retornoAt" TIMESTAMPTZ,
  "ultimoContato" TIMESTAMPTZ,
  "proximaAcao" TEXT,
  anotacao TEXT,
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  "companyId" TEXT REFERENCES companies(id),
  convertido BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- CRM TASKS
CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "leadId" TEXT NOT NULL REFERENCES crm_leads(id),
  descricao TEXT NOT NULL,
  "dueAt" TIMESTAMPTZ,
  done BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- FINANCIALS
CREATE TABLE IF NOT EXISTS financials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  valor FLOAT NOT NULL,
  categoria TEXT,
  status "FinancialStatus" DEFAULT 'PENDENTE',
  "vencimentoAt" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  cancelado BOOLEAN DEFAULT false,
  "franchiseId" TEXT REFERENCES franchises(id),
  "companyId" TEXT REFERENCES companies(id),
  "contractId" TEXT REFERENCES contracts(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- DISC TESTS
CREATE TABLE IF NOT EXISTS disc_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES students(id),
  respostas JSONB NOT NULL,
  resultado TEXT NOT NULL,
  grafico JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- GAMIFICATION
CREATE TABLE IF NOT EXISTS gamification_points (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  acao TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES users(id),
  acao TEXT NOT NULL,
  modulo TEXT,
  detalhes TEXT,
  ip TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  tipo TEXT,
  link TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- UPLOADED FILES
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER,
  referencia TEXT,
  "referenciaId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL REFERENCES users(id),
  "franchiseId" TEXT NOT NULL REFERENCES franchises(id),
  cargo TEXT,
  permissoes TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- PRISMA MIGRATIONS
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  applied_steps_count INTEGER DEFAULT 0
);

SELECT 'Tabelas criadas com sucesso! Agora rode o seed.' as resultado;
