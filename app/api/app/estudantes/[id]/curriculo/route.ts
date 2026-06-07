import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { handleApiError } from "@/lib/api-response";

const DISC_FULL: Record<string, any> = {
  D: {
    titulo: "Dominante", cor: "#dc2626", emoji: "🔴",
    descricao: "Orientado a resultados, direto e assertivo. Age com rapidez, assume o controle e gosta de desafios.",
    pontosFortes: ["Liderança e tomada de decisão","Foco em resultados e metas","Determinação e persistência","Motivação de equipes em crise","Ação rápida em situações críticas"],
    pontosMelhoria: ["Desenvolver paciência e escuta ativa","Considerar sentimentos da equipe","Aprender a delegar","Moderar a impulsividade","Praticar empatia"],
    vagasIdeais: ["Gerente de vendas","Líder de projetos","Empreendedor","Diretor comercial","Coordenador de operações"],
    ambienteIdeal: "Ambientes desafiadores, com autonomia, metas claras e oportunidades de liderança.",
    comunicacao: "Seja direto, objetivo e focado em resultados. Evite detalhes desnecessários.",
    motivadores: "Poder e autoridade · Desafios e competição · Liberdade para agir · Resultados mensuráveis · Reconhecimento por conquistas",
    lideranca: "Líder orientado a resultados. Define metas ambiciosas, toma decisões rapidamente e espera execução eficiente. Funciona melhor com autonomia total e desafios constantes.",
    carreiras: "Empreendedorismo · Gestão executiva · Vendas de alto nível · Advocacia · Política · Gestão de projetos · Diretoria",
  },
  I: {
    titulo: "Influente", cor: "#f59e0b", emoji: "🟡",
    descricao: "Entusiasta, comunicativo e inspirador. Destaca-se pela energia positiva, criatividade e persuasão.",
    pontosFortes: ["Comunicação e persuasão","Criação de relacionamentos","Motivação de equipes","Criatividade e inovação","Alta energia e entusiasmo"],
    pontosMelhoria: ["Desenvolver organização e disciplina","Melhorar a gestão do tempo","Aprofundar análise antes de decidir","Manter o foco em uma tarefa","Cumprir prazos com consistência"],
    vagasIdeais: ["Vendas e relacionamento","Marketing e comunicação","RH e T&D","Relações públicas","Atendimento ao cliente"],
    ambienteIdeal: "Ambientes sociais, criativos, com reconhecimento e variedade de atividades.",
    comunicacao: "Use entusiasmo, reconheça suas ideias e crie conexão pessoal antes de tratar de negócios.",
    motivadores: "Reconhecimento social · Novas experiências · Trabalho em equipe · Liberdade de expressão · Influência sobre outros",
    lideranca: "Líder inspirador e motivador. Cria ambientes positivos e entusiasma a equipe. Excelente para engajar pessoas em projetos novos.",
    carreiras: "Marketing e Publicidade · Recursos Humanos · Relações Públicas · Treinamento · Vendas · Coaching · Educação · Comunicação",
  },
  S: {
    titulo: "Estável", cor: "#16a34a", emoji: "🟢",
    descricao: "Colaborativo, paciente e confiável. Valoriza harmonia, consistência e relações duradouras.",
    pontosFortes: ["Confiabilidade e consistência","Trabalho em equipe","Paciência e escuta ativa","Lealdade e comprometimento","Estabilidade emocional"],
    pontosMelhoria: ["Desenvolver assertividade","Aprender a lidar com mudanças rápidas","Comunicar discordâncias","Tomar decisões com mais agilidade","Sair da zona de conforto"],
    vagasIdeais: ["Analista administrativo","Assistente de RH","Suporte ao cliente","Educação e treinamento","Saúde e assistência social"],
    ambienteIdeal: "Ambientes estáveis, previsíveis, com bom relacionamento interpessoal e propósito claro.",
    comunicacao: "Crie um ambiente de confiança, seja paciente e demonstre estabilidade nas relações.",
    motivadores: "Segurança e estabilidade · Relações de confiança · Reconhecimento por lealdade · Harmonia · Sentimento de pertencimento",
    lideranca: "Líder servidor e colaborativo. Prioriza o bem-estar da equipe e cria ambientes harmoniosos. Excelente mediador de conflitos.",
    carreiras: "Recursos Humanos · Psicologia · Enfermagem · Assistência Social · Educação · Serviço ao cliente · Administração",
  },
  C: {
    titulo: "Consciente", cor: "#2563eb", emoji: "🔵",
    descricao: "Analítico, meticuloso e preciso. Toma decisões baseadas em dados, prima pela qualidade e exatidão.",
    pontosFortes: ["Análise e pensamento crítico","Atenção a detalhes e qualidade","Planejamento e organização","Rigor técnico e precisão","Soluções bem estruturadas"],
    pontosMelhoria: ["Desenvolver flexibilidade","Comunicação interpessoal","Equilibrar perfeição com prazos","Agir em situações de incerteza","Delegar tarefas sem microgerenciar"],
    vagasIdeais: ["Analista de dados","Contabilidade e finanças","TI e desenvolvimento","Engenharia e qualidade","Jurídico e compliance"],
    ambienteIdeal: "Ambientes estruturados, com padrões claros, dados concretos e tempo para análise.",
    comunicacao: "Forneça dados, documentação e tempo para análise. Evite decisões impulsivas.",
    motivadores: "Qualidade e excelência · Expertise e conhecimento · Processos estruturados · Independência analítica · Precisão",
    lideranca: "Líder analítico e sistemático. Define processos claros e padrões elevados. Toma decisões baseadas em dados e rigor técnico.",
    carreiras: "Engenharia · Finanças e Contabilidade · Ciência de Dados · Direito · Medicina · Pesquisa · Auditoria · TI · Arquitetura",
  },
};

