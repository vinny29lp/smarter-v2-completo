/** Cadastro de fechamento da franquia (formulário público). Puro: sem "@/", testável. */
export interface CadastroFranquia {
  nome: string; cpf: string; dataNasc?: string; email: string; telefone: string;
  nomeUnidade: string; razaoSocial?: string; cnpj?: string;
  endereco?: string; cep?: string; cidade: string; uf: string; regioes: string;
}

const txt = (v: unknown, n = 120) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const dig = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function cpfValido(cpf: string): boolean {
  const d = dig(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[t])) return false;
  }
  return true;
}

/** Valida e normaliza. Devolve { ok:false, erro } ou { ok:true, dados }. */
export function validarCadastro(b: any): { ok: true; dados: CadastroFranquia } | { ok: false; erro: string } {
  const dados: CadastroFranquia = {
    nome: txt(b?.nome, 100), cpf: dig(b?.cpf), dataNasc: txt(b?.dataNasc, 10) || undefined,
    email: txt(b?.email, 120).toLowerCase(), telefone: dig(b?.telefone).slice(0, 13),
    nomeUnidade: txt(b?.nomeUnidade, 80), razaoSocial: txt(b?.razaoSocial, 120) || undefined, cnpj: dig(b?.cnpj) || undefined,
    endereco: txt(b?.endereco, 160) || undefined, cep: dig(b?.cep).slice(0, 8) || undefined,
    cidade: txt(b?.cidade, 80), uf: txt(b?.uf, 2).toUpperCase(), regioes: txt(b?.regioes, 300),
  };
  if (dados.nome.length < 3) return { ok: false, erro: "Informe seu nome completo." };
  if (!cpfValido(dados.cpf)) return { ok: false, erro: "CPF inválido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return { ok: false, erro: "E-mail inválido." };
  if (dados.telefone.length < 10) return { ok: false, erro: "Informe um telefone com DDD." };
  if (dados.nomeUnidade.length < 3) return { ok: false, erro: "Informe o nome da unidade (ex.: Smarter Niterói)." };
  if (!dados.cidade || dados.uf.length !== 2) return { ok: false, erro: "Informe cidade e UF da unidade." };
  if (dados.cnpj && dados.cnpj.length !== 14) return { ok: false, erro: "CNPJ deve ter 14 dígitos (ou deixe em branco se ainda não tem)." };
  if (!dados.regioes) return { ok: false, erro: "Informe a região de atuação (cidades e bairros)." };
  return { ok: true, dados };
}

/** "Icaraí, Niterói; Centro, São Gonçalo" → regiões [{cidade, bairro?}] (cidade padrão = cidade da unidade). */
export function regioesDoCadastro(c: Pick<CadastroFranquia, "regioes" | "cidade" | "uf">): { cidade: string; uf: string; bairro?: string }[] {
  const itens = c.regioes.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
  const out = itens.map(it => {
    const [a, b] = it.split(",").map(s => s.trim());
    return b ? { bairro: a, cidade: b, uf: c.uf } : { cidade: a, uf: c.uf };
  });
  return out.length ? out : [{ cidade: c.cidade, uf: c.uf }];
}
