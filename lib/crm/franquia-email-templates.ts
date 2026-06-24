/**
 * CRM de Franquias — Templates de e-mail para venda de unidades Smarter
 *
 * Dados de mercado reais utilizados nos templates:
 *   - 877 mil estagiários em 2024 (crescimento de 37% vs. 2023) — Fonte: MTE/ABRES
 *   - 20,1 milhões de estudantes elegíveis → apenas 4,5% em estágio → enorme mercado
 *   - Setor de franquias educacionais: R$15,5 bilhões (crescimento 9% em 2024) — Fonte: ABF
 *   - Mercado total de franquias BR: R$301,7 bilhões, 200 mil unidades ativas — Fonte: ABF 2025
 *   - Taxa de franquia Smarter: R$6.000 (Projeto Expansão) / R$17.000 normal
 *   - ROI estimado: ~4 meses
 *
 * Templates disponíveis (por etapa ou manual):
 *   apresentacao_negocio | follow_up | proposta_financeira | boas_vindas | reaquecimento
 */

export interface FranquiaEmailTemplate {
  subject: string;
  html: (p: {
    nome: string;
    cidade?: string | null;
    estado?: string | null;
  }) => string;
}

const APP_URL = "https://sistema.smarterestagios.com.br";
const WHATSAPP  = "https://wa.me/5521977188527";

