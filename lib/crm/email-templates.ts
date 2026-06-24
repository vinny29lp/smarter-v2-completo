/**
 * CRM — Templates de e-mail comercial por etapa do pipeline
 *
 * COMO EDITAR:
 *   Altere apenas o conteúdo das funções `subject` e `html`.
 *   Não altere as chaves do objeto (novo_lead, primeiro_contato, etc.).
 *   As variáveis disponíveis em `html(p)` são:
 *     p.empresa   — nome da empresa
 *     p.contato   — nome do responsável
 *     p.setor     — setor da empresa
 *     p.cidade    — cidade
 *     p.unidade   — nome da franquia Smarter
 *
 * Os e-mails são enviados automaticamente ao mover um lead para a etapa correspondente,
 * SOMENTE se o lead tiver e-mail cadastrado e optIn === true.
 */

export interface EmailTemplate {
  subject: string;
  html: (p: { empresa: string; contato?: string | null; setor?: string | null; cidade?: string | null; unidade?: string }) => string;
}

const APP_URL = "https://sistema.smarterestagios.com.br";

function base(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);padding:24px 32px;text-align:center}
  .brand{color:white;font-weight:900;font-size:20px;letter-spacing:-0.5px}
  .sub{color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px}
  .body{padding:32px}
  .title{font-size:22px;font-weight:900;color:#0f2a5e;margin-bottom:8px;line-height:1.3}
  .divider{height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:16px 0}
  p{color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:16px 0}
  .box-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  .check{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;font-size:13px;color:#374151}
  .icon{color:#0f2a5e;font-weight:900;flex-shrink:0;margin-top:1px}
  .btn{display:inline-block;background:#0f2a5e;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px}
  .highlight{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:12px;padding:20px 24px;margin:20px 0;color:white;text-align:center}
  .hl-num{font-size:32px;font-weight:900;color:#f5c400}
  .hl-txt{font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .unsubscribe{font-size:10px;color:#cbd5e1;margin-top:6px}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="brand">Smarter Estágios</div>
    <div class="sub">Gestão completa de estágios — Lei 11.788/2008</div>
  </div>
  <div class="body">
    <div class="title">${titulo}</div>
    <div class="divider"></div>
    ${corpo}
  </div>
  <div class="footer">
    Smarter Estágios — contato@smarterestagios.com.br<br>
    <span class="unsubscribe">Você recebe este e-mail pois manifestou interesse em nossos serviços.<br>Para não receber mais, responda "REMOVER" para este endereço.</span>
  </div>
</div>
</body></html>`;
}

const TEMPLATES: Record<string, EmailTemplate> = {

  /** Disparado ao mover para "1º Contato" */
  primeiro_contato: {
    subject: "Redução de custos com estágio? Veja como a Smarter pode ajudar {{empresa}}",
    html: (p) => base(
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! Vamos apresentar a Smarter?`,
      `
      <p>Obrigado pelo interesse da <strong>${p.empresa}</strong> em nossos serviços de gestão de estágios. Somos a <strong>Smarter Estágios</strong> — a agência de integração que cuida de todo o processo para sua empresa, do recrutamento ao encerramento, com total conformidade com a <strong>Lei 11.788/2008</strong>.</p>

      <div class="box">
        <div class="box-title">Por que contratar estagiários com a Smarter?</div>
        <div class="check"><span class="icon">💰</span><span><strong>Custo até 70% menor</strong> que um funcionário CLT. Sem FGTS, sem 13°, sem aviso prévio.</span></div>
        <div class="check"><span class="icon">📋</span><span><strong>Zero burocracia</strong> — TCE, documentação, renovações e rescisões 100% gerenciados por nós.</span></div>
        <div class="check"><span class="icon">🎓</span><span><strong>Talento personalizado</strong> — selecionamos candidatos do perfil exato que sua empresa precisa.</span></div>
        <div class="check"><span class="icon">⚖️</span><span><strong>Conformidade garantida</strong> — suporte jurídico e administrativo incluso no serviço.</span></div>
        <div class="check"><span class="icon">🤝</span><span><strong>Rede de +200 instituições</strong> parceiras em todo o Brasil para captação de talentos.</span></div>
      </div>

      <p>Podemos agendar uma conversa rápida de 20 minutos para entender as necessidades da <strong>${p.empresa}</strong> e mostrar como funciona na prática?</p>

      <div style="text-align:center">
        <a href="https://wa.me/5511999999999?text=Olá!+Tenho+interesse+em+conhecer+a+Smarter+Estágios" class="btn">💬 Falar com especialista →</a>
      </div>
      `
    ),
  },

  /** Disparado ao mover para "Apresentação / Reunião Agendada" */
  apresentacao: {
    subject: "{{empresa}} — 5 números que toda empresa precisa conhecer antes da reunião",
    html: (p) => base(
      `Antes da nossa reunião — dados que vão te surpreender`,
      `
      <p>Olá${p.contato ? `, <strong>${p.contato.split(" ")[0]}</strong>` : ""}! Nossa reunião está confirmada e queremos que você chegue com o máximo de contexto.</p>

      <p>Separamos alguns números do mercado de estágio que mostram o potencial estratégico que a <strong>${p.empresa}</strong> tem ao estruturar um programa com a Smarter:</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0">
        <div class="highlight" style="flex:1;min-width:120px">
          <div class="hl-num">70%</div>
          <div class="hl-txt">de redução de custo vs. CLT</div>
        </div>
        <div class="highlight" style="flex:1;min-width:120px">
          <div class="hl-num">48h</div>
          <div class="hl-txt">tempo médio para indicar candidatos</div>
        </div>
        <div class="highlight" style="flex:1;min-width:120px">
          <div class="hl-num">93%</div>
          <div class="hl-txt">de satisfação das empresas parceiras</div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">O que vamos apresentar na reunião</div>
        <div class="check"><span class="icon">📊</span><span>Cálculo real de economia para o porte da <strong>${p.empresa}</strong></span></div>
        <div class="check"><span class="icon">🎯</span><span>Perfis disponíveis${p.setor ? ` na área de <strong>${p.setor}</strong>` : " na sua área de atuação"}</span></div>
        <div class="check"><span class="icon">📄</span><span>Como funciona o processo completo — recrutamento, documentação e acompanhamento</span></div>
        <div class="check"><span class="icon">💡</span><span>Cases de empresas similares à sua que já usam a Smarter</span></div>
      </div>

      <p style="font-size:13px;color:#64748b">Qualquer dúvida antes da reunião, estamos à disposição. Até breve!</p>
      `
    ),
  },

  /** Disparado ao mover para "Proposta Enviada" */
  proposta: {
    subject: "Proposta Smarter para {{empresa}} — Veja os detalhes",
    html: (p) => base(
      `Proposta personalizada para a ${p.empresa}`,
      `
      <p>Olá${p.contato ? `, <strong>${p.contato.split(" ")[0]}</strong>` : ""}! Conforme combinado, enviamos a proposta comercial da Smarter Estágios para a <strong>${p.empresa}</strong>.</p>

      <div class="box" style="border-left:4px solid #f5c400">
        <div class="box-title">O que está incluso no serviço Smarter</div>
        <div class="check"><span class="icon">✅</span><span><strong>Recrutamento e seleção</strong> de estagiários com DISC comportamental</span></div>
        <div class="check"><span class="icon">✅</span><span><strong>TCE digital</strong> com assinatura eletrônica — IES, empresa, estagiário e Smarter</span></div>
        <div class="check"><span class="icon">✅</span><span><strong>Gestão completa</strong> — rescisões, renovações, recibos, avaliações semestrais</span></div>
        <div class="check"><span class="icon">✅</span><span><strong>Suporte jurídico</strong> para qualquer dúvida sobre a Lei 11.788/2008</span></div>
        <div class="check"><span class="icon">✅</span><span><strong>Portal empresa</strong> — acompanhe seus estagiários em tempo real</span></div>
        <div class="check"><span class="icon">✅</span><span><strong>Seguro de vida</strong> obrigatório incluso</span></div>
      </div>

      <p>Ficou com alguma dúvida sobre os valores ou condições? Podemos adaptar a proposta à realidade da <strong>${p.empresa}</strong>. Responda este e-mail ou nos chame no WhatsApp.</p>

      <div style="text-align:center">
        <a href="https://wa.me/5511999999999?text=Quero+tirar+uma+dúvida+sobre+a+proposta+da+Smarter" class="btn">📩 Tirar dúvida sobre a proposta →</a>
      </div>
      `
    ),
  },

  /** Disparado ao mover para "Em Negociação" */
  negociacao: {
    subject: "{{empresa}} — Como outras empresas decidiram pela Smarter (casos reais)",
    html: (p) => base(
      `Cases reais — empresas que transformaram seu programa de estágio`,
      `
      <p>Olá${p.contato ? `, <strong>${p.contato.split(" ")[0]}</strong>` : ""}! Sabemos que a decisão de parceiros estratégicos exige cuidado. Por isso, compartilhamos como empresas parecidas com a <strong>${p.empresa}</strong> evoluíram seu programa de estágio com a Smarter.</p>

      <div class="box">
        <div class="box-title">🏢 Empresa do setor${p.setor ? ` de ${p.setor}` : " Industrial"} — SP</div>
        <p style="font-size:13px;font-style:italic;color:#374151;margin:0">"Antes perdíamos horas com papelada e conformidade. Com a Smarter, em 48h tínhamos o TCE assinado e o estagiário na função. O custo caiu 65% em relação ao que pagávamos com uma agência de emprego."</p>
        <p style="font-size:11px;color:#94a3b8;margin:8px 0 0">— Diretora de RH, empresa com 120 funcionários</p>
      </div>

      <div class="box">
        <div class="box-title">🏢 Empresa de Tecnologia — RJ</div>
        <p style="font-size:13px;font-style:italic;color:#374151;margin:0">"A seleção com DISC foi diferencial. Recebemos candidatos alinhados ao nosso perfil técnico. Dos 4 estagiários contratados nos últimos 2 anos, 3 viraram colaboradores efetivos."</p>
        <p style="font-size:11px;color:#94a3b8;margin:8px 0 0">— Gerente de Operações, startup de 35 pessoas</p>
      </div>

      <div class="highlight">
        <div class="hl-num" style="font-size:20px">Sua empresa merece o mesmo resultado.</div>
        <div class="hl-txt" style="margin-top:8px;font-size:13px">Estamos prontos para fechar as condições finais. Que tal uma conversa rápida esta semana?</div>
      </div>

      <div style="text-align:center">
        <a href="https://wa.me/5511999999999?text=Quero+avançar+com+a+proposta+Smarter" class="btn">🤝 Fechar com a Smarter →</a>
      </div>
      `
    ),
  },

  /** Disparado ao marcar como Vendido */
  fechado: {
    subject: "Bem-vindo(a) à família Smarter, {{empresa}}! Próximos passos",
    html: (p) => base(
      `Parceria confirmada! Vamos começar? 🎉`,
      `
      <p>Olá${p.contato ? `, <strong>${p.contato.split(" ")[0]}</strong>` : ""}! É com muito prazer que damos as boas-vindas à <strong>${p.empresa}</strong> como empresa parceira da <strong>Smarter Estágios</strong>!</p>

      <div class="box" style="border-left:4px solid #10b981">
        <div class="box-title">✅ Próximos passos</div>
        <div class="check"><span class="icon">1.</span><span>Assinatura do Contrato de Parceria (enviaremos em breve)</span></div>
        <div class="check"><span class="icon">2.</span><span>Cadastro da empresa no portal Smarter (acesso em até 24h)</span></div>
        <div class="check"><span class="icon">3.</span><span>Briefing da vaga: definição do perfil do estagiário ideal</span></div>
        <div class="check"><span class="icon">4.</span><span>Início da seleção — candidatos em até 5 dias úteis</span></div>
      </div>

      <p>A partir de agora, nossa equipe é sua equipe. Qualquer dúvida, pode nos acionar diretamente pelo WhatsApp ou e-mail. Faremos de tudo para que esta seja uma parceria longa e muito produtiva!</p>

      <div style="text-align:center">
        <a href="https://wa.me/5511999999999?text=Olá+Smarter!+Sou+da+${encodeURIComponent(p.empresa)}+e+quero+iniciar+o+processo" class="btn">📱 Falar com meu consultor →</a>
      </div>
      `
    ),
  },
};

export function getEmailTemplate(etapa: string): EmailTemplate | null {
  return TEMPLATES[etapa] || null;
}

/** Resolve variável {{empresa}} no subject */
export function resolveSubject(template: EmailTemplate, empresa: string): string {
  return template.subject.replace(/\{\{empresa\}\}/g, empresa);
}
