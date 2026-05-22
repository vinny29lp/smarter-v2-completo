// ── Email via Resend HTTP API ────────────────────────────────────
// Token: env RESEND_API_KEY (priority) or SystemConfig.resendApiKey (fallback DB)

import { getSystemConfig } from "./getConfig";

const RESEND_URL = "https://api.resend.com/emails";
// Use RESEND_FROM env var for verified domain, fallback to Resend test sender
const FROM = process.env.RESEND_FROM || "Smarter Estágios <onboarding@resend.dev>";

async function getApiKey(): Promise<string | null> {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const cfg = await getSystemConfig();
  return cfg?.resendApiKey || null;
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY não configurado — email não enviado.");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Email] Erro ao enviar:", e);
    return false;
  }
}

// ── Templates ────────────────────────────────────────────────────
function base(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:#0f2a5e;padding:24px 32px;display:flex;align-items:center;gap:12px}
  .logo{background:#f5c400;color:#0f2a5e;font-weight:900;font-size:18px;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center}
  .brand{color:white;font-weight:900;font-size:18px}
  .body{padding:32px}
  .title{font-size:22px;font-weight:900;color:#0f2a5e;margin-bottom:8px}
  .divider{height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:16px 0}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
  .label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}
  .value{font-size:15px;font-weight:600;color:#1e293b}
  .btn{display:inline-block;background:#0f2a5e;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="logo">S</div>
    <div class="brand">Smarter Estágios</div>
  </div>
  <div class="body">
    <div class="title">${titulo}</div>
    <div class="divider"></div>
    ${corpo}
  </div>
  <div class="footer">Smarter Estágios — Sistema de Gestão de Estágios<br>Este é um email automático, não responda.</div>
</div>
</body></html>`;
}

export async function enviarBoasVindasEstudante(params: {
  email: string; nome: string; senha: string; curso: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || process.env.NEXT_PUBLIC_APP_URL || "https://smarter-v2-completo.vercel.app";
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nome}</strong>! Seu acesso ao portal de estágio foi criado.</p>
    <div class="box">
      <div class="label">Seu acesso</div>
      <div style="margin-top:8px">
        <div class="label">E-mail</div><div class="value">${params.email}</div>
        <div class="label" style="margin-top:8px">Senha temporária</div><div class="value">${params.senha}</div>
        <div class="label" style="margin-top:8px">Curso</div><div class="value">${params.curso}</div>
      </div>
    </div>
    <p style="color:#475569;font-size:13px">Acesse o portal para acompanhar seu estágio, ver vagas disponíveis e completar seu perfil.</p>
    <a href="${url}/login" class="btn">Acessar Portal →</a>
  `;
  return sendMail(params.email, "Bem-vindo(a) à Smarter Estágios — Acesso criado", base("Bem-vindo(a) ao Portal!", corpo));
}

export async function enviarBoasVindasEmpresa(params: {
  email: string; nomeEmpresa: string; nomeResponsavel: string; senha: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || process.env.NEXT_PUBLIC_APP_URL || "https://smarter-v2-completo.vercel.app";
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nomeResponsavel}</strong>! O acesso da empresa <strong>${params.nomeEmpresa}</strong> foi criado.</p>
    <div class="box">
      <div class="label">Credenciais de acesso</div>
      <div style="margin-top:8px">
        <div class="label">E-mail</div><div class="value">${params.email}</div>
        <div class="label" style="margin-top:8px">Senha temporária</div><div class="value">${params.senha}</div>
      </div>
    </div>
    <p style="color:#475569;font-size:13px">Através do portal você pode gerenciar estagiários, assinar documentos e acompanhar o financeiro.</p>
    <a href="${url}/login" class="btn">Acessar Portal da Empresa →</a>
  `;
  return sendMail(params.email, "Bem-vindo(a) à Smarter Estágios — Acesso da Empresa criado", base("Acesso da Empresa Criado!", corpo));
}

export async function enviarCobranca(params: {
  email: string; nomeEmpresa: string; descricao: string; valor: number;
  vencimento?: string; chavePix?: string; instrucao?: string;
  linkBoleto?: string; mensagemPersonalizada?: string;
}): Promise<boolean> {
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const venc = params.vencimento ? new Date(params.vencimento).toLocaleDateString("pt-BR") : "—";
  let pagamentoHtml = "";
  if (params.chavePix) {
    pagamentoHtml += `<div class="box" style="border-left:3px solid #10b981"><div class="label">💳 Pagamento via PIX</div><div class="value" style="font-size:18px;letter-spacing:1px">${params.chavePix}</div></div>`;
  }
  if (params.linkBoleto) {
    pagamentoHtml += `<div class="box" style="border-left:3px solid #3b82f6"><div class="label">📄 Boleto Bancário</div><a href="${params.linkBoleto}" style="color:#0f2a5e;font-weight:700">Clique aqui para visualizar o boleto</a></div>`;
  }
  if (params.instrucao) {
    pagamentoHtml += `<div class="box"><div class="label">📝 Instruções</div><div style="color:#475569;font-size:13px;margin-top:4px">${params.instrucao}</div></div>`;
  }
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nomeEmpresa}</strong>! Segue abaixo a cobrança referente aos serviços da <strong>Smarter Estágios</strong>.</p>
    <div class="box" style="border-left:3px solid #f59e0b">
      <div class="label">Referência</div><div class="value">${params.descricao}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div><div class="label">Valor</div><div class="value" style="color:#0f2a5e;font-size:20px">${fmt(params.valor)}</div></div>
        <div><div class="label">Vencimento</div><div class="value">${venc}</div></div>
      </div>
    </div>
    ${params.mensagemPersonalizada ? `<p style="color:#475569;font-size:13px;font-style:italic">${params.mensagemPersonalizada}</p>` : ""}
    ${pagamentoHtml}
  `;
  return sendMail(params.email, `Cobrança Smarter Estágios — ${params.descricao}`, base("Cobrança Pendente", corpo));
}

export async function enviarNotificacaoAssinatura(params: {
  email: string; nome: string; tipoDoc: string; linkAssinatura?: string;
}): Promise<boolean> {
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nome}</strong>! Há um documento aguardando sua assinatura digital.</p>
    <div class="box"><div class="label">Documento</div><div class="value">${params.tipoDoc}</div></div>
    ${params.linkAssinatura ? `<a href="${params.linkAssinatura}" class="btn">Assinar Documento →</a>` : "<p>Acesse o portal para assinar o documento.</p>"}
  `;
  return sendMail(params.email, `Documento para Assinatura — ${params.tipoDoc}`, base("Assinatura Pendente", corpo));
}

export async function enviarBoasVindasColaborador(params: {
  email: string; nome: string; senha: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || process.env.NEXT_PUBLIC_APP_URL || "https://smarter-v2-completo.vercel.app";
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nome}</strong>! Seu acesso à equipe Smarter Estágios foi criado.</p>
    <div class="box">
      <div class="label">Credenciais de acesso</div>
      <div style="margin-top:8px">
        <div class="label">E-mail</div><div class="value">${params.email}</div>
        <div class="label" style="margin-top:8px">Senha temporária</div><div class="value">${params.senha}</div>
      </div>
    </div>
    <a href="${url}/login" class="btn">Acessar o Sistema →</a>
  `;
  return sendMail(params.email, "Bem-vindo(a) à equipe Smarter Estágios", base("Bem-vindo(a) à Equipe!", corpo));
}
