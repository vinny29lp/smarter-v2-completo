import { DOC_CSS } from "./templates";

interface DiscProfile {
  resultado: string;
  grafico?: any;
  nome?: string;
  curso?: string;
  dataTeste?: string;
}

const DISC_DATA: Record<string, {
  titulo: string; cor: string; icone: string;
  descricao: string;
  caracteristicas: string[];
  pontosFortes: string[];
  pontosMelhoria: string[];
  comunicacao: string;
  lideranca: string;
  trabalhoEquipe: string;
  sobPressao: string;
  ambienteIdeal: string;
  sugestoes: string[];
  motivadores: string;
  estiloLideranca: string;
  carreiras: string;
}> = {
  D: {
    titulo: "Dominante",
    cor: "#dc2626",
    icone: "🔥",
    descricao: "Pessoas com perfil Dominante são orientadas a resultados, diretas e determinadas. Preferem desafios, agem com rapidez e assumem o controle das situações.",
    caracteristicas: [
      "Orientado a resultados e conquistas",
      "Toma decisões rápidas e diretas",
      "Autoconfiante e assertivo",
      "Gosta de desafios e competição",
      "Prefere comunicação direta e objetiva",
      "Alta energia e disposição para agir",
    ],
    pontosFortes: [
      "Excelente capacidade de liderança e tomada de decisão",
      "Focado em resultados e metas concretas",
      "Determinado e persistente diante de obstáculos",
      "Capaz de motivar equipes em momentos de crise",
      "Eficiente em situações que exigem ação rápida",
    ],
    pontosMelhoria: [
      "Pode parecer impaciente ou dominador com outros",
      "Tende a não ouvir opiniões antes de decidir",
      "Pode desconsiderar sentimentos da equipe",
      "Dificuldade em delegar tarefas importantes",
      "Pode assumir riscos desnecessários",
    ],
    comunicacao: "Seja direto, objetivo e focado em resultados. Evite detalhes desnecessários. Mostre o impacto prático das ideias e respeite o tempo dele.",
    lideranca: "Lidera pelo exemplo e pela assertividade. Prefere equipes autônomas que entregam resultados. Necessita aprender a ouvir e incluir a equipe nas decisões.",
    estiloLideranca: "Líder orientado a resultados — define metas arrojadas, age com decisão e cobra entregas. Melhor em ambientes de alta performance onde velocidade e resultado são prioridade.",
    trabalhoEquipe: "Pode ser um motor poderoso para a equipe, mas precisa desenvolver a escuta ativa e a empatia para criar um ambiente colaborativo.",
    sobPressao: "Geralmente se mantém focado e torna-se ainda mais determinado. Pode se tornar mais impaciente e controlador. Funciona melhor com metas claras.",
    ambienteIdeal: "Ambientes desafiadores, com autonomia para tomar decisões, metas desafiadoras, reconhecimento por resultados e oportunidades de liderança.",
    sugestoes: [
      "Pratique a escuta ativa antes de tomar decisões",
      "Desenvolva a empatia para entender o impacto de suas ações nos outros",
      "Aprenda a delegar com confiança",
      "Busque feedback da equipe regularmente",
      "Invista em inteligência emocional",
    ],
    motivadores: "Poder e autoridade · Desafios e competição · Liberdade para agir · Resultados mensuráveis · Reconhecimento por conquistas · Autonomia e independência",
    carreiras: "Empreendedorismo · Gestão Executiva · Vendas de Alto Nível · Advocacia · Medicina (cirurgia/emergência) · Engenharia de Projetos · Militarismo · Consultoria Estratégica · Direito Empresarial",
  },
  I: {
    titulo: "Influente",
    cor: "#f59e0b",
    icone: "⭐",
    descricao: "Pessoas com perfil Influente são entusiastas, comunicativas e inspiradoras. Destacam-se pela energia positiva, criatividade e capacidade de persuadir.",
    caracteristicas: [
      "Extremamente comunicativo e sociável",
      "Entusiasta e otimista por natureza",
      "Criativo e cheio de ideias",
      "Persuasivo e inspirador",
      "Orientado a pessoas e relacionamentos",
      "Gosta de reconhecimento e aprovação social",
    ],
    pontosFortes: [
      "Habilidade excepcional de comunicação e persuasão",
      "Facilidade para criar relacionamentos e redes",
      "Capacidade de motivar e engajar equipes",
      "Criatividade e pensamento inovador",
      "Adaptabilidade e flexibilidade em situações novas",
    ],
    pontosMelhoria: [
      "Pode ser desorganizado e perder foco em detalhes",
      "Tende a prometer mais do que pode cumprir",
      "Dificuldade em lidar com rotinas e tarefas repetitivas",
      "Pode tomar decisões impulsivas baseadas em emoções",
      "Precisa de aprovação externa para se motivar",
    ],
    comunicacao: "Use linguagem animada e envolvente. Reconheça suas contribuições, valorize as ideias e crie um ambiente de diálogo aberto e positivo.",
    lideranca: "Lidera pela inspiração e pelo entusiasmo. Cria um clima organizacional positivo. Necessita desenvolver foco em execução e acompanhamento de resultados.",
    estiloLideranca: "Líder inspirador e motivacional — contagia a equipe com entusiasmo, facilita a comunicação e cria um ambiente positivo. Melhor em contextos que valorizam criatividade e engajamento de pessoas.",
    trabalhoEquipe: "É o coração da equipe — motiva, conecta pessoas e cria um ambiente agradável. Precisa de apoio para manter o foco e cumprir prazos.",
    sobPressao: "Pode perder o foco e buscar escapar da situação. Precisa de suporte emocional e reconhecimento para se recompor rapidamente.",
    ambienteIdeal: "Ambientes dinâmicos, com liberdade para criar, interagir com pessoas, projetos variados, reconhecimento público e oportunidades de apresentação.",
    sugestoes: [
      "Desenvolva disciplina e organização pessoal",
      "Aprenda a priorizar e finalizar tarefas antes de iniciar novas",
      "Pratique o gerenciamento de compromissos assumidos",
      "Busque equilíbrio entre o entusiasmo e a análise de riscos",
      "Trabalhe a escuta ativa para além do prazer de falar",
    ],
    motivadores: "Reconhecimento social · Liberdade criativa · Interação com pessoas · Projetos variados e inovadores · Prestígio e aprovação · Ambiente descontraído e colaborativo",
    carreiras: "Marketing e Publicidade · Relações Públicas · Eventos e Entretenimento · Pedagogia e Educação · Jornalismo · Recursos Humanos · Vendas · Coaching · Comunicação Corporativa",
  },
  S: {
    titulo: "Estável",
    cor: "#10b981",
    icone: "🌿",
    descricao: "Pessoas com perfil Estável são pacientes, leais e colaborativas. Valorizam a harmonia, a estabilidade e o trabalho em equipe acima de tudo.",
    caracteristicas: [
      "Paciente, calmo e equilibrado",
      "Extremamente leal e comprometido",
      "Colaborativo e bom ouvinte",
      "Prefere ambientes previsíveis e estáveis",
      "Sensível aos sentimentos alheios",
      "Metódico e consistente no trabalho",
    ],
    pontosFortes: [
      "Confiabilidade e comprometimento excepcionais",
      "Habilidade natural para ouvir e mediar conflitos",
      "Consistência e estabilidade sob pressão",
      "Capacidade de criar ambientes harmoniosos",
      "Lealdade e dedicação à equipe e à organização",
    ],
    pontosMelhoria: [
      "Resistência a mudanças e situações novas",
      "Dificuldade em lidar com conflitos diretos",
      "Pode evitar dar feedbacks negativos necessários",
      "Tende a ser indeciso em situações de pressão",
      "Pode acumular tarefas por dificuldade de dizer não",
    ],
    comunicacao: "Seja paciente, gentil e demonstre respeito. Evite pressão excessiva ou mudanças abruptas. Dê tempo para processar informações e valorize a opinião.",
    lideranca: "Lidera pelo exemplo, pela consistência e pelo cuidado com as pessoas. Cria equipes unidas e estáveis. Necessita desenvolver assertividade e gestão de mudanças.",
    estiloLideranca: "Líder servidor e colaborativo — prioriza o bem-estar da equipe, resolve conflitos com empatia e mantém o ambiente estável. Melhor em contextos que exigem continuidade e coesão de grupo.",
    trabalhoEquipe: "É o pilar da equipe — confiável, dedicado e sempre disposto a ajudar. Precisa aprender a se posicionar e expressar suas próprias necessidades.",
    sobPressao: "Tende a internalizar o estresse e manter a calma externamente. Pode precisar de tempo extra para processar e adaptar-se. Precisa de suporte e clareza.",
    ambienteIdeal: "Ambientes estáveis, com equipes coesas, processos claros, relacionamentos saudáveis, reconhecimento pela dedicação e segurança no trabalho.",
    sugestoes: [
      "Desenvolva assertividade para comunicar suas necessidades",
      "Pratique dizer não quando necessário",
      "Trabalhe a abertura para mudanças e inovação",
      "Busque feedbacks construtivos para crescimento",
      "Desenvolva confiança para tomar iniciativas e decisões",
    ],
    motivadores: "Harmonia e estabilidade · Segurança no trabalho · Reconhecimento pela dedicação · Relacionamentos saudáveis · Rotinas previsíveis · Trabalho em equipe coeso",
    carreiras: "Psicologia · Enfermagem e Saúde · Assistência Social · Pedagogia · Recursos Humanos · Administração · Secretariado · Trabalho Voluntário · Serviço Público · Gestão de Pessoas",
  },
  C: {
    titulo: "Consciente",
    cor: "#3b82f6",
    icone: "🎯",
    descricao: "Pessoas com perfil Consciente são analíticas, precisas e orientadas a qualidade. Destacam-se pela excelência técnica, rigor e pensamento sistemático.",
    caracteristicas: [
      "Analítico e meticuloso nos detalhes",
      "Orientado a qualidade e excelência",
      "Pensamento sistemático e lógico",
      "Prefere fatos, dados e evidências",
      "Alta capacidade de planejamento",
      "Criterioso e cuidadoso nas decisões",
    ],
    pontosFortes: [
      "Excelência técnica e atenção aos detalhes",
      "Capacidade analítica e pensamento crítico",
      "Planejamento cuidadoso e execução precisa",
      "Alta qualidade na entrega de trabalhos",
      "Capacidade de identificar riscos e antecipar problemas",
    ],
    pontosMelhoria: [
      "Pode ser perfeccionista em excesso e paralisar decisões",
      "Dificuldade com ambiguidade e situações incertas",
      "Pode ser crítico demais consigo e com os outros",
      "Tende à análise excessiva antes de agir",
      "Pode ter dificuldade de se adaptar a mudanças rápidas",
    ],
    comunicacao: "Use dados, fatos e argumentos lógicos. Seja preciso e detalhado. Dê tempo para análise antes de exigir respostas. Evite pressão por decisões rápidas.",
    lideranca: "Lidera pela competência técnica e pelo rigor. Cria estruturas sólidas e processos eficientes. Necessita desenvolver flexibilidade e habilidades interpessoais.",
    estiloLideranca: "Líder técnico e sistemático — define processos claros, mantém altos padrões de qualidade e toma decisões baseadas em dados. Melhor em ambientes que exigem precisão, compliance e excelência técnica.",
    trabalhoEquipe: "Contribui com qualidade, análise e organização. Precisa desenvolver flexibilidade para aceitar soluções 'boas o suficiente' e valorizar perspectivas diferentes.",
    sobPressao: "Pode se tornar ainda mais perfeccionista e paralisar. Necessita de estrutura, clareza e tempo adequado. Funciona melhor com processos definidos.",
    ambienteIdeal: "Ambientes com processos claros, tarefas desafiantes intelectualmente, autonomia técnica, recursos para pesquisa e reconhecimento pela qualidade do trabalho.",
    sugestoes: [
      "Desenvolva a capacidade de tomar decisões com informações incompletas",
      "Pratique a flexibilidade e abertura a diferentes abordagens",
      "Trabalhe a comunicação interpessoal e empatia",
      "Aprenda a priorizar velocidade em situações que exigem agilidade",
      "Busque equilíbrio entre perfeição e entrega dentro do prazo",
    ],
    motivadores: "Qualidade e precisão · Conhecimento e expertise · Processos estruturados · Autonomia técnica · Reconhecimento pela excelência · Ambiente organizado e previsível",
    carreiras: "Tecnologia da Informação · Engenharia · Contabilidade e Finanças · Medicina e Ciências da Saúde · Pesquisa Científica · Arquitetura · Direito · Análise de Dados · Auditoria · Farmácia",
  },
};

