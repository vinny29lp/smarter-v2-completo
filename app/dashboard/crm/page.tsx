"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { slaStatus, diasRestantes, SLA_CONFIG } from "@/lib/crm/sla-config";

const ETAPAS = ["novo_lead","primeiro_contato","apresentacao","proposta","negociacao","fechado"];
// Labels e cores derivados do SLA_CONFIG para manter sincronismo
const ETAPA_LABEL: Record<string,string> = Object.fromEntries(
  Object.entries(SLA_CONFIG).map(([k, v]) => [k, v.label])
);
const ETAPA_COLOR: Record<string,string> = Object.fromEntries(
  Object.entries(SLA_CONFIG).map(([k, v]) => [k, v.cor])
);
const PRIO_BADGE: Record<string,"green"|"yellow"|"red"> = {
  baixa:"green", media:"yellow", alta:"red"
};
const SITUACAO_COLOR: Record<string,string> = {
  ativo:"", vendido:"opacity-60 bg-emerald-50", perdido:"opacity-50 bg-red-50/30", pausado:"opacity-60 bg-slate-50",
};

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<"ativo"|"todos"|"vendido"|"perdido"|"pausado">("ativo");
  const [novoModal, setNovoModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slaBreached, setSlaBreached] = useState(0);
  const [form, setForm] = useState({
    empresa:"", contato:"", cargo:"", email:"", telefone:"",
    cidade:"", prioridade:"media", valorNegociado:"", observacao:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const linkPublico = typeof window !== "undefined"
    ? `${window.location.origin}/lead`
    : "/lead";

  const load = useCallback(() => {
    fetch(`/api/app/crm?situacao=${filtro}`)
      .then(r=>r.json()).then(d=>setLeads(d.leads||[]));
  }, [filtro]);

  useEffect(() => {
    load();
    // Dispara verificação de SLA ao carregar a página
    fetch("/api/app/crm/sla-check")
      .then(r=>r.json())
      .then(d=>{ if (d.breached) setSlaBreached(d.breached); })
      .catch(()=>{});
  }, [load]);

  const criarLead = async () => {
    if (!form.empresa) return;
    setLoading(true);
    const res = await fetch("/api/app/crm", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    });
    const data = await res.json();
    if (data.lead) { load(); setNovoModal(false); setForm({empresa:"",contato:"",cargo:"",email:"",telefone:"",cidade:"",prioridade:"media",valorNegociado:"",observacao:""}); }
    setLoading(false);
  };

  const moverEtapa = async (id:string, etapa:string) => {
    await fetch(`/api/app/crm/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({etapa}),
    });
    setLeads(p=>p.map(l=>l.id===id?{...l,etapa}:l));
  };

  const copy = () => {
    navigator.clipboard.writeText(linkPublico);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  // KPIs
  const todosLeads = leads;
  const valorPipeline = leads.filter(l=>l.situacao==="ativo").reduce((a,l)=>a+(l.valorNegociado||0),0);
  const vencidos = leads.filter(l=>l.retornoAt && new Date(l.retornoAt)<new Date() && l.situacao==="ativo").length;
  const slaVencidosLocal = leads.filter(l=>l.situacao==="ativo" && slaStatus(l.etapa, l.etapaChangedAt)==="vencido").length;
  const totalSlaAlerta = Math.max(slaBreached, slaVencidosLocal);

  // Módulo 9 — Forecast MRR ponderado por etapa
  const PROB_ETAPA: Record<string,number> = {
    novo_lead:0.05, primeiro_contato:0.15, apresentacao:0.30,
    proposta:0.55, negociacao:0.75, fechado:1,
  };
  const mrrForecast = leads
    .filter(l=>l.situacao==="ativo" && l.valorNegociado)
    .reduce((sum,l)=>sum + ((l.valorNegociado||0) * (PROB_ETAPA[l.etapa||"novo_lead"]||0.05)) / 12, 0);
  const mrrReal = leads
    .filter(l=>l.situacao==="vendido" && l.valorNegociado)
    .reduce((sum,l)=>sum + (l.valorNegociado||0) / 12, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800">CRM</h1>
          <p className="text-slate-500 text-sm mt-1">
            {leads.filter(l=>l.situacao==="ativo").length} leads ativos
            {valorPipeline>0 && ` • R$ ${valorPipeline.toLocaleString("pt-BR")} em pipeline`}
            {vencidos>0 && <span className="text-red-500"> • {vencidos} retorno(s) vencido(s) ⚠️</span>}
            {totalSlaAlerta>0 && <span className="text-red-600 font-bold"> • 🚨 {totalSlaAlerta} SLA vencido{totalSlaAlerta>1?"s":""}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setLinkModal(true)}>🔗 Link Captação</Button>
          <Button onClick={()=>setNovoModal(true)}>+ Novo Lead</Button>
        </div>
      </div>

      {/* Módulo 9 — Forecast MRR */}
      {(mrrForecast > 0 || mrrReal > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {mrrForecast > 0 && (
            <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] rounded-xl p-4 text-white">
              <p className="text-[10px] font-bold uppercase opacity-70 mb-1">MRR Forecast</p>
              <p className="text-xl font-black">R$ {Math.round(mrrForecast).toLocaleString("pt-BR")}</p>
              <p className="text-[10px] opacity-60 mt-0.5">receita recorrente ponderada</p>
            </div>
          )}
          {mrrReal > 0 && (
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
              <p className="text-[10px] font-bold uppercase opacity-70 mb-1">MRR Confirmado</p>
              <p className="text-xl font-black">R$ {Math.round(mrrReal).toLocaleString("pt-BR")}</p>
              <p className="text-[10px] opacity-60 mt-0.5">contratos fechados</p>
            </div>
          )}
          {valorPipeline > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">Pipeline Ativo</p>
              <p className="text-xl font-black text-amber-800">R$ {Math.round(valorPipeline).toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">valor total em negociação</p>
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Leads Ativos</p>
            <p className="text-xl font-black text-slate-800">{leads.filter(l=>l.situacao==="ativo").length}</p>
            {totalSlaAlerta > 0 && <p className="text-[10px] text-red-600 mt-0.5 font-bold">🚨 {totalSlaAlerta} SLA vencido(s)</p>}
          </div>
        </div>
      )}

      {/* Filtros de situação */}
      <div className="flex gap-1.5 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          ["ativo","Ativos"],["todos","Todos"],["vendido","Vendidos"],["perdido","Perdidos"],["pausado","Pausados"]
        ].map(([k,l])=>(
          <button key={k} onClick={()=>setFiltro(k as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro===k?"bg-white shadow text-[#0f2a5e]":"text-slate-500 hover:text-slate-700"
            }`}>{l}</button>
        ))}
      </div>

      {/* Kanban */}
      {leads.length===0 ? (
        <Card className="p-12 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-slate-600 font-semibold">Nenhum lead {filtro !== "ativo" ? `(${filtro})` : "ativo"}</p>
          <button onClick={()=>setNovoModal(true)} className="mt-3 text-sm text-blue-500 hover:underline">+ Criar primeiro lead</button>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {ETAPAS.map(col => {
              const cards = leads.filter(l=>l.etapa===col);
              const valorCol = cards.reduce((a,l)=>a+(l.valorNegociado||0),0);
              return (
                <div key={col} className="w-60 flex-shrink-0">
                  <div className={`border rounded-xl px-3 py-2 mb-2 ${ETAPA_COLOR[col]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{ETAPA_LABEL[col]}</span>
                      <span className="bg-white text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    {valorCol>0 && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">R$ {valorCol.toLocaleString("pt-BR")}</p>}
                  </div>
                  <div className="space-y-2 min-h-16">
                    {cards.map(l=>(
                      <div key={l.id} className={`bg-white rounded-xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition-shadow ${SITUACAO_COLOR[l.situacao]||""}`}>
                        {/* Cabeçalho do card */}
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate flex-1">{l.empresa}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Badge SLA */}
                            {l.situacao==="ativo" && (()=>{
                              const st = slaStatus(l.etapa, l.etapaChangedAt);
                              const dr = diasRestantes(l.etapa, l.etapaChangedAt);
                              if (st==="vencido") return (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700" title={`SLA vencido há ${Math.abs(dr??0)} dia(s)`}>
                                  🚨{Math.abs(dr??0)}d
                                </span>
                              );
                              if (st==="alerta") return (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700" title={`SLA: ${dr} dia(s) restante(s)`}>
                                  ⚠️{dr}d
                                </span>
                              );
                              return null;
                            })()}
                            <Badge variant={PRIO_BADGE[l.prioridade]||"gray"}>{l.prioridade[0].toUpperCase()}</Badge>
                          </div>
                        </div>
                        {l.contato && <p className="text-[10px] text-slate-400">{l.contato}{l.cargo?` · ${l.cargo}`:""}</p>}
                        {l.valorNegociado && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-1">R$ {Number(l.valorNegociado).toLocaleString("pt-BR")}</p>
                        )}

                        {/* Próxima tarefa pendente */}
                        {l.tasks?.length>0 && (
                          <div className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] ${new Date(l.tasks[0].dueAt)<new Date()?"bg-red-50 text-red-600":"bg-slate-50 text-slate-500"}`}>
                            ✅ {l.tasks[0].descricao}
                            {l.tasks[0].dueAt && ` · ${new Date(l.tasks[0].dueAt).toLocaleDateString("pt-BR")}`}
                          </div>
                        )}

                        {/* Retorno agendado */}
                        {l.retornoAt && (
                          <div className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] ${new Date(l.retornoAt)<new Date()?"bg-red-50 text-red-600 font-bold":"bg-amber-50 text-amber-600"}`}>
                            📅 {new Date(l.retornoAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}
                            {new Date(l.retornoAt)<new Date()?" ⚠️":""}
                          </div>
                        )}

                        {/* Última nota */}
                        {l.notas?.length>0 && (
                          <p className="mt-1.5 text-[10px] text-slate-400 truncate italic">"{l.notas[0].texto}"</p>
                        )}

                        {/* Contadores */}
                        {(l._count?.notas>0||l._count?.tasks>0) && (
                          <div className="flex gap-2 mt-1.5 text-[10px] text-slate-400">
                            {l._count?.notas>0 && <span>📝 {l._count.notas}</span>}
                            {l._count?.tasks>0 && <span>✅ {l._count.tasks}</span>}
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-1 mt-2">
                          {l.telefone && (
                            <a href={`https://wa.me/55${l.telefone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] bg-green-50 text-green-700 py-1 rounded-lg font-semibold hover:bg-green-100">
                              📱
                            </a>
                          )}
                          <Link href={`/dashboard/crm/${l.id}`}
                            className="flex-1 text-center text-[10px] bg-blue-50 text-blue-700 py-1 rounded-lg font-semibold hover:bg-blue-100">
                            Ver →
                          </Link>
                        </div>

                        {/* Mover etapa */}
                        {l.situacao==="ativo" && col!=="fechado" && (
                          <select className="w-full mt-1.5 text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white outline-none"
                            value={col} onChange={e=>moverEtapa(l.id,e.target.value)}>
                            {ETAPAS.map(e=><option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                          </select>
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

      {/* Modal: Novo Lead */}
      <Modal open={novoModal} onClose={()=>setNovoModal(false)} title="Novo Lead">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="Empresa *" value={form.empresa} onChange={e=>set("empresa",e.target.value)} placeholder="Nome da empresa"/></div>
          <Input label="Contato" value={form.contato} onChange={e=>set("contato",e.target.value)} placeholder="Nome do responsável"/>
          <Input label="Cargo" value={form.cargo} onChange={e=>set("cargo",e.target.value)} placeholder="Diretor de RH"/>
          <Input label="Telefone / WhatsApp" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 99999-0000"/>
          <Input label="E-mail" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@empresa.com"/>
          <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo / SP"/>
          <Input label="Valor Negociado (R$)" type="number" value={form.valorNegociado} onChange={e=>set("valorNegociado",e.target.value)} placeholder="0"/>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Prioridade</label>
            <div className="flex gap-2">
              {["baixa","media","alta"].map(p=>(
                <button key={p} onClick={()=>set("prioridade",p)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-colors ${form.prioridade===p?"border-[#0f2a5e] bg-[#0f2a5e] text-white":"border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Observação inicial</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
              value={form.observacao} onChange={e=>set("observacao",e.target.value)} placeholder="Como veio o lead, contexto inicial..."/>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={()=>setNovoModal(false)}>Cancelar</Button>
          <Button onClick={criarLead} disabled={loading||!form.empresa}>{loading?"Criando...":"Criar Lead"}</Button>
        </div>
      </Modal>

      {/* Modal: Link de Captação */}
      <Modal open={linkModal} onClose={()=>setLinkModal(false)} title="🔗 Link de Captação de Leads">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Compartilhe este link com sua equipe comercial ou use em campanhas de tráfego pago.
            Quem preencher o formulário entra automaticamente no seu CRM.
          </p>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Link geral</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-2 select-all">
              {linkPublico}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Link para tráfego pago (UTM)</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-2 select-all text-xs">
              {linkPublico}?utm=trafego_pago
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Link para equipe comercial</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-2 select-all text-xs">
              {linkPublico}?origem=equipe_comercial
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={copy} className="flex-1 justify-center">{copied?"✓ Copiado!":"📋 Copiar Link Principal"}</Button>
            <Button variant="secondary" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent("Preencha seus dados: "+linkPublico)}`)}>
              📱 WhatsApp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
