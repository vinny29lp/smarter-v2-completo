/** Valor em reais por extenso (pt-BR). Puro, testável. Ex.: 4500 → "quatro mil e quinhentos reais". */
const U = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100, partes: string[] = [];
  if (c) partes.push(C[c]);
  if (r) partes.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " e " + U[r % 10] : ""));
  return partes.join(" e ");
}

export function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000), mil = Math.floor((n % 1_000_000) / 1000), resto = n % 1000;
  const p: string[] = [];
  if (milhoes) p.push(ate999(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
  if (mil) p.push(mil === 1 ? "mil" : ate999(mil) + " mil");
  if (resto) p.push(ate999(resto));
  // "e" antes do último bloco quando ele é < 100 ou centena exata (regra gramatical simplificada)
  if (p.length === 1) return p[0];
  const ultimo = resto || mil;
  const junta = ultimo < 100 || ultimo % 100 === 0 ? " e " : ", ";
  return p.slice(0, -1).join(", ") + junta + p[p.length - 1];
}

export function reaisPorExtenso(valor: number): string {
  const cent = Math.round(valor * 100), reais = Math.floor(cent / 100), c = cent % 100;
  const r = reais === 0 ? "" : inteiroPorExtenso(reais) + (reais === 1 ? " real" : (reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de reais" : " reais"));
  const cs = c === 0 ? "" : inteiroPorExtenso(c) + (c === 1 ? " centavo" : " centavos");
  return [r, cs].filter(Boolean).join(" e ") || "zero real";
}

export const formatarReais = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
