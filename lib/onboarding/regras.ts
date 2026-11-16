/**
 * Regras puras do onboarding guiado da Lia e da região de atuação (sem "@/", testável no vitest).
 * O assistente só libera o sistema quando TODOS os passos obrigatórios estiverem concluídos.
 */
export interface Regiao { cidade: string; uf?: string; bairro?: string }

const limpa = (s: unknown, n = 80) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Normaliza o que vem do formulário/JSON: remove vazios e duplicados (cidade+bairro), máx. 12. */
export function normalizarRegioes(entrada: unknown): Regiao[] {
  if (!Array.isArray(entrada)) return [];
  const vistos = new Set<string>();
  const out: Regiao[] = [];
  for (const r of entrada) {
    const cidade = limpa((r as any)?.cidade);
    if (!cidade) continue;
    const bairro = limpa((r as any)?.bairro);
    const uf = limpa((r as any)?.uf, 2).toUpperCase();
    const chave = `${cidade}|${bairro}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push({ cidade, ...(uf ? { uf } : {}), ...(bairro ? { bairro } : {}) });
    if (out.length >= 12) break;
  }
  return out;
}

/** Texto para a Alizo/Google Maps: "Icaraí, Niterói - RJ" ou "Niterói - RJ". */
export function regiaoComoTexto(r: Regiao, ufPadrao?: string | null): string {
  const uf = r.uf || ufPadrao || "";
  return `${r.bairro ? r.bairro + ", " : ""}${r.cidade}${uf ? " - " + uf : ""}`;
}

/** Rotaciona as regiões dia a dia (cada região é prospectada em seu dia). */
export function regiaoDoDia(regioes: Regiao[], agora: Date): Regiao | null {
  if (regioes.length === 0) return null;
  const dia = Math.floor(agora.getTime() / 86_400_000);
  return regioes[dia % regioes.length];
}

// ───────────── Passos do assistente ─────────────
export type PassoId =
  | "tour_hoje" | "dados_unidade" | "regiao" | "tour_empresas" | "tour_crm" | "tour_vagas" | "tour_contratos" | "tour_financeiro" | "prospeccao";

export interface Passo {
  id: PassoId; titulo: string; lia: string; obrigatorio: boolean;
  /** automatico = calculado pelos dados; manual = o franqueado confirma que entendeu/fez */
  tipo: "automatico" | "manual";
  acao?: { rotulo: string; href: string };
}

export const PASSOS: Passo[] = [
  { id: "dados_unidade", tipo: "automatico", obrigatorio: true, titulo: "Dados da sua unidade",
    lia: "Confira o endereço, o WhatsApp e o telefone da unidade. Eles aparecem nos e-mails e contratos e a Lia usa para falar em seu nome.",
    acao: { rotulo: "Completar dados da unidade", href: "/dashboard/configuracoes" } },
  { id: "regiao", tipo: "automatico", obrigatorio: true, titulo: "Região de atuação definida",
    lia: "A Smarter define as cidades e bairros em que a sua unidade atua. O Sales (Victor) prospecta SOMENTE nessa região. Se estiver vazia, fale com a Smarter." },
  { id: "tour_hoje", tipo: "manual", obrigatorio: true, titulo: "Conhecer a tela Hoje",
    lia: "A tela Hoje é o seu painel diário: mostra o que fazer primeiro (contatos com empresas, vagas, contratos). Abra todo dia de manhã e siga a ordem.",
    acao: { rotulo: "Abrir a tela Hoje", href: "/dashboard/hoje" } },
  { id: "tour_empresas", tipo: "manual", obrigatorio: true, titulo: "Conhecer Empresas e a apresentação",
    lia: "Na aba Empresas você cadastra empresas e copia o link da apresentação comercial para enviar por WhatsApp. É o seu cartão de visitas.",
    acao: { rotulo: "Abrir Empresas", href: "/dashboard/empresas" } },
  { id: "tour_crm", tipo: "manual", obrigatorio: true, titulo: "Conhecer o CRM",
    lia: "O Sales traz empresas da sua região para o CRM e envia o primeiro e-mail. Você faz o contato humano: ligue ou mande WhatsApp com o link da apresentação.",
    acao: { rotulo: "Abrir CRM", href: "/dashboard/crm" } },
  { id: "tour_vagas", tipo: "manual", obrigatorio: true, titulo: "Conhecer Vagas e Processos seletivos",
    lia: "Quando a empresa aceita, você cadastra a empresa, envia o levantamento de perfil e a Lia abre a vaga e chama os candidatos. Você agenda o processo seletivo.",
    acao: { rotulo: "Abrir Vagas", href: "/dashboard/vagas" } },
  { id: "tour_contratos", tipo: "manual", obrigatorio: true, titulo: "Conhecer Contratos",
    lia: "Depois da seleção, o contrato (TCE) é gerado e assinado digitalmente. A Lia cobra assinaturas, avaliações semestrais e renovações por você.",
    acao: { rotulo: "Abrir Contratos", href: "/dashboard/contratos" } },
  { id: "tour_financeiro", tipo: "manual", obrigatorio: false, titulo: "Conhecer o Financeiro",
    lia: "Aqui ficam a taxa de gestão e os repasses. Dê uma olhada com calma depois do primeiro contrato.",
    acao: { rotulo: "Abrir Financeiro", href: "/dashboard/financeiro" } },
  { id: "prospeccao", tipo: "automatico", obrigatorio: false, titulo: "Sales (Victor) conectado e prospectando",
    lia: "Quando a unidade está conectada à Alizo e a região está definida, o Sales começa a buscar empresas sozinho. Esse passo é ativado pela Smarter e não bloqueia o seu acesso." },
];

export interface FatosOnboarding {
  franchise: { endereco?: string | null; cidade?: string | null; uf?: string | null; whatsapp?: string | null; telefone?: string | null; cep?: string | null };
  regioes: Regiao[];
  passosManuais: Record<string, unknown> | null | undefined;
  alizoMapeada: boolean;
}

export interface PassoStatus extends Passo { feito: boolean; detalhe?: string }

export function dadosUnidadeFaltando(f: FatosOnboarding["franchise"]): string[] {
  const falta: string[] = [];
  if (!f.endereco || f.endereco.trim().length < 5) falta.push("endereço");
  if (!f.cep) falta.push("CEP");
  if (!f.cidade || !f.uf) falta.push("cidade/UF");
  if (!(f.whatsapp || f.telefone)) falta.push("WhatsApp ou telefone");
  return falta;
}

export function statusPassos(fatos: FatosOnboarding): { passos: PassoStatus[]; concluido: boolean; feitos: number; total: number } {
  const manual = fatos.passosManuais || {};
  const passos: PassoStatus[] = PASSOS.map(p => {
    let feito = false; let detalhe: string | undefined;
    if (p.id === "dados_unidade") { const falta = dadosUnidadeFaltando(fatos.franchise); feito = falta.length === 0; if (!feito) detalhe = "Falta: " + falta.join(", "); }
    else if (p.id === "regiao") { feito = fatos.regioes.length > 0; if (!feito) detalhe = "Nenhuma região cadastrada ainda."; }
    else if (p.id === "prospeccao") { feito = fatos.alizoMapeada && fatos.regioes.length > 0; if (!feito) detalhe = fatos.alizoMapeada ? "Defina a região." : "Aguardando a conexão da unidade com a Alizo (feita pela Smarter)."; }
    else feito = manual[p.id] === true;
    return { ...p, feito, detalhe };
  });
  const obrig = passos.filter(p => p.obrigatorio);
  return { passos, concluido: obrig.every(p => p.feito), feitos: passos.filter(p => p.feito).length, total: passos.length };
}

/** Passos manuais que o franqueado pode confirmar pela API. */
export const PASSOS_MANUAIS = new Set<string>(PASSOS.filter(p => p.tipo === "manual").map(p => p.id));
