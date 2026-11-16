/** Regras puras da sincronização de franquias com a Alizo (sem banco, sem imports "@/"). */

export interface FranquiaParaAlizo {
  id: string; name: string; responsavel: string; email: string; telefone?: string | null; whatsapp?: string | null;
  endereco?: string | null; cep?: string | null; cidade: string; uf: string;
}

/** Separa "Rua X, 123 - Centro" em rua/número/bairro (melhor esforço; nunca inventa o que não existe). */
export function parseEndereco(endereco?: string | null) {
  const txt = (endereco || "").trim();
  if (!txt) return { street: "", number: "", complement: "", district: "" };
  const [parteRua, ...resto] = txt.split(/\s+-\s+/);
  const [rua, numero, ...comp] = parteRua.split(",").map(s => s.trim());
  const nr = /^\d+[A-Za-z]?$|^s\/?n$/i.test(numero || "") ? numero : "";
  const complemento = nr ? comp.join(", ") : [numero, ...comp].filter(Boolean).join(", ");
  return { street: rua || "", number: nr, complement: complemento, district: resto[0]?.split(",")[0]?.trim() || "" };
}

/** Payload de POST/PUT /units. `external_id` = id permanente da franquia (nunca muda entre tentativas). */
export function payloadUnidade(f: FranquiaParaAlizo) {
  // Contrato da Alizo: `address` é texto corrido; cidade/UF/fuso vão como campos próprios.
  const partes = [(f.endereco || "").trim(), (f.cep || "").trim()].filter(Boolean);
  return {
    external_id: f.id,
    name: f.name,
    contact_email: f.email,
    contact_phone: f.whatsapp || f.telefone || "",
    owner_name: f.responsavel,
    address: partes.join(" - "),
    city: f.cidade,
    state: f.uf,
    timezone: "America/Sao_Paulo",
  };
}

/** Franquia deve operar na Alizo? Suspensa/inativa/bloqueada → desativar (nunca apagar). */
export function franquiaDeveOperar(f: { status?: string | null; acessoBloqueado?: boolean | null }): boolean {
  return (f.status ?? "ATIVO") === "ATIVO" && !f.acessoBloqueado;
}

export type ClasseErro = "temporario" | "autenticacao" | "dados" | "conflito" | "nao_encontrado" | "desconhecido";
export function classificarErro(status: number): ClasseErro {
  if (status === 0 || status === 429 || status >= 500) return "temporario";
  if (status === 401 || status === 403) return "autenticacao";
  if (status === 400) return "dados";
  if (status === 409) return "conflito";
  if (status === 404) return "nao_encontrado";
  return "desconhecido";
}

/** Status local após uma falha: temporário/auth → mantém/gera erro conforme a classe. */
export function statusAposErro(c: ClasseErro): "pending" | "error" {
  return c === "temporario" ? "pending" : "error";
}

/** Erro curto e seguro para gravar/mostrar: sem token, sem URL, sem dados pessoais. */
export function erroSeguro(status: number, mensagem: string): string {
  const base = String(mensagem || "").replace(/Bearer\s+\S+/gi, "[oculto]").replace(/https?:\/\/\S+/g, "[url]").slice(0, 200);
  return `[${status || "rede"}] ${base}`;
}

/** Dia (UTC) do início do período diário de prospecção. */
export const LIMITE_PROSPECCAO_DIA = 15;
export function restanteProspeccaoHoje(capturadasHoje: number): number {
  return Math.max(0, LIMITE_PROSPECCAO_DIA - Math.max(0, capturadasHoje));
}

/** Lê "N capturadas" do detalhe gravado pela rotina de prospecção (0 se não houver). */
export function capturadasDoDetalhe(detalhe?: string | null): number {
  const m = /(\d+) capturadas/.exec(detalhe || "");
  return m ? Number(m[1]) : 0;
}
