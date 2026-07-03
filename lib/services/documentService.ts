import { prisma } from "@/lib/prisma";
import type { ContratoData } from "@/lib/documents/types";

/** Converte valor numérico em reais para extenso em pt-BR.
 *  Ex: 1500 → "um mil e quinhentos reais"
 *      600.50 → "seiscentos reais e cinquenta centavos"
 */
function valorParaExtenso(valor: number): string {
  if (!valor || isNaN(valor) || valor <= 0) return "—";

  const unidades = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze",
    "dezesseis", "dezessete", "dezoito", "dezenove",
  ];
  const dezenas  = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function grupo(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10), u = n % 10;
      return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`;
    }
    const c = Math.floor(n / 100), resto = n % 100;
    return resto === 0 ? centenas[c] : `${centenas[c]} e ${grupo(resto)}`;
  }

  const reais     = Math.floor(valor);
  const centavos  = Math.round((valor - reais) * 100);

  let parteReais = "";
  if (reais >= 1000000) {
    const mi = Math.floor(reais / 1000000), resto = reais % 1000000;
    parteReais = `${grupo(mi)} ${mi === 1 ? "milhão" : "milhões"}${resto > 0 ? " e " + valorParaExtenso(resto).replace(/ reais$/, "") : ""} reais`;
  } else if (reais >= 1000) {
    const mil = Math.floor(reais / 1000), resto = reais % 1000;
    const milPart = mil === 1 ? "um mil" : `${grupo(mil)} mil`;
    parteReais = resto === 0 ? `${milPart} reais` : `${milPart} e ${grupo(resto)} reais`;
  } else if (reais > 0) {
    parteReais = `${grupo(reais)} ${reais === 1 ? "real" : "reais"}`;
  }

  const parteCentavos = centavos > 0
    ? `${grupo(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`
    : "";

  if (parteReais && parteCentavos) return `${parteReais} e ${parteCentavos}`;
  if (parteReais) return parteReais;
  if (parteCentavos) return parteCentavos;
  return "—";
}

export async function buildContratoData(contractId: string): Promise<ContratoData | null> {
  const [contract, systemConfig] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        student: { include: { user: true, institution: true } },
        company: true,
        institution: true,
        franchise: true,
      },
    }),
    prisma.systemConfig.findUnique({ where: { id: "default" } }).catch(() => null),
  ]);

  if (!contract) return null;

  const { student, company, institution, franchise } = contract;

  // Build 7-day schedule from diasSemana string
  const ALL_DAYS = [
    "Segunda-feira","Terca-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sabado","Domingo"
  ];
  const DISP_DAYS = [
    "Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"
  ];

  // Lookup map for preset ranges (handles accented characters correctly)
  const PRESET_RANGES: Record<string, number[]> = {
    "segunda a sexta":   [0,1,2,3,4],
    "segunda a sábado":  [0,1,2,3,4,5],
    "segunda a sabado":  [0,1,2,3,4,5],
    "segunda a domingo": [0,1,2,3,4,5,6],
    "terça a sexta":     [1,2,3,4],
    "terca a sexta":     [1,2,3,4],
    "terça a sábado":    [1,2,3,4,5],
    "terca a sabado":    [1,2,3,4,5],
    "terça a domingo":   [1,2,3,4,5,6],
    "terca a domingo":   [1,2,3,4,5,6],
    "quarta a sexta":    [2,3,4],
    "quarta a sábado":   [2,3,4,5],
    "quarta a sabado":   [2,3,4,5],
    "quarta a domingo":  [2,3,4,5,6],
    "quinta a sexta":    [3,4],
    "quinta a sábado":   [3,4,5],
    "quinta a sabado":   [3,4,5],
    "quinta a domingo":  [3,4,5,6],
    "sexta a sábado":    [4,5],
    "sexta a sabado":    [4,5],
    "sexta a domingo":   [4,5,6],
    "sábado a domingo":  [5,6],
    "sabado a domingo":  [5,6],
    "quinta a segunda":  [3,4,5,6,0],
    "sexta a segunda":   [4,5,6,0],
    "sexta a terça":     [4,5,6,0,1],
    "sexta a terca":     [4,5,6,0,1],
    "sábado a segunda":  [5,6,0],
    "sabado a segunda":  [5,6,0],
    "sábado a terça":    [5,6,0,1],
    "sabado a terca":    [5,6,0,1],
    "sábado a quarta":   [5,6,0,1,2],
    "sabado a quarta":   [5,6,0,1,2],
    "domingo a segunda": [6,0],
    "domingo a terça":   [6,0,1],
    "domingo a terca":   [6,0,1],
    "domingo a quarta":  [6,0,1,2],
    "domingo a quinta":  [6,0,1,2,3],
    "domingo a sexta":   [6,0,1,2,3,4],
  };

  // Individual day detection (fallback for legacy text input)
  const DAY_KEYWORDS: [string, number][] = [
    ["segunda", 0], ["terça", 1], ["terca", 1],
    ["quarta", 2], ["quinta", 3], ["sexta", 4],
    ["sábado", 5], ["sabado", 5], ["domingo", 6],
  ];

  // Helper: resolve which day indices a legacy text "dias" string covers
  function resolveDias(raw: string): Set<number> {
    const s = raw.trim().toLowerCase();
    const active = new Set<number>();
    if (PRESET_RANGES[s] !== undefined) {
      PRESET_RANGES[s].forEach(i => active.add(i));
    } else {
      DAY_KEYWORDS.forEach(([kw, idx]) => { if (s.includes(kw)) active.add(idx); });
    }
    if (active.size === 0) { for (let i = 0; i < 5; i++) active.add(i); }
    return active;
  }

  // Helper: expand a numeric De→Até range (supports wrap-around e.g. Sex(4)→Ter(1))
  function getDaysInRange(de: number, ate: number): number[] {
    const days: number[] = [];
    if (de <= ate) {
      for (let i = de; i <= ate; i++) days.push(i);
    } else {
      for (let i = de; i <= 6; i++) days.push(i);
      for (let i = 0; i <= ate; i++) days.push(i);
    }
    return days;
  }

  // Helper: calculates net daily hours from HH:MM strings and intervalo in minutes
  function calcChDiariaFromTimes(inicio: string, fim: string, intervalo: number): number {
    const [h1, m1] = inicio.split(":").map(Number);
    const [h2, m2] = fim.split(":").map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1) - intervalo;
    return Math.max(0, Math.round(totalMin / 60 * 10) / 10);
  }

  // horariosMap: dayIndex → {inicio, fim, chDiaria}
  const horariosMap = new Map<number, {inicio: string; fim: string; chDiaria?: number}>();

  // ── Detect stored format ─────────────────────────────────────────────────────
  // Format A (new): [{de:number, ate:number, inicio, fim, intervalo}]
  // Format B (legacy v1): [{dias:string, inicio, fim}]
  // Format C (single preset string): "Segunda a Sexta" etc.
  let parsedBlocos: Array<{de:number; ate:number; inicio:string; fim:string; intervalo?:number}> | null = null;
  let parsedTurnos: Array<{dias: string; inicio: string; fim: string}> | null = null;
  try {
    const parsed = JSON.parse(contract.diasSemana || "");
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0]?.de === "number") {
        // Format A: new structured blocos
        parsedBlocos = parsed;
      } else if (typeof parsed[0]?.dias === "string") {
        // Format B: legacy free-text turnos
        parsedTurnos = parsed;
      }
    }
  } catch { /* Format C: plain text preset */ }

  if (parsedBlocos) {
    // New format: each bloco has numeric De/Até day indices + horários + intervalo
    for (const bloco of parsedBlocos) {
      const { de, ate, inicio, fim, intervalo = 0 } = bloco;
      const chDiaria = calcChDiariaFromTimes(inicio, fim, intervalo);
      getDaysInRange(de, ate).forEach(i =>
        horariosMap.set(i, { inicio: inicio || "—", fim: fim || "—", chDiaria })
      );
    }
  } else if (parsedTurnos) {
    // Legacy format B: free-text dias field (old personalizado UI)
    for (const turno of parsedTurnos) {
      const dias = resolveDias(turno.dias);
      dias.forEach(i => horariosMap.set(i, { inicio: turno.inicio || "—", fim: turno.fim || "—" }));
    }
  } else {
    // Format C: single preset string or plain text
    const activeDays = resolveDias(contract.diasSemana || "Segunda a Sexta");
    activeDays.forEach(i => horariosMap.set(i, {
      inicio: contract.horarioInicio ?? "—",
      fim: contract.horarioFim ?? "—",
    }));
  }

  const horarios = ALL_DAYS.map((dia, i) => {
    const h = horariosMap.get(i);
    return {
      dia: DISP_DAYS[i],
      inicio: h?.inicio ?? "—",
      fim: h?.fim ?? "—",
      ativo: horariosMap.has(i),
      chDiaria: h?.chDiaria,
    };
  });

  // Use SystemConfig (admin settings) as primary source for Smarter company data
  const smarter = {
    razaoSocial: systemConfig?.razaoSocial || franchise?.razaoSocial || franchise?.name || "Smarter Estágios Agente de Integração Ltda.",
    cnpj: systemConfig?.cnpj || franchise?.cnpj || "—",
    endereco: systemConfig?.endereco || franchise?.endereco || "—",
    cidade: systemConfig?.cidade || franchise?.cidade || "—",
    estado: systemConfig?.uf || franchise?.uf || "SP",
    telefone: systemConfig?.telefone || franchise?.telefone || "—",
    email: systemConfig?.email || franchise?.email || "—",
    responsavel: systemConfig?.responsavel || franchise?.responsavel || "—",
    logoDocUrl: systemConfig?.logoDocUrl || undefined,
    watermarkText: systemConfig?.watermarkText || "SMARTER",
  };

  return {
    numero: contract.numero || contract.id.slice(0, 8).toUpperCase(),
    dataAssinatura: new Date(contract.dataInicio).toLocaleDateString("pt-BR"),
    cidadeAssinatura: (contract as any).cidade || company.cidade || "São Paulo",
    tipoEstagio: contract.tipoEstagio ?? "Não Obrigatório",
    estudante: {
      nome: student.name,
      cpf: student.cpf || "—",
      rg: student.rg || "—",
      dataNascimento: student.dataNasc ? new Date(student.dataNasc).toLocaleDateString("pt-BR") : "—",
      telefone: student.telefone || "—",
      celular: student.celular || "—",
      email: student.email,
      endereco: [student.endereco, student.bairro].filter(Boolean).join(" — ") || "—",
      bairro: student.bairro || "—",
      cidade: student.cidade || "—",
      estado: student.uf || "—",
      cep: student.cep || "—",
      curso: student.curso || "—",
      periodo: student.periodo || "—",
      ...((student as any).menorDeIdade && (student as any).nomeResponsavel
        ? { responsavel: { nome: (student as any).nomeResponsavel } }
        : {}),
    },
    empresa: {
      nomeFan: company.name,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      endereco: [company.endereco, company.bairro].filter(Boolean).join(" — ") || "—",
      bairro: company.bairro || "—",
      cidade: company.cidade,
      estado: company.uf,
      cep: company.cep || "—",
      telefone: company.telefone || "—",
      email: company.email,
      representante: company.responsavel || "—",
      cargoRepresentante: company.cargoResponsavel || "—",
      supervisor: contract.supervisorNome || "—",
      cargoSupervisor: contract.supervisorCargo || "—",
      emailSupervisor: contract.supervisorEmail || "—",
      telefoneSupervisor: contract.supervisorTel || "—",
    },
    instituicao: {
      nomeFan: institution?.name || student.institution?.name || "—",
      razaoSocial: institution?.razaoSocial || student.institution?.razaoSocial || "—",
      cnpj: institution?.cnpj || student.institution?.cnpj || "—",
      endereco: institution?.endereco || "—",
      bairro: "—",
      cidade: institution?.cidade || "—",
      estado: institution?.uf || "—",
      cep: institution?.cep || "—",
      telefone: institution?.telefone || "—",
      email: institution?.email || "—",
      // Cláusula 1 — dados do cadastro da IES
      orientador: institution?.coordenador || "—",
      cargoOrientador: institution?.cargoCoord || "—",
      emailOrientador: institution?.email || "—",
      // Plano de Estágio — dados inseridos na criação do contrato
      supervisorIES: contract.coordNome || "—",
      cargoSupervisorIES: contract.coordCargo || "—",
      emailSupervisorIES: contract.coordEmail || "—",
    },
    smarter,
    estagio: {
      dataInicio: new Date(contract.dataInicio).toLocaleDateString("pt-BR"),
      dataFim: new Date(contract.dataFim).toLocaleDateString("pt-BR"),
      valorBolsa: contract.bolsa ?? 0,
      valorBolsaExtenso: valorParaExtenso(contract.bolsa ?? 0),
      auxilioTransporte: contract.auxTransporte ?? 0,
      beneficios: contract.beneficios ?? "—",
      chDiaria: contract.chDiaria ?? 0,
      chSemanal: contract.chSemanal ?? 0,
      intervalo: contract.intervalo ?? 0,
      atividades: contract.atividades || "—",
      localEstagio: contract.localEstagio || (company.cidade + "/" + company.uf),
      modalidade: (contract as any).modalidade || "Presencial",
      horarios,
      apoliceSeguro: contract.apoliceSeguro || "A ser informada pelo Agente",
      seguradora: contract.seguradora || "A ser contratada pelo Agente de Integração",
    },
  };
}

export async function saveDocumentHtml(docId: string, html: string, status: string = "GERADO") {
  return prisma.internshipDocument.update({
    where: { id: docId },
    data: { htmlContent: html, status: status as any, updatedAt: new Date() },
  });
}
