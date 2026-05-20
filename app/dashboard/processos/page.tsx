"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

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

export default function ProcessosPage() {
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

  const load = () => fetch("/api/app/processos").then(r=>r.json()).then(d=>setCandidaturas(d.candidaturas||[]));
  useEffect(()=>{ load(); },[]);

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
    D:{titulo:"Dominante",cor:"#dc2626",descricao:"Orientado a resultados, direto e assertivo. Age com rapidez e gosta de desafios.",pontosFortes:["Liderança e tomada de decisão","Foco em resultados","Determinação e persistência","Motivação de equipes","Ação rápida"],pontosMelhoria:["Desenvolver escuta ativa","Considerar sentimentos da equipe","Aprender a delegar","Moderar impulsividade","Praticar empatia"],vagasIdeais:["Gerente de vendas","Líder de projetos","Diretor comercial","Coordenador de operações"],comunicacao:"Seja direto, objetivo e focado em resultados. Evite detalhes desnecessários."},
    I:{titulo:"Influente",cor:"#f59e0b",descricao:"Entusiasta, comunicativo e inspirador. Destaca-se pela energia positiva e persuasão.",pontosFortes:["Comunicação e persuasão","Criação de relacionamentos","Motivação de equipes","Criatividade e inovação","Alta energia"],pontosMelhoria:["Desenvolver organização","Melhorar gestão do tempo","Aprofundar análise","Manter foco","Cumprir prazos"],vagasIdeais:["Vendas e relacionamento","Marketing","RH e T&D","Relações públicas","Atendimento"],comunicacao:"Use entusiasmo, reconheça suas ideias e crie conexão pessoal."},
    S:{titulo:"Estável",cor:"#16a34a",descricao:"Colaborativo, paciente e confiável. Valoriza harmonia e relações duradouras.",pontosFortes:["Confiabilidade","Trabalho em equipe","Paciência e escuta","Lealdade","Estabilidade emocional"],pontosMelhoria:["Desenvolver assertividade","Lidar com mudanças","Comunicar discordâncias","Decidir com agilidade","Sair da zona de conforto"],vagasIdeais:["Analista administrativo","Assistente de RH","Suporte ao cliente","Educação","Saúde"],comunicacao:"Crie ambiente de confiança, seja paciente e demonstre estabilidade."},
    C:{titulo:"Consciente",cor:"#2563eb",descricao:"Analítico, meticuloso e preciso. Toma decisões baseadas em dados e prima pela qualidade.",pontosFortes:["Análise e pensamento crítico","Atenção a detalhes","Planejamento e organização","Rigor técnico","Soluções bem estruturadas"],pontosMelhoria:["Desenvolver flexibilidade","Comunicação interpessoal","Equilibrar perfeição e prazos","Agir na incerteza","Delegar"],vagasIdeais:["Analista de dados","Contabilidade","TI e desenvolvimento","Engenharia","Jurídico"],comunicacao:"Forneça dados e documentação. Dê tempo para análise."},
  };

  const gerarParecer = () => {
    if (!selected) return;
    const discKey = selected.student?.discResult?.charAt(0)?.toUpperCase() as string;
    const disc = DISC_INFO[discKey] || null;
    const scores = selected.student?.discData || {};
    const maxScore = Math.max(...Object.values(scores).map(Number as any), 1);
    const ul = (items: string[]) => items.map((i: string) => `<li style="font-size:11px;color:#475569;margin-bottom:4px">${i}</li>`).join("");
    const tag = (t: string, cor: string) => `<span style="display:inline-block;background:${cor}22;color:${cor};font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:12px;margin:2px">${t}</span>`;
    const box = (title: string, body: string, cor = "#0f2a5e") => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:10px"><div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:${cor};border-bottom:1px solid ${cor}22;padding-bottom:4px;margin-bottom:7px">${title}</div>${body}</div>`;
    const fld = (l: string, v: string) => `<div style="margin-bottom:6px"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:1px">${l}</div><div style="font-size:11px;color:#1f2937">${v||"—"}</div></div>`;
    const barras = disc ? Object.entries(DISC_INFO).map(([k, v]: [string, any]) => {
      const val = Number(scores[k] || 0); const pct = Math.round((val / maxScore) * 100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><div style="width:16px;font-weight:900;font-size:12px;color:${v.cor}">${k}</div><div style="flex:1;background:#f1f5f9;border-radius:4px;overflow:hidden;height:16px"><div style="height:16px;background:${v.cor};border-radius:4px;width:${pct}%;padding-left:5px;display:flex;align-items:center">${pct>15?`<span style="font-size:9px;color:white;font-weight:700">${val}</span>`:""}</div></div><span style="width:26px;font-size:10px;color:#64748b">${val}</span>${k===discKey?`<span style="font-size:9px;font-weight:900;color:${v.cor}">✓</span>`:""}</div>`;
    }).join("") : "";
    const recLabel: Record<string,string> = {aprovado:"✅ APROVADO",reprovado:"❌ REPROVADO",em_analise:"⏳ EM ANÁLISE"};
    const recColor: Record<string,string> = {aprovado:"#16a34a",reprovado:"#dc2626",em_analise:"#d97706"};
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Parecer — ${selected.student?.name}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif}.doc{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 20mm;background:white;font-size:11px;color:#1a1a1a;line-height:1.55;position:relative}.dh{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:6px;padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}.dh-logo{color:#f5c400;font-weight:900;font-size:22px}.dh-logo span{font-size:9px;display:block;font-weight:400;color:rgba(255,255,255,.7)}.dh-center{flex:1;text-align:center;padding:0 16px}.dh-name{color:white;font-size:14px;font-weight:900}.dh-sub{color:rgba(255,255,255,.7);font-size:9.5px;margin-top:2px}.dh-right{text-align:right}.dh-badge{display:inline-block;background:#22c55e;color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px;letter-spacing:.5px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sec-head{display:flex;align-items:center;gap:6px;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #0f2a5e;margin-top:10px}.sec-n{background:#0f2a5e;color:white;font-size:9px;font-weight:900;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}.sec-t{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e}.footer{border-top:1px solid #e2e8f0;padding-top:4px;margin-top:16px;display:flex;justify-content:space-between;font-size:8px;color:#9ca3af}@media print{body{background:white}.doc{margin:0}}</style>
</head><body><div class="doc">

<div class="dh">
  <div class="dh-logo">S<span>Smarter Estágios</span></div>
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
  ${box("Vaga", `${fld("Título",selected.vacancy?.titulo||"—")}${fld("Empresa",selected.vacancy?.company?.name||"—")}${fld("Bolsa","R$ "+(selected.vacancy?.bolsa?.toLocaleString("pt-BR")||"—")+"/mês")}${fld("Match",`${selected.matching||60}%`)}${selected.entrevistaAt?fld("Entrevista",new Date(selected.entrevistaAt).toLocaleString("pt-BR")+" — "+(selected.entrevistaLocal||selected.entrevistaLink||"—")):"")}`)}
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
    <div style="color:#f5c400;font-weight:900;font-size:20px">S<span style="font-size:9px;display:block;font-weight:400;color:rgba(255,255,255,.7)">Smarter Estágios</span></div>
    <div style="text-align:center;flex:1;padding:0 16px">
      <div style="color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase;letter-spacing:.5px">Relatório DISC Comportamental</div>
      <div style="color:white;font-size:14px;font-weight:900;margin-top:2px">${selected.student?.name}</div>
      <div style="color:rgba(255,255,255,.7);font-size:9.5px;margin-top:1px">Perfil ${discKey} — ${disc.titulo}</div>
    </div>
    <div style="text-align:right"><div style="display:inline-block;background:${disc.cor};color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px">Perfil ${disc.titulo}</div></div>
  </div>

  ${box(`Perfil Predominante — ${discKey} · ${disc.titulo}`, `<p style="font-size:11px;color:#374151;line-height:1.6">${disc.descricao}</p>`, disc.cor)}
  ${box("Distribuição DISC — Pontuação", `${barras}<p style="font-size:9px;color:#9ca3af;margin-top:4px">D=Dominante · I=Influente · S=Estável · C=Consciente</p>`, disc.cor)}
  <div class="grid2">
    ${box("✅ Pontos Fortes", `<ul style="padding-left:16px;margin:0">${ul(disc.pontosFortes)}</ul>`, "#16a34a")}
    ${box("📈 Pontos de Desenvolvimento", `<ul style="padding-left:16px;margin:0">${ul(disc.pontosMelhoria)}</ul>`, "#dc2626")}
  </div>
  <div class="grid2">
    ${box("💬 Como se Comunicar", `<p style="font-size:11px;color:#374151;line-height:1.5">${disc.comunicacao}</p>`, disc.cor)}
    ${box("💼 Vagas e Funções Compatíveis", `<div>${disc.vagasIdeais.map((v: string) => tag(v, disc.cor)).join("")}</div>`, disc.cor)}
  </div>
</div>` : ""}

<div class="footer">
  <span>Parecer Técnico + DISC · ${selected.student?.name} · ${selected.vacancy?.titulo}</span>
  <span>Gerado pela plataforma Smarter Estágios · ${new Date().toLocaleDateString("pt-BR")}</span>
</div>
</div></body></html>`;
    const blob = new Blob([html],{type:"text/html"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`parecer-${selected.student?.name?.replace(/\s+/g,"-").toLowerCase()}.html`;
    a.click(); URL.revokeObjectURL(url);
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
        <h1 className="text-2xl font-black text-slate-800">Processos Seletivos</h1>
        <p className="text-slate-500 text-sm mt-1">{candidaturas.length} candidaturas</p>
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
          <p className="text-slate-600 font-semibold">Nenhuma candidatura ainda</p>
          <p className="text-slate-400 text-sm mt-1">Publique vagas e inscreva estudantes para começar.</p>
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
          <div className="grid grid-cols-3 gap-4">
            {/* Info */}
            <div className="col-span-1 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">CANDIDATO</p>
                <p className="text-sm font-bold">{selected.student?.name}</p>
                <p className="text-xs text-slate-500">{selected.student?.curso}</p>
                {selected.student?.discResult && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${DISC_COLOR[selected.student.discResult]}`}>
                    DISC: {selected.student.discResult}
                  </span>
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
                    <label className="text-xs font-bold text-slate-600 block mb-1">Avaliação Técnica completa</label>
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
