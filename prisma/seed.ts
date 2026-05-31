import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const hash = (p: string) => bcrypt.hash(p, 10);

  // ── Franqueadora master
  const franqueadora = await prisma.user.upsert({
    where: { email: "admin@smarter.com.br" },
    update: {},
    create: {
      name: "Smarter Master",
      email: "admin@smarter.com.br",
      password: await hash("smarter123"),
      role: "FRANQUEADORA",
    },
  });

  // ── Instituição de Ensino
  const ies = await prisma.institution.upsert({
    where: { id: "ies-usp" },
    update: {},
    create: {
      id: "ies-usp",
      name: "USP",
      razaoSocial: "Universidade de Sao Paulo",
      cnpj: "63.025.530/0001-04",
      tipo: "Publica Federal",
      email: "estagios@usp.br",
      telefone: "(11) 3091-1000",
      coordenador: "Prof. Dr. Carlos Silva",
      cargoCoord: "Coordenador de Estagios",
      cidade: "Sao Paulo",
      uf: "SP",
    },
  });

  // ── Franqueado SP
  const franchise = await prisma.franchise.upsert({
    where: { cnpj: "11.222.333/0001-44" },
    update: {},
    create: {
      name: "Smarter Sao Paulo",
      razaoSocial: "Smarter SP Agente de Integracao Ltda.",
      cnpj: "11.222.333/0001-44",
      responsavel: "João Silva",
      email: "sp@smarter.com.br",
      telefone: "(11) 9999-0001",
      cidade: "Sao Paulo",
      uf: "SP",
      endereco: "Av. Paulista, 1000",
      cep: "01310-100",
      mensalidade: 200,
      pontuacao: 9850,
    },
  });

  // Usuário franqueado
  await prisma.user.upsert({
    where: { email: "franqueado@smarter.com.br" },
    update: {},
    create: {
      name: "João Silva",
      email: "franqueado@smarter.com.br",
      password: await hash("franq123"),
      role: "FRANQUEADO",
      franchiseId: franchise.id,
    },
  });

  // ── Empresa
  const company = await prisma.company.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: {},
    create: {
      name: "TechCorp",
      razaoSocial: "TechCorp Brasil Ltda.",
      cnpj: "12.345.678/0001-90",
      setor: "Tecnologia",
      email: "rh@techcorp.com.br",
      telefone: "(11) 3333-1111",
      responsavel: "Carlos Mendes",
      cargoResponsavel: "Diretor de RH",
      cidade: "Sao Paulo",
      uf: "SP",
      endereco: "Av. Paulista, 1000",
      franchiseId: franchise.id,
    },
  });

  // Usuário empresa
  await prisma.user.upsert({
    where: { email: "empresa@techcorp.com.br" },
    update: {},
    create: {
      name: "Carlos Mendes",
      email: "empresa@techcorp.com.br",
      password: await hash("empresa123"),
      role: "EMPRESA",
      franchiseId: franchise.id,
      companyId: company.id,
    },
  });

  // ── Estudante
  const studentUser = await prisma.user.upsert({
    where: { email: "estudante@email.com" },
    update: {},
    create: {
      name: "Ana Lima",
      email: "estudante@email.com",
      password: await hash("estud123"),
      role: "ESTUDANTE",
      franchiseId: franchise.id,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      name: "Ana Lima",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      dataNasc: new Date("2002-03-10"),
      sexo: "F",
      email: "estudante@email.com",
      celular: "(11) 98888-1111",
      endereco: "Rua das Flores, 100",
      bairro: "Jardim Paulista",
      cidade: "Sao Paulo",
      uf: "SP",
      cep: "01310-000",
      curso: "Administracao de Empresas",
      periodo: "4",
      previsaoConclusao: "Julho/2026",
      institutionId: ies.id,
      franchiseId: franchise.id,
      discResult: "D",
      status: "EM_ESTAGIO",
      habilidades: ["Excel", "Word", "Atendimento", "Organizacao"],
    },
  });

  // ── Vaga
  const vacancy = await prisma.vacancy.upsert({
    where: { id: "v-dev-jr" },
    update: {},
    create: {
      id: "v-dev-jr",
      titulo: "Assistente Administrativo Jr",
      area: "Administrativo",
      descricao: "Apoio nas rotinas administrativas e atendimento ao cliente.",
      requisitos: "Cursando Administracao ou areas correlatas.",
      beneficios: "Auxilio Transporte",
      modalidade: "Presencial",
      bolsa: 1500,
      auxTransporte: 200,
      cargaHoraria: 30,
      chDiaria: 6,
      horario: "08h-14h",
      cidade: "Sao Paulo",
      uf: "SP",
      discDesejado: "D",
      companyId: company.id,
      franchiseId: franchise.id,
    },
  });

  // ── Contrato
  const contract = await prisma.contract.upsert({
    where: { id: "ct-001" },
    update: {},
    create: {
      id: "ct-001",
      numero: "001/2025",
      studentId: student.id,
      companyId: company.id,
      institutionId: ies.id,
      franchiseId: franchise.id,
      bolsa: 1500,
      valorEmpresa: 1800,
      auxTransporte: 200,
      beneficios: "Auxilio Transporte",
      vencimento: 5,
      dataInicio: new Date("2025-01-15"),
      dataFim: new Date("2025-07-15"),
      atividades: "Apoio nas rotinas administrativas, elaboracao de relatorios, atendimento ao cliente e suporte ao time financeiro.",
      localEstagio: "Av. Paulista, 1000 - Sao Paulo/SP",
      cidade: "Sao Paulo",
      uf: "SP",
      chDiaria: 6,
      chSemanal: 30,
      diasSemana: "Segunda a Sexta",
      horarioInicio: "08:00",
      horarioFim: "14:00",
      intervalo: 60,
      supervisorNome: "Maria Santos",
      supervisorCargo: "Coordenadora de RH",
      supervisorEmail: "maria@techcorp.com.br",
      supervisorTel: "(11) 99999-2222",
      coordNome: "Prof. Dr. Carlos Silva",
      coordCargo: "Coordenador de Estagios",
      coordEmail: "carlos@usp.br",
      coordTel: "(11) 3091-1000",
      apoliceSeguro: "212709/M-65358303000126",
      seguradora: "PORTO SEGURO S.A",
      tipoEstagio: "Nao Obrigatorio",
      status: "ATIVO",
    },
  });

  // ── Documentos do contrato
  const docTipos = [
    { tipo: "tce", titulo: "Termo de Compromisso de Estagio" },
    { tipo: "pe", titulo: "Plano de Estagio" },
    { tipo: "ta", titulo: "Termo Aditivo" },
    { tipo: "tr", titulo: "Rescisao ao TCE" },
    { tipo: "rr", titulo: "Recibo de Rescisao" },
    { tipo: "rec", titulo: "Termo de Recesso Remunerado" },
    { tipo: "rpb", titulo: "Recibo de Pagamento de Bolsa" },
    { tipo: "re", titulo: "Termo de Realizacao de Estagio" },
    { tipo: "as", titulo: "Avaliacao Semestral" },
    { tipo: "pt", titulo: "Parecer Tecnico" },
    { tipo: "cps", titulo: "Contrato de Prestacao de Servicos" },
  ];

  for (const d of docTipos) {
    await prisma.internshipDocument.upsert({
      where: { id: `doc-${d.tipo}-001` },
      update: {},
      create: {
        id: `doc-${d.tipo}-001`,
        contractId: contract.id,
        tipo: d.tipo,
        titulo: d.titulo,
        status: d.tipo === "tce" ? "ASSINADO" : d.tipo === "rpb" ? "GERADO" : "NAO_GERADO",
      },
    });
  }

  // ── CRM Lead
  await prisma.crmLead.upsert({
    where: { id: "lead-001" },
    update: {},
    create: {
      id: "lead-001",
      empresa: "Startup Inovar",
      contato: "Roberto Lima",
      email: "roberto@inovar.com",
      telefone: "(11) 98765-1234",
      etapa: "proposta",
      prioridade: "alta",
      valorNegociado: 960,
      proximaAcao: "Enviar proposta comercial",
      franchiseId: franchise.id,
    },
  });

  // ── Financeiro
  await prisma.financial.createMany({
    skipDuplicates: true,
    data: [
      { id: "fin-001", descricao: "Mensalidade TechCorp - Abril/2025", tipo: "entrada", valor: 480, status: "PAGO", categoria: "Empresa", franchiseId: franchise.id, companyId: company.id },
      { id: "fin-002", descricao: "Taxa Smarter Franqueadora - Abril/2025", tipo: "saida", valor: 213, status: "PAGO", categoria: "Taxa", franchiseId: franchise.id },
      { id: "fin-003", descricao: "Mensalidade Logistica Brasil - Abril/2025", tipo: "entrada", valor: 480, status: "PENDENTE", categoria: "Empresa", franchiseId: franchise.id },
    ],
  });

  // ── Gamification
  await prisma.gamificationPoint.createMany({
    skipDuplicates: true,
    data: [
      { id: "g-001", franchiseId: franchise.id, acao: "contrato_criado", pontos: 400 },
      { id: "g-002", franchiseId: franchise.id, acao: "empresa_cadastrada", pontos: 300 },
      { id: "g-003", franchiseId: franchise.id, acao: "vaga_publicada", pontos: 200 },
    ],
  });

  console.log("✅ Seed concluído!");
  console.log("\n📧 Usuários de teste:");
  console.log("  admin@smarter.com.br      / smarter123  (Franqueadora)");
  console.log("  franqueado@smarter.com.br / franq123    (Franqueado)");
  console.log("  empresa@techcorp.com.br   / empresa123  (Empresa)");
  console.log("  estudante@email.com       / estud123    (Estudante)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
