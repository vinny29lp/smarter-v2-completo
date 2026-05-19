-- ============================================================
-- SMARTER ONE V2 — Seed de dados de teste
-- Execute APÓS o supabase-setup.sql
-- ============================================================

-- FRANQUEADO
INSERT INTO franchises (id, name, "razaoSocial", cnpj, responsavel, email, telefone, cidade, uf, endereco, cep, status, mensalidade, pontuacao)
VALUES (
  'franchise-sp-001',
  'Smarter Sao Paulo',
  'Smarter SP Agente de Integracao Ltda.',
  '11.222.333/0001-44',
  'Joao Silva',
  'sp@smarter.com.br',
  '(11) 9999-0001',
  'Sao Paulo', 'SP',
  'Av. Paulista, 1000',
  '01310-100',
  'ATIVO', 200, 9850
) ON CONFLICT (id) DO NOTHING;

-- INSTITUIÇÃO
INSERT INTO institutions (id, name, "razaoSocial", cnpj, tipo, email, telefone, coordenador, "cargoCoord", cidade, uf)
VALUES (
  'ies-usp-001',
  'USP',
  'Universidade de Sao Paulo',
  '63.025.530/0001-04',
  'Publica Federal',
  'estagios@usp.br',
  '(11) 3091-1000',
  'Prof. Dr. Carlos Silva',
  'Coordenador de Estagios',
  'Sao Paulo', 'SP'
) ON CONFLICT (id) DO NOTHING;

-- USUÁRIO FRANQUEADORA
INSERT INTO users (id, name, email, password, role)
VALUES (
  'user-admin-001',
  'Smarter Master',
  'admin@smarter.com.br',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'FRANQUEADORA'
) ON CONFLICT (email) DO NOTHING;

-- USUÁRIO FRANQUEADO
INSERT INTO users (id, name, email, password, role, "franchiseId")
VALUES (
  'user-franq-001',
  'Joao Silva',
  'franqueado@smarter.com.br',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'FRANQUEADO',
  'franchise-sp-001'
) ON CONFLICT (email) DO NOTHING;

-- EMPRESA
INSERT INTO companies (id, name, "razaoSocial", cnpj, setor, email, telefone, responsavel, "cargoResponsavel", cidade, uf, endereco, "franchiseId")
VALUES (
  'company-tech-001',
  'TechCorp',
  'TechCorp Brasil Ltda.',
  '12.345.678/0001-90',
  'Tecnologia',
  'rh@techcorp.com.br',
  '(11) 3333-1111',
  'Carlos Mendes',
  'Diretor de RH',
  'Sao Paulo', 'SP',
  'Av. Paulista, 1000',
  'franchise-sp-001'
) ON CONFLICT (cnpj) DO NOTHING;

-- USUÁRIO EMPRESA
INSERT INTO users (id, name, email, password, role, "franchiseId", "companyId")
VALUES (
  'user-empresa-001',
  'Carlos Mendes',
  'empresa@techcorp.com.br',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'EMPRESA',
  'franchise-sp-001',
  'company-tech-001'
) ON CONFLICT (email) DO NOTHING;

-- USUÁRIO ESTUDANTE
INSERT INTO users (id, name, email, password, role, "franchiseId")
VALUES (
  'user-estudante-001',
  'Ana Lima',
  'estudante@email.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'ESTUDANTE',
  'franchise-sp-001'
) ON CONFLICT (email) DO NOTHING;

-- ESTUDANTE
INSERT INTO students (id, "userId", name, cpf, rg, "dataNasc", sexo, email, celular, endereco, bairro, cidade, uf, cep, curso, periodo, "previsaoConclusao", "institutionId", "franchiseId", "discResult", status, habilidades)
VALUES (
  'student-ana-001',
  'user-estudante-001',
  'Ana Lima',
  '123.456.789-00',
  '12.345.678-9',
  '2002-03-10',
  'F',
  'estudante@email.com',
  '(11) 98888-1111',
  'Rua das Flores, 100',
  'Jardim Paulista',
  'Sao Paulo', 'SP', '01310-000',
  'Administracao de Empresas',
  '4',
  'Julho/2026',
  'ies-usp-001',
  'franchise-sp-001',
  'D',
  'EM_ESTAGIO',
  ARRAY['Excel','Word','Atendimento','Organizacao']
) ON CONFLICT (id) DO NOTHING;

-- VAGA
INSERT INTO vacancies (id, titulo, area, descricao, requisitos, beneficios, modalidade, bolsa, "auxTransporte", "cargaHoraria", "chDiaria", horario, cidade, uf, "discDesejado", status, "companyId", "franchiseId")
VALUES (
  'vacancy-001',
  'Assistente Administrativo Jr',
  'Administrativo',
  'Apoio nas rotinas administrativas e atendimento ao cliente.',
  'Cursando Administracao ou areas correlatas.',
  'Auxilio Transporte',
  'Presencial',
  1500, 200, 30, 6, '08h-14h',
  'Sao Paulo', 'SP', 'D', 'ABERTA',
  'company-tech-001',
  'franchise-sp-001'
) ON CONFLICT (id) DO NOTHING;

