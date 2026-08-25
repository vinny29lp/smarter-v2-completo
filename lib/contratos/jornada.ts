/**
 * jornada.ts — Sistema de "blocos" de jornada (dias + horário próprio por
 * bloco) compartilhado entre a criação (components/forms/ContratoForm.tsx) e
 * a edição (app/dashboard/contratos/[id]/page.tsx) de um estágio.
 *
 * Um contrato pode ter jornadas diferentes em dias diferentes (ex: segunda a
 * sexta 08:00–14:00 e sábado 11:00–15:00) — isso é representado como uma
 * lista de blocos, cada um com um range de dias (De/Até, índices 0=Segunda
 * a 6=Domingo) e seu próprio horário/intervalo. A lista é serializada como
 * JSON no campo `diasSemana` do contrato; `lib/services/documentService.ts`
 * lê esse mesmo formato para montar a tabela de horários e o texto da TCE.
 */

export interface BlocoJornada {
  de: number;
  ate: number;
  inicio: string;
  fim: string;
  intervalo: number;
}

export const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

/** Quantidade de dias cobertos por um range De→Até (soma range com volta ao início da semana, ex: Sex(4)→Ter(1)). */
export function getDiasCount(de: number, ate: number): number {
  return de <= ate ? ate - de + 1 : 7 - de + ate + 1;
}

/** C.H. diária líquida (horas) de um bloco, a partir de horário início/fim e intervalo em minutos. */
export function calcBlocoCh(b: { inicio: string; fim: string; intervalo: number }): number {
  const [h1s, m1s] = (b.inicio || "").split(":");
  const [h2s, m2s] = (b.fim || "").split(":");
  const h1 = parseInt(h1s), m1 = parseInt(m1s ?? "0");
  const h2 = parseInt(h2s), m2 = parseInt(m2s ?? "0");
  if (isNaN(h1) || isNaN(h2)) return 0;
  const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1) - (b.intervalo || 0);
  return Math.max(0, totalMin / 60);
}

// Presets reconhecidos pelo select de "Dias da Semana" (mesmos rótulos de
// ContratoForm.tsx) — usados para reconstruir um range De/Até aproximado ao
// carregar um contrato existente para edição.
const PRESET_RANGES: Record<string, [number, number]> = {
  "segunda a sexta": [0, 4],
  "segunda a sábado": [0, 5], "segunda a sabado": [0, 5],
  "segunda a domingo": [0, 6],
  "terça a sábado": [1, 5], "terca a sabado": [1, 5],
  "terça a domingo": [1, 6], "terca a domingo": [1, 6],
  "quarta a sábado": [2, 5], "quarta a sabado": [2, 5],
  "quarta a domingo": [2, 6],
  "quinta a segunda": [3, 0],
  "sexta a terça": [4, 1], "sexta a terca": [4, 1],
  "sábado a quarta": [5, 2], "sabado a quarta": [5, 2],
  "domingo a quinta": [6, 3],
};

const DAY_KEYWORDS: [string, number][] = [
  ["segunda", 0], ["terça", 1], ["terca", 1], ["quarta", 2], ["quinta", 3],
  ["sexta", 4], ["sábado", 5], ["sabado", 5], ["domingo", 6],
];

/**
 * Converte um texto livre de dias (preset reconhecido, ou texto solto tipo
 * "Segunda, Quarta e Sexta") num range De/Até aproximado — usa o menor e o
 * maior dia citado. Só serve para reconstruir blocos editáveis a partir de
 * dados legados; não precisa ser perfeito porque, ao salvar a edição, os
 * dias voltam a ser representados como blocos estruturados.
 */
function textoParaRange(texto: string): [number, number] {
  const s = (texto || "").trim().toLowerCase();
  if (PRESET_RANGES[s]) return PRESET_RANGES[s];
  const dias = new Set<number>();
  DAY_KEYWORDS.forEach(([kw, idx]) => { if (s.includes(kw)) dias.add(idx); });
  if (dias.size === 0) return [0, 4];
  const arr = [...dias].sort((a, b) => a - b);
  return [arr[0], arr[arr.length - 1]];
}

/**
 * Reconstrói os blocos editáveis a partir do que está salvo no contrato —
 * aceita os mesmos formatos que documentService.ts já sabe interpretar:
 *
 *  A) JSON estruturado `[{de,ate,inicio,fim,intervalo}]` — já é a lista de blocos.
 *  B) JSON legado `[{dias:string,inicio,fim}]` — 1 bloco por turno, com o
 *     range de dias aproximado a partir do texto.
 *  C) string simples (preset ou texto livre) — contrato "antigo" com um
 *     único horário: vira 1 bloco só, usando horarioInicio/horarioFim/
 *     intervalo do próprio contrato, pronto para editar ou para virar base
 *     de mais blocos.
 */
export function blocosDoContrato(contract: {
  diasSemana?: string | null;
  horarioInicio?: string | null;
  horarioFim?: string | null;
  intervalo?: number | null;
}): BlocoJornada[] {
  const raw = contract.diasSemana || "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0]?.de === "number") {
        return parsed.map((b: any) => ({
          de: b.de, ate: b.ate,
          inicio: b.inicio || "08:00", fim: b.fim || "14:00",
          intervalo: b.intervalo ?? 0,
        }));
      }
      if (typeof parsed[0]?.dias === "string") {
        return parsed.map((t: any) => {
          const [de, ate] = textoParaRange(t.dias || "");
          return { de, ate, inicio: t.inicio || "08:00", fim: t.fim || "14:00", intervalo: 0 };
        });
      }
    }
  } catch { /* não é JSON — cai no fallback de string simples (Formato C) abaixo */ }

  const [de, ate] = textoParaRange(raw || "Segunda a Sexta");
  return [{
    de, ate,
    inicio: contract.horarioInicio || "08:00",
    fim: contract.horarioFim || "14:00",
    intervalo: contract.intervalo ?? 0,
  }];
}

/** Serializa os blocos de volta para o formato estruturado salvo em `diasSemana`. */
export function serializarBlocos(blocos: BlocoJornada[]): string {
  return JSON.stringify(blocos.map(b => ({ de: b.de, ate: b.ate, inicio: b.inicio, fim: b.fim, intervalo: b.intervalo })));
}
