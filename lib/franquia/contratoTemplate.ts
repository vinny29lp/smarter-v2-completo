/**
 * Contrato de Franquia Empresarial — modelo aprovado ("CONTRATO SANTA ISABEL - SP"), com campos editáveis por lead.
 * Texto das cláusulas em ./contratoClausulas.ts; o PDF com a identidade visual da Smarter é gerado em ./contratoPdf.ts.
 * Por segurança, o envio real só ocorre com FRANQUIA_CONTRATO_LIBERADO=true (liberar depois de conferir o PDF gerado).
 */
import type { CadastroFranquia } from "./cadastro";
import { CLAUSULAS } from "./contratoClausulas";
import { reaisPorExtenso, formatarReais } from "./extenso";

export const CONTRATO_APROVADO = process.env.FRANQUIA_CONTRATO_LIBERADO === "true";

const fmtCpf = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface DadosContrato {
  cadastro: CadastroFranquia;
  regiao?: string | null;           // "Região de X"; padrão: cidade/UF da unidade
  valor?: number | null;            // valor negociado (promocional) da região
  formaPagamento?: string | null;
  enderecoCompleto?: string | null; // padrão: montado do cadastro
  dataContrato?: Date;
}

/** Campos obrigatórios que ainda faltam para o contrato poder ser gerado. */
export function faltandoParaContrato(d: DadosContrato): string[] {
  const f: string[] = [];
  if (!d.valor || d.valor <= 0) f.push("valor negociado");
  if (!String(d.formaPagamento ?? "").trim()) f.push("forma de pagamento");
  return f;
}

export function enderecoDoCadastro(c: CadastroFranquia): string {
  return [c.endereco, c.cidade && c.uf ? `${c.cidade} - ${c.uf}` : "", c.cep ? `Cep: ${c.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : ""].filter(Boolean).join(", ");
}

export interface Trecho { t: string; b: boolean }
export interface Paragrafo { trechos: Trecho[]; titulo: boolean }

/** Valores já resolvidos do contrato (campos variáveis). */
export function valoresDoContrato(d: DadosContrato): Record<string, string> {
  const c = d.cadastro;
  return {
    NOME: c.nome, CPF: fmtCpf(c.cpf), ENDERECO: d.enderecoCompleto?.trim() || enderecoDoCadastro(c),
    REGIAO: d.regiao?.trim() || `${c.cidade} - ${c.uf}`,
    VALOR: d.valor ? formatarReais(d.valor) : "[VALOR]", VALOR_EXTENSO: d.valor ? reaisPorExtenso(d.valor) : "[VALOR POR EXTENSO]",
    FORMA_PAGAMENTO: d.formaPagamento?.trim() || "[FORMA DE PAGAMENTO]",
  };
}

/** Parágrafos do contrato com os campos variáveis em negrito. */
export function paragrafosContrato(d: DadosContrato): Paragrafo[] {
  const vals = valoresDoContrato(d);
  return CLAUSULAS.map(p => {
    if (/^CLÁUSULA /.test(p)) return { titulo: true, trechos: [{ t: p, b: true }] };
    const trechos: Trecho[] = [];
    p.split(/(\{\{[A-Z_]+\}\})/).forEach(parte => {
      const m = parte.match(/^\{\{([A-Z_]+)\}\}$/);
      if (m) trechos.push({ t: vals[m[1]] ?? "", b: true });
      else if (parte) trechos.push({ t: parte, b: false });
    });
    return { titulo: false, trechos };
  });
}

export function localEData(d?: Date): string {
  const dt = d ?? new Date();
  return `Rio de Janeiro, ${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}.`;
}

export const cpfFormatado = fmtCpf;
