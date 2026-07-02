/**
 * CRM — Templates de mensagem para envio da Apresentação Comercial Rastreável
 *
 * Cada canal retorna:
 *   - assunto (e-mail)
 *   - mensagem pronta com link rastreável embutido
 *
 * Variáveis: contato, empresa, segmento, franqueadoNome, link
 */

export interface ApresentacaoMsgParams {
  contato: string;       // nome do responsável na empresa
  empresa: string;       // nome da empresa
  segmento?: string;     // setor/segmento
  franqueadoNome: string; // nome do responsável da unidade Smarter
  franqueadoTelefone?: string;
  franqueadoEmail?: string;
  franqueadoCidade?: string;
  link: string;          // link rastreável da apresentação
}

export interface ApresentacaoMsg {
  assunto?: string;
  mensagem: string;
}

// ─── E-MAIL ──────────────────────────────────────────────────────────────────

export function msgEmail(p: ApresentacaoMsgParams): ApresentacaoMsg {
  return {
    assunto: "Como sua empresa pode formar talentos e reduzir custos com estágio",
    mensagem: `Olá, ${p.contato || "tudo bem"}?

Preparamos uma apresentação rápida mostrando como empresas estão utilizando programas de estágio para formar talentos, reduzir custos de contratação e desenvolver novos profissionais com segurança.

Você pode acessar pelo link abaixo:

${p.link}

A apresentação leva menos de 3 minutos para ser visualizada.

Fico à disposição para conversar e entender como a Smarter Estágios pode apoiar sua empresa.

Atenciosamente,
${p.franqueadoNome}
Smarter Estágios${p.franqueadoCidade ? ` — ${p.franqueadoCidade}` : ""}${p.franqueadoTelefone ? `\n${p.franqueadoTelefone}` : ""}${p.franqueadoEmail ? `\n${p.franqueadoEmail}` : ""}`,
  };
}

// ─── WHATSAPP ────────────────────────────────────────────────────────────────

export function msgWhatsApp(p: ApresentacaoMsgParams): ApresentacaoMsg {
  const nome = p.contato?.split(" ")[0] || "";
  return {
    mensagem: `Olá${nome ? `, ${nome}` : ""}! Tudo bem? 👋

Aqui é ${p.franqueadoNome}, da *Smarter Estágios*.

Preparamos uma apresentação rápida mostrando como sua empresa pode contratar estagiários de forma simples, segura e com apoio completo da Smarter.

Segue o link para visualizar:
${p.link}

Leva menos de 3 minutos para conhecer. 😊

Fico à disposição!`,
  };
}

// ─── INSTAGRAM ───────────────────────────────────────────────────────────────

export function msgInstagram(p: ApresentacaoMsgParams): ApresentacaoMsg {
  const nome = p.contato?.split(" ")[0] || "";
  return {
    mensagem: `Olá${nome ? `, ${nome}` : ""}! Tudo bem?

Sou ${p.franqueadoNome}, da Smarter Estágios.

Gostaria de compartilhar uma apresentação rápida sobre como empresas podem contratar estagiários com segurança, agilidade e suporte completo.

${p.link}

Fico à disposição! 🤝`,
  };
}

// ─── LINKEDIN ────────────────────────────────────────────────────────────────

export function msgLinkedIn(p: ApresentacaoMsgParams): ApresentacaoMsg {
  const nome = p.contato?.split(" ")[0] || "";
  return {
    mensagem: `Olá${nome ? `, ${nome}` : ""}! Tudo bem?

Vi que sua empresa atua no segmento de ${p.segmento || "mercado"} e acredito que um programa de estágio pode ser uma excelente estratégia para formar talentos e apoiar o crescimento da equipe.

Preparei uma apresentação rápida da Smarter Estágios:

${p.link}

Será um prazer conversar caso faça sentido para sua empresa.

${p.franqueadoNome} | Smarter Estágios`,
  };
}

// ─── HTML DO E-MAIL ──────────────────────────────────────────────────────────

export function htmlEmailApresentacao(p: ApresentacaoMsgParams): string {
  const nome = p.contato?.split(" ")[0] || "Olá";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,#0D2B5C,#1a3d8f);padding:28px 32px;text-align:center}
  .logo{color:white;font-weight:900;font-size:22px;letter-spacing:-0.5px}
  .logo span{color:#F4B400}
  .sub{color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px}
  .body{padding:36px 32px}
  .title{font-size:20px;font-weight:900;color:#0D2B5C;margin-bottom:8px;line-height:1.3}
  .divider{height:3px;background:linear-gradient(90deg,#0D2B5C,#F4B400);border-radius:2px;margin:16px 0}
  p{color:#475569;font-size:14px;line-height:1.7;margin:0 0 14px}
  .btn-wrap{text-align:center;margin:28px 0}
  .btn{display:inline-block;background:#F4B400;color:#0D2B5C;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px}
  .box{background:#f0f4ff;border:1px solid #c7d4f0;border-radius:12px;padding:18px 22px;margin:20px 0}
  .box p{color:#0D2B5C;margin:0;font-size:13px}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .sig{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b}
  .sig strong{color:#0D2B5C}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="logo"><span>S</span> Smarter Estágios</div>
    <div class="sub">Gestão completa de estágios — Lei 11.788/2008</div>
  </div>
  <div class="body">
    <div class="title">Olá, ${nome}! Temos algo para você 👋</div>
    <div class="divider"></div>

    <p>Preparamos uma <strong>apresentação rápida</strong> mostrando como empresas estão utilizando programas de estágio para:</p>

    <div class="box">
      <p>✅ Formar talentos alinhados à cultura da empresa<br>
      ✅ Reduzir custos de contratação<br>
      ✅ Contar com toda a segurança jurídica da Lei do Estágio<br>
      ✅ Ter apoio completo em documentação e gestão</p>
    </div>

    <p>A apresentação leva <strong>menos de 3 minutos</strong> para ser visualizada e foi pensada especialmente para empresas como a <strong>${p.empresa}</strong>.</p>

    <div class="btn-wrap">
      <a href="${p.link}" class="btn">🎓 Ver apresentação agora</a>
    </div>

    <p style="font-size:12px;color:#94a3b8;text-align:center">Ou copie o link: <a href="${p.link}" style="color:#0D2B5C">${p.link}</a></p>

    <div class="sig">
      <strong>${p.franqueadoNome}</strong><br>
      Smarter Estágios${p.franqueadoCidade ? ` — ${p.franqueadoCidade}` : ""}<br>
      ${p.franqueadoTelefone ? `📱 ${p.franqueadoTelefone}<br>` : ""}
      ${p.franqueadoEmail ? `✉️ ${p.franqueadoEmail}` : ""}
    </div>
  </div>
  <div class="footer">
    Smarter Estágios · Agente de Integração<br>
    <span style="font-size:10px">Você recebe este e-mail pois sua empresa pode se beneficiar de um programa de estágio.<br>
    Para não receber mais mensagens, responda "REMOVER".</span>
  </div>
</div>
</body></html>`;
}
