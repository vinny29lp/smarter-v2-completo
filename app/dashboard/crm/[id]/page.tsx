"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { getAllWhatsAppTemplates, buildWhatsAppUrl } from "@/lib/crm/whatsapp-templates";
import { SLA_CONFIG, slaStatus, diasRestantes } from "@/lib/crm/sla-config";
import {
  detectarSituacao, todasSituacoes, GRUPOS_FOLLOWUP,
  buildWppUrl, calcularProximoFollowup,
  type FollowupSituacao, type LeadFollowupContext,
} from "@/lib/crm/followup-messages";

const ETAPAS = ["novo_lead","primeiro_contato","apresentacao","proposta","negociacao","fechado"];
const ETAPA_LABEL: Record<string,string> = Object.fromEntries(
  Object.entries(SLA_CONFIG).map(([k,v])=>[k,v.label])
);

// Utilitários para módulos 6 e 8 (usados inline no JSX)
function buildWhatsLink(lead: any, etapa: string) {
  if (!lead?.telefone) return "#";
  const tpls = getAllWhatsAppTemplates();
  const tpl = tpls[etapa] || tpls.reengajamento;
  return buildWhatsAppUrl(lead.telefone, tpl, { empresa: lead.empresa, contato: lead.contato, setor: lead.setor });
}

async function logWhatsClick(leadId: string, label: string) {
  fetch(`/api/app/crm/${leadId}/whatsapp-click`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateLabel: label }),
  }).catch(() => {});
}

function gerarContrato(leadId: string) {
  window.open(`/api/app/crm/${leadId}/contrato-parceria`, "_blank");
}

const EMAIL_TEMPLATES = [
  { label: "Apresentação da Smarter", template: "primeiro_contato", desc: "Apresenta a Smarter e propõe reunião" },
  { label: "Confirmação de Reunião", template: "apresentacao",     desc: "Lembra e confirma reunião agendada" },
  { label: "Envio de Proposta",       template: "proposta",        desc: "Formaliza a proposta de parceria" },
  { label: "Follow-up Comercial",     template: "negociacao",      desc: "Cases de sucesso + reforço comercial" },
  { label: "Boas-vindas Parceiro",    template: "fechado",         desc: "E-mail de boas-vindas ao fechar" },
];
const TIPO_NOTA: Record<string,{icon:string;color:string}> = {
  anotacao:    {icon:"📝",color:"bg-slate-100 text-slate-600"},
  ligacao:     {icon:"📞",color:"bg-blue-100 text-blue-700"},
  email:       {icon:"✉️", color:"bg-purple-100 text-purple-700"},
  reuniao:     {icon:"🤝",color:"bg-green-100 text-green-700"},
  whatsapp:    {icon:"📱",color:"bg-emerald-100 text-emerald-700"},
  etapa:       {icon:"📍",color:"bg-indigo-100 text-indigo-700"},
  alerta:      {icon:"🚨",color:"bg-red-100 text-red-700"},
};
const SITUACAO_BADGE: Record<string,"green"|"yellow"|"red"|"gray"|"blue"> = {
  ativo:"green",vendido:"blue",perdido:"red",pausado:"gray"
};

