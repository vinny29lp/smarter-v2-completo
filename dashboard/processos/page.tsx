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

  const gerarParecer = () => {
    if (!selected) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a}
      h1{color:#0f2a5e;border-bottom:2px solid #0f2a5e;padding-bottom:8px}
      h3{color:#374151;margin-top:20px}
      .label{font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px}
      .val{font-size:14px;margin-bottom:12px}
      .disc{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:12px}
      .match{display:inline-block;padding:4px 12px;border-radius:20px;background:#e0f2fe;color:#0369a1;font-weight:bold}
      .rec{padding:12px;border-radius:8px;font-weight:bold;text-align:center;font-size:16px}
      .aprovado{background:#d1fae5;color:#065f46}
      .reprovado{background:#fee2e2;color:#991b1b}
      .em_analise{background:#fef3c7;color:#92400e}
    </style></head><body>
    <h1>Parecer Técnico — Processo Seletivo</h1>
    <p style="color:#6b7280;font-size:12px">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    <h3>Candidato</h3>
    <div class="label">Nome</div><div class="val">${selected.student?.name}</div>
    <div class="label">E-mail</div><div class="val">${selected.student?.user?.email||"—"}</div>
    <div class="label">Curso</div><div class="val">${selected.student?.curso||"—"} ${selected.student?.periodo ? `— ${selected.student.periodo}º período` : ""}</div>
    <div class="label">Instituição</div><div class="val">${selected.student?.institution?.name||"—"}</div>
    <div class="label">Perfil DISC</div><div class="val"><span class="disc" style="background:#dbeafe;color:#1e40af">${selected.student?.discResult||"Não informado"}</span></div>
    <h3>Vaga</h3>
    <div class="label">Título</div><div class="val">${selected.vacancy?.titulo}</div>
    <div class="label">Empresa</div><div class="val">${selected.vacancy?.company?.name}</div>
    <div class="label">Bolsa</div><div class="val">R$ ${selected.vacancy?.bolsa?.toLocaleString("pt-BR")}/mês</div>
    <div class="label">Match</div><div class="val"><span class="match">${selected.matching||60}%</span></div>
    ${selected.entrevistaAt ? `<h3>Entrevista Agendada</h3><div class="val">${new Date(selected.entrevistaAt).toLocaleString("pt-BR")} — ${selected.entrevistaLocal||selected.entrevistaLink||"—"}</div>` : ""}
    <h3>Anotações do Processo</h3>
    <p style="background:#f9fafb;border-left:3px solid #0f2a5e;padding:12px;border-radius:4px">${selected.anotacao||"Sem anotações."}</p>
    <h3>Avaliação Técnica</h3>
    <p style="background:#f9fafb;border-left:3px solid #0f2a5e;padding:12px;border-radius:4px">${parecerTecnico||"Sem avaliação."}</p>
    ${recomendacao ? `<h3>Recomendação Final</h3><div class="rec ${recomendacao}">${recomendacao.toUpperCase().replace("_"," ")}</div>` : ""}
    <p style="margin-top:40px;font-size:11px;color:#9ca3af">Smarter Estágios — Sistema de Gestão de Estágios</p>
    </body></html>`;
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
