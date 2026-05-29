/**
 * Validações oficiais — CPF, CNPJ, CEP, email, telefone, UF, cidade
 * Usadas nos formulários e no bloqueio de emissão de documentos.
 */

// ── CPF ───────────────────────────────────────────────────────────────────────
export function validarCPF(cpf: string): boolean {
  const s = cpf.replace(/\D/g, "");
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(s[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(s[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(s[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(s[10]);
}

export function formatarCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, "").slice(0, 11);
  return s
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// ── CNPJ ──────────────────────────────────────────────────────────────────────
export function validarCNPJ(cnpj: string): boolean {
  const s = cnpj.replace(/\D/g, "");
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
  const calc = (str: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(str[i]) * w, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = mod(calc(s, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const d2 = mod(calc(s, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  return parseInt(s[12]) === d1 && parseInt(s[13]) === d2;
}

export function formatarCNPJ(cnpj: string): string {
  const s = cnpj.replace(/\D/g, "").slice(0, 14);
  return s
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

// ── CEP ───────────────────────────────────────────────────────────────────────
export function validarCEP(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep.trim());
}

export function formatarCEP(cep: string): string {
  const s = cep.replace(/\D/g, "").slice(0, 8);
  return s.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

// ── Email ─────────────────────────────────────────────────────────────────────
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ── Telefone (mínimo 10 dígitos com DDD) ─────────────────────────────────────
export function validarTelefone(tel: string): boolean {
  const s = tel.replace(/\D/g, "");
  return s.length >= 10 && s.length <= 11;
}

export function formatarTelefone(tel: string): string {
  const s = tel.replace(/\D/g, "").slice(0, 11);
  if (s.length <= 10) {
    return s.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return s.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

// ── UF (estados brasileiros válidos) ─────────────────────────────────────────
const UFS_VALIDAS = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
]);

export function validarUF(uf: string): boolean {
  return UFS_VALIDAS.has(uf.trim().toUpperCase());
}

// ── Cidade (não vazia, mínimo 2 chars) ───────────────────────────────────────
export function validarCidade(cidade: string): boolean {
  return cidade.trim().length >= 2;
}

// ── ViaCEP: consulta automática de endereço ──────────────────────────────────
export interface EnderecoViaCEP {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function buscarCEP(cep: string): Promise<EnderecoViaCEP | null> {
  const s = cep.replace(/\D/g, "");
  if (s.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${s}/json/`);
    if (!res.ok) return null;
    const data: EnderecoViaCEP = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