// ── Helpers Apresentação Comercial ───────────────────────────────────────────
function scoreTemperatura(score: number) {
  if (score >= 70) return { label: "🔥 Quente", cls: "bg-red-100 text-red-700 border-red-200" };
  if (score >= 40) return { label: "🌡️ Morno",  cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "❄️ Frio", cls: "bg-sky-100 text-sky-700 border-sky-200" };
}
function getFollowupSugestao(lead: any): string | null {
  if (!lead?.apresentacaoEnviadaEm) return null;

  const acessos     = lead.apresentacaoAcessos   || 0;
  const scroll      = lead.apresentacaoScrollMax  || 0;
  const tempo       = lead.apresentacaoTempoSeg   || 0;
  const diasEnviado = Math.floor((Date.now() - new Date(lead.apresentacaoEnviadaEm).getTime()) / 86400000);

  let cliques: string[] = [];
  try { cliques = JSON.parse(lead.apresentacaoCliques || "[]"); } catch {}

  // ── Alta intenção: clicou em CTA ──
  if (cliques.includes("clicou_agendamento"))
    return "🔥 URGENTE: lead clicou em 'Agendar conversa'! Entre em contato agora.";
  if (cliques.includes("clicou_whatsapp"))
    return "🔥 URGENTE: lead clicou no WhatsApp! Responda já.";

  // ── Abriu e leu tudo (scroll ≥ 100%) ──
  if (acessos >= 1 && scroll >= 100)
    return "📖 Lead leu a apresentação inteira! Ótimo momento para ligar agora.";

  // ── Abriu e leu boa parte (scroll 75–99%) ──
  if (acessos >= 1 && scroll >= 75)
    return "📖 Lead leu a maior parte — mostre-se disponível com um WhatsApp hoje.";

  // ── Abriu mais de uma vez (ainda lendo) ──
  if (acessos > 1 && scroll < 75)
    return `👁️ Lead voltou à apresentação ${acessos}x — está considerando. Hora de ligar.`;

  // ── Abriu mas saiu rápido (bounce: < 30s e scroll < 25%) ──
  if (acessos >= 1 && tempo < 30 && scroll < 25)
    return "⚡ Lead abriu mas saiu rápido — mande um WhatsApp curto chamando atenção.";

  // ── Abriu e leu parcialmente (scroll 25–74%) ──
  if (acessos >= 1 && scroll >= 25 && scroll < 75)
    return "✅ Lead está lendo a apresentação — aguarde 24h e faça follow-up pelo WhatsApp.";

  // ── Abriu mas leu pouco (scroll < 25%, tempo OK) ──
  if (acessos >= 1 && scroll < 25)
    return "✅ Lead abriu a apresentação — envie um WhatsApp perguntando se ficou alguma dúvida.";

  // ── Não abriu e já faz mais de 48h ──
  if (acessos === 0 && diasEnviado >= 2)
    return `❄️ Lead não abriu em ${diasEnviado} dia${diasEnviado > 1 ? "s" : ""} — tente reenviar por outro canal.`;

  // ── Recém-enviado, ainda não abriu ──
  if (acessos === 0 && diasEnviado < 2)
    return "🕐 Apresentação enviada — aguarde o lead abrir antes de fazer follow-up.";

  return null;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Modais
  const [notaModal, setNotaModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [agendaModal, setAgendaModal] = useState(false);
  const [vendidoModal, setVendidoModal] = useState(false);
  const [perdidoModal, setPerdidoModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  // Campos
  const [novaNota, setNovaNota] = useState("");
  const [tipoNota, setTipoNota] = useState("anotacao");
  const [novaTask, setNovaTask] = useState({ descricao:"", dueAt:"", dueHora:"", linkReuniao:"", endereco:"" });
  const [agenda, setAgenda] = useState({ retornoAt:"", retornoHora:"", proximaAcao:"" });
  const [motivo, setMotivo] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [sendingEmail, setSendingEmail] = useState<string|null>(null);
  const [apEnviando, setApEnviando] = useState<string|null>(null);
  const [apPreviewModal, setApPreviewModal] = useState(false);
  const [apData, setApData] = useState<any>(null);

  // Follow-up Inteligente
  const [fuMsgText, setFuMsgText]           = useState<string>("");
  const [fuSituacaoId, setFuSituacaoId]     = useState<string | null>(null);
  const [fuCopied, setFuCopied]             = useState(false);
  const [fuEmailModal, setFuEmailModal]     = useState(false);
  const [fuDropdown, setFuDropdown]         = useState(false);
  const [fuLinkCopied, setFuLinkCopied]     = useState(false);

  const load = () => {
    fetch(`/api/app/crm/${params.id}`)
      .then(r => r.json())
      .then(d => { setLead(d.lead); setEditForm(d.lead); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [params.id]);

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const patch = async (body: any) => {
    setSaving(true);
    const res = await fetch(`/api/app/crm/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.lead) setLead(data.lead);
    setSaving(false);
    return data;
  };

  const adicionarNota = async () => {
    if (!novaNota.trim()) return;
    await patch({ action: "add_nota", texto: novaNota, tipo: tipoNota });
    load();
    setNotaModal(false); setNovaNota(""); setTipoNota("anotacao");
    toast("Nota adicionada ✓");
  };

  const adicionarTask = async () => {
    if (!novaTask.descricao.trim()) return;
    const dueAt = novaTask.dueAt && novaTask.dueHora
      ? new Date(`${novaTask.dueAt}T${novaTask.dueHora}`).toISOString()
      : novaTask.dueAt ? new Date(novaTask.dueAt).toISOString() : null;
    await fetch(`/api/app/crm/${params.id}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novaTask, dueAt }),
    });
    load();
    setTaskModal(false);
    setNovaTask({ descricao:"", dueAt:"", dueHora:"", linkReuniao:"", endereco:"" });
    toast("Tarefa criada ✓");
  };

  const salvarAgenda = async () => {
    const retornoAt = agenda.retornoAt && agenda.retornoHora
      ? new Date(`${agenda.retornoAt}T${agenda.retornoHora}`).toISOString()
      : agenda.retornoAt ? new Date(agenda.retornoAt).toISOString() : null;
    await patch({ retornoAt, proximaAcao: agenda.proximaAcao });
    setAgendaModal(false);
    toast("Agenda salva ✓");
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    await fetch(`/api/app/crm/${params.id}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }),
    });
    load();
  };

  const marcarVendido = async () => {
    await patch({ action: "vendido", observacao: motivo });
    setVendidoModal(false); setMotivo("");
    toast("Lead marcado como VENDIDO! 🏆");
  };

  const marcarPerdido = async () => {
    await patch({ action: "perdido", motivo });
    setPerdidoModal(false); setMotivo("");
    toast("Lead marcado como perdido.");
  };

  const pausar = async () => {
    await patch({ action: lead?.situacao === "pausado" ? "reativar" : "pausar" });
    toast(lead?.situacao === "pausado" ? "Lead reativado ✓" : "Lead pausado.");
  };

  const salvarEdicao = async () => {
    await patch(editForm);
    setEditModal(false);
    toast("Dados atualizados ✓");
  };

  const enviarApresentacao = async (canal: string) => {
    if (!params.id) return;
    setApEnviando(canal);
    try {
      const res = await fetch(`/api/app/crm/${params.id}/enviar-apresentacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal }),
      });
      const data = await res.json();
      if (!data.ok) { toast(`Erro: ${data.error || "tente novamente"}`); return; }
      load();
      if (canal === "email") {
        toast("✉️ Apresentação enviada por e-mail!");
      } else if (canal === "link") {
        setApData(data);
        try { await navigator.clipboard.writeText(data.link); toast("🔗 Link copiado!"); }
        catch { setApPreviewModal(true); }
      } else {
        setApData(data);
        setApPreviewModal(true);
      }
    } catch {
      toast("Erro ao gerar apresentação. Tente novamente.");
    } finally {
      setApEnviando(null);
    }
  };

  // ── Registra ação do follow-up na timeline ──────────────────────────────────
  const registrarAcaoFu = async (texto: string) => {
    await fetch(`/api/app/crm/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_nota", texto, tipo: "whatsapp" }),
    }).catch(() => {});
    load();
  };

  // ── Helper: contexto do lead para mensagens ──────────────────────────────────
  function leadCtx(): LeadFollowupContext {
    return {
      contato:               lead?.contato,
      empresa:               lead?.empresa,
      setor:                 lead?.setor,
      cidade:                lead?.cidade,
      whatsapp:              lead?.whatsapp || lead?.telefone,
      telefone:              lead?.telefone,
      email:                 lead?.email,
      franqueadoNome:        lead?.franchise?.responsavel,
      franqueadoCidade:      lead?.franchise?.cidade && lead?.franchise?.uf
                               ? `${lead.franchise.cidade}/${lead.franchise.uf}` : undefined,
      apresentacaoToken:     lead?.apresentacaoToken,
      apresentacaoAcessos:   lead?.apresentacaoAcessos,
      apresentacaoScrollMax: lead?.apresentacaoScrollMax,
      apresentacaoTempoSeg:  lead?.apresentacaoTempoSeg,
      apresentacaoCliques:   lead?.apresentacaoCliques,
      apresentacaoEnviadaEm: lead?.apresentacaoEnviadaEm,
      leadScore:             lead?.leadScore,
    };
  }

  // ── Seleciona situação (automática ou manual) e carrega mensagem ─────────────
  function selecionarSituacao(sit: FollowupSituacao) {
    setFuSituacaoId(sit.id);
    setFuMsgText(sit.mensagem.whatsapp);
    setFuDropdown(false);
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Carregando...</div>;
  if (!lead) return <div className="p-8 text-center text-red-400">Lead não encontrado.</div>;

  const notas = lead.notas || [];
  const tasks = lead.tasks || [];
  const pendentes = tasks.filter((t: any) => !t.done);
  const concluidas = tasks.filter((t: any) => t.done);

  // Módulo 7 — Timeline unificada (notas + tasks como eventos)
  const timelineItems = [
    ...notas.map((n: any) => ({
      id: n.id, tipo: n.tipo || "anotacao", texto: n.texto,
      at: new Date(n.createdAt), isTask: false,
    })),
    ...tasks.map((t: any) => ({
      id: t.id, tipo: "tarefa",
      texto: `${t.done ? "✅" : "⬜"} Tarefa: ${t.descricao}${t.dueAt ? ` · vence ${new Date(t.dueAt).toLocaleDateString("pt-BR")}` : ""}`,
      at: new Date(t.createdAt), isTask: true, done: t.done,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const TIPO_TIMELINE: Record<string,{icon:string;color:string}> = {
    ...TIPO_NOTA,
    tarefa: {icon:"✅",color:"bg-slate-100 text-slate-600"},
  };

  return (
    <div>
      {msg && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm" className="text-slate-400 hover:text-slate-600 text-sm">← CRM</Link>
          <span className="text-slate-300">/</span>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{lead.empresa}</h1>
            {lead.contato && <p className="text-slate-500 text-sm">{lead.contato}{lead.cargo ? ` — ${lead.cargo}` : ""}</p>}
          </div>
          <Badge variant={SITUACAO_BADGE[lead.situacao] || "gray"}>
            {lead.situacao === "ativo" ? "Ativo" : lead.situacao === "vendido" ? "Vendido ✓" : lead.situacao === "perdido" ? "Perdido" : "Pausado"}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" size="sm" onClick={() => setEditModal(true)}>✏️ Editar</Button>
          <Button variant="secondary" size="sm" onClick={() => setNotaModal(true)}>📝 Nota</Button>
          <Button variant="secondary" size="sm" onClick={() => setTaskModal(true)}>✅ Tarefa</Button>
          <Button variant="secondary" size="sm" onClick={() => setAgendaModal(true)}>📅 Agenda</Button>
          {lead.situacao === "ativo" && (
            <>
              <Button size="sm" onClick={() => setVendidoModal(true)}>🏆 Vendido</Button>
              <Button variant="danger" size="sm" onClick={() => setPerdidoModal(true)}>✗ Perdido</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={pausar}>
            {lead.situacao === "pausado" ? "▶ Reativar" : "⏸ Pausar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Coluna 1: Dados do lead */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Dados do Lead</h3>
            <div className="space-y-2 text-sm">
              {[
                ["Empresa", lead.empresa],
                ["Contato", lead.contato],
                ["Cargo", lead.cargo],
                ["E-mail", lead.email],
                ["Telefone", lead.telefone],
                ["WhatsApp", lead.whatsapp],
                ["Instagram", lead.instagram ? `@${lead.instagram.replace(/^@/,"")}` : null],
                ["LinkedIn", lead.linkedin],
                ["Cidade", lead.cidade ? `${lead.cidade}${lead.uf ? ` / ${lead.uf}` : ""}` : lead.uf],
                ["Segmento", lead.setor],
                ["Origem", lead.origem],
                ["Prioridade", lead.prioridade],
              ].filter(([,v]) => v).map(([l,v]) => (
                <div key={l}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{l}</p>
                  <p className="font-medium">{v}</p>
                </div>
              ))}
              {lead.valorNegociado && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Valor Negociado</p>
                  <p className="font-bold text-emerald-600">R$ {Number(lead.valorNegociado).toLocaleString("pt-BR")}</p>
                </div>
              )}
            </div>

            {/* Ações rápidas — Módulos 5, 6 e 8 */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">

              {/* E-mail Comercial (Módulo 5) */}
              {lead.email ? (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">✉️ E-mail Comercial</p>
                  <div className="space-y-1">
                    {EMAIL_TEMPLATES.map(({ label, template, desc }) => (
                      <button
                        key={template}
                        disabled={sendingEmail === template}
                        onClick={async () => {
                          setSendingEmail(template);
                          const res = await fetch(`/api/app/crm/${params.id}/send-email`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ template }),
                          });
                          const data = await res.json();
                          setSendingEmail(null);
                          if (data.ok) {
                            toast(`✉️ E-mail "${label}" enviado!`);
                            load();
                          } else {
                            toast(`Erro: ${data.error || "falha ao enviar"}`);
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors disabled:opacity-50"
                      >
                        <p className="text-[11px] font-bold text-purple-800">
                          {sendingEmail === template ? "Enviando..." : label}
                        </p>
                        <p className="text-[10px] text-purple-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Cadastre um e-mail para enviar mensagens comerciais.</p>
              )}

              {/* WhatsApp Comercial (Módulo 6) */}
              {lead.telefone && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">📱 WhatsApp Comercial</p>
                  {[
                    {label:"Apresentação Smarter", etapa:"primeiro_contato"},
                    {label:"Confirmação de Reunião", etapa:"apresentacao"},
                    {label:"Follow-up da Proposta", etapa:"proposta"},
                    {label:"Reforço Comercial",     etapa:"negociacao"},
                    {label:"Boas-vindas",           etapa:"fechado"},
                    {label:"Reengajamento",         etapa:"reengajamento"},
                  ].map(({label, etapa}) => (
                    <a key={etapa}
                      href={buildWhatsLink(lead, etapa)}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => logWhatsClick(params.id as string, label)}
                      className="block text-[10px] text-green-700 hover:underline py-0.5 font-medium">
                      📱 {label}
                    </a>
                  ))}
                </div>
              )}

              {/* Contrato de Parceria (Módulo 8) */}
              {(lead.situacao === "vendido" || lead.etapa === "fechado") && (
                <button
                  onClick={() => gerarContrato(params.id as string)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#0f2a5e]/5 hover:bg-[#0f2a5e]/10 border border-[#0f2a5e]/10 transition-colors">
                  <p className="text-[11px] font-bold text-[#0f2a5e]">📄 Gerar Contrato de Parceria</p>
                  <p className="text-[10px] text-slate-500">Abre HTML pronto para impressão</p>
                </button>
              )}
            </div>
          </Card>

          {/* ── APRESENTAÇÃO COMERCIAL ─────────────────────────────── */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🎯 Apresentação Comercial</h3>

            {/* Lead Score */}
            {lead.leadScore != null && lead.apresentacaoEnviadaEm && (() => {
              const temp = scoreTemperatura(lead.leadScore);
              return (
                <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between ${temp.cls}`}>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-70">Lead Score</p>
                    <p className="text-2xl font-black">{lead.leadScore}<span className="text-xs font-normal ml-1">/100</span></p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${temp.cls}`}>{temp.label}</span>
                </div>
              );
            })()}

            {/* Métricas de engajamento */}
            {lead.apresentacaoEnviadaEm && (
              <div className="mb-4">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Engajamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Acessos",   value: lead.apresentacaoAcessos || 0 },
                    { label: "Tempo",     value: `${Math.floor((lead.apresentacaoTempoSeg || 0) / 60)}m${String((lead.apresentacaoTempoSeg || 0) % 60).padStart(2,"0")}s` },
                    { label: "Scroll",    value: `${lead.apresentacaoScrollMax || 0}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                      <p className="text-sm font-black text-slate-700">{String(value)}</p>
                    </div>
                  ))}
                </div>
                {/* Cliques */}
                {lead.apresentacaoCliques && (() => {
                  let cliques: string[] = [];
                  try { cliques = JSON.parse(lead.apresentacaoCliques); } catch {}
                  const labels: Record<string,string> = {
                    clicou_whatsapp: "📱 WhatsApp",
                    clicou_agendamento: "📅 Agendamento",
                    clicou_vaga: "🎯 Vaga",
                  };
                  return cliques.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cliques.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#0D2B5C]/10 text-[#0D2B5C] text-[10px] rounded-full font-bold">
                          {labels[c] || c}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* ── FOLLOW-UP INTELIGENTE ─────────────────────────────── */}
            {(() => {
              if (!lead.apresentacaoEnviadaEm) return null;
              const ctx = leadCtx();
              const autoSit = detectarSituacao(ctx);
              const todasSit = todasSituacoes(ctx);
              const sitAtiva: FollowupSituacao | undefined =
                fuSituacaoId ? todasSit.find(s => s.id === fuSituacaoId) ?? autoSit ?? undefined
                             : autoSit ?? undefined;
              if (!autoSit && !fuSituacaoId) return null;

              const link = lead.apresentacaoToken
                ? `https://sistema.smarterestagios.com.br/comercial/${lead.apresentacaoToken}`
                : null;

              const wppNum = lead.whatsapp || lead.telefone;
              const wppUrl = buildWppUrl(wppNum, fuMsgText || sitAtiva?.mensagem.whatsapp || "");
              const emailDisp = !!lead.email && !!sitAtiva?.mensagem.emailAssunto;

              // Canal badge cores
              const canalCor: Record<string, string> = {
                whatsapp:          "bg-green-100 text-green-700",
                whatsapp_email:    "bg-green-100 text-green-700",
                ligacao_whatsapp:  "bg-orange-100 text-orange-700",
                email:             "bg-purple-100 text-purple-700",
                aguardar:          "bg-slate-100 text-slate-500",
              };

              return (
                <div className="mb-4 space-y-3">

                  {/* Indicador contextual */}
                  {sitAtiva && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                      sitAtiva.urgente
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-amber-50 border border-amber-200 text-amber-800"
                    }`}>
                      {sitAtiva.indicador}
                    </div>
                  )}

                  {/* Módulo de mensagem */}
                  <div className="border border-[#0D2B5C]/15 rounded-2xl overflow-hidden">
                    {/* Header do módulo */}
                    <div className="bg-[#0D2B5C] px-4 py-2.5 flex items-center justify-between">
                      <p className="text-white text-[11px] font-black uppercase tracking-wide">💬 Mensagem sugerida</p>
                      {sitAtiva && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canalCor[sitAtiva.canal] || "bg-slate-100 text-slate-600"}`}>
                          {sitAtiva.canalLabel}
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-3 space-y-3">
                      {/* Textarea editável */}
                      <textarea
                        rows={7}
                        value={fuMsgText || (sitAtiva?.mensagem.whatsapp ?? "")}
                        onChange={e => setFuMsgText(e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#0D2B5C]/30 leading-relaxed"
                        placeholder="Selecione uma situação para ver a mensagem sugerida..."
                      />
                      <p className="text-[10px] text-slate-400 italic">Você pode editar a mensagem antes de enviar.</p>

                      {/* Botões de ação */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Copiar */}
                        <button
                          onClick={async () => {
                            const txt = fuMsgText || sitAtiva?.mensagem.whatsapp || "";
                            await navigator.clipboard.writeText(txt).catch(() => {});
                            setFuCopied(true);
                            setTimeout(() => setFuCopied(false), 2000);
                            await registrarAcaoFu("📋 Mensagem sugerida copiada pelo usuário");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                        >
                          {fuCopied ? "✓ Copiada!" : "📋 Copiar"}
                        </button>

                        {/* WhatsApp */}
                        <button
                          disabled={!wppUrl}
                          title={!wppUrl ? "Este lead não possui WhatsApp cadastrado." : undefined}
                          onClick={async () => {
                            if (!wppUrl) return;
                            window.open(wppUrl, "_blank");
                            await registrarAcaoFu("📱 Follow-up aberto no WhatsApp");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          📱 WhatsApp
                        </button>

                        {/* E-mail */}
                        <button
                          disabled={!emailDisp}
                          title={!lead.email ? "Este lead não possui e-mail cadastrado." : undefined}
                          onClick={async () => {
                            setFuEmailModal(true);
                            await registrarAcaoFu("📧 Follow-up preparado por e-mail");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          📧 E-mail
                        </button>

                        {/* Copiar link */}
                        <button
                          disabled={!link}
                          onClick={async () => {
                            if (!link) return;
                            await navigator.clipboard.writeText(link).catch(() => {});
                            setFuLinkCopied(true);
                            setTimeout(() => setFuLinkCopied(false), 2000);
                            await registrarAcaoFu("🔗 Link da apresentação copiado");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-bold transition-colors disabled:opacity-40"
                        >
                          {fuLinkCopied ? "✓ Copiado!" : "🔗 Copiar Link"}
                        </button>
                      </div>

                      {/* Marcar follow-up realizado */}
                      <button
                        onClick={async () => {
                          await registrarAcaoFu("✅ Follow-up realizado pelo franqueado");
                          if (sitAtiva) {
                            const prox = calcularProximoFollowup(sitAtiva);
                            await fetch(`/api/app/crm/${params.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ultimoContato: new Date().toISOString(),
                                retornoAt: prox.toISOString(),
                                proximaAcao: `Follow-up: ${sitAtiva.canalLabel}`,
                              }),
                            }).catch(() => {});
                            load();
                          }
                          toast("✅ Follow-up registrado! Próximo retorno agendado.");
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0D2B5C] hover:bg-[#0f3470] text-white text-[11px] font-black transition-colors"
                      >
                        ✅ Marcar follow-up como realizado
                      </button>
                    </div>
                  </div>

                  {/* Dropdown: escolher outro modelo */}
                  <div className="relative">
                    <button
                      onClick={() => setFuDropdown(!fuDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <span>🔄 Escolher outro modelo de mensagem</span>
                      <span className={`transition-transform ${fuDropdown ? "rotate-180" : ""}`}>▾</span>
                    </button>

                    {fuDropdown && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                        {GRUPOS_FOLLOWUP.map(grupo => (
                          <div key={grupo.label}>
                            <p className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wide border-b border-slate-100">
                              {grupo.label}
                            </p>
                            {grupo.ids.map(id => {
                              const s = todasSit.find(x => x.id === id);
                              if (!s) return null;
                              return (
                                <button
                                  key={id}
                                  onClick={() => selecionarSituacao(s)}
                                  className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#0D2B5C]/5 transition-colors border-b border-slate-50 ${fuSituacaoId === id ? "bg-[#0D2B5C]/8 font-black text-[#0D2B5C]" : "text-slate-700"}`}
                                >
                                  {s.indicador.length > 60 ? s.indicador.slice(0, 57) + "…" : s.indicador}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Link enviado */}
            {lead.apresentacaoToken && (
              <div className="mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Link gerado</p>
                  <button
                    onClick={() => {
                      const url = `https://sistema.smarterestagios.com.br/comercial/${lead.apresentacaoToken}`;
                      navigator.clipboard.writeText(url).then(() => toast("🔗 Link copiado!")).catch(() => {});
                    }}
                    className="text-[10px] text-blue-500 hover:underline font-semibold"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  sistema.smarterestagios.com.br/comercial/{lead.apresentacaoToken?.slice(0, 12)}…
                </p>
                {lead.apresentacaoAbertaEm && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    ✓ Aberta em {new Date(lead.apresentacaoAbertaEm).toLocaleDateString("pt-BR")}
                    {lead.apresentacaoCanal && ` · por ${lead.apresentacaoCanal}`}
                  </p>
                )}
              </div>
            )}

            {/* Canais de envio */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Enviar apresentação</p>
              {[
                { canal: "email",     icon: "✉️", label: "E-mail",       desc: "Envia automaticamente" },
                { canal: "whatsapp",  icon: "📱", label: "WhatsApp",     desc: "Abre wa.me com mensagem" },
                { canal: "instagram", icon: "📸", label: "Instagram",    desc: "Copia mensagem para DM" },
                { canal: "linkedin",  icon: "💼", label: "LinkedIn",     desc: "Copia mensagem" },
                { canal: "link",      icon: "🔗", label: "Copiar Link",  desc: "Link rastreável direto" },
              ].map(({ canal, icon, label, desc }) => (
                <button
                  key={canal}
                  disabled={!!apEnviando}
                  onClick={() => enviarApresentacao(canal)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#0D2B5C]/5 hover:bg-[#0D2B5C]/10 border border-[#0D2B5C]/10 transition-colors disabled:opacity-40"
                >
                  <p className="text-[11px] font-bold text-[#0D2B5C]">
                    {apEnviando === canal ? "Gerando..." : `${icon} ${label}`}
                  </p>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Etapa */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Etapa do Pipeline</h3>
            <div className="space-y-1">
              {ETAPAS.map((e, i) => (
                <button key={e} onClick={() => patch({ etapa: e }).then(() => toast("Etapa atualizada ✓"))}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    lead.etapa === e
                      ? "bg-[#0f2a5e] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {i > 0 && "→ "}{ETAPA_LABEL[e]}
                </button>
              ))}
            </div>
          </Card>

          {/* Agenda */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Agenda</h3>
            {lead.retornoAt ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-800">📅 Retorno agendado</p>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  {new Date(lead.retornoAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                </p>
                {lead.proximaAcao && <p className="text-xs text-amber-700 mt-1">{lead.proximaAcao}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhum retorno agendado.</p>
            )}
            {lead.ultimoContato && (
              <p className="text-[10px] text-slate-400 mt-2">
                Último contato: {new Date(lead.ultimoContato).toLocaleDateString("pt-BR")}
              </p>
            )}
            <button onClick={() => setAgendaModal(true)}
              className="mt-3 text-xs text-blue-500 hover:underline font-semibold">
              + Agendar retorno
            </button>
          </Card>
        </div>

        {/* Coluna 2: Tarefas */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tarefas ({pendentes.length} pendentes)
              </h3>
              <button onClick={() => setTaskModal(true)} className="text-[10px] text-blue-500 hover:underline font-bold">
                + Nova
              </button>
            </div>

            {pendentes.length === 0 && concluidas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma tarefa criada.</p>
            ) : (
              <div className="space-y-2">
                {pendentes.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <input type="checkbox" checked={false} onChange={() => toggleTask(t.id, true)}
                      className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{t.descricao}</p>
                      {t.dueAt && (
                        <p className={`text-[10px] mt-0.5 ${new Date(t.dueAt) < new Date() ? "text-red-500 font-bold" : "text-slate-400"}`}>
                          {new Date(t.dueAt) < new Date() ? "⚠️ " : ""}
                          {new Date(t.dueAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                        </p>
                      )}
                      {t.linkReuniao && (
                        <a href={t.linkReuniao} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:underline">🔗 Entrar na reunião</a>
                      )}
                      {t.endereco && <p className="text-[10px] text-slate-400">📍 {t.endereco}</p>}
                    </div>
                  </div>
                ))}
                {concluidas.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-1">Concluídas ({concluidas.length})</p>
                    {concluidas.slice(0,3).map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 py-1">
                        <input type="checkbox" checked onChange={() => toggleTask(t.id, false)} className="w-3.5 h-3.5"/>
                        <p className="text-[10px] text-slate-400 line-through">{t.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna 3: Timeline Unificada (Módulo 7) */}
        <div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Timeline ({timelineItems.length})
              </h3>
              <button onClick={() => setNotaModal(true)} className="text-[10px] text-blue-500 hover:underline font-bold">
                + Nota
              </button>
            </div>

            {timelineItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma interação registrada.</p>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {timelineItems.map((item) => {
                  const meta = TIPO_TIMELINE[item.tipo] || TIPO_TIMELINE.anotacao;
                  return (
                    <div key={item.id} className={`relative pl-4 border-l-2 pb-3 last:pb-0 ${
                      item.tipo==="etapa" ? "border-indigo-200" :
                      item.tipo==="email" ? "border-purple-200" :
                      item.tipo==="whatsapp" ? "border-green-200" :
                      item.tipo==="alerta" ? "border-red-200" :
                      "border-slate-200"
                    }`}>
                      <div className="absolute -left-2 top-0">
                        <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${meta.color}`}>{meta.icon}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{item.texto}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.at.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* SLA badge na etapa atual (Módulo 1 — exibição no detalhe) */}
          {lead.situacao === "ativo" && (() => {
            const st = slaStatus(lead.etapa, (lead as any).etapaChangedAt);
            const dr = diasRestantes(lead.etapa, (lead as any).etapaChangedAt);
            if (st === "vencido") return (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                🚨 SLA vencido há <strong>{Math.abs(dr??0)} dia(s)</strong> nesta etapa. Tarefa automática criada.
              </div>
            );
            if (st === "alerta") return (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
                ⚠️ SLA: apenas <strong>{dr} dia(s)</strong> restante(s) nesta etapa.
              </div>
            );
            return null;
          })()}
        </div>
      </div>

      {/* Modal: Nova Nota */}
      <Modal open={notaModal} onClose={() => setNotaModal(false)} title="Registrar Interação">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TIPO_NOTA).map(([k, v]) => (
                <button key={k} onClick={() => setTipoNota(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    tipoNota === k ? "border-[#0f2a5e] bg-[#0f2a5e] text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {v.icon} {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Anotação *</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-28 resize-none outline-none focus:border-[#0f2a5e]"
              value={novaNota} onChange={e => setNovaNota(e.target.value)}
              placeholder="Descreva o que foi conversado, enviado ou combinado..."
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setNotaModal(false)}>Cancelar</Button>
            <Button onClick={adicionarNota} disabled={!novaNota.trim() || saving}>
              {saving ? "Salvando..." : "Registrar ✓"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Tarefa */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Nova Tarefa">
        <div className="space-y-3">
          <Input label="Descrição *" value={novaTask.descricao} onChange={e => setNovaTask(p => ({...p, descricao: e.target.value}))} placeholder="Enviar proposta, ligar para o cliente..."/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={novaTask.dueAt} onChange={e => setNovaTask(p => ({...p, dueAt: e.target.value}))}/>
            <Input label="Horário" type="time" value={novaTask.dueHora} onChange={e => setNovaTask(p => ({...p, dueHora: e.target.value}))}/>
          </div>
          <Input label="Link de Reunião (opcional)" value={novaTask.linkReuniao} onChange={e => setNovaTask(p => ({...p, linkReuniao: e.target.value}))} placeholder="https://meet.google.com/..."/>
          <Input label="Endereço (opcional)" value={novaTask.endereco} onChange={e => setNovaTask(p => ({...p, endereco: e.target.value}))} placeholder="Rua, número..."/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
            <Button onClick={adicionarTask} disabled={!novaTask.descricao.trim()}>Criar Tarefa ✓</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Agendar Retorno */}
      <Modal open={agendaModal} onClose={() => setAgendaModal(false)} title="Agendar Retorno">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={agenda.retornoAt} onChange={e => setAgenda(p => ({...p, retornoAt: e.target.value}))}/>
            <Input label="Horário" type="time" value={agenda.retornoHora} onChange={e => setAgenda(p => ({...p, retornoHora: e.target.value}))}/>
          </div>
          <Input label="Próxima Ação" value={agenda.proximaAcao} onChange={e => setAgenda(p => ({...p, proximaAcao: e.target.value}))} placeholder="Ligar para apresentar proposta..."/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAgendaModal(false)}>Cancelar</Button>
            <Button onClick={salvarAgenda} disabled={!agenda.retornoAt}>Salvar ✓</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Vendido */}
      <Modal open={vendidoModal} onClose={() => setVendidoModal(false)} title="🏆 Marcar como Vendido">
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            O lead <strong>{lead.empresa}</strong> será marcado como <strong>VENDIDO</strong> e movido para Fechado.
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Observação (opcional)</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
              value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Detalhes do fechamento, valor acordado..."/>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setVendidoModal(false)}>Cancelar</Button>
            <Button onClick={marcarVendido}>Confirmar — Vendido! 🏆</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Perdido */}
      <Modal open={perdidoModal} onClose={() => setPerdidoModal(false)} title="✗ Marcar como Perdido">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Motivo da perda *</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-24 resize-none outline-none focus:border-[#0f2a5e]"
              value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Preço, concorrente, não tem estagiários no momento..."/>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPerdidoModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={marcarPerdido} disabled={!motivo.trim()}>Confirmar — Perdido</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Lead */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Lead" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Empresa" value={editForm.empresa||""} onChange={e=>setEditForm((p:any)=>({...p,empresa:e.target.value}))}/>
          <Input label="Contato" value={editForm.contato||""} onChange={e=>setEditForm((p:any)=>({...p,contato:e.target.value}))}/>
          <Input label="Cargo" value={editForm.cargo||""} onChange={e=>setEditForm((p:any)=>({...p,cargo:e.target.value}))} placeholder="Gerente de RH, CEO..."/>
          <Input label="Telefone (fixo)" value={editForm.telefone||""} onChange={e=>setEditForm((p:any)=>({...p,telefone:e.target.value}))}/>
          <Input label="WhatsApp" value={editForm.whatsapp||""} onChange={e=>setEditForm((p:any)=>({...p,whatsapp:e.target.value}))} placeholder="(11) 99999-9999"/>
          <Input label="E-mail" type="email" value={editForm.email||""} onChange={e=>setEditForm((p:any)=>({...p,email:e.target.value}))}/>
          <Input label="Instagram" value={editForm.instagram||""} onChange={e=>setEditForm((p:any)=>({...p,instagram:e.target.value}))} placeholder="@usuario"/>
          <Input label="LinkedIn" value={editForm.linkedin||""} onChange={e=>setEditForm((p:any)=>({...p,linkedin:e.target.value}))} placeholder="linkedin.com/in/..."/>
          <Input label="Cidade" value={editForm.cidade||""} onChange={e=>setEditForm((p:any)=>({...p,cidade:e.target.value}))}/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">UF</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={editForm.uf||""} onChange={e=>setEditForm((p:any)=>({...p,uf:e.target.value}))}>
              <option value="">Selecionar...</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf=>(
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <Input label="Valor Negociado (R$)" type="number" value={editForm.valorNegociado||""} onChange={e=>setEditForm((p:any)=>({...p,valorNegociado:e.target.value}))}/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Prioridade</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={editForm.prioridade||"media"} onChange={e=>setEditForm((p:any)=>({...p,prioridade:e.target.value}))}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
          <Button onClick={salvarEdicao} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>

      {/* Modal: Preview Apresentação Comercial */}
      {/* Modal: E-mail do Follow-up Inteligente */}
      {fuEmailModal && (() => {
        const ctx = leadCtx();
        const todasSit = todasSituacoes(ctx);
        const sit = fuSituacaoId ? todasSit.find(s => s.id === fuSituacaoId) : detectarSituacao(ctx);
        const assunto = sit?.mensagem.emailAssunto || "Smarter Estágios";
        const corpo   = sit?.mensagem.emailCorpo   || fuMsgText;
        const mailto  = `mailto:${lead.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
        return (
          <Modal open={fuEmailModal} onClose={() => setFuEmailModal(false)} title="📧 Enviar por E-mail" size="lg">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Para</p>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700">{lead.email}</span>
                  <button onClick={() => navigator.clipboard.writeText(lead.email || "").catch(()=>{})}
                    className="text-[10px] text-blue-500 hover:underline font-bold">Copiar</button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Assunto</p>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700">{assunto}</span>
                  <button onClick={() => navigator.clipboard.writeText(assunto).catch(()=>{})}
                    className="text-[10px] text-blue-500 hover:underline font-bold">Copiar</button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Corpo do e-mail</p>
                <div className="relative">
                  <textarea readOnly value={corpo} rows={9}
                    className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none" />
                  <button onClick={() => navigator.clipboard.writeText(corpo).catch(()=>{})}
                    className="absolute top-2 right-2 text-[10px] text-blue-500 hover:underline font-bold bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                    Copiar corpo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a href={mailto}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2B5C] text-white text-xs font-black hover:bg-[#0f3470] transition-colors text-center">
                  📨 Abrir no e-mail
                </a>
                <button onClick={() => setFuEmailModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: Preview Apresentação Comercial */}
      <Modal open={apPreviewModal} onClose={() => setApPreviewModal(false)} title="📊 Apresentação Gerada" size="lg">
        {apData && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-bold text-emerald-700 mb-2">✅ Link rastreável gerado!</p>
              <div className="flex items-center gap-2">
                <code className="text-[11px] bg-white border border-emerald-200 rounded-lg px-2 py-1 flex-1 text-emerald-800 break-all">{apData.link}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(apData.link).then(() => toast("🔗 Link copiado!")).catch(()=>{})}
                  className="text-xs text-blue-600 hover:underline font-semibold whitespace-nowrap"
                >
                  Copiar
                </button>
              </div>
            </div>

            {apData.mensagem && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-600">Mensagem sugerida:</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(apData.mensagem).then(() => toast("📋 Mensagem copiada!")).catch(()=>{})}
                    className="text-xs text-blue-500 hover:underline font-semibold"
                  >
                    📋 Copiar
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{apData.mensagem}</pre>
                </div>
              </div>
            )}

            {apData.whatsappLink && (
              <a href={apData.whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-bold text-sm transition-colors">
                📱 Abrir WhatsApp
              </a>
            )}

            {apData.instagramProfile && (
              <a href={`https://instagram.com/${apData.instagramProfile.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-xl py-3 font-bold text-sm transition-opacity">
                📸 Abrir Perfil no Instagram
              </a>
            )}

            <Button variant="secondary" className="w-full" onClick={() => setApPreviewModal(false)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