function radarSVG(scores: Record<string, number>): string {
  const cx = 120, cy = 120, r = 90;
  const keys = ["D", "I", "S", "C"];
  const angles = [-90, 0, 90, 180]; // degrees for D(top), I(right), S(bottom), C(left)
  const colors: Record<string, string> = { D: "#dc2626", I: "#f59e0b", S: "#10b981", C: "#3b82f6" };

  function toXY(angleDeg: number, pct: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * (pct / 100) * Math.cos(rad), y: cy + r * (pct / 100) * Math.sin(rad) };
  }

  // Grid circles
  const gridCircles = [25, 50, 75, 100].map(p =>
    `<circle cx="${cx}" cy="${cy}" r="${r * p / 100}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`
  ).join("");

  // Axis lines
  const axisLines = keys.map((_, i) => {
    const end = toXY(angles[i], 100);
    return `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="#e2e8f0" stroke-width="1.5"/>`;
  }).join("");

  // Data polygon
  const points = keys.map((k, i) => {
    const val = Number(scores[k] || 0);
    const pt = toXY(angles[i], Math.max(val, 5));
    return `${pt.x},${pt.y}`;
  }).join(" ");

  // Data points
  const dots = keys.map((k, i) => {
    const val = Number(scores[k] || 0);
    const pt = toXY(angles[i], Math.max(val, 5));
    return `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${colors[k]}" stroke="white" stroke-width="1.5"/>`;
  }).join("");

  // Labels
  const labelOffset = 14;
  const labelPositions = [
    { x: cx, y: cy - r - labelOffset, anchor: "middle" },      // D top
    { x: cx + r + labelOffset, y: cy + 4, anchor: "start" },   // I right
    { x: cx, y: cy + r + labelOffset + 4, anchor: "middle" },  // S bottom
    { x: cx - r - labelOffset, y: cy + 4, anchor: "end" },     // C left
  ];
  const labels = keys.map((k, i) => {
    const val = Number(scores[k] || 0);
    const lp = labelPositions[i];
    return `<text x="${lp.x}" y="${lp.y}" text-anchor="${lp.anchor}" font-size="12" font-weight="900" fill="${colors[k]}">${k} ${val}%</text>`;
  }).join("");

  return `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    ${gridCircles}
    ${axisLines}
    <polygon points="${points}" fill="${DISC_DATA[keys.find(k => scores[k] === Math.max(...keys.map(k2 => scores[k2] || 0))) || "S"].cor}33" stroke="${DISC_DATA[keys.find(k => scores[k] === Math.max(...keys.map(k2 => scores[k2] || 0))) || "S"].cor}" stroke-width="2"/>
    ${dots}
    ${labels}
  </svg>`;
}

