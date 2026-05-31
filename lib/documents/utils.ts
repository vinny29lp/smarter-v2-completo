/** Número por extenso SEM sufixo monetário — use para horas, dias, unidades */
export function numeroExtenso(v: number): string {
  return valorExtenso(v).replace(/ reais$/, "");
}

export function valorExtenso(v: number): string {
  if (v === 0) return "zero reais";
  if (v < 0) return "menos " + valorExtenso(-v);
  const n = ["","um","dois","tres","quatro","cinco","seis","sete","oito","nove",
    "dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cem","duzentos","trezentos","quatrocentos","quinhentos",
    "seiscentos","setecentos","oitocentos","novecentos"];
  if (v < 20) return n[v] + " reais";
  if (v < 100) return d[Math.floor(v/10)] + (v%10 ? " e " + n[v%10] : "") + " reais";
  if (v < 1000) return c[Math.floor(v/100)] + (v%100 ? " e " + valorExtenso(v%100).replace(" reais","") : "") + " reais";
  const mil = Math.floor(v/1000); const r = v%1000;
  return (mil === 1 ? "um mil" : valorExtenso(mil).replace(" reais","") + " mil") + (r ? " e " + valorExtenso(r) : " reais");
}

export function dataExtenso(d: string): string {
  const m = ["janeiro","fevereiro","marco","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro"];
  const p = d.split("/");
  if (p.length < 3) return d;
  const mes = parseInt(p[1]) - 1;
  if (mes < 0 || mes > 11) return d;
  return parseInt(p[0]) + " de " + m[mes] + " de " + p[2];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}
