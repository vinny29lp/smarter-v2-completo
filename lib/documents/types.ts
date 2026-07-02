export interface ContratoData {
  numero: string;
  dataAssinatura: string;
  cidadeAssinatura: string;
  tipoEstagio: string;
  estudante: {
    nome: string; cpf: string; rg: string; dataNascimento: string;
    telefone: string; celular: string; email: string;
    endereco: string; bairro: string; cidade: string; estado: string; cep: string;
    curso: string; periodo: string;
    responsavel?: { nome: string };
  };
  empresa: {
    nomeFan: string; razaoSocial: string; cnpj: string;
    endereco: string; bairro: string; cidade: string; estado: string; cep: string;
    telefone: string; email: string;
    representante: string; cargoRepresentante: string;
    supervisor: string; cargoSupervisor: string;
    emailSupervisor: string; telefoneSupervisor: string;
  };
  instituicao: {
    nomeFan: string; razaoSocial: string; cnpj: string;
    endereco: string; bairro: string; cidade: string; estado: string; cep: string;
    telefone: string; email: string;
    orientador: string; cargoOrientador: string; emailOrientador: string;
  };
  smarter: {
    razaoSocial: string; cnpj: string;
    endereco: string; cidade: string; estado: string;
    telefone: string; email: string; responsavel: string;
    logoDocUrl?: string; watermarkText?: string;
  };
  estagio: {
    dataInicio: string; dataFim: string;
    valorBolsa: number; valorBolsaExtenso: string;
    auxilioTransporte: number; beneficios: string;
    chDiaria: number; chSemanal: number;
    intervalo: number; atividades: string;
    localEstagio: string;
    horarios: Array<{ dia: string; inicio: string; fim: string }>;
    apoliceSeguro: string; seguradora: string;
  };
}
