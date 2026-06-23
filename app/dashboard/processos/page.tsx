"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { AIButton } from "@/components/ai/AIButton";

const ETAPAS = [
  {key:"inscritos",  label:"Inscritos",   color:"bg-slate-100 border-slate-300"},
  {key:"triagem",    label:"Triagem",      color:"bg-blue-50 border-blue-300"},
  {key:"entrevista", label:"Entrevista",   color:"bg-purple-50 border-purple-300"},
  {key:"aprovado",   label:"Aprovado ✓",  color:"bg-green-50 border-green-300"},
  {key:"reprovado",  label:"Reprovado",   color:"bg-red-50 border-red-300"},
];
const DISC_COLOR: Record<string,string> = {
  D:"bg-red-100 text-red-700",I:"bg-amber-100 text-amber-700",
  S:"bg-emerald-100 text-emerald-700",C:"bg-blue-100 text-blue-700"
};
const REC_BADGE: Record<string,"green"|"yellow"|"red"> = {aprovado:"green",em_analise:"yellow",reprovado:"red"};

function ProcessosContent() {
  const searchParams = useSearchParams();
  const vagaId = searchParams.get("vagaId");
  const [vagaInfo, setVagaInfo] = useState<{titulo:string;id:string}|null>(null);
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"anotacoes"|"agendamento"|"parecer">("anotacoes");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Campos editáveis
  const [anotacaoInterna, setAnotacaoInterna] = useState("");
  const [anotacao, setAnotacao] = useState("");
  const [entrevistaAt, setEntrevistaAt] = useState("");
  const [entrevistaHora, setEntrevistaHora] = useState("");
  const [entrevistaLocal, setEntrevistaLocal] = useState("");
  const [entrevistaLink, setEntrevistaLink] = useState("");
  const [recomendacao, setRecomendacao] = useState("");
  const [parecerTecnico, setParecerTecnico] = useState("");

  const load = () => {
    const url = vagaId ? `/api/app/processos?vacancyId=${vagaId}` : "/api/app/processos";
    fetch(url).then(r=>r.json()).then(d=>{
      setCandidaturas(d.candidaturas||[]);
      if (vagaId && d.candidaturas?.length > 0) {
        const v = d.candidaturas[0]?.vacancy;
        if (v) setVagaInfo({ id: v.id, titulo: v.titulo });
      }
    });
  };
  useEffect(()=>{ load(); },[vagaId]);

  const openCard = (c: any) => {
    setSelected(c);
    setAnotacaoInterna(c.anotacaoInterna||"");
    setAnotacao(c.anotacao||"");
    setEntrevistaAt(c.entrevistaAt ? c.entrevistaAt.split("T")[0] : "");
    setEntrevistaHora(c.entrevistaAt ? new Date(c.entrevistaAt).toTimeString().slice(0,5) : "");
    setEntrevistaLocal(c.entrevistaLocal||"");
    setEntrevistaLink(c.entrevistaLink||"");
    setRecomendacao(c.recomendacao||"");
    setParecerTecnico(c.parecerTecnico||"");
    setActiveTab("anotacoes");
  };

  const save = async (extraData?: any) => {
    if (!selected) return;
    setSaving(true);
    const entAt = entrevistaAt && entrevistaHora
      ? new Date(`${entrevistaAt}T${entrevistaHora}:00`).toISOString()
      : entrevistaAt ? new Date(entrevistaAt).toISOString() : null;
    const body = {
      anotacaoInterna, anotacao, entrevistaAt: entAt,
      entrevistaLocal, entrevistaLink, recomendacao, parecerTecnico, ...extraData,
    };
    const res = await fetch(`/api/app/processos/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await res.json();
    setCandidaturas(p=>p.map(c=>c.id===selected.id?{...c,...data.application}:c));
    setSelected((s:any)=>({...s,...data.application}));
    setMsg("Salvo ✓"); setTimeout(()=>setMsg(""),2000);
    setSaving(false);
  };

  const moverEtapa = async (id: string, etapa: string) => {
    const res = await fetch(`/api/app/processos/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({etapa})});
    const data = await res.json();
    setCandidaturas(p=>p.map(c=>c.id===id?{...c,...data.application}:c));
    if (selected?.id===id) setSelected((s:any)=>({...s,etapa}));
  };

  const DISC_INFO: Record<string, any> = {
    D:{titulo:"Dominante",cor:"#dc2626",descricao:"Orientado a resultados, direto e assertivo. Age com rapidez e gosta de desafios.",pontosFortes:["Liderança e tomada de decisão","Foco em resultados","Determinação e persistência","Motivação de equipes","Ação rápida"],pontosMelhoria:["Desenvolver escuta ativa","Considerar sentimentos da equipe","Aprender a delegar","Moderar impulsividade","Praticar empatia"],comunicacao:"Seja direto, objetivo e focado em resultados. Evite detalhes desnecessários.",motivadores:"Poder e autoridade · Desafios e competição · Liberdade para agir · Resultados mensuráveis · Reconhecimento por conquistas",estiloLideranca:"Líder orientado a resultados — define metas arrojadas, age com decisão e cobra entregas. Melhor em ambientes de alta performance onde velocidade e resultado são prioridade.",carreiras:"Empreendedorismo · Gestão Executiva · Vendas de Alto Nível · Advocacia · Medicina (cirurgia/emergência) · Engenharia de Projetos · Militarismo · Consultoria Estratégica"},
    I:{titulo:"Influente",cor:"#f59e0b",descricao:"Entusiasta, comunicativo e inspirador. Destaca-se pela energia positiva e persuasão.",pontosFortes:["Comunicação e persuasão","Criação de relacionamentos","Motivação de equipes","Criatividade e inovação","Alta energia"],pontosMelhoria:["Desenvolver organização","Melhorar gestão do tempo","Aprofundar análise","Manter foco","Cumprir prazos"],comunicacao:"Use entusiasmo, reconheça suas ideias e crie conexão pessoal.",motivadores:"Reconhecimento social · Liberdade criativa · Interação com pessoas · Projetos variados · Prestígio e aprovação · Ambiente descontraído",estiloLideranca:"Líder inspirador e motivacional — contagia a equipe com entusiasmo, facilita a comunicação e cria um ambiente positivo. Melhor em contextos que valorizam criatividade e engajamento.",carreiras:"Marketing e Publicidade · Relações Públicas · Eventos e Entretenimento · Pedagogia · Jornalismo · Recursos Humanos · Vendas · Coaching · Comunicação Corporativa"},
    S:{titulo:"Estável",cor:"#16a34a",descricao:"Colaborativo, paciente e confiável. Valoriza harmonia e relações duradouras.",pontosFortes:["Confiabilidade","Trabalho em equipe","Paciência e escuta","Lealdade","Estabilidade emocional"],pontosMelhoria:["Desenvolver assertividade","Lidar com mudanças","Comunicar discordâncias","Decidir com agilidade","Sair da zona de conforto"],comunicacao:"Crie ambiente de confiança, seja paciente e demonstre estabilidade.",motivadores:"Harmonia e estabilidade · Segurança no trabalho · Reconhecimento pela dedicação · Relacionamentos saudáveis · Rotinas previsíveis",estiloLideranca:"Líder servidor e colaborativo — prioriza o bem-estar da equipe, resolve conflitos com empatia e mantém o ambiente estável. Melhor em contextos que exigem continuidade e coesão.",carreiras:"Psicologia · Enfermagem e Saúde · Assistência Social · Pedagogia · Recursos Humanos · Administração · Secretariado · Serviço Público · Gestão de Pessoas"},
    C:{titulo:"Consciente",cor:"#2563eb",descricao:"Analítico, meticuloso e preciso. Toma decisões baseadas em dados e prima pela qualidade.",pontosFortes:["Análise e pensamento crítico","Atenção a detalhes","Planejamento e organização","Rigor técnico","Soluções bem estruturadas"],pontosMelhoria:["Desenvolver flexibilidade","Comunicação interpessoal","Equilibrar perfeição e prazos","Agir na incerteza","Delegar"],comunicacao:"Forneça dados e documentação. Dê tempo para análise.",motivadores:"Qualidade e precisão · Conhecimento e expertise · Processos estruturados · Autonomia técnica · Reconhecimento pela excelência",estiloLideranca:"Líder técnico e sistemático — define processos claros, mantém altos padrões de qualidade e toma decisões baseadas em dados. Melhor em ambientes que exigem precisão e excelência técnica.",carreiras:"Tecnologia da Informação · Engenharia · Contabilidade e Finanças · Medicina e Ciências da Saúde · Pesquisa Científica · Arquitetura · Direito · Análise de Dados · Auditoria"},
  };

  const gerarParecer = () => {
    if (!selected) return;
    const discKey = selected.student?.discResult?.charAt(0)?.toUpperCase() as string;
    const disc = DISC_INFO[discKey] || null;
    // discData is stored as { grafico: { D, I, S, C }, resultado, ... }
    const rawDiscData = selected.student?.discData || {};
    const scores: Record<string, number> = rawDiscData.grafico || rawDiscData || {};
    const ul = (items: string[]) => items.map((i: string) => `<li style="font-size:11px;color:#475569;margin-bottom:4px">${i}</li>`).join("");
    const tag = (t: string, cor: string) => `<span style="display:inline-block;background:${cor}22;color:${cor};font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:12px;margin:2px">${t}</span>`;
    const box = (title: string, body: string, cor = "#0f2a5e") => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:10px"><div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:${cor};border-bottom:1px solid ${cor}22;padding-bottom:4px;margin-bottom:7px">${title}</div>${body}</div>`;
    const fld = (l: string, v: string) => `<div style="margin-bottom:6px"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:1px">${l}</div><div style="font-size:11px;color:#1f2937">${v||"—"}</div></div>`;
    // Values are already 0-100 percentages
    const barras = disc ? ["D","I","S","C"].map((k) => {
      const v = DISC_INFO[k]; const val = Number(scores[k] || 0);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><div style="width:16px;font-weight:900;font-size:12px;color:${v.cor}">${k}</div><div style="flex:1;background:#f1f5f9;border-radius:4px;overflow:hidden;height:16px"><div style="height:16px;background:${v.cor};border-radius:4px;width:${val}%;padding-left:5px;display:flex;align-items:center">${val>15?`<span style="font-size:9px;color:white;font-weight:700">${val}%</span>`:""}</div></div><span style="width:36px;font-size:10px;color:#64748b;text-align:right">${val}%</span>${k===discKey?`<span style="font-size:9px;font-weight:900;color:${v.cor}">✓</span>`:""}</div>`;
    }).join("") : "";
    // Radar SVG for parecer
    const cx=120,cy=120,r=90;
    const discAngles: Record<string,number> = {D:-90,I:0,S:90,C:180};
    const discCors: Record<string,string> = {D:"#dc2626",I:"#f59e0b",S:"#10b981",C:"#3b82f6"};
    const toXY=(a:number,p:number)=>({x:cx+r*(p/100)*Math.cos(a*Math.PI/180),y:cy+r*(p/100)*Math.sin(a*Math.PI/180)});
    const gridC=[25,50,75,100].map(p=>`<circle cx="${cx}" cy="${cy}" r="${r*p/100}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`).join("");
    const axisL=["D","I","S","C"].map(k=>{const e=toXY(discAngles[k],100);return `<line x1="${cx}" y1="${cy}" x2="${e.x}" y2="${e.y}" stroke="#e2e8f0" stroke-width="1.5"/>`;}).join("");
    const polyPts=["D","I","S","C"].map(k=>{const p=toXY(discAngles[k],Math.max(Number(scores[k]||0),5));return `${p.x},${p.y}`;}).join(" ");
    const dotsSvg=["D","I","S","C"].map(k=>{const p=toXY(discAngles[k],Math.max(Number(scores[k]||0),5));return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${discCors[k]}" stroke="white" stroke-width="1.5"/>`;}).join("");
    const lblPos=[{x:cx,y:cy-r-14,a:"middle"},{x:cx+r+14,y:cy+4,a:"start"},{x:cx,y:cy+r+18,a:"middle"},{x:cx-r-14,y:cy+4,a:"end"}];
    const lblSvg=["D","I","S","C"].map((k,i)=>`<text x="${lblPos[i].x}" y="${lblPos[i].y}" text-anchor="${lblPos[i].a}" font-size="11" font-weight="900" fill="${discCors[k]}">${k} ${Number(scores[k]||0)}%</text>`).join("");
    const dominantKey = ["D","I","S","C"].reduce((a,b)=>(Number(scores[a]||0)>=Number(scores[b]||0)?a:b),"D");
    const radarSvg=`<svg width="220" height="220" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">${gridC}${axisL}<polygon points="${polyPts}" fill="${discCors[dominantKey]}33" stroke="${discCors[dominantKey]}" stroke-width="2"/>${dotsSvg}${lblSvg}</svg>`;
    const recLabel: Record<string,string> = {aprovado:"✅ APROVADO",reprovado:"❌ REPROVADO",em_analise:"⏳ EM ANÁLISE"};
    const recColor: Record<string,string> = {aprovado:"#16a34a",reprovado:"#dc2626",em_analise:"#d97706"};
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Parecer — ${selected.student?.name}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif}.doc{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 20mm;background:white;font-size:11px;color:#1a1a1a;line-height:1.55;position:relative}.dh{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:6px;padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}.dh-logo{display:flex;align-items:center}.dh-logo img{height:36px;object-fit:contain}.dh-center{flex:1;text-align:center;padding:0 16px}.dh-name{color:white;font-size:14px;font-weight:900}.dh-sub{color:rgba(255,255,255,.7);font-size:9.5px;margin-top:2px}.dh-right{text-align:right}.dh-badge{display:inline-block;background:#22c55e;color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px;letter-spacing:.5px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sec-head{display:flex;align-items:center;gap:6px;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #0f2a5e;margin-top:10px}.sec-n{background:#0f2a5e;color:white;font-size:9px;font-weight:900;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}.sec-t{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e}.footer{border-top:1px solid #e2e8f0;padding-top:4px;margin-top:16px;display:flex;justify-content:space-between;font-size:8px;color:#9ca3af}@page{size:A4 portrait;margin:0}
@media print{
html,body{margin:0!important;padding:0!important;background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
.doc{width:100%!important;max-width:100%!important;margin:0!important;padding:12mm 14mm 16mm!important;box-shadow:none!important;min-height:0!important}
.grid2,[style*="grid-template-columns"],[style*="display:grid"],[style*="display: grid"]{display:grid!important}
[style*="display:flex"],[style*="display: flex"]{display:flex!important}
div,span,p,li{break-inside:avoid;page-break-inside:avoid}
}</style>
</head><body><div class="doc">

<div class="dh">
  <div class="dh-logo"><img src="https://sistema.smarterestagios.com.br/logo-sistema.png" alt="Sistema Smarter"/></div>
  <div class="dh-center">
    <div style="color:rgba(255,255,255,.7);font-size:9px;text-transform:uppercase;letter-spacing:.5px">Parecer Técnico — Processo Seletivo</div>
    <div class="dh-name">${selected.student?.name}</div>
    <div class="dh-sub">${selected.vacancy?.titulo} · ${selected.vacancy?.company?.name}</div>
  </div>
  <div class="dh-right">
    <div class="dh-badge">PARECER</div>
    <div style="font-size:9px;color:rgba(255,255,255,.7);margin-top:4px">${new Date().toLocaleDateString("pt-BR")}</div>
    ${disc ? `<div style="font-size:9px;color:${disc.cor};font-weight:900;background:${disc.cor}33;padding:2px 8px;border-radius:12px;margin-top:3px">DISC: ${discKey} · ${disc.titulo}</div>` : ""}
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
  ${box("Candidato", `${fld("Nome",selected.student?.name||"—")}${fld("E-mail",selected.student?.user?.email||"—")}${fld("Curso",`${selected.student?.curso||"—"} · ${selected.student?.periodo||"—"}° Período`)}${fld("Instituição",selected.student?.institution?.name||"—")}`)}
  ${box("Vaga", `${fld("Título",selected.vacancy?.titulo||"—")}${fld("Empresa",selected.vacancy?.company?.name||"—")}${fld("Bolsa","R$ "+(selected.vacancy?.bolsa?.toLocaleString("pt-BR")||"—")+"/mês")}${fld("Match",`${selected.matching||60}%`)}${selected.entrevistaAt?fld("Entrevista",new Date(selected.entrevistaAt).toLocaleString("pt-BR")+" — "+(selected.entrevistaLocal||selected.entrevistaLink||"—")):""}`)}
</div>

${anotacao||parecerTecnico ? `
<div>
  <div class="sec-head"><div class="sec-n">A</div><div class="sec-t">Avaliação do Processo</div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${anotacao ? box("📝 Anotações do Processo", `<p style="font-size:11px;color:#374151;line-height:1.6">${anotacao}</p>`) : ""}
    ${parecerTecnico ? box("📋 Avaliação Técnica", `<p style="font-size:11px;color:#374151;line-height:1.6">${parecerTecnico}</p>`) : ""}
  </div>
</div>` : ""}

${recomendacao ? `
<div style="margin:12px 0">
  <div class="sec-head"><div class="sec-n">R</div><div class="sec-t">Recomendação Final</div></div>
  <div style="padding:12px;border-radius:6px;text-align:center;font-size:15px;font-weight:900;color:${recColor[recomendacao]||"#374151"};background:${recColor[recomendacao]||"#374151"}22;border:1px solid ${recColor[recomendacao]||"#374151"}44">
    ${recLabel[recomendacao]||recomendacao.toUpperCase()}
  </div>
</div>` : ""}

${disc ? `
<div style="page-break-before:always;padding-top:8mm">
  <div style="background:linear-gradient(135deg,${disc.cor}cc,${disc.cor}99);border-radius:6px;padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
    <div><img src="https://sistema.smarterestagios.com.br/logo-sistema.png" alt="Sistema Smarter" style="height:36px;object-fit:contain"/></div>
    <div style="text-align:center;flex:1;padding:0 16px">
      <div style="color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase;letter-spacing:.5px">Relatório DISC Comportamental</div>
      <div style="color:white;font-size:14px;font-weight:900;margin-top:2px">${selected.student?.name}</div>
      <div style="color:rgba(255,255,255,.7);font-size:9.5px;margin-top:1px">Perfil ${discKey} — ${disc.titulo}</div>
    </div>
    <div style="text-align:right"><div style="display:inline-block;background:${disc.cor};color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px">Perfil ${disc.titulo}</div></div>
  </div>

  ${box(`Perfil Predominante — ${discKey} · ${disc.titulo}`, `<p style="font-size:11px;color:#374151;line-height:1.6">${disc.descricao}</p>`, disc.cor)}

  <div style="display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:10px;align-items:start">
    ${box("Distribuição DISC — Percentuais", `${barras}<p style="font-size:9px;color:#9ca3af;margin-top:4px">D=Dominante · I=Influente · S=Estável · C=Consciente</p>`, disc.cor)}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;text-align:center">
      <div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:${disc.cor};border-bottom:1px solid ${disc.cor}22;padding-bottom:4px;margin-bottom:7px">Mapa de Perfil</div>
      ${radarSvg}
    </div>
  </div>

  <div class="grid2">
    ${box("✅ Pontos Fortes", `<ul style="padding-left:16px;margin:0">${ul(disc.pontosFortes)}</ul>`, "#16a34a")}
    ${box("📈 Pontos de Desenvolvimento", `<ul style="padding-left:16px;margin:0">${ul(disc.pontosMelhoria)}</ul>`, "#dc2626")}
  </div>

  ${box("🚀 Motivadores", `<div>${disc.motivadores.split(" · ").map((m: string)=>`<span style="display:inline-block;background:#f0fdf4;border:1px solid #86efac;color:#166534;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:12px;margin:2px">${m}</span>`).join("")}</div>`, disc.cor)}

  <div class="grid2">
    ${box("💬 Como se Comunicar", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.comunicacao}</p>`, disc.cor)}
    ${box("👑 Estilo de Liderança", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.estiloLideranca}</p>`, disc.cor)}
  </div>

  ${box("💼 Carreiras com Alta Afinidade", `<div>${disc.carreiras.split(" · ").map((c: string)=>`<span style="display:inline-block;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:12px;margin:2px">${c}</span>`).join("")}</div>`, disc.cor)}
</div>` : ""}

<div class="footer">
  <span>Parecer Técnico + DISC · ${selected.student?.name} · ${selected.vacancy?.titulo}</span>
  <span>Gerado pela plataforma Sistema Smarter · ${new Date().toLocaleDateString("pt-BR")}</span>
</div>
</div></body></html>`;
    // Auto-print → browser Save-as-PDF
    const printHtml = html.replace("</body>", `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script></body>`);
    const blob = new Blob([printHtml],{type:"text/html"});
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const whatsMsg = (c: any) => {
    const v = c.vacancy || {};
    const nome = (c.student?.name || "").split(" ")[0];
    const bolsa = v.bolsa ? `R$ ${Number(v.bolsa).toLocaleString("pt-BR")}/mês` : "";
    const linhas = [
      `Olá, ${nome}! 🎉`,
      ``,
      `Você foi selecionado(a) para participar do *Processo Seletivo* da seguinte vaga:`,
      ``,
      `📋 *${v.titulo || "—"}*`,
      v.company?.name ? `🏢 Empresa: ${v.company.name}` : ``,
      bolsa ? `💰 Bolsa: ${bolsa}` : ``,
      v.modalidade ? `📚 Modalidade: ${v.modalidade}` : ``,
      v.cargaHoraria ? `⏰ Carga Horária: ${v.cargaHoraria}h/semana` : ``,
      v.horario ? `🕐 Horário: ${v.horario}` : ``,
      v.cidade && v.uf ? `📍 Local: ${v.cidade}/${v.uf}` : ``,
      ``,
      `Seu perfil foi analisado e está alinhado com o que a empresa busca! 🙌`,
      ``,
      `Você tem interesse em participar do processo seletivo? Por favor, confirme sua disponibilidade respondendo esta mensagem. 😊`,
      ``,
      `Equipe Smarter Estágios`,
    ].filter((l, i, arr) => l !== `` || (i > 0 && arr[i - 1] !== ``));
    return linhas.join("\n");
  };

  const whatsLink = (c: any) => {
    const raw = (c.student?.celular || c.student?.telefone || "").replace(/\D/g, "");
    if (!raw) return null;
    const phone = raw.startsWith("55") ? raw : `55${raw}`;
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(whatsMsg(c))}`;
  };

  const porEtapa = (etapa: string) => candidaturas.filter(c => c.etapa === etapa);
  const entrevistasHoje = candidaturas.filter(c => {
    if (!c.entrevistaAt) return false;
    const d = new Date(c.entrevistaAt);
    const hoje = new Date();
    return d.getDate()===hoje.getDate() && d.getMonth()===hoje.getMonth() && d.getFullYear()===hoje.getFullYear();
  });

  return (
    <div>
      <div className="mb-5">
        {vagaId && (
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/vagas" className="text-slate-400 hover:text-slate-600 text-sm">← Vagas</Link>
            <span className="text-slate-300">/</span>
            {vagaInfo && (
              <>
                <Link href={`/dashboard/vagas/${vagaInfo.id}`} className="text-slate-400 hover:text-slate-600 text-sm">{vagaInfo.titulo}</Link>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-sm text-slate-600 font-semibold">Processo Seletivo</span>
          </div>
        )}
        <h1 className="text-2xl font-black text-slate-800">
          {vagaInfo ? `Processo Seletivo — ${vagaInfo.titulo}` : "Processos Seletivos"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{candidaturas.length} candidatura{candidaturas.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Lembretes de entrevistas */}
      {entrevistasHoje.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-bold text-amber-800 mb-2">⏰ Entrevistas hoje ({entrevistasHoje.length})</p>
          {entrevistasHoje.map(c=>(
            <div key={c.id} className="text-xs text-amber-700">
              {new Date(c.entrevistaAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} — <strong>{c.student?.name}</strong> para <strong>{c.vacancy?.titulo}</strong>
              {c.entrevistaLink && <a href={c.entrevistaLink} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Entrar na reunião →</a>}
            </div>
          ))}
        </div>
      )}

      {candidaturas.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-slate-600 font-semibold">
            {vagaId ? "Nenhuma candidatura nesta vaga ainda" : "Nenhuma candidatura ainda"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {vagaId ? "Compartilhe o link da vaga para receber candidaturas." : "Publique vagas e inscreva estudantes para começar."}
          </p>
          <Link href="/dashboard/vagas" className="mt-3 inline-flex text-sm text-blue-500 hover:underline">→ Ver Vagas</Link>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {ETAPAS.map(etapa => {
              const cards = porEtapa(etapa.key);
              return (
                <div key={etapa.key} className="w-60 flex-shrink-0">
                  <div className={`text-xs font-bold px-2 py-1.5 rounded-lg border mb-2 text-center ${etapa.color}`}>
                    {etapa.label} <span className="ml-1 opacity-60">({cards.length})</span>
                  </div>
                  <div className="space-y-2 min-h-16">
                    {cards.map(c=>(
                      <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={()=>openCard(c)}>
                        <p className="text-xs font-bold text-slate-800 truncate">{c.student?.name}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.vacancy?.titulo}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.vacancy?.company?.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          {c.student?.discResult
                            ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${DISC_COLOR[c.student.discResult]||""}`}>{c.student.discResult}</span>
                            : <span/>}
                          <div className="flex items-center gap-1">
                            {c.entrevistaAt && <span title="Entrevista agendada">📅</span>}
                            <span className="text-[10px] font-bold text-emerald-600">{c.matching||60}%</span>
                          </div>
                        </div>
                        {c.recomendacao && <div className={`mt-1 text-[10px] text-center font-bold rounded px-1 ${c.recomendacao==="aprovado"?"bg-green-100 text-green-700":c.recomendacao==="reprovado"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                          {c.recomendacao.toUpperCase()}
                        </div>}
                        <select className="w-full mt-2 text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white outline-none"
                          value={c.etapa} onClick={e=>e.stopPropagation()}
                          onChange={e=>{ e.stopPropagation(); moverEtapa(c.id,e.target.value); }}>
                          {ETAPAS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
                        </select>
                        {whatsLink(c) && (
                          <a href={whatsLink(c)!} target="_blank" rel="noopener noreferrer"
                            onClick={e=>e.stopPropagation()}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#25d366] text-white rounded-lg text-[11px] font-bold hover:bg-[#20ba5a] transition-colors">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal detalhe candidatura */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title="Candidatura" size="xl">
        {selected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Info */}
            <div className="col-span-1 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-slate-500 mb-1">CANDIDATO</p>
                <p className="text-sm font-bold">{selected.student?.name}</p>
                {selected.student?.discResult && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${DISC_COLOR[selected.student.discResult]}`}>
                    DISC: {selected.student.discResult}
                  </span>
                )}
                {(selected.student?.user?.email || selected.student?.email) && (
                  <p className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="mt-px">✉️</span>
                    <span className="break-all">{selected.student.user?.email || selected.student.email}</span>
                  </p>
                )}
                {(selected.student?.celular || selected.student?.telefone) && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>📱</span>
                    <span>{selected.student.celular || selected.student.telefone}</span>
                  </p>
                )}
                {selected.student?.dataNasc && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>🎂</span>
                    <span>{new Date(selected.student.dataNasc).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                  </p>
                )}
                {selected.student?.curso && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>📚</span>
                    <span>{selected.student.curso}{selected.student.periodo ? ` — ${selected.student.periodo}° Período` : ""}</span>
                  </p>
                )}
                {selected.student?.institution?.name && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>🏫</span>
                    <span>{selected.student.institution.name}</span>
                  </p>
                )}
                {(selected.student?.cidade || selected.student?.endereco) && (
                  <p className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="mt-px">📍</span>
                    <span>
                      {[selected.student.endereco, selected.student.bairro, selected.student.cidade && selected.student.uf ? `${selected.student.cidade}/${selected.student.uf}` : selected.student.cidade].filter(Boolean).join(", ")}
                    </span>
                  </p>
                )}
                {whatsLink(selected) && (
                  <a href={whatsLink(selected)!} target="_blank" rel="noopener noreferrer"
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-[#25d366] text-white rounded-xl text-xs font-bold hover:bg-[#20ba5a] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Iniciar no WhatsApp
                  </a>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">VAGA</p>
                <p className="text-sm font-bold">{selected.vacancy?.titulo}</p>
                <p className="text-xs text-slate-500">{selected.vacancy?.company?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                    <div className="h-1.5 bg-emerald-400 rounded-full" style={{width:`${selected.matching||60}%`}}/>
                  </div>
                  <span className="text-xs font-bold">{selected.matching||60}%</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Recomendação</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={recomendacao} onChange={e=>setRecomendacao(e.target.value)}>
                  <option value="">Sem definição</option>
                  <option value="aprovado">✓ Aprovado</option>
                  <option value="em_analise">⏳ Em análise</option>
                  <option value="reprovado">✗ Reprovado</option>
                </select>
              </div>
              <Button className="w-full justify-center" onClick={gerarParecer} variant="secondary">📄 Gerar Parecer</Button>
            </div>

            {/* Tabs */}
            <div className="col-span-2">
              {msg && <div className="mb-2 text-xs text-emerald-600 font-bold">{msg}</div>}
              <div className="flex gap-1 mb-3 bg-slate-100 rounded-xl p-1">
                {[["anotacoes","📝 Anotações"],["agendamento","📅 Agendamento"],["parecer","📋 Parecer"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setActiveTab(k as any)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab===k?"bg-white shadow text-[#0f2a5e]":"text-slate-500"}`}>{l}</button>
                ))}
              </div>

              {activeTab==="anotacoes" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Anotação Interna (não aparece no parecer)</label>
                    <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none" value={anotacaoInterna} onChange={e=>setAnotacaoInterna(e.target.value)} placeholder="Notas internas sobre o candidato..."/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Anotação para o Parecer Técnico</label>
                    <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none" value={anotacao} onChange={e=>setAnotacao(e.target.value)} placeholder="Observações que aparecerão no parecer técnico..."/>
                  </div>
                </div>
              )}

              {activeTab==="agendamento" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Data da Entrevista" type="date" value={entrevistaAt} onChange={e=>setEntrevistaAt(e.target.value)}/>
                    <Input label="Horário" type="time" value={entrevistaHora} onChange={e=>setEntrevistaHora(e.target.value)}/>
                  </div>
                  <Input label="Local (endereço ou nome)" value={entrevistaLocal} onChange={e=>setEntrevistaLocal(e.target.value)} placeholder="Ex: Av. Paulista, 1000 — Sala 301"/>
                  <Input label="Link de Reunião (opcional)" value={entrevistaLink} onChange={e=>setEntrevistaLink(e.target.value)} placeholder="https://meet.google.com/..."/>
                  {entrevistaAt && entrevistaHora && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                      📅 Agendado para <strong>{new Date(`${entrevistaAt}T${entrevistaHora}`).toLocaleString("pt-BR")}</strong>
                      {entrevistaLink && <span> — <a href={entrevistaLink} target="_blank" rel="noopener noreferrer" className="underline">Entrar na reunião</a></span>}
                    </div>
                  )}
                </div>
              )}

              {activeTab==="parecer" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600">Avaliação Técnica completa</label>
                      <AIButton
                        label="Melhorar parecer com IA"
                        endpoint="/api/app/ai/parecer"
                        payload={{
                          parecerAtual: parecerTecnico,
                          candidato: selected?.student?.name || "",
                          vaga: selected?.vacancy?.titulo || "",
                          empresa: selected?.vacancy?.company?.name || "",
                          etapa: selected?.etapa || "",
                          anotacao: anotacao,
                        }}
                        resultLabel="Parecer aprimorado pela IA"
                        disabled={!parecerTecnico && !anotacao}
                        onResult={(text) => setParecerTecnico(text)}
                      />
                    </div>
                    <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-40 resize-none" value={parecerTecnico} onChange={e=>setParecerTecnico(e.target.value)} placeholder="Descreva a avaliação técnica do candidato, pontos fortes, pontos de melhoria, adequação à vaga..."/>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button onClick={()=>save()} disabled={saving} className="flex-1 justify-center">{saving?"Salvando...":"Salvar ✓"}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ProcessosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-[#0f2a5e] border-t-transparent rounded-full animate-spin"/></div>}>
      <ProcessosContent />
    </Suspense>
  );
}
