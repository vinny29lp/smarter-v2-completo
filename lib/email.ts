// ── Email via Resend HTTP API ────────────────────────────────────
// Token: env RESEND_API_KEY (priority) or SystemConfig.resendApiKey (fallback DB)
//
// DOMÍNIO: smarterestagios.com.br verificado no Resend (DNS adicionados no HostGator)
//
// FROM addresses:
//   financeiro@smarterestagios.com.br → usado apenas na aba Financeiro (cobranças)
//   contato@smarterestagios.com.br    → usado em todos os demais emails
//     (boas-vindas estudante/empresa/colaborador, assinatura, avaliação)

import { getSystemConfig } from "./getConfig";

const RESEND_URL = "https://api.resend.com/emails";
const FROM_CONTATO    = process.env.RESEND_FROM_CONTATO    || "Smarter Estágios <contato@smarterestagios.com.br>";
const FROM_FINANCEIRO = process.env.RESEND_FROM_FINANCEIRO || "Smarter Estágios <financeiro@smarterestagios.com.br>";

async function getApiKey(): Promise<string | null> {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const cfg = await getSystemConfig();
  return cfg?.resendApiKey || null;
}

// ── Inline attachment type (CID) ─────────────────────────────────
type EmailAttachment = {
  filename: string;
  content: string;   // base64
  content_id: string;
};

