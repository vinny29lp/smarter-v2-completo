import type { ContratoData } from "./types";

export function validateTCE(data: ContratoData): string[] {
  const erros: string[] = [];
  const ch = parseInt(String(data.estagio.chSemanal)) || 0;
  if (ch > 30) erros.push("Carga horaria semanal ultrapassa 30h (Lei 11.788/2008, art. 10).");
  if (!data.empresa.supervisor) erros.push("Supervisor da empresa e obrigatorio (Lei 11.788/2008, art. 9).");
  if (!data.instituicao.orientador) erros.push("Orientador da IES e obrigatorio (Lei 11.788/2008, art. 9).");
  if (!data.estagio.apoliceSeguro) erros.push("Apolice de seguro e obrigatoria (Lei 11.788/2008, art. 9, IV).");
  if (data.estagio.dataInicio && data.estagio.dataFim) {
    try {
      const ini = new Date(data.estagio.dataInicio.split("/").reverse().join("-"));
      const fim = new Date(data.estagio.dataFim.split("/").reverse().join("-"));
      if ((fim.getTime() - ini.getTime()) / (1000*60*60*24) > 730) {
        erros.push("Estagio superior a 2 anos (art. 11). Verifique excecao para PcD.");
      }
    } catch(_) {}
  }
  return erros;
}
