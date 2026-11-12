/**
 * documento.ts — Qual documento/nome usar ao emitir boleto Cora para uma unidade.
 *
 * Bug real (Montes Claros/MG): a unidade é pessoa física (CPF do responsável),
 * mas o cadastro tinha um "CNPJ" inválido ("06.042.699/6010-00" — na verdade o
 * CPF com "000" no fim, formatado como CNPJ). O código escolhia
 * `cnpj || cpf` e `cnpj ? "CNPJ" : "CPF"`: qualquer valor preenchido em CNPJ
 * ganhava do CPF, a Cora recusava o documento e o boleto automático nunca
 * saía. Agora cada documento só vale se passar na checagem dos dígitos
 * verificadores; CNPJ inválido cai pro CPF válido, e pessoa física usa o nome
 * do responsável (como a unidade está cadastrada na Cora).
 *
 * Sem imports com alias "@/" — testável direto no vitest.
 */

const soDigitos = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

export function validarCpf(valor: string | null | undefined): boolean {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[n])) return false;
  }
  return true;
}

export function validarCnpj(valor: string | null | undefined): boolean {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const digito = (tam: number) => {
    let soma = 0;
    let peso = tam - 7;
    for (let i = 0; i < tam; i++) {
      soma += Number(c[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digito(12) === Number(c[12]) && digito(13) === Number(c[13]);
}

export interface FranquiaDocumento {
  name: string;
  razaoSocial?: string | null;
  responsavel?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
}

export type DocumentoCobranca =
  | { ok: true; documento: string; tipoDocumento: "CNPJ" | "CPF"; nomeCliente: string }
  | { ok: false; erro: string };

export function resolverDocumentoCobranca(f: FranquiaDocumento): DocumentoCobranca {
  if (validarCnpj(f.cnpj)) {
    return { ok: true, documento: soDigitos(f.cnpj), tipoDocumento: "CNPJ", nomeCliente: f.razaoSocial || f.name };
  }
  if (validarCpf(f.cpf)) {
    return { ok: true, documento: soDigitos(f.cpf), tipoDocumento: "CPF", nomeCliente: f.responsavel || f.razaoSocial || f.name };
  }
  const temCnpj = soDigitos(f.cnpj).length > 0;
  const temCpf = soDigitos(f.cpf).length > 0;
  if (!temCnpj && !temCpf) {
    return { ok: false, erro: "CNPJ/CPF da unidade não cadastrado. Preencha o CNPJ (pessoa jurídica) ou o CPF do responsável (pessoa física) no cadastro da unidade antes de gerar o boleto." };
  }
  return {
    ok: false,
    erro: `Documento da unidade inválido${temCnpj ? " (CNPJ não passa na validação dos dígitos)" : ""}${temCpf ? " (CPF não passa na validação dos dígitos)" : ""}. Corrija o CNPJ/CPF no cadastro da unidade antes de gerar o boleto.`,
  };
}