export function gerarRelatorioDisc(profile: DiscProfile): string {
  const key = profile.resultado?.charAt(0)?.toUpperCase() as keyof typeof DISC_DATA;
  const d = DISC_DATA[key] || DISC_DATA["S"];

  // Values from grafico are already 0-100 percentages — use directly
  const scores: Record<string, number> = profile.grafico || { D: 0, I: 0, S: 0, C: 0 };

  const barras = Object.entries(DISC_DATA).map(([k, v]) => {
    const val = Number(scores[k] || 0);
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:20px;font-weight:900;font-size:13px;color:${v.cor}">${k}</div>
        <div style="flex:1;background:#f1f5f9;border-radius:6px;overflow:hidden;height:20px">
          <div style="height:20px;background:${v.cor};border-radius:6px;width:${val}%;display:flex;align-items:center;padding-left:8px">
            ${val > 15 ? `<span style="font-size:10px;color:white;font-weight:700">${val}%</span>` : ""}
          </div>
        </div>
        <div style="width:36px;font-size:11px;color:#64748b;font-weight:700;text-align:right">${val}%</div>
        ${k === key ? `<div style="font-size:9px;font-weight:900;color:${v.cor};white-space:nowrap">✓ DOMINANTE</div>` : ""}
      </div>`;
  }).join("");

  const li = (items: string[]) => items.map(i => `<li style="margin-bottom:6px;color:#475569;font-size:11px">${i}</li>`).join("");

  const radar = radarSVG(scores);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  ${DOC_CSS}
  .disc-header{background:linear-gradient(135deg,${d.cor}22,${d.cor}11);border:2px solid ${d.cor}44;border-radius:12px;padding:20px;margin-bottom:20px;display:flex;align-items:center;gap:16px}
  .disc-icon{font-size:40px;line-height:1}
  .disc-badge{background:${d.cor};color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;display:inline-block;margin-bottom:4px}
  .disc-name{font-size:22px;font-weight:900;color:${d.cor};line-height:1.2}
  .section-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px}
  .section-box h4{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:${d.cor};margin-bottom:8px;border-bottom:1px solid ${d.cor}33;padding-bottom:5px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .tag{display:inline-block;background:${d.cor}22;color:${d.cor};font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:12px;margin:2px}
  ul{padding-left:16px;margin:0}
  .chart-title{font-size:10px;font-weight:900;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  .info-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px}
  .info-row:last-child{border:none}
  .info-label{font-weight:700;color:#94a3b8;font-size:9px;text-transform:uppercase;min-width:80px}
  .motivador-tag{display:inline-block;background:#f0fdf4;border:1px solid #86efac;color:#166534;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:12px;margin:2px}
  .carreira-tag{display:inline-block;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:12px;margin:2px}
</style>
</head><body>
<div class="doc">
  <div class="watermark">SMARTER</div>
  <div class="header">
    <div><img src="https://sistema.smarterestagios.com.br/logo-sistema.png" alt="Sistema Smarter" style="height:36px;object-fit:contain"/></div>
    <div class="title-area"><div class="doc-title">RELATÓRIO DISC COMPORTAMENTAL</div><div class="doc-sub">Análise Completa de Perfil</div></div>
  </div>

  <!-- Info do candidato -->
  <div class="section-box" style="margin-top:12px">
    <div class="info-row"><span class="info-label">Candidato</span><span style="font-weight:600">${profile.nome || "—"}</span></div>
    <div class="info-row"><span class="info-label">Curso</span><span>${profile.curso || "—"}</span></div>
    <div class="info-row"><span class="info-label">Data do teste</span><span>${profile.dataTeste || new Date().toLocaleDateString("pt-BR")}</span></div>
  </div>

  <!-- Perfil dominante -->
  <div class="disc-header">
    <div class="disc-icon">${d.icone}</div>
    <div>
      <div class="disc-badge">Perfil Predominante</div>
      <div class="disc-name">${d.titulo}</div>
      <p style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.5">${d.descricao}</p>
    </div>
  </div>

  <!-- Gráfico + Radar lado a lado -->
  <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:14px;align-items:start">
    <div class="section-box" style="margin-bottom:0">
      <h4>Distribuição DISC — Percentuais</h4>
      ${barras}
      <p style="font-size:9.5px;color:#94a3b8;margin-top:8px;font-style:italic">D=Dominante · I=Influente · S=Estável · C=Consciente</p>
    </div>
    <div class="section-box" style="margin-bottom:0;text-align:center">
      <h4>Mapa de Perfil</h4>
      ${radar}
    </div>
  </div>

  <div class="grid-2">
    <!-- Pontos fortes -->
    <div class="section-box">
      <h4>✅ Pontos Fortes</h4>
      <ul>${li(d.pontosFortes)}</ul>
    </div>

    <!-- Pontos de melhoria -->
    <div class="section-box">
      <h4>📈 Pontos de Desenvolvimento</h4>
      <ul>${li(d.pontosMelhoria)}</ul>
    </div>
  </div>

  <!-- Características -->
  <div class="section-box">
    <h4>🎯 Características Principais</h4>
    <div>${d.caracteristicas.map(c => `<span class="tag">${c}</span>`).join("")}</div>
  </div>

  <!-- Motivadores -->
  <div class="section-box">
    <h4>🚀 Motivadores</h4>
    <div>${d.motivadores.split(" · ").map(m => `<span class="motivador-tag">${m}</span>`).join("")}</div>
  </div>

  <!-- Comportamentos -->
  <div class="grid-2">
    <div class="section-box">
      <h4>💬 Como se Comunicar</h4>
      <p style="font-size:11px;color:#475569;line-height:1.6">${d.comunicacao}</p>
    </div>
    <div class="section-box">
      <h4>👑 Estilo de Liderança</h4>
      <p style="font-size:11px;color:#475569;line-height:1.6">${d.estiloLideranca}</p>
    </div>
    <div class="section-box">
      <h4>🤝 Trabalho em Equipe</h4>
      <p style="font-size:11px;color:#475569;line-height:1.6">${d.trabalhoEquipe}</p>
    </div>
    <div class="section-box">
      <h4>⚡ Sob Pressão</h4>
      <p style="font-size:11px;color:#475569;line-height:1.6">${d.sobPressao}</p>
    </div>
  </div>

  <!-- Ambiente ideal -->
  <div class="section-box">
    <h4>🏢 Ambiente de Trabalho Ideal</h4>
    <p style="font-size:11px;color:#475569;line-height:1.6">${d.ambienteIdeal}</p>
  </div>

  <!-- Carreiras com Alta Afinidade -->
  <div class="section-box">
    <h4>💼 Carreiras com Alta Afinidade</h4>
    <div>${d.carreiras.split(" · ").map(c => `<span class="carreira-tag">${c}</span>`).join("")}</div>
  </div>

  <!-- Sugestões -->
  <div class="section-box">
    <h4>💡 Sugestões para Desenvolvimento</h4>
    <ul>${li(d.sugestoes)}</ul>
  </div>

  <div class="footer-line">
    <span>Relatório DISC Comportamental — Sistema Smarter</span>
    <span>Gerado em ${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
</div>
</body></html>`;
}