function base(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,#0f2a5e,#1e40af);padding:28px 32px;text-align:center}
  .brand{color:white;font-weight:900;font-size:22px;letter-spacing:-0.5px}
  .sub{color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px}
  .badge{display:inline-block;background:#f5c400;color:#0f2a5e;font-weight:900;font-size:11px;padding:4px 12px;border-radius:100px;margin-top:8px;letter-spacing:.5px}
  .body{padding:32px}
  .title{font-size:22px;font-weight:900;color:#0f2a5e;margin-bottom:8px;line-height:1.3}
  .divider{height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:16px 0}
  p{color:#475569;font-size:14px;line-height:1.8;margin:0 0 12px}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:16px 0}
  .box-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  .check{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;font-size:13px;color:#374151}
  .icon{flex-shrink:0;margin-top:1px}
  .btn{display:inline-block;background:linear-gradient(135deg,#0f2a5e,#1e40af);color:white!important;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px}
  .btn-wa{display:inline-block;background:#25d366;color:white!important;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;margin-left:8px}
  .numbers{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
  .num-box{flex:1;min-width:110px;background:linear-gradient(135deg,#0f2a5e,#1e40af);border-radius:12px;padding:16px;text-align:center;color:white}
  .num-val{font-size:28px;font-weight:900;color:#f5c400;display:block}
  .num-lbl{font-size:11px;color:rgba(255,255,255,0.8);margin-top:4px;display:block;line-height:1.3}
  .roi-box{background:linear-gradient(135deg,#065f46,#047857);border-radius:12px;padding:20px 24px;margin:16px 0;text-align:center;color:white}
  .roi-val{font-size:40px;font-weight:900;color:#6ee7b7}
  .roi-lbl{font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px}
  .quote{border-left:4px solid #f5c400;background:#fefce8;padding:14px 16px;margin:16px 0;border-radius:0 8px 8px 0}
  .quote p{font-style:italic;color:#374151;font-size:13px;margin:0}
  .quote small{color:#94a3b8;font-size:11px;margin-top:6px;display:block}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .unsubscribe{font-size:10px;color:#cbd5e1;margin-top:6px}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="brand">Smarter Estágios</div>
    <div class="sub">Rede de Franquias — Formação Profissional</div>
    <div class="badge">🏢 Oportunidade de Franquia</div>
  </div>
  <div class="body">
    <div class="title">${titulo}</div>
    <div class="divider"></div>
    ${corpo}
  </div>
  <div class="footer">
    Smarter Estágios — franquias@smarterestagios.com.br<br>
    <span class="unsubscribe">Você recebe este e-mail pois demonstrou interesse em empreender com a Smarter.<br>Para não receber mais, responda "REMOVER" para este endereço.</span>
  </div>
</div>
</body></html>`;
}

const TEMPLATES: Record<string, FranquiaEmailTemplate> = {

  /** Apresentação inicial da Smarter + mercado */
  apresentacao_negocio: {
    subject: "{{nome}}, conheça a Smarter — o mercado de R$ 15 bilhões que você ainda pode explorar",
    html: (p) => base(
      `${p.nome ? p.nome.split(" ")[0] + ", " : ""}você já ouviu falar no mercado de estágios?`,
      `
      <p>Olá, <strong>${p.nome.split(" ")[0]}</strong>! Meu nome é ${p.cidade ? `e ficamos felizes em saber que você está em <strong>${p.cidade}/${p.estado}</strong>, ` : ""}estamos em expansão pelo Brasil e acreditamos que você pode ser o próximo empreendedor de sucesso da rede Smarter.</p>

      <p>A <strong>Smarter Estágios</strong> é uma <strong>agência de integração de estágios</strong> que conecta estudantes universitários e técnicos com empresas que precisam de talentos qualificados, com total suporte administrativo e jurídico.</p>

      <div class="box" style="border-left:4px solid #f5c400">
        <div class="box-title">📊 O Mercado que Ninguém Está Explorando</div>
        <div class="check"><span class="icon">📈</span><span><strong>877 mil estagiários ativos em 2024</strong>, crescimento de 37% em um único ano (Fonte: Ministério do Trabalho)</span></div>
        <div class="check"><span class="icon">🎓</span><span><strong>20 milhões de estudantes elegíveis</strong> no Brasil — apenas 4,5% está em estágio. Espaço enorme para crescer.</span></div>
        <div class="check"><span class="icon">💼</span><span><strong>Mercado de franquias educacionais:</strong> R$ 15,5 bilhões com crescimento de 9% em 2024 (Fonte: ABF)</span></div>
        <div class="check"><span class="icon">🏢</span><span>Setor de franquias total: <strong>R$ 301,7 bilhões e 200 mil unidades ativas</strong> em todo o Brasil</span></div>
      </div>

      <div class="numbers">
        <div class="num-box">
          <span class="num-val">37%</span>
          <span class="num-lbl">crescimento do mercado de estágios em 2024</span>
        </div>
        <div class="num-box">
          <span class="num-val">20M</span>
          <span class="num-lbl">estudantes elegíveis sem oportunidade de estágio</span>
        </div>
        <div class="num-box">
          <span class="num-val">R$15bi</span>
          <span class="num-lbl">mercado de franquias educacionais no Brasil</span>
        </div>
      </div>

      <div class="box">
        <div class="box-title">🚀 Por que a Smarter é diferente</div>
        <div class="check"><span class="icon">⚡</span><span><strong>Tecnologia própria</strong> — plataforma completa de gestão de estágios, da seleção ao encerramento do contrato</span></div>
        <div class="check"><span class="icon">📋</span><span><strong>Produto 100% regulamentado</strong> pela Lei do Estágio 11.788/2008 — toda empresa com ≥ 1 funcionário pode contratar</span></div>
        <div class="check"><span class="icon">🤝</span><span><strong>Mercado recorrente</strong> — contratos se renovam e empresas voltam a contratar todo semestre</span></div>
        <div class="check"><span class="icon">📱</span><span><strong>Suporte completo</strong> — treinamento, materiais, back-office e equipe nacional à sua disposição</span></div>
      </div>

      <p>Posso te apresentar tudo com mais detalhes. Que tal uma conversa de 20 minutos esta semana?</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Olá!+Tenho+interesse+em+conhecer+a+franquia+Smarter" class="btn-wa">💬 Conversar no WhatsApp</a>
        <br><br>
        <a href="mailto:franquias@smarterestagios.com.br?subject=Quero+saber+mais+sobre+a+franquia+Smarter" class="btn">📧 Responder por E-mail</a>
      </div>
      `
    ),
  },

  /** Follow-up após apresentação — números do ROI */
  follow_up: {
    subject: "{{nome}}, o que acontece com quem investe na Smarter em 4 meses?",
    html: (p) => base(
      `${p.nome.split(" ")[0]}, você viu os números do nosso negócio?`,
      `
      <p>Olá, <strong>${p.nome.split(" ")[0]}</strong>! Quero compartilhar algo que tenho certeza vai te interessar: o tempo de retorno de investimento de quem abriu uma unidade Smarter.</p>

      <div class="roi-box">
        <div class="roi-val">4 meses</div>
        <div class="roi-lbl">Tempo médio estimado para recuperar o investimento inicial</div>
      </div>

      <div class="box">
        <div class="box-title">💰 Investimento no Projeto Expansão</div>
        <div class="check"><span class="icon">✅</span><span><strong>Taxa de franquia: R$ 6.000</strong> (Projeto Expansão — vagas limitadas)</span></div>
        <div class="check"><span class="icon">✅</span><span>Plataforma tecnológica completa inclusa — sem custo adicional</span></div>
        <div class="check"><span class="icon">✅</span><span>Treinamento online e suporte contínuo da franqueadora</span></div>
        <div class="check"><span class="icon">✅</span><span>Cartela inicial de prospecção + materiais comerciais</span></div>
        <div class="check"><span class="icon">✅</span><span>Não exige ponto físico para começar — modelo home/office</span></div>
      </div>

      <div class="box" style="border-left:4px solid #10b981">
        <div class="box-title">📊 Como funciona a receita</div>
        <div class="check"><span class="icon">💵</span><span>Você cobra uma <strong>taxa de gestão mensal</strong> de cada empresa parceira por estagiário ativo</span></div>
        <div class="check"><span class="icon">♻️</span><span>Receita <strong>recorrente</strong> — contratos de estágio duram 6 a 24 meses e são renovados</span></div>
        <div class="check"><span class="icon">📈</span><span>Quanto mais empresas você atende, maior o faturamento — modelo escalável</span></div>
      </div>

      <div class="numbers">
        <div class="num-box">
          <span class="num-val">R$6k</span>
          <span class="num-lbl">investimento inicial (Projeto Expansão)</span>
        </div>
        <div class="num-box">
          <span class="num-val">4 meses</span>
          <span class="num-lbl">retorno estimado do investimento</span>
        </div>
        <div class="num-box">
          <span class="num-val">∞</span>
          <span class="num-lbl">escalabilidade — sem limite de estagiários por unidade</span>
        </div>
      </div>

      <p>Tem alguma dúvida sobre o modelo financeiro? Podemos detalhar a projeção de receita para ${p.cidade ? `a região de <strong>${p.cidade}</strong>` : "a sua cidade"} especificamente.</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Quero+entender+melhor+o+modelo+financeiro+da+Smarter" class="btn-wa">💬 Falar sobre os números</a>
      </div>
      `
    ),
  },

  /** Proposta formal enviada */
  proposta_financeira: {
    subject: "{{nome}} — Proposta oficial Smarter Estágios + próximos passos",
    html: (p) => base(
      `${p.nome.split(" ")[0]}, sua proposta está pronta!`,
      `
      <p>Olá, <strong>${p.nome.split(" ")[0]}</strong>! Seguindo nossa conversa, formalizamos a proposta para a abertura de sua unidade Smarter${p.cidade ? ` em <strong>${p.cidade}/${p.estado}</strong>` : ""}.</p>

      <div class="box" style="border-left:4px solid #f5c400">
        <div class="box-title">📋 Resumo da Proposta — Projeto Expansão Smarter</div>
        <div class="check"><span class="icon">🏷️</span><span><strong>Taxa de Franquia:</strong> R$ 6.000 (Projeto Expansão — condição especial)</span></div>
        <div class="check"><span class="icon">📱</span><span><strong>Plataforma tecnológica:</strong> acesso completo — gestão de estagiários, TCE digital, portal empresa</span></div>
        <div class="check"><span class="icon">🎓</span><span><strong>Treinamento inicial:</strong> capacitação completa em operações, vendas e gestão da unidade</span></div>
        <div class="check"><span class="icon">📣</span><span><strong>Materiais de prospecção:</strong> kit comercial, apresentações, scripts de vendas</span></div>
        <div class="check"><span class="icon">🤝</span><span><strong>Suporte da franqueadora:</strong> time nacional à disposição por WhatsApp e reuniões semanais</span></div>
        <div class="check"><span class="icon">🌎</span><span><strong>Território de atuação:</strong> exclusividade por região (a definir conforme localização)</span></div>
      </div>

      <div class="roi-box">
        <div class="roi-val">~4 meses</div>
        <div class="roi-lbl">Retorno estimado sobre o investimento inicial de R$ 6.000</div>
      </div>

      <div class="box">
        <div class="box-title">📅 Próximos Passos para Fechar</div>
        <div class="check"><span class="icon">1️⃣</span><span>Aprovação da proposta — responda este e-mail ou fale no WhatsApp</span></div>
        <div class="check"><span class="icon">2️⃣</span><span>Assinatura do contrato de franquia (enviamos por e-sign)</span></div>
        <div class="check"><span class="icon">3️⃣</span><span>Pagamento da taxa de franquia</span></div>
        <div class="check"><span class="icon">4️⃣</span><span>Início do treinamento e onboarding — você estará operacional em dias</span></div>
      </div>

      <p>Tem alguma dúvida sobre os termos? Podemos ajustar qualquer detalhe. Não deixe essa oportunidade passar — as vagas do Projeto Expansão são limitadas.</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Quero+aprovar+a+proposta+Smarter+e+seguir+com+a+assinatura" class="btn-wa">✅ Aprovar proposta no WhatsApp</a>
        <br><br>
        <a href="mailto:franquias@smarterestagios.com.br?subject=Aprovação+da+proposta+de+franquia" class="btn">📧 Aprovar por e-mail</a>
      </div>
      `
    ),
  },

  /** Boas-vindas ao fechar a franquia */
  boas_vindas: {
    subject: "Bem-vindo(a) à rede Smarter, {{nome}}! Você é nosso novo franqueado 🎉",
    html: (p) => base(
      `${p.nome.split(" ")[0]}, seja bem-vindo(a) à família Smarter! 🎉`,
      `
      <p>É com enorme satisfação que damos as boas-vindas a <strong>${p.nome}</strong> como novo(a) franqueado(a) da rede <strong>Smarter Estágios</strong>${p.cidade ? ` em <strong>${p.cidade}/${p.estado}</strong>` : ""}!</p>

      <div class="box" style="border-left:4px solid #10b981">
        <div class="box-title">✅ O que acontece agora</div>
        <div class="check"><span class="icon">1️⃣</span><span>Você receberá o acesso à plataforma Smarter em até 24 horas</span></div>
        <div class="check"><span class="icon">2️⃣</span><span>Nosso time entrará em contato para agendar o <strong>treinamento de onboarding</strong></span></div>
        <div class="check"><span class="icon">3️⃣</span><span>Você receberá os materiais comerciais e kit de prospecção</span></div>
        <div class="check"><span class="icon">4️⃣</span><span>Será incluído no grupo de <strong>franqueados da rede</strong> para suporte e trocas</span></div>
        <div class="check"><span class="icon">5️⃣</span><span>Em poucos dias, você estará pronto(a) para prospectar suas primeiras empresas parceiras</span></div>
      </div>

      <div class="roi-box">
        <div class="roi-val">Você fez a escolha certa.</div>
        <div class="roi-lbl">O mercado de estágios cresce 37% ao ano. Sua unidade está no lugar certo, na hora certa.</div>
      </div>

      <p>Qualquer dúvida durante o processo, estamos sempre aqui. Juntos, vamos transformar o mercado de formação profissional no Brasil.</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Olá!+Sou+${encodeURIComponent(p.nome)}+e+acabei+de+assinar+como+franqueado+Smarter!" class="btn-wa">📱 Falar com meu consultor</a>
      </div>
      `
    ),
  },

  // ─── TEMPLATES DE REAQUECIMENTO DE LEADS FRIOS ────────────────────────────

  /** Reaquecimento — Lead sem resposta há mais de 30 dias */
  reaquecimento_30d: {
    subject: "{{nome}}, algo mudou desde a nossa última conversa sobre a Smarter",
    html: (p) => base(
      `${p.nome.split(" ")[0]}, ainda pensa em empreender?`,
      `
      <p>Olá, <strong>${p.nome.split(" ")[0]}</strong>! Faz um tempo que não nos falamos — mas acreditamos que o momento certo para empreender pode ser diferente para cada pessoa.</p>

      <p>Quero compartilhar o que aconteceu no mercado de estágios desde então:</p>

      <div class="box" style="border-left:4px solid #f5c400">
        <div class="box-title">📈 O mercado não parou de crescer</div>
        <div class="check"><span class="icon">🚀</span><span>O mercado de estágios <strong>cresceu 37% em 2024</strong> e segue em expansão em 2025</span></div>
        <div class="check"><span class="icon">🎓</span><span>Mais de <strong>20 milhões de estudantes elegíveis</strong> ainda sem acesso a oportunidades de estágio</span></div>
        <div class="check"><span class="icon">🏢</span><span>Setor de franquias educacionais bateu <strong>R$ 15,5 bilhões</strong> em 2024, crescimento de 9%</span></div>
        <div class="check"><span class="icon">⏰</span><span>As <strong>vagas do Projeto Expansão</strong> (R$ 6.000 de investimento) ainda estão disponíveis — mas são limitadas</span></div>
      </div>

      <p>Se antes o momento não era ideal, talvez agora seja diferente. Posso te atualizar em uma conversa rápida de 15 minutos?</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Olá!+Estava+pensando+na+Smarter+e+quero+retomar+a+conversa" class="btn-wa">💬 Retomar no WhatsApp</a>
      </div>
      `
    ),
  },

  /** Reaquecimento — Lead frio com mais de 6 meses */
  reaquecimento_frio: {
    subject: "{{nome}}, você sabia que o mercado de estágios cresceu 37% em 2024?",
    html: (p) => base(
      `${p.nome.split(" ")[0]}, o mercado que você quase aproveitou está maior do que nunca`,
      `
      <p>Olá, <strong>${p.nome.split(" ")[0]}</strong>! Passamos algum tempo sem nos falar, mas o mercado em que a Smarter atua não parou.</p>

      <p>Tomei a liberdade de te enviar uma atualização porque acredito genuinamente que <strong>agora pode ser o melhor momento para começar</strong>.</p>

      <div class="numbers">
        <div class="num-box">
          <span class="num-val">877k</span>
          <span class="num-lbl">estagiários ativos em 2024 — recorde histórico</span>
        </div>
        <div class="num-box">
          <span class="num-val">+37%</span>
          <span class="num-lbl">crescimento do mercado em um único ano</span>
        </div>
        <div class="num-box">
          <span class="num-val">4 meses</span>
          <span class="num-lbl">retorno estimado do seu investimento</span>
        </div>
      </div>

      <div class="box">
        <div class="box-title">🔑 O que mudou desde a nossa última conversa</div>
        <div class="check"><span class="icon">✅</span><span>Nossa plataforma ganhou novos módulos — seleção por DISC, portal empresa, TCE digital</span></div>
        <div class="check"><span class="icon">✅</span><span>Mais de 200 mil empresas no Brasil ainda não têm estagiários — mercado local inexplorado</span></div>
        <div class="check"><span class="icon">✅</span><span>O <strong>Projeto Expansão</strong> com taxa de R$ 6.000 segue disponível por tempo limitado</span></div>
      </div>

      <div class="quote">
        <p>"Comecei com zero clientes. Em 4 meses já tinha 8 empresas ativas e o investimento estava recuperado. O suporte da franqueadora foi fundamental."</p>
        <small>— Franqueado Smarter, interior de SP</small>
      </div>

      <p>Se antes havia alguma dúvida ou impedimento, adoraria entender o que mudou. Uma conversa rápida não te compromete em nada.</p>

      <div style="text-align:center">
        <a href="${WHATSAPP}?text=Olá!+Vi+seu+e-mail+e+quero+retomar+a+conversa+sobre+a+franquia+Smarter" class="btn-wa">💬 Quero conversar</a>
        <br><br>
        <a href="mailto:franquias@smarterestagios.com.br?subject=Retomando+conversa+sobre+franquia+Smarter" class="btn">📧 Responder por e-mail</a>
      </div>
      `
    ),
  },

};

export function getFranquiaEmailTemplate(templateKey: string): FranquiaEmailTemplate | null {
  return TEMPLATES[templateKey] || null;
}

/** Resolve {{nome}} no subject */
export function resolveFranquiaSubject(template: FranquiaEmailTemplate, nome: string): string {
  return template.subject.replace(/\{\{nome\}\}/g, nome.split(" ")[0]);
}

/** Lista todos os templates disponíveis */
export const FRANQUIA_EMAIL_TEMPLATES_LIST = [
  { key: "apresentacao_negocio", label: "Apresentação da Smarter + Mercado",       desc: "Apresentação inicial com dados reais do mercado de estágios" },
  { key: "follow_up",            label: "Follow-up — ROI e Investimento",           desc: "Detalhes financeiros: R$6k investimento, retorno em 4 meses" },
  { key: "proposta_financeira",  label: "Proposta Formal",                          desc: "Proposta oficial com todos os itens inclusos e próximos passos" },
  { key: "boas_vindas",          label: "Boas-vindas ao Franqueado",                desc: "E-mail de boas-vindas após assinatura do contrato" },
  { key: "reaquecimento_30d",    label: "🧊 Reaquecimento — 30 dias sem resposta",  desc: "Para leads que pararam de responder recentemente" },
  { key: "reaquecimento_frio",   label: "🧊 Reaquecimento — Lead Frio (+6 meses)", desc: "Para leads antigos captados de tráfego pago ou eventos" },
];