// ── Extract base64 from data URI or fetch from URL ───────────────
async function resolveQrCode(qrCodePixUrl: string): Promise<EmailAttachment | null> {
  try {
    // data URI: data:image/png;base64,XXXX
    if (qrCodePixUrl.startsWith("data:")) {
      const match = qrCodePixUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      const ext = match[1].split("/")[1] || "png";
      return { filename: `qrcode.${ext}`, content: match[2], content_id: "qrcode-pix" };
    }

    // External URL: fetch and convert to base64
    const res = await fetch(qrCodePixUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const ct = res.headers.get("content-type") || "image/png";
    const ext = ct.split("/")[1]?.split(";")[0] || "png";
    return { filename: `qrcode.${ext}`, content: base64, content_id: "qrcode-pix" };
  } catch {
    return null;
  }
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  from?: string,
): Promise<boolean> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY não configurado — email não enviado.");
    return false;
  }
  try {
    const body: Record<string, unknown> = { from: from ?? FROM_CONTATO, to: [to], subject, html };
    if (attachments?.length) body.attachments = attachments;

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
// APP_URL: usa env vars mas ignora localhost (valor de desenvolvimento no .env commitado)
const _rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = (_rawAppUrl && !_rawAppUrl.includes("localhost") && !_rawAppUrl.includes("127.0.0"))
  ? _rawAppUrl.replace(/\/$/, "")
  : "https://sistema.smarterestagios.com.br";

function base(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:#0f2a5e;padding:20px 32px;text-align:center}
  .header img{height:48px;object-fit:contain}
  .brand{color:white;font-weight:900;font-size:16px;margin-top:6px}
  .body{padding:32px}
  .title{font-size:22px;font-weight:900;color:#0f2a5e;margin-bottom:8px}
  .divider{height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:16px 0}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
  .label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}
  .value{font-size:15px;font-weight:600;color:#1e293b}
  .btn{display:inline-block;background:#0f2a5e;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .pix-box{background:#f0fdf4;border:2px solid #10b981;border-radius:12px;padding:20px;margin:16px 0;text-align:center}
  .pix-key{font-family:monospace;font-size:16px;font-weight:700;color:#065f46;background:#d1fae5;padding:10px 16px;border-radius:8px;display:inline-block;margin:8px 0;word-break:break-all}
  .pix-qr{margin:16px auto;display:block;max-width:180px;border-radius:8px;border:4px solid #d1fae5}
</style></head><body>
<div class="wrap">
  <div class="header">
    <img src="${APP_URL}/logo-branca.png" alt="Smarter Estágios" height="48"
         onerror="this.style.display='none';document.getElementById('brand-text').style.display='block'"/>
    <div id="brand-text" class="brand" style="display:none">Smarter Estágios</div>
  </div>
  <div class="body">
    <div class="title">${titulo}</div>
    <div class="divider"></div>
    ${corpo}
  </div>
  <div class="footer">Smarter Estágios — Sistema de Gestão de Estágios<br>Este é um email automático, por favor não responda.<br>financeiro@smarterestagios.com.br</div>
</div>
</body></html>`;
}

// ── Template mínimo para notificações INTERNAS (equipe/franqueado) ──
// Sem logo, sem banner, sem botão grande de CTA e sem o texto "não responda".
// Objetivo: parecer um email operacional/transacional, não uma peça de
// marketing — reduz o risco de o Gmail classificar como "Promoções".
function baseInterno(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.6;margin:0;padding:20px;background:#ffffff">
  <p style="margin:0 0 2px;font-weight:700;font-size:15px;color:#0f2a5e">${titulo}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0 16px"/>
  ${corpo}
  <p style="margin-top:24px;font-size:11px;color:#94a3b8">Smarter Estágios — notificação automática do CRM.</p>
</body></html>`;
}

// ── Notificação interna de novo lead (formulário /parceria e afins) ──
// Enviada para a unidade responsável (ou franqueadora, se sem unidade)
// assim que um lead é capturado — precisa cair na caixa principal do
// destinatário, por isso usa o template mínimo acima.
export async function enviarNotificacaoNovoLead(params: {
  destinatarioEmail: string;
  nomeContato: string;
  empresa: string;
  whatsapp?: string | null;
  email?: string | null;
  origemLabel: string;
  leadUrl?: string;
}): Promise<boolean> {
  const corpo = `
    <p style="margin:0 0 12px">Novo lead recebido via ${params.origemLabel}.</p>
    <p style="margin:0 0 4px"><strong>Nome:</strong> ${params.nomeContato}</p>
    <p style="margin:0 0 4px"><strong>Empresa:</strong> ${params.empresa}</p>
    ${params.whatsapp ? `<p style="margin:0 0 4px"><strong>WhatsApp:</strong> ${params.whatsapp}</p>` : ""}
    ${params.email ? `<p style="margin:0 0 4px"><strong>E-mail:</strong> ${params.email}</p>` : ""}
    ${params.leadUrl ? `<p style="margin:16px 0 0">Acessar no CRM: <a href="${params.leadUrl}" style="color:#0f2a5e">${params.leadUrl}</a></p>` : ""}
  `;
  return sendMail(
    params.destinatarioEmail,
    `Novo lead: ${params.empresa}`,
    baseInterno("Novo lead recebido", corpo),
  );
}

export async function enviarBoasVindasEstudante(params: {
  email: string; nome: string; senha: string; curso: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || APP_URL;
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nome}</strong>! Seu acesso ao portal Smarter Estágios foi criado com sucesso. Seja bem-vindo(a)!</p>

    <div class="box">
      <div class="label">Suas credenciais de acesso</div>
      <div style="margin-top:8px">
        <div class="label">E-mail</div><div class="value">${params.email}</div>
        <div class="label" style="margin-top:8px">Senha temporária</div><div class="value">${params.senha}</div>
        <div class="label" style="margin-top:8px">Curso</div><div class="value">${params.curso}</div>
      </div>
    </div>

    <a href="${url}/login" class="btn">Acessar Meu Portal →</a>

    <div style="margin:28px 0;padding:24px;background:linear-gradient(135deg,#0f2a5e 0%,#1a3d8f 100%);border-radius:16px;text-align:center">
      <p style="color:#f5c400;font-size:22px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px">
        🧠 FAÇA SEU TESTE DISC AGORA!
      </p>
      <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 8px">
        Descubra seu perfil comportamental e conquiste as melhores vagas de estágio
      </p>
      <p style="color:#cbd5e1;font-size:13px;margin:0 0 18px;line-height:1.6">
        O teste DISC revela seus pontos fortes, seu estilo de trabalho e como você se destaca.<br>
        <strong style="color:#f5c400">Estudantes com perfil DISC preenchido têm até 3x mais chances de ser selecionados pelas empresas parceiras.</strong>
      </p>
      <a href="${url}/portal-estudante" style="display:inline-block;background:#f5c400;color:#0f2a5e;padding:14px 32px;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none">
        ▶ Fazer o Teste DISC Agora
      </a>
    </div>

    <p style="color:#475569;font-size:13px;margin-top:16px">
      Após o teste, seu perfil ficará visível para as empresas parceiras ao buscar estagiários. Não perca tempo — complete seu perfil hoje mesmo!
    </p>
  `;
  return sendMail(params.email, "🎓 Bem-vindo(a) à Smarter Estágios — Acesso criado + Faça seu Teste DISC!", base("Bem-vindo(a) ao Portal!", corpo));
}

export async function enviarBoasVindasEmpresa(params: {
  email: string; nomeEmpresa: string; nomeResponsavel: string; senha: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || APP_URL;
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

export async function enviarBoasVindasInstituicao(params: {
  email: string; nomeInstituicao: string; nomeContato?: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || APP_URL;
  const saudacao = params.nomeContato ? `Olá, <strong>${params.nomeContato}</strong>!` : `Olá!`;
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">${saudacao} A instituição <strong>${params.nomeInstituicao}</strong> foi cadastrada com sucesso como parceira da <strong>Smarter Estágios</strong>.</p>
    <div class="box">
      <div class="label">O que isso significa?</div>
      <div style="margin-top:8px;color:#475569;font-size:13px;line-height:1.7">
        <p style="margin:4px 0">✅ Seus estudantes poderão ser encaminhados para estágios nas empresas parceiras</p>
        <p style="margin:4px 0">✅ Os Termos de Compromisso de Estágio (TCE) serão gerenciados digitalmente pela plataforma</p>
        <p style="margin:4px 0">✅ Relatórios de acompanhamento dos estagiários disponíveis em tempo real</p>
        <p style="margin:4px 0">✅ Assinatura digital de documentos sem necessidade de deslocamento</p>
      </div>
    </div>
    <p style="color:#475569;font-size:13px;margin-top:16px">
      Qualquer dúvida, entre em contato com a unidade Smarter responsável pelo seu cadastro.
    </p>
    <a href="${url}" class="btn">Conhecer a Plataforma →</a>
  `;
  return sendMail(
    params.email,
    `Bem-vindo(a) à Smarter Estágios — ${params.nomeInstituicao} cadastrada com sucesso`,
    base("Parceria Confirmada!", corpo)
  );
}

export async function enviarCobranca(params: {
  email: string; nomeEmpresa: string; descricao: string; valor: number;
  vencimento?: string; chavePix?: string; instrucao?: string;
  linkBoleto?: string; qrCodePixUrl?: string; mensagemPersonalizada?: string;
}): Promise<boolean> {
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const venc = params.vencimento ? new Date(params.vencimento).toLocaleDateString("pt-BR") : "—";

  // Resolve QR code como inline attachment CID (funciona em qualquer cliente de email)
  let qrAttachment: EmailAttachment | null = null;
  if (params.qrCodePixUrl) {
    qrAttachment = await resolveQrCode(params.qrCodePixUrl);
  }

  let pagamentoHtml = "";

  if (params.chavePix) {
    // Se tiver QR code resolvido, usa CID reference; senão, omite a imagem
    const qrImg = qrAttachment
      ? `<img src="cid:qrcode-pix" alt="QR Code PIX" class="pix-qr" width="180" style="max-width:180px;border-radius:8px;border:4px solid #d1fae5;display:block;margin:12px auto"/><br>
         <p style="color:#065f46;font-size:12px;margin:4px 0 12px">📱 Aponte a câmera do celular para o QR Code ou copie a chave abaixo</p>`
      : "";
    pagamentoHtml += `
      <div class="pix-box">
        <p style="font-size:13px;font-weight:700;color:#065f46;margin:0 0 8px">💳 Pagamento via PIX</p>
        ${qrImg}
        <p style="font-size:12px;color:#6b7280;margin:0 0 4px">Copie e cole a chave PIX:</p>
        <div class="pix-key">${params.chavePix}</div>
        <p style="font-size:11px;color:#9ca3af;margin:8px 0 0">Após o pagamento, o sistema será atualizado automaticamente.</p>
      </div>`;
  }

  if (params.linkBoleto) {
    pagamentoHtml += `<div class="box" style="border-left:3px solid #3b82f6"><div class="label">📄 Boleto Bancário</div><a href="${params.linkBoleto}" style="color:#0f2a5e;font-weight:700">Clique aqui para visualizar o boleto</a></div>`;
  }

  if (params.instrucao) {
    pagamentoHtml += `<div class="box"><div class="label">📝 Instruções de Pagamento</div><div style="color:#475569;font-size:13px;margin-top:4px;white-space:pre-line">${params.instrucao}</div></div>`;
  }

  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nomeEmpresa}</strong>! Segue abaixo a cobrança referente aos serviços da <strong>Smarter Estágios</strong>.</p>
    <div class="box" style="border-left:3px solid #f59e0b">
      <div class="label">Referência</div><div class="value">${params.descricao}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div><div class="label">Valor</div><div class="value" style="color:#0f2a5e;font-size:20px;font-weight:900">${fmt(params.valor)}</div></div>
        <div><div class="label">Vencimento</div><div class="value">${venc}</div></div>
      </div>
    </div>
    ${params.mensagemPersonalizada ? `<p style="color:#475569;font-size:13px;font-style:italic;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #cbd5e1">${params.mensagemPersonalizada}</p>` : ""}
    ${pagamentoHtml || `<p style="color:#64748b;font-size:13px">Entre em contato para informações de pagamento.</p>`}
  `;

  const attachments = qrAttachment ? [qrAttachment] : undefined;
  return sendMail(
    params.email,
    `Cobrança Smarter Estágios — ${params.descricao}`,
    base("Cobrança Pendente", corpo),
    attachments,
    FROM_FINANCEIRO,
  );
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

export async function enviarAvaliacaoLink(params: {
  email: string;
  nomeEmpresa: string;
  nomeEstagiario: string;
  contratoId: string;
  loginUrl?: string;
}): Promise<boolean> {
  const appUrl = params.loginUrl || APP_URL;
  const link = `${appUrl}/portal-empresa/avaliacoes?contrato=${params.contratoId}`;
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nomeEmpresa}</strong>!</p>
    <p style="color:#475569;margin-bottom:16px">Chegou a hora da <strong>Avaliação Semestral</strong> do(a) estagiário(a) <strong>${params.nomeEstagiario}</strong>, conforme previsto na <strong>Lei 11.788/2008</strong>.</p>
    <div class="box">
      <div class="label">Estagiário(a)</div>
      <div class="value">${params.nomeEstagiario}</div>
      <div class="label" style="margin-top:8px">O que você vai avaliar</div>
      <div style="color:#475569;font-size:13px;margin-top:4px">Pontualidade · Produtividade · Iniciativa · Comunicação · Aprendizado · Postura Profissional</div>
    </div>
    <p style="color:#475569;font-size:13px">Acesse o portal abaixo para preencher a avaliação. O processo leva menos de 3 minutos.</p>
    <a href="${link}" class="btn">Preencher Avaliação →</a>
    <p style="color:#94a3b8;font-size:11px;margin-top:16px">Se o botão não funcionar, copie e cole este link no navegador:<br>${link}</p>
  `;
  return sendMail(params.email, `Avaliação Semestral — ${params.nomeEstagiario}`, base("📋 Avaliação Semestral de Estágio", corpo));
}

export async function enviarBoasVindasColaborador(params: {
  email: string; nome: string; senha: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || APP_URL;
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

export async function enviarBoasVindasFranqueado(params: {
  email: string; nome: string; nomeUnidade: string; senha: string; loginUrl?: string;
}): Promise<boolean> {
  const url = params.loginUrl || APP_URL;
  const corpo = `
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${params.nome}</strong>! A unidade <strong>${params.nomeUnidade}</strong> foi cadastrada na rede Smarter Estágios. Seja bem-vindo(a)!</p>
    <div class="box">
      <div class="label">Credenciais de acesso ao sistema</div>
      <div style="margin-top:8px">
        <div class="label">E-mail de login</div><div class="value">${params.email}</div>
        <div class="label" style="margin-top:8px">Senha temporária</div><div class="value">${params.senha}</div>
      </div>
    </div>
    <p style="color:#475569;font-size:13px">Através do painel você pode gerenciar estudantes, empresas, contratos de estágio e o financeiro da sua unidade.</p>
    <a href="${url}/login" class="btn">Acessar o Sistema →</a>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">Recomendamos alterar sua senha após o primeiro acesso.</p>
  `;
  return sendMail(
    params.email,
    `Bem-vindo(a) à Smarter Estágios — Acesso da unidade ${params.nomeUnidade} criado`,
    base("Bem-vindo(a) à Rede Smarter!", corpo),
  );
}

// ── Apresentação Comercial para Empresas (aba Empresas) ─────────
// E-mail de prospecção enviado pela unidade para uma empresa-alvo,
// com CTA para a landing pública /parceria?ref=<franchiseId>.
export async function enviarApresentacaoEmpresas(params: {
  email: string;
  nomeContato?: string;
  nomeUnidade: string;      // ex: "Smarter Campinas" ou "Smarter Estágios"
  responsavel?: string;
  cidade?: string;          // "Campinas/SP"
  whatsapp?: string | null;
  refId?: string | null;    // franchiseId — ausente = lead vai para a franqueadora
}): Promise<boolean> {
  const link = `${APP_URL}/parceria${params.refId ? `?ref=${encodeURIComponent(params.refId)}` : ""}`;
  const saudacao = params.nomeContato ? `Olá, <strong>${params.nomeContato}</strong>!` : "Olá!";
  const assinatura = [params.responsavel, params.nomeUnidade, params.cidade].filter(Boolean).join(" · ");

  const corpo = `
    <p style="color:#475569;margin-bottom:16px">${saudacao}</p>
    <p style="color:#475569;margin-bottom:16px">
      Contratar bons profissionais está cada vez mais <strong>caro e demorado</strong>.
      A <strong>Smarter Estágios</strong> ajuda empresas como a sua a contratar
      <strong>estagiários selecionados com tecnologia</strong> — com custo muito menor
      que uma contratação CLT e <strong>zero burocracia</strong> para você.
    </p>

    <div class="box">
      <p style="font-size:13px;margin:0 0 12px;font-weight:700;color:#0f2a5e">Por que empresas contratam com a Smarter?</p>
      <p style="margin:4px 0;font-size:13px">🎯 Triagem inteligente — só os candidatos alinhados ao seu perfil</p>
      <p style="margin:4px 0;font-size:13px">📑 TCE, plano de atividades e seguro: tudo por nossa conta</p>
      <p style="margin:4px 0;font-size:13px">⚖️ 100% conforme a Lei nº 11.788/2008 — sem vínculo empregatício</p>
      <p style="margin:4px 0;font-size:13px">🏫 Convênio com instituições de ensino já incluído</p>
      <p style="margin:4px 0;font-size:13px">🤝 Atendimento humanizado, com especialista da sua região</p>
      <p style="margin:4px 0;font-size:13px">⚡ Em média 7 a 15 dias úteis para o estagiário começar</p>
    </div>

    <p style="color:#475569;margin:16px 0">
      Preparamos uma <strong>apresentação completa</strong> mostrando como funciona na prática.
      Leva menos de 3 minutos para conhecer:
    </p>

    <div style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#0f2a5e;color:white;font-weight:900;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;display:inline-block">
        Ver a apresentação da Smarter →
      </a>
    </div>

    <p style="color:#64748b;font-size:12px;text-align:center">
      Ou copie e cole este link no navegador:<br/>
      <a href="${link}" style="color:#0f2a5e">${link}</a>
    </p>

    <div class="box" style="background:#fef9ec;border-color:#f5c400">
      <p style="margin:0;font-size:12px;color:#92400e">
        💡 Na apresentação você pode deixar seus dados e receber uma
        <strong> proposta gratuita e sem compromisso</strong> para a sua empresa.
      </p>
    </div>

    ${assinatura ? `
    <p style="color:#475569;font-size:13px;margin-top:20px">
      Atenciosamente,<br/>
      <strong>${assinatura}</strong>
      ${params.whatsapp ? `<br/><span style="color:#64748b;font-size:12px">📱 WhatsApp: ${params.whatsapp}</span>` : ""}
    </p>` : ""}
  `;

  return sendMail(
    params.email,
    "Contratar estagiários sem burocracia — conheça a Smarter Estágios",
    base("Talentos para a sua empresa, sem complicação", corpo),
  );
}

// ── Proposta Comercial ────────────────────────────────────────────
export async function enviarPropostaComercial(params: {
  email: string;
  empresa: string;          // nome da empresa
  responsavel?: string;     // A/C responsável
  valorGestao: number;      // Company.valorGestao
  nomeUnidade: string;      // ex: "Smarter Campinas" ou "Smarter Estágios"
  responsavelUnidade?: string;
  cidade?: string;          // "Campinas/SP"
  token: string;            // proposalToken — forma o link público
}): Promise<boolean> {
  const link = `${APP_URL}/proposta/${params.token}`;
  const saudacao = params.responsavel ? `Olá, <strong>${params.responsavel}</strong>!` : "Olá!";
  const assinatura = [params.responsavelUnidade, params.nomeUnidade, params.cidade].filter(Boolean).join(" · ");
  const valorStr = params.valorGestao.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const corpo = `
    <p style="color:#475569;margin-bottom:16px">${saudacao}</p>
    <p style="color:#475569;margin-bottom:16px">
      Com base no que vimos sobre a <strong>${params.empresa}</strong>, preparamos uma
      <strong>proposta comercial objetiva</strong> para vocês começarem a contratar estagiários
      com a Smarter.
    </p>

    <div class="box">
      <p style="font-size:13px;margin:0 0 12px;font-weight:700;color:#0f2a5e">O que está incluso</p>
      <p style="margin:4px 0;font-size:13px">🎯 Triagem inteligente por perfil comportamental (DISC)</p>
      <p style="margin:4px 0;font-size:13px">📑 TCE gerado e assinado digitalmente, sem burocracia</p>
      <p style="margin:4px 0;font-size:13px">⚖️ Conformidade total com a Lei nº 11.788/2008</p>
      <p style="margin:4px 0;font-size:13px">🏫 Convênio com instituições de ensino já integrado</p>
      <p style="margin:4px 0;font-size:13px">🛡️ Seguro contra acidentes pessoais incluso</p>
      <p style="margin:4px 0;font-size:13px">⚡ Prazo médio de 7 a 15 dias úteis para o estagiário começar</p>
    </div>

    <div class="box" style="text-align:center">
      <p class="label">Investimento</p>
      <p style="font-size:24px;font-weight:900;color:#0f2a5e;margin:2px 0">R$ ${valorStr}<span style="font-size:14px;font-weight:700;color:#64748b">/mês por estagiário ativo</span></p>
    </div>

    <div style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#0f2a5e;color:white;font-weight:900;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;display:inline-block">
        Ver a proposta completa →
      </a>
    </div>

    <p style="color:#64748b;font-size:12px;text-align:center">
      Ou copie e cole este link no navegador:<br/>
      <a href="${link}" style="color:#0f2a5e">${link}</a>
    </p>

    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:8px">Proposta válida por 15 dias.</p>

    ${assinatura ? `
    <p style="color:#475569;font-size:13px;margin-top:20px">
      Atenciosamente,<br/>
      <strong>${assinatura}</strong>
    </p>` : ""}
  `;

  return sendMail(
    params.email,
    `Proposta comercial Smarter Estágios — ${params.empresa}`,
    base("Proposta Comercial", corpo),
  );
}

// ── Convite IES — Portal de Adesão ──────────────────────────────
export async function enviarConviteIES(params: {
  email: string;
  nomeIES: string;
  coordenador?: string;
  portalUrl: string;
  nomeUnidade?: string;
}): Promise<boolean> {
  const corpo = `
    <p class="title">Convite de Convênio de Estágio</p>
    <div class="divider"></div>
    <p>Olá${params.coordenador ? `, <strong>${params.coordenador}</strong>` : ""},</p>
    <p>A <strong>${params.nomeUnidade || "Smarter Estágios"}</strong> tem o prazer de convidar
    <strong>${params.nomeIES}</strong> para firmar um Convênio de Estágio conosco.</p>
    <p>Por meio deste convênio, seus alunos terão acesso a vagas de estágio qualificadas em empresas parceiras,
    com toda a gestão feita de forma 100% digital — desde o TCE até os relatórios de acompanhamento.</p>
    <div class="box">
      <p style="font-size:13px;margin:0 0 12px;font-weight:700;color:#0f2a5e">Por que firmar convênio com a Smarter?</p>
      <p style="margin:4px 0;font-size:13px">📊 Painel em tempo real com todos os estágios dos seus alunos</p>
      <p style="margin:4px 0;font-size:13px">📝 Contratos digitais — sem papel, sem burocracia</p>
      <p style="margin:4px 0;font-size:13px">🎯 Matching inteligente entre alunos e vagas por perfil e curso</p>
      <p style="margin:4px 0;font-size:13px">🔐 100% em conformidade com a Lei n.º 11.788/2008</p>
      <p style="margin:4px 0;font-size:13px">🆓 Totalmente gratuito para a instituição de ensino</p>
    </div>
    <p>O processo de adesão é simples, rápido e 100% digital. Clique no botão abaixo para conhecer a Smarter e assinar o convênio:</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${params.portalUrl}" style="background:#0f2a5e;color:white;font-weight:900;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;display:inline-block">
        Acessar Portal de Convênio →
      </a>
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center">
      Ou copie e cole este link no navegador:<br/>
      <a href="${params.portalUrl}" style="color:#0f2a5e">${params.portalUrl}</a>
    </p>
    <div class="box" style="background:#fef9ec;border-color:#f5c400">
      <p style="margin:0;font-size:12px;color:#92400e">
        ⏱ O processo de adesão leva menos de 5 minutos e não exige nenhum custo para a IES.
        O link acima é exclusivo para ${params.nomeIES}.
      </p>
    </div>
  `;
  return sendMail(
    params.email,
    `Convite: Convênio de Estágio com a Smarter Estágios — ${params.nomeIES}`,
    base(`Convite para ${params.nomeIES}`, corpo),
  );
}


// ── Convênio Firmado — email de confirmação para a IES ──────────────
export async function enviarConvenioFirmadoIES(params: {
  email: string;
  nomeIES: string;
  assinanteName: string;
  protocolo: string;
  portalUrl: string;
  nomeSmarter?: string;
  senhaPortal?: string; // senha em texto puro (gerada após assinatura)
}): Promise<boolean> {
  const credenciaisHtml = params.senhaPortal ? `
    <div class="box" style="background:#eff6ff;border-color:#93c5fd">
      <p style="margin:0 0 8px;font-weight:700;color:#1e40af;font-size:13px">🔐 Suas credenciais de acesso ao portal</p>
      <p style="margin:0 0 4px;font-size:13px;color:#1e40af"><strong>E-mail:</strong> ${params.email}</p>
      <p style="margin:0;font-size:13px;color:#1e40af"><strong>Senha:</strong> <span style="font-family:monospace;font-size:14px;font-weight:700;letter-spacing:0.1em">${params.senhaPortal}</span></p>
      <p style="margin:8px 0 0;font-size:11px;color:#60a5fa">Guarde esta senha. Você pode alterá-la a qualquer momento no seu painel.</p>
    </div>
  ` : "";
  const corpo = `
    <p class="title">Convênio Firmado com Sucesso! 🎉</p>
    <div class="divider"></div>
    <p>Olá, <strong>${params.assinanteName}</strong>,</p>
    <p>É com grande satisfação que confirmamos que <strong>${params.nomeIES}</strong> agora faz parte
    da rede <strong>${params.nomeSmarter || "Smarter Estágios"}</strong>!</p>
    <div class="box" style="background:#f0fdf4;border-color:#86efac">
      <p style="margin:0 0 8px;font-weight:700;color:#166534;font-size:13px">✅ Protocolo de Assinatura</p>
      <p style="margin:0;font-family:monospace;font-size:15px;font-weight:700;color:#166534;letter-spacing:0.05em">${params.protocolo}</p>
      <p style="margin:6px 0 0;font-size:11px;color:#166534">Guarde este código como comprovante da assinatura eletrônica.</p>
    </div>
    ${credenciaisHtml}
    <p>Acesse o portal da sua instituição usando o link abaixo:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${params.portalUrl}" style="background:#0f2a5e;color:white;font-weight:900;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;display:inline-block">
        Acessar Portal da IES →
      </a>
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center">
      Link permanente do portal:<br/>
      <a href="${params.portalUrl}" style="color:#0f2a5e">${params.portalUrl}</a>
    </p>
    <p>Nossa equipe entrará em contato em breve para os próximos passos. Qualquer dúvida,
    responda este e-mail ou entre em contato pelo site.</p>
    <p>Seja bem-vindo(a) à rede Smarter! 🚀</p>
  `;
  return sendMail(
    params.email,
    `✅ Convênio firmado — ${params.nomeIES} agora faz parte da Smarter Estágios`,
    base(`Convênio firmado — ${params.nomeIES}`, corpo),
  );
}

// ── Minuta Própria — notifica convenios@ para tratar manualmente ─────
export async function enviarMiniutaPropriaParaSmarter(params: {
  nomeIES: string;
  emailIES: string;
  assinanteName: string;
  assinanteCpf: string;
  telefoneIES?: string;
  portalUrl: string;
  observacao?: string;
}): Promise<boolean> {
  // Notificação interna (equipe de convênios) — template mínimo, sem
  // banner/CTA de marketing, para não cair em Promoções.
  const corpo = `
    <p style="margin:0 0 12px">Uma Instituição de Ensino optou por utilizar a minuta padrão da própria instituição
    ao invés da minuta Smarter. Ação manual necessária.</p>
    <p style="margin:0 0 4px"><strong>Instituição:</strong> ${params.nomeIES}</p>
    <p style="margin:0 0 4px"><strong>E-mail:</strong> ${params.emailIES}</p>
    <p style="margin:0 0 4px"><strong>Representante:</strong> ${params.assinanteName}</p>
    <p style="margin:0 0 4px"><strong>CPF:</strong> ${params.assinanteCpf}</p>
    ${params.telefoneIES ? `<p style="margin:0 0 4px"><strong>Telefone:</strong> ${params.telefoneIES}</p>` : ""}
    ${params.observacao ? `<p style="margin:8px 0 0;font-size:13px;color:#475569">Observação: ${params.observacao}</p>` : ""}
    <p style="margin:16px 0 0">Acessar registro da IES: <a href="${params.portalUrl}" style="color:#0f2a5e">${params.portalUrl}</a></p>
    <p style="margin:12px 0 0;color:#b45309;font-weight:700">Ação necessária: entre em contato com a IES para receber a minuta deles, revisar, assinar e registrar o convênio no sistema.</p>
  `;
  return sendMail(
    "convenios@smarterestagios.com.br",
    `Ação necessária: ${params.nomeIES} optou por minuta própria`,
    baseInterno("Minuta própria — IES aguarda contato", corpo),
  );
}
