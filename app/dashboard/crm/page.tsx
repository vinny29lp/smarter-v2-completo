"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const isFranqueadora = session?.user?.role === "FRANQUEADORA";
  const [leads, setLeads] = useState<any[]>([]);
  const [statsLeads, setStatsLeads] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<"ativo"|"todos"|"vendido"|"perdido"|"pausado">("ativo");
  const [novoModal, setNovoModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLinkKey, setCopiedLinkKey] = useState<string|null>(null);
  const copyLinkItem = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkKey(key); setTimeout(()=>setCopiedLinkKey(null), 2000);
  };
  const [slaBreached, setSlaBreached] = useState(0);
  const [form, setForm] = useState({
    empresa:"", contato:"", cargo:"", email:"", telefone:"",
    whatsapp:"", instagram:"", linkedin:"",
    cidade:"", uf:"", setor:"", origem:"",
    prioridade:"media", valorNegociado:"", observacao:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const franchiseId = (session?.user as any)?.franchiseId as string | null | undefined;
  const linkBase = typeof window !== "undefined" ? `${window.location.origin}/lead` : "/lead";
  // FRANQUEADO: inclui ?ref= para direcionar leads à sua unidade
  // FRANQUEADORA: sem ?ref= (leads vão para o CRM da FRANQUEADORA)
  const linkPublico = franchiseId && !isFranqueadora
    ? `${linkBase}?ref=${franchiseId}`
    : linkBase;

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
    // Carrega todos os leads para os cards de canais (independente do filtro ativo)
    fetch("/api/app/crm?situacao=todos&limit=200")
      .then(r=>r.json())
      .then(d=>setStatsLeads(d.leads||[]))
      .catch(()=>{});
  }, [load]);

  const criarLead = async () => {
    if (!form.empresa) return;
    setLoading(true);
    const res = await fetch("/api/app/crm", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    });
    const data = await res.json();
    if (data.lead) { load(); setNovoModal(false); setForm({empresa:"",contato:"",cargo:"",email:"",telefone:"",whatsapp:"",instagram:"",linkedin:"",cidade:"",uf:"",setor:"",origem:"",prioridade:"media",valorNegociado:"",observacao:""}); }
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

  // Cards de Canais de Captação
  const CANAIS = [
    { key: "link_publico",     label: "Site / Link Público",  icon: "🔗", bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    bar: "bg-blue-500"   },
    { key: "instagram",        label: "Instagram",            icon: "📱", bg: "bg-pink-50",    border: "border-pink-200",    text: "text-pink-700",    bar: "bg-pink-500"   },
    { key: "trafego_pago",     label: "Tráfego Pago",         icon: "💰", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   bar: "bg-amber-500"  },
    { key: "equipe_comercial", label: "Equipe Comercial",     icon: "🤝", bg: "bg-green-50",   border: "border-green-200",   text: "text-green-700",   bar: "bg-green-500"  },
    { key: "whatsapp",         label: "WhatsApp",             icon: "💬", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500"},
    { key: "manual",           label: "Inserção Manual",      icon: "✍️", bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-700",   bar: "bg-slate-500"  },
  ];
  const origemStats = CANAIS.map(canal => {
    const grupo = statsLeads.filter(l => (l.origem || "link_publico") === canal.key);
    const total    = grupo.length;
    const ativos   = grupo.filter(l => l.situacao === "ativo").length;
    const vendidos = grupo.filter(l => l.situacao === "vendido").length;
    const txConv   = total > 0 ? Math.round((vendidos / total) * 100) : 0;
    return { ...canal, total, ativos, vendidos, txConv };
  }).filter(c => c.total > 0);

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
        <div className="flex gap-2 flex-wrap justify-end">
          {isFranqueadora && (
            <Link href="/dashboard/crm/franqueadora">
              <Button variant="secondary">🏆 Ranking de Unidades</Button>
            </Link>
          )}
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

      {/* Cards de Canais de Captação */}
      {origemStats.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">📊 Canais de Captação</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {origemStats.map(c => (
              <div key={c.key} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base">{c.icon}</span>
                  <span className={`text-[10px] font-black ${c.text}`}>{c.txConv}%</span>
                </div>
                <p className={`text-[10px] font-bold ${c.text} leading-tight mb-1`}>{c.label}</p>
                <p className={`text-2xl font-black ${c.text}`}>{c.total}</p>
                <p className="text-[10px] text-slate-500 mb-1.5">
                  {c.ativos} ativ{c.ativos === 1 ? "o" : "os"} · {c.vendidos} conv.
                </p>
                {/* Barra de conversão */}
                <div className="w-full h-1 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${c.txConv}%` }} />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">taxa de conversão</p>
              </div>
            ))}
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
                            {(l as any).leadScore > 0 && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                (l as any).leadScore >= 70 ? "bg-red-100 text-red-700" :
                                (l as any).leadScore >= 40 ? "bg-amber-100 text-amber-700" :
                                "bg-sky-100 text-sky-700"
                              }`}>
                                {(l as any).leadScore >= 70 ? "🔥" : (l as any).leadScore >= 40 ? "🌡️" : "❄️"}{(l as any).leadScore}
                              </span>
                            )}
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
      <Modal open={novoModal} onClose={()=>setNovoModal(false)} title="Novo Lead" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="Empresa *" value={form.empresa} onChange={e=>set("empresa",e.target.value)} placeholder="Nome da empresa"/></div>
          <Input label="Contato" value={form.contato} onChange={e=>set("contato",e.target.value)} placeholder="Nome do responsável"/>
          <Input label="Cargo" value={form.cargo} onChange={e=>set("cargo",e.target.value)} placeholder="Diretor de RH, CEO..."/>
          <Input label="E-mail" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@empresa.com"/>
          <Input label="WhatsApp" value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)} placeholder="(11) 99999-0000"/>
          <Input label="Telefone (fixo)" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 3333-0000"/>
          <Input label="Instagram" value={form.instagram} onChange={e=>set("instagram",e.target.value)} placeholder="@usuario"/>
          <Input label="LinkedIn" value={form.linkedin} onChange={e=>set("linkedin",e.target.value)} placeholder="linkedin.com/in/..."/>
          <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">UF</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={form.uf} onChange={e=>set("uf",e.target.value)}>
              <option value="">Selecionar...</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf=>(
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <Input label="Segmento" value={form.setor} onChange={e=>set("setor",e.target.value)} placeholder="Varejo, Indústria, Saúde..."/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Origem</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={form.origem} onChange={e=>set("origem",e.target.value)}>
              <option value="">Selecionar...</option>
              {[
                {v:"link_publico",    l:"Site / Link Público"},
                {v:"instagram",       l:"Instagram"},
                {v:"trafego_pago",    l:"Tráfego Pago"},
                {v:"equipe_comercial",l:"Equipe Comercial"},
                {v:"whatsapp",        l:"WhatsApp"},
                {v:"manual",          l:"Inserção Manual"},
                {v:"indicacao",       l:"Indicação"},
                {v:"linkedin",        l:"LinkedIn"},
                {v:"email",           l:"E-mail"},
                {v:"evento",          l:"Evento"},
              ].map(({v,l})=>(
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
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
      <Modal open={linkModal} onClose={()=>setLinkModal(false)} title="🔗 Seus Links de Captação">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Estes links são <strong>exclusivos da sua unidade</strong>. Quem preencher o formulário entra direto no seu CRM.
            Use cada link na campanha certa.
          </p>

          {/* Link principal */}
          {[
            { key:"principal", label: "🔗 Link principal", desc: "Use no Instagram, WhatsApp e bio.", url: linkPublico },
            { key:"instagram", label: "📱 Instagram / Bio", desc: "Tráfego orgânico e story.", url: `${linkPublico}${linkPublico.includes("?")?"&":"?"}utm=instagram` },
            { key:"trafego",   label: "💰 Tráfego pago (Meta/Google)", desc: "Para anúncios pagos — rastreia a origem.", url: `${linkPublico}${linkPublico.includes("?")?"&":"?"}utm=trafego_pago` },
            { key:"equipe",    label: "🤝 Equipe comercial", desc: "Para sua equipe indicar clientes.", url: `${linkPublico}${linkPublico.includes("?")?"&":"?"}origem=equipe_comercial` },
            { key:"whatsapp",  label: "💬 WhatsApp / Mensagem", desc: "Envio direto por WhatsApp.", url: `${linkPublico}${linkPublico.includes("?")?"&":"?"}utm=whatsapp` },
          ].map(({ key, label, desc, url }) => (
            <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">{label}</span>
                <button
                  onClick={() => copyLinkItem(url, key)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-0.5 bg-blue-50 rounded-lg"
                >
                  {copiedLinkKey===key ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mb-1">{desc}</p>
              <p className="text-[10px] font-mono text-slate-600 break-all select-all">{url}</p>
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={copy} className="flex-1 justify-center">{copied?"✓ Copiado!":"📋 Copiar Link Principal"}</Button>
            <Button variant="secondary" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent("Preencha seus dados e nossa equipe entra em contato: "+linkPublico)}`)}>
              📱 Enviar no WhatsApp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