// Generate radar chart SVG for DISC profile
function radarSVG(scores: Record<string, number>): string {
  const cx = 100, cy = 100, r = 75;
  const labels = ["D","I","S","C"];
  const cores: Record<string,string> = {D:"#ef4444",I:"#eab308",S:"#22c55e",C:"#3b82f6"};
  const angles = labels.map((_,i) => (i * Math.PI * 2) / 4 - Math.PI / 2);
  const max = Math.max(...Object.values(scores).map(Number), 1);
  const pts = labels.map((l,i) => {
    const pct = Number(scores[l] || 0) / max;
    return { x: cx + r * pct * Math.cos(angles[i]), y: cy + r * pct * Math.sin(angles[i]) };
  });
  const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
  const grid = [0.25,0.5,0.75,1].map(lvl =>
    `<polygon points="${angles.map(a=>`${cx+r*lvl*Math.cos(a)},${cy+r*lvl*Math.sin(a)}`).join(" ")}" fill="none" stroke="#e2e8f0" stroke-width="0.8"/>`
  ).join("");
  const axes = angles.map(a => `<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(a)}" y2="${cy+r*Math.sin(a)}" stroke="#e2e8f0" stroke-width="0.8"/>`).join("");
  const lbls = labels.map((l,i) => {
    const lx = cx + (r+16)*Math.cos(angles[i]);
    const ly = cy + (r+16)*Math.sin(angles[i]);
    return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="900" fill="${cores[l]}">${l}</text>`;
  }).join("");
  const dots = pts.map((p,i) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${cores[labels[i]]}"/>`).join("");
  return `<svg viewBox="0 0 200 200" style="width:160px;height:160px;display:block;margin:0 auto">${grid}${axes}<polygon points="${poly}" fill="rgba(15,42,94,0.12)" stroke="#0f2a5e" stroke-width="2"/>${dots}${lbls}</svg>`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  // LGPD-B01: Ownership check — currículo contém CPF e dados pessoais sensíveis
  // FRANQUEADORA acessa todos | FRANQUEADO/FUNCIONARIO só da própria franquia | ESTUDANTE só o próprio
  if (role === "ESTUDANTE") {
    // Estudante só acessa o próprio currículo (via studentId da sessão)
    const ownId = session.user.studentId;
    if (!ownId || ownId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role !== "FRANQUEADORA") {
    // Franqueado/Funcionario: verifica se estudante pertence à sua franquia
    const check = await prisma.student.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!check || (check.franchiseId && check.franchiseId !== franchiseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const s = await prisma.student.findUnique({
    where: { id: params.id },
    include: { institution: true, user: { select: { email: true } } },
  });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const disc = s.discResult ? DISC_FULL[s.discResult.charAt(0).toUpperCase()] : null;
  // discData stored as { grafico: { D, I, S, C }, resultado, respostas, realizadoEm }
  const rawDiscData = (s.discData as any) || {};
  const scores: Record<string, number> = rawDiscData.grafico || rawDiscData || {};

  const barras = disc ? Object.entries(DISC_FULL).map(([k, v]) => {
    const pct = Number(scores[k] || 0); // values are already 0-100 percentages
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:16px;font-weight:900;font-size:12px;color:${v.cor}">${k}</div>
      <div style="flex:1;background:#f1f5f9;border-radius:4px;overflow:hidden;height:18px">
        <div style="height:18px;background:${v.cor};border-radius:4px;width:${pct}%;padding-left:6px;display:flex;align-items:center">
          ${pct > 15 ? `<span style="font-size:10px;color:white;font-weight:700">${pct}%</span>` : ""}
        </div>
      </div>
      <span style="width:32px;font-size:10px;color:#64748b;font-weight:700">${pct}%</span>
      ${k === s.discResult?.charAt(0).toUpperCase() ? `<span style="font-size:9px;font-weight:900;color:${v.cor}">✓</span>` : ""}
    </div>`;
  }).join("") : "";

  const ul = (items: string[]) => `<ul style="padding-left:16px;margin:4px 0">${items.map(i => `<li style="font-size:11px;color:#475569;margin-bottom:4px">${i}</li>`).join("")}</ul>`;
  const tag = (t: string, cor: string) => `<span style="display:inline-block;background:${cor}22;color:${cor};font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:12px;margin:2px">${t}</span>`;
  const box = (title: string, content: string, cor = "#0f2a5e") => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:10px">
      <div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:${cor};border-bottom:1px solid ${cor}22;padding-bottom:4px;margin-bottom:7px">${title}</div>
      ${content}
    </div>`;
  const fld = (l: string, v: string) => `<div style="margin-bottom:6px"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:1px">${l}</div><div style="font-size:11px;color:#1f2937">${v || "—"}</div></div>`;

  const habilidades = s.habilidades || [];
  const idiomas = (s.idiomas as any[]) || [];
  const curriculo = (s.curriculo as any) || {};
  const experiencias = curriculo.experiencias || (s as any).experiencias || [];
  const formacoes = curriculo.formacoes || (s as any).formacoes || [];

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Currículo — ${s.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif}
  .doc{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 20mm;background:white;font-size:11px;color:#1a1a1a;line-height:1.55;position:relative}
  .dh{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:6px;padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
  .dh-logo{display:flex;align-items:center}
  .dh-logo img{height:36px;object-fit:contain}
  .dh-center{flex:1;text-align:center;padding:0 16px}
  .dh-name{color:white;font-size:16px;font-weight:900}
  .dh-sub{color:rgba(255,255,255,.7);font-size:10px;margin-top:2px}
  .dh-right{text-align:right}
  .dh-badge{display:inline-block;background:#22c55e;color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px;letter-spacing:.5px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .sec-head{display:flex;align-items:center;gap:6px;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #0f2a5e;margin-top:10px}
  .sec-n{background:#0f2a5e;color:white;font-size:9px;font-weight:900;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sec-t{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e}
  .footer{position:absolute;bottom:10mm;left:14mm;right:14mm;border-top:1px solid #e2e8f0;padding-top:4px;display:flex;justify-content:space-between;font-size:8px;color:#9ca3af}
  @media print{body{background:white}.doc{margin:0}}
</style>
</head><body><div class="doc">

<div class="dh">
  <div class="dh-logo"><img src="${process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br"}/logo-sistema.png" alt="Sistema Smarter"/></div>
  <div class="dh-center">
    <div class="dh-name">${s.name}</div>
    <div class="dh-sub">${s.curso || "—"} · ${s.periodo || "—"}° Período · ${s.institution?.name || "—"}</div>
  </div>
  <div class="dh-right">
    <div class="dh-badge">CURRÍCULO</div>
    ${disc ? `<div style="margin-top:4px;font-size:9px;color:${disc.cor};font-weight:900;background:${disc.cor}22;padding:2px 8px;border-radius:12px;display:inline-block">DISC: ${s.discResult} — ${disc.titulo}</div>` : ""}
  </div>
</div>

<!-- DADOS PESSOAIS -->
<div>
  <div class="sec-head"><div class="sec-n">1</div><div class="sec-t">Dados Pessoais</div></div>
  <div class="grid2">
    <div>
      ${fld("CPF", s.cpf || "—")}
      ${fld("E-mail", s.user?.email || s.email)}
      ${fld("Celular", s.celular || s.telefone || "—")}
    </div>
    <div>
      ${fld("Endereço", [s.endereco, s.bairro].filter(Boolean).join(", ") || "—")}
      ${fld("Cidade / UF", [s.cidade, s.uf].filter(Boolean).join("/") || "—")}
      ${fld("CEP", s.cep || "—")}
    </div>
  </div>
</div>

<!-- FORMAÇÃO -->
${formacoes.length > 0 ? `
<div>
  <div class="sec-head"><div class="sec-n">2</div><div class="sec-t">Formação Acadêmica</div></div>
  ${formacoes.map((f: any) => `
  <div style="padding:5px 0;border-bottom:1px solid #f1f5f9">
    <div style="font-size:11px;font-weight:700;color:#1f2937">${f.curso || f.titulo || "—"}</div>
    <div style="font-size:10px;color:#6b7280">${f.instituicao || "—"} · ${f.periodo || f.ano || "—"}</div>
  </div>`).join("")}
</div>` : `
<div>
  <div class="sec-head"><div class="sec-n">2</div><div class="sec-t">Formação Acadêmica</div></div>
  <div style="padding:5px 0;border-bottom:1px solid #f1f5f9">
    <div style="font-size:11px;font-weight:700;color:#1f2937">${s.curso || "—"}</div>
    <div style="font-size:10px;color:#6b7280">${s.institution?.name || "—"} · ${s.periodo || "—"}° Semestre · Previsão: ${s.previsaoConclusao || "—"}</div>
  </div>
</div>`}

<!-- EXPERIÊNCIAS -->
${experiencias.length > 0 ? `
<div>
  <div class="sec-head"><div class="sec-n">3</div><div class="sec-t">Experiências Profissionais</div></div>
  ${experiencias.map((exp: any) => `
  <div style="padding:5px 0;border-bottom:1px solid #f1f5f9">
    <div style="font-size:11px;font-weight:700;color:#1f2937">${exp.cargo || exp.titulo || "—"}</div>
    <div style="font-size:10px;color:#6b7280">${exp.empresa || exp.local || "—"} · ${exp.periodo || exp.ano || "—"}</div>
    ${exp.descricao ? `<div style="font-size:10px;color:#374151;margin-top:2px">${exp.descricao}</div>` : ""}
  </div>`).join("")}
</div>` : ""}

<!-- HABILIDADES E IDIOMAS -->
${habilidades.length > 0 || idiomas.length > 0 ? `
<div>
  <div class="sec-head"><div class="sec-n">4</div><div class="sec-t">Habilidades e Idiomas</div></div>
  <div class="grid2">
    ${habilidades.length > 0 ? `<div>${box("Habilidades", `<div>${habilidades.map((h: string) => tag(h, "#0f2a5e")).join("")}</div>`)}</div>` : "<div></div>"}
    ${idiomas.length > 0 ? `<div>${box("Idiomas", idiomas.map((i: any) => `<div style="font-size:11px;color:#374151;margin-bottom:3px"><strong>${typeof i === "string" ? i : i.idioma}</strong>${typeof i === "object" && i.nivel ? ` — ${i.nivel}` : ""}</div>`).join(""))}</div>` : ""}
  </div>
</div>` : ""}

${disc ? `
<!-- ═══════════════════ RELATÓRIO DISC COMPLETO ═══════════════════ -->
<div style="page-break-before:always;padding-top:10mm">

<div class="dh" style="background:linear-gradient(135deg,${disc.cor}cc,${disc.cor}99)">
  <div class="dh-logo"><img src="${process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br"}/logo-sistema.png" alt="Sistema Smarter"/></div>
  <div class="dh-center">
    <div style="color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase;letter-spacing:1px">Relatório DISC Comportamental</div>
    <div class="dh-name">${s.name}</div>
    <div class="dh-sub">Análise Completa de Perfil · ${new Date().toLocaleDateString("pt-BR")}</div>
  </div>
  <div class="dh-right">
    <div class="dh-badge" style="background:${disc.cor}">Perfil ${disc.titulo}</div>
    <div style="font-size:20px;margin-top:4px">${disc.emoji}</div>
  </div>
</div>

<!-- Perfil Predominante -->
${box("Perfil Predominante — " + s.discResult + " · " + disc.titulo,
  `<p style="font-size:11px;color:#374151;line-height:1.6">${disc.descricao}</p>`, disc.cor)}

<!-- Distribuição + Mapa Radar lado a lado -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
  ${box("📊 Distribuição DISC — Percentuais", `${barras}<p style="font-size:9px;color:#9ca3af;margin-top:6px;font-style:italic">D=Dominante · I=Influente · S=Estável · C=Consciente</p>`, disc.cor)}
  ${box("🗺️ Mapa de Perfil", `${radarSVG(scores)}<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;justify-content:center">${Object.keys(DISC_FULL).map(k=>`<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;background:${DISC_FULL[k].cor}22;color:${DISC_FULL[k].cor}">${k}: ${Number(scores[k]||0)}%</span>`).join("")}</div>`, disc.cor)}
</div>

<!-- Pontos Fortes e de Desenvolvimento -->
<div class="grid2">
  ${box("✅ Pontos Fortes", ul(disc.pontosFortes), "#16a34a")}
  ${box("📈 Pontos de Desenvolvimento", ul(disc.pontosMelhoria), "#dc2626")}
</div>

<!-- Comunicação e Ambiente -->
<div class="grid2">
  ${box("💬 Estilo de Comunicação", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.comunicacao}</p>`, disc.cor)}
  ${box("🏢 Ambiente de Trabalho Ideal", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.ambienteIdeal}</p>`, disc.cor)}
</div>

<!-- Motivadores e Estilo de Liderança -->
<div class="grid2">
  ${box("⚡ Motivadores", `<div>${disc.motivadores.split(" · ").map((m: string)=>`<div style="font-size:10.5px;color:#374151;margin-bottom:3px;display:flex;align-items:center;gap:4px"><span style="color:${disc.cor};font-weight:700">→</span>${m}</div>`).join("")}</div>`, disc.cor)}
  ${box("👑 Estilo de Liderança", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.lideranca}</p>`, disc.cor)}
</div>

<!-- Carreiras com Alta Afinidade -->
${box("🚀 Carreiras com Alta Afinidade",
  `<div>${disc.carreiras.split(" · ").map((c: string) => tag(c, disc.cor)).join("")}</div>`, disc.cor)}

</div>` : ""}

<div class="footer">
  <span>Currículo + Relatório DISC · ${s.name}</span>
  <span>Gerado pela plataforma Sistema Smarter · ${new Date().toLocaleDateString("pt-BR")}</span>
</div>
</div></body></html>`;

  const htmlPDF = wrapParaPDF(html, `Currículo — ${s.name}`);
  return new Response(htmlPDF, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  } catch (e) {
    return handleApiError(e, "ESTUDANTE_CURRICULO_GET");
  }
}
