/**
 * dates.ts — Normalização de campos de data opcionais vindos de formulários.
 *
 * Um <input type="date"> manda "YYYY-MM-DD" quando preenchido e "" (string
 * vazia) quando o usuário limpa o campo. O Prisma, para uma coluna
 * `DateTime?`, só aceita `null`, um `Date`, ou uma string ISO-8601 válida —
 * string vazia derruba a query com "premature end of input. Expected
 * ISO-8601 DateTime." Toda rota que faz `update()` de um campo de data
 * opcional a partir do body deve passar o valor por aqui antes de montar o
 * `data` do Prisma.
 */

/**
 * Normaliza um valor de data opcional vindo do body de uma requisição.
 *
 * - `undefined` → `undefined` (campo não enviado — não mexe no valor atual)
 * - `null`, `""` ou string só com espaços → `null` (limpa a data)
 * - `Date` já pronto → devolve como está
 * - string "YYYY-MM-DD" (sem "T") → vira meio-dia UTC, pra não cair no dia
 *   anterior por causa de fuso horário
 * - string ISO já completa (com "T") → vira `Date`
 * - string inválida (não parseável) → `null`, em vez de deixar o Prisma
 *   quebrar com um erro 500 confuso
 */
function parseDataFlexivel(texto: string): Date | null {
  const s = texto.trim();
  if (s === "") return null;
  const parsed = s.includes("T") ? new Date(s) : new Date(s + "T12:00:00.000Z");
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizarDataOpcional(valor: unknown): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== "string") return null;
  return parseDataFlexivel(valor);
}

/**
 * true quando o valor pode ser normalizado sem perda de informação —
 * `undefined`, `null`, string vazia ou uma data válida. `false` só quando é
 * uma string não vazia que não dá pra interpretar como data (ex: veio
 * corrompida de algum client não-padrão), ou um tipo sem sentido pro campo
 * (número, objeto).
 *
 * A diferença para `normalizarDataOpcional` importa: aquela função sempre
 * devolve algo utilizável (inclusive `null` pra entrada inválida, pra nunca
 * quebrar o Prisma) — esta aqui existe pra a rota poder, ANTES de tocar no
 * Prisma, distinguir "o usuário limpou o campo" (válido, vira null) de
 * "chegou um valor que não faz sentido" (inválido, deve virar um erro 400
 * com mensagem clara pro usuário, não um erro 500 cru do banco).
 */
export function dataOpcionalEhValida(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (valor instanceof Date) return !isNaN(valor.getTime());
  if (typeof valor !== "string") return false;
  const s = valor.trim();
  return s === "" || parseDataFlexivel(s) !== null;
}
