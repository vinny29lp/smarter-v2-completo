/**
 * Contrato de franquia — modelo para o Autentique.
 * ATENÇÃO: o texto jurídico abaixo é um PLACEHOLDER. O envio real fica bloqueado até o modelo
 * aprovado pelo jurídico ser colocado em CLAUSULAS_HTML e a env FRANQUIA_CONTRATO_LIBERADO=true ser definida.
 */
import type { CadastroFranquia } from "./cadastro";

export const CONTRATO_APROVADO = process.env.FRANQUIA_CONTRATO_LIBERADO === "true";

/** Substituir pelo texto aprovado. Mantido vazio de propósito: não inventamos cláusulas jurídicas. */
export const CLAUSULAS_HTML = `<p>[CLÁUSULAS DO CONTRATO DE FRANQUIA — substituir pelo modelo jurídico aprovado]</p>`;

const esc = (s?: string) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function contratoFranquiaHtml(c: CadastroFranquia, valor?: number | null): string {
  return `<html><body style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5">
<h2 style="text-align:center">CONTRATO DE FRANQUIA EMPRESARIAL — SMARTER ESTÁGIOS</h2>
<h3>FRANQUEADO(A)</h3>
<p>${esc(c.nome)}, CPF ${esc(c.cpf)}${c.dataNasc ? `, nascido(a) em ${esc(c.dataNasc)}` : ""}, e-mail ${esc(c.email)}, telefone ${esc(c.telefone)}${c.razaoSocial ? `; pela empresa ${esc(c.razaoSocial)}${c.cnpj ? `, CNPJ ${esc(c.cnpj)}` : ""}` : ""}.</p>
<p>Unidade: <b>${esc(c.nomeUnidade)}</b> — ${esc(c.endereco || "")} ${esc(c.cidade)}/${esc(c.uf)}${c.cep ? ` — CEP ${esc(c.cep)}` : ""}.</p>
<p>Região de atuação: ${esc(c.regioes)}.</p>
${valor ? `<p>Taxa de franquia: R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.</p>` : ""}
<hr/>${CLAUSULAS_HTML}
</body></html>`;
}
