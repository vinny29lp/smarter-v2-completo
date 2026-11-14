/**
 * Identidade visual dos e-mails da Lia (função pura, sem "@/", testável): cabeçalho azul Smarter com logo,
 * faixa azul→amarela, botões, assinatura da Lia, bloco "links úteis" por assunto e rodapé com descadastro.
 */
export const COR_AZUL = "#0f2a5e";
export const COR_AMARELO = "#f5c400";

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export interface LinkUtil { rotulo: string; href: string }

/** Tópicos que a Lia (ou o tipo do e-mail) pode pedir — cada um vira links reais do sistema. */
export type Topico =
  | "portal" | "solicitar_vaga" | "avaliacoes" | "estagiarios" | "documentos" | "financeiro"
  | "vagas" | "curriculo" | "candidaturas" | "cadastro_estudante" | "cadastro_empresa" | "site";

export function linkDoTopico(t: Topico, app: string): LinkUtil {
  switch (t) {
    case "portal": return { rotulo: "Acessar o portal (esqueci minha senha na tela de entrada)", href: `${app}/login` };
    case "solicitar_vaga": return { rotulo: "Solicitar uma vaga de estágio", href: `${app}/solicitar-vaga` };
    case "avaliacoes": return { rotulo: "Avaliações dos estagiários", href: `${app}/portal-empresa/avaliacoes` };
    case "estagiarios": return { rotulo: "Meus estagiários", href: `${app}/portal-empresa/estagiarios` };
    case "documentos": return { rotulo: "Documentos e contratos", href: `${app}/portal-empresa/documentos` };
    case "financeiro": return { rotulo: "Financeiro e boletos", href: `${app}/portal-empresa/financeiro` };
    case "vagas": return { rotulo: "Ver vagas abertas", href: `${app}/vagas` };
    case "curriculo": return { rotulo: "Completar meu currículo", href: `${app}/portal-estudante/curriculo` };
    case "candidaturas": return { rotulo: "Minhas candidaturas", href: `${app}/portal-estudante/candidaturas` };
    case "cadastro_estudante": return { rotulo: "Cadastro de estudante", href: `${app}/cadastro/estudante` };
    case "cadastro_empresa": return { rotulo: "Cadastro de empresa", href: `${app}/cadastro/empresa` };
    default: return { rotulo: "Site da Smarter Estágios", href: "https://smarterestagios.com.br" };
  }
}

/** Tópicos padrão de cada tipo de e-mail automático. */
export const TOPICOS_POR_TIPO: Record<string, Topico[]> = {
  ASSINATURA: ["portal", "documentos"],
  RENOVACAO: ["estagiarios", "documentos", "solicitar_vaga"],
  AVALIACAO: ["avaliacoes", "estagiarios", "portal"],
  CRM_FOLLOWUP: ["solicitar_vaga", "cadastro_empresa"],
  REATIVACAO: ["solicitar_vaga", "cadastro_empresa", "site"],
  PORTAL_ATIVACAO: ["portal", "estagiarios", "avaliacoes", "financeiro"],
  CONVITE_VAGA: ["vagas", "curriculo", "candidaturas"],
  ENTREVISTA_LEMBRETE: ["candidaturas", "curriculo"],
};

export function linksPorTipo(tipo: string, app: string, extras: Topico[] = []): LinkUtil[] {
  const topicos = [...(TOPICOS_POR_TIPO[tipo] || ["site"]), ...extras];
  const vistos = new Set<string>();
  const out: LinkUtil[] = [];
  for (const t of topicos) {
    const l = linkDoTopico(t, app);
    if (!vistos.has(l.href)) { vistos.add(l.href); out.push(l); }
  }
  return out;
}

export function blocoLinks(links: LinkUtil[]): string {
  if (links.length === 0) return "";
  const itens = links.map(l => `<li style="margin:4px 0"><a href="${esc(l.href)}" style="color:${COR_AZUL};font-weight:600">${esc(l.rotulo)}</a></li>`).join("");
  return `<div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em">Links úteis</p>
    <ul style="margin:0;padding-left:18px;font-size:13px">${itens}</ul></div>`;
}

export function botao(href: string, texto: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:${COR_AZUL};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">${esc(texto)}</a></p>`;
}

export function templateLiaEmail(p: { titulo: string; corpo: string; app: string; optoutUrl: string; links?: LinkUtil[] }): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.6">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:${COR_AZUL};padding:20px 32px;text-align:center">
    <img src="${esc(p.app)}/logo-branca.png" alt="Smarter Estágios" height="48" style="height:48px;border:0;display:inline-block"/>
  </div>
  <div style="padding:28px 32px">
    <div style="font-size:20px;font-weight:900;color:${COR_AZUL};margin-bottom:8px">${esc(p.titulo)}</div>
    <div style="height:3px;background:linear-gradient(90deg,${COR_AZUL},${COR_AMARELO});border-radius:2px;margin:12px 0 18px"></div>
    ${p.corpo}
    ${blocoLinks(p.links || [])}
    <p style="margin:26px 0 0;font-size:13px;color:#475569">Um abraço,<br/><b style="color:${COR_AZUL}">Lia</b> · assistente digital da Smarter Estágios</p>
  </div>
  <div style="background:#f8fafc;padding:18px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
    Smarter Estágios — Sistema de Gestão de Estágios<br/>
    Pode responder este e-mail: a Lia lê e responde, e a equipe da sua unidade acompanha.<br/>
    Não quer mais receber estes avisos? <a href="${esc(p.optoutUrl)}" style="color:#94a3b8">Clique aqui para parar de receber</a>.
  </div>
</div></body></html>`;
}

/** Endereço de resposta rastreável: lia@dominio → lia+<envioId>@dominio (o id volta no "para" da resposta). */
export function enderecoResposta(base: string | undefined | null, envioId: string): string | undefined {
  const m = /^([^@+\s]+)@([^@\s]+)$/.exec((base || "").trim());
  return m ? `${m[1]}+${envioId}@${m[2]}` : undefined;
}

export function extrairEnvioId(destinatarios: string[] | string | null | undefined): string | null {
  const lista = Array.isArray(destinatarios) ? destinatarios : [destinatarios || ""];
  for (const d of lista) {
    const m = /\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i.exec(d);
    if (m) return m[1].toLowerCase();
  }
  return null;
}