-- CONTRATO
INSERT INTO contracts (id, numero, "studentId", "companyId", "institutionId", "franchiseId", bolsa, "valorEmpresa", "auxTransporte", beneficios, vencimento, "dataInicio", "dataFim", atividades, "localEstagio", cidade, uf, "chDiaria", "chSemanal", "diasSemana", "horarioInicio", "horarioFim", intervalo, "supervisorNome", "supervisorCargo", "supervisorEmail", "supervisorTel", "coordNome", "coordCargo", "coordEmail", "apoliceSeguro", seguradora, "tipoEstagio", status)
VALUES (
  'contract-001',
  '001/2025',
  'student-ana-001',
  'company-tech-001',
  'ies-usp-001',
  'franchise-sp-001',
  1500, 1800, 200,
  'Auxilio Transporte', 5,
  '2025-01-15', '2025-07-15',
  'Apoio nas rotinas administrativas, elaboracao de relatorios, atendimento ao cliente e suporte ao time financeiro.',
  'Av. Paulista, 1000 - Sao Paulo/SP',
  'Sao Paulo', 'SP',
  6, 30, 'Segunda a Sexta', '08:00', '14:00', 60,
  'Maria Santos', 'Coordenadora de RH', 'maria@techcorp.com.br', '(11) 99999-2222',
  'Prof. Dr. Carlos Silva', 'Coordenador de Estagios', 'carlos@usp.br',
  '212709/M-65358303000126', 'PORTO SEGURO S.A',
  'Nao Obrigatorio', 'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- DOCUMENTOS DO CONTRATO (11 documentos)
INSERT INTO internship_documents (id, "contractId", tipo, titulo, status) VALUES
  ('doc-tce-001',  'contract-001', 'tce',  'Termo de Compromisso de Estagio',     'ASSINADO'),
  ('doc-pe-001',   'contract-001', 'pe',   'Plano de Estagio',                    'ASSINADO'),
  ('doc-ta-001',   'contract-001', 'ta',   'Termo Aditivo',                       'NAO_GERADO'),
  ('doc-tr-001',   'contract-001', 'tr',   'Rescisao ao TCE',                     'NAO_GERADO'),
  ('doc-rr-001',   'contract-001', 'rr',   'Recibo de Rescisao',                  'NAO_GERADO'),
  ('doc-rec-001',  'contract-001', 'rec',  'Termo de Recesso Remunerado',         'NAO_GERADO'),
  ('doc-rpb-001',  'contract-001', 'rpb',  'Recibo de Pagamento de Bolsa',        'GERADO'),
  ('doc-re-001',   'contract-001', 're',   'Termo de Realizacao de Estagio',      'NAO_GERADO'),
  ('doc-as-001',   'contract-001', 'as',   'Avaliacao Semestral',                 'NAO_GERADO'),
  ('doc-pt-001',   'contract-001', 'pt',   'Parecer Tecnico',                     'NAO_GERADO'),
  ('doc-cps-001',  'contract-001', 'cps',  'Contrato de Prestacao de Servicos',   'ASSINADO')
ON CONFLICT (id) DO NOTHING;

-- CRM LEADS
INSERT INTO crm_leads (id, empresa, contato, email, telefone, etapa, prioridade, "valorNegociado", "proximaAcao", "franchiseId")
VALUES
  ('lead-001', 'Startup Inovar', 'Roberto Lima', 'roberto@inovar.com', '11987651234', 'proposta', 'alta', 960, 'Enviar proposta comercial', 'franchise-sp-001'),
  ('lead-002', 'Tech Solutions', 'Carla Santos', 'carla@techsol.com', '11976542345', 'apresentacao', 'media', NULL, 'Agendar reuniao de apresentacao', 'franchise-sp-001'),
  ('lead-003', 'Grupo Educacional', 'Paulo Melo', 'paulo@edu.com', '11965433456', 'primeiro_contato', 'alta', NULL, 'Retornar ligacao urgente', 'franchise-sp-001')
ON CONFLICT (id) DO NOTHING;

-- FINANCEIRO
INSERT INTO financials (id, descricao, tipo, valor, status, categoria, "franchiseId", "companyId")
VALUES
  ('fin-001', 'Mensalidade TechCorp - Abril/2025', 'entrada', 480, 'PAGO', 'Empresa', 'franchise-sp-001', 'company-tech-001'),
  ('fin-002', 'Taxa Smarter Franqueadora - Abril/2025', 'saida', 213, 'PAGO', 'Taxa', 'franchise-sp-001', NULL),
  ('fin-003', 'Mensalidade Logistica Brasil - Abril/2025', 'entrada', 480, 'PENDENTE', 'Empresa', 'franchise-sp-001', NULL),
  ('fin-004', 'Aluguel Escritorio - Abril/2025', 'saida', 1800, 'PAGO', 'Operacional', 'franchise-sp-001', NULL)
ON CONFLICT (id) DO NOTHING;

-- GAMIFICAÇÃO
INSERT INTO gamification_points (id, "franchiseId", acao, pontos)
VALUES
  ('gam-001', 'franchise-sp-001', 'contrato_criado', 400),
  ('gam-002', 'franchise-sp-001', 'empresa_cadastrada', 300),
  ('gam-003', 'franchise-sp-001', 'vaga_publicada', 200),
  ('gam-004', 'franchise-sp-001', 'lead_convertido', 500),
  ('gam-005', 'franchise-sp-001', 'documento_assinado', 150)
ON CONFLICT (id) DO NOTHING;

SELECT 'Seed concluido com sucesso! Sistema pronto para uso.' as resultado;

-- RESUMO DOS USUARIOS
SELECT 'USUARIOS DE TESTE:' as info
UNION ALL SELECT '  admin@smarter.com.br      | smarter123 | Franqueadora'
UNION ALL SELECT '  franqueado@smarter.com.br | franq123   | Franqueado'
UNION ALL SELECT '  empresa@techcorp.com.br   | empresa123 | Empresa'
UNION ALL SELECT '  estudante@email.com       | estud123   | Estudante';
