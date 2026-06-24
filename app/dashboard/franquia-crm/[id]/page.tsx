"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FRANQUIA_PIPELINE,
  FRANQUIA_ETAPAS_ORDER,
  franquiaSlaStatus,
  franquiaDiasRestantes,
} from "@/lib/crm/franquia-pipeline";
import {
  FRANQUIA_EMAIL_TEMPLATES_LIST,
} from "@/lib/crm/franquia-email-templates";
import {
  FRANQUIA_WHATS_TEMPLATES,
  buildFranquiaWhatsAppUrl,
} from "@/lib/crm/franquia-whatsapp-templates";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  nomeCompleto: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  etapa: string;
  situacao: string;
  origem: string | null;
  leadFrio: boolean;
  optIn: boolean;
  anotacao: string | null;
  proximaAcao: string | null;
  retornoAt: string | null;
  ultimoContato: string | null;
  etapaChangedAt: string | null;
  valorInvestimento: number | null;
  notas: { id: string; texto: string; tipo: string; createdAt: string }[];
  tarefas: { id: string; descricao: string; dueAt: string | null; done: boolean; createdAt: string }[];
}

const TIPO_NOTA_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  anotacao:  { bg: "bg-slate-100",   text: "text-slate-700",  icon: "📝" },
  email:     { bg: "bg-blue-50",     text: "text-blue-700",   icon: "✉️" },
  whatsapp:  { bg: "bg-green-50",    text: "text-green-700",  icon: "💬" },
  etapa:     { bg: "bg-purple-50",   text: "text-purple-700", icon: "🔄" },
  alerta:    { bg: "bg-red-50",      text: "text-red-700",    icon: "⚠️" },
};

export default function FranquiaLeadPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [lead, setLead]   = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  // Nota
  const [notaTexto, setNotaTexto] = useState("");
  const [notaTipo,  setNotaTipo]  = useState("anotacao");

  // Tarefa
  const [tarefaTexto, setTarefaTexto] = useState("");
  const [tarefaDue,   setTarefaDue]   = useState("");

  // Modal perdido
  const [perdidoModal, setPerdidoModal] = useState(false);
  const [perdidoMotivo, setPerdidoMotivo] = useState("");

  // Edição inline
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState({ email: "", telefone: "", cidade: "", estado: "", proximaAcao: "", anotacao: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/franquia-crm/${id}`);
      const d = await r.json();
      setLead(d.lead);
      if (d.lead) {
        setEditForm({
          email: d.lead.email || "",
          telefone: d.lead.telefone || "",
          cidade: d.lead.cidade || "",
          estado: d.lead.estado || "",
          proximaAcao: d.lead.proximaAcao || "",
          anotacao: d.lead.anotacao || "",
        });
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const r = await fetch(`/api/app/franquia-crm/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (r.ok) await load();
      else { const d = await r.json(); alert(d.error || "Erro"); }
    } finally { setSaving(false); }
  }

  async function sendEmail(templateKey: string) {
    if (!lead?.email) return alert("Lead sem e-mail cadastrado");
    setSendingEmail(templateKey);
    try {
      const r = await fetch(`/api/app/franquia-crm/${id}/send-email`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: templateKey }),
      });
      const d = await r.json();
      if (r.ok) { alert(`✅ E-mail enviado: "${d.subject}"`); await load(); }
      else alert(d.error || "Erro ao enviar");
    } finally { setSendingEmail(null); }
  }

  async function salvarNota() {
    if (!notaTexto.trim()) return;
    await patch({ nota: notaTexto.trim(), tipoNota: notaTipo });
    setNotaTexto("");
    setNotaTipo("anotacao");
  }

  async function salvarTarefa() {
    if (!tarefaTexto.trim()) return;
    await patch({ tarefa: tarefaTexto.trim(), tarefaDueAt: tarefaDue || undefined });
    setTarefaTexto(""); setTarefaDue("");
  }

  async function concluirTarefa(tid: string) {
    await patch({ concluirTarefaId: tid });
  }

  async function salvarEdicao() {
    await patch(editForm);
    setEditando(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lead) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Lead não encontrado</p>
        <Link href="/dashboard/franquia-crm"><Button>Voltar ao CRM</Button></Link>
      </div>
    </div>
  );

  const cfg  = FRANQUIA_PIPELINE[lead.etapa] || { label: lead.etapa, color: "#64748b", bgColor: "#f1f5f9", emoji: "📌" };
  const sla  = franquiaSlaStatus(lead.etapa, lead.etapaChangedAt ? new Date(lead.etapaChangedAt) : null);
  const dias = franquiaDiasRestantes(lead.etapa, lead.etapaChangedAt ? new Date(lead.etapaChangedAt) : null);

  // Timeline unificada
  const timeline = [
    ...lead.notas.map((n) => ({ type: "nota" as const, date: n.createdAt, data: n })),
    ...lead.tarefas.map((t) => ({ type: "tarefa" as const, date: t.createdAt, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link href="/dashboard/franquia-crm" className="hover:text-blue-800">🏢 CRM Franquias</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">{lead.nomeCompleto}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── COLUNA ESQUERDA: Info + Ações ─────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Card do Lead */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5" style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.bgColor})` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-black text-slate-900">{lead.nomeCompleto}</h1>
                  {lead.cidade && <p className="text-sm text-slate-500 mt-0.5">📍 {lead.cidade}/{lead.estado}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: cfg.color }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  {lead.leadFrio && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🧊 Lead Frio</span>}
                  {lead.situacao === "vendido" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✅ VENDIDO</span>}
                  {lead.situacao === "perdido" && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">❌ PERDIDO</span>}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {editando ? (
                <div className="space-y-2">
                  <Input placeholder="E-mail" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                  <Input placeholder="Telefone" value={editForm.telefone} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Cidade" value={editForm.cidade} onChange={(e) => setEditForm((f) => ({ ...f, cidade: e.target.value }))} />
                    <Input placeholder="UF" value={editForm.estado} onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value }))} maxLength={2} className="uppercase" />
                  </div>
                  <Input placeholder="Próxima ação" value={editForm.proximaAcao} onChange={(e) => setEditForm((f) => ({ ...f, proximaAcao: e.target.value }))} />
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="Anotação interna" value={editForm.anotacao} onChange={(e) => setEditForm((f) => ({ ...f, anotacao: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button onClick={salvarEdicao} disabled={saving} size="sm" className="flex-1 bg-blue-900">Salvar</Button>
                    <Button onClick={() => setEditando(false)} size="sm" variant="outline" className="flex-1">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {lead.email    && <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">✉️</span><span className="text-slate-700">{lead.email}</span></div>}
                  {lead.telefone && <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">📱</span><span className="text-slate-700">{lead.telefone}</span></div>}
                  {lead.origem   && <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">🌐</span><span className="text-slate-500 capitalize">{lead.origem}</span></div>}
                  {lead.proximaAcao && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                      📌 <strong>Próx. ação:</strong> {lead.proximaAcao}
                    </div>
                  )}
                  {lead.anotacao && (
                    <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600">{lead.anotacao}</div>
                  )}
                  <Button onClick={() => setEditando(true)} variant="outline" size="sm" className="w-full text-xs">✏️ Editar dados</Button>
                </>
              )}

              {/* SLA */}
              {lead.situacao === "ativo" && (
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  sla === "vencido"  ? "bg-red-50 text-red-700 border border-red-200" :
                  sla === "atencao" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                  "bg-green-50 text-green-700 border border-green-200"
                }`}>
                  {sla === "vencido" ? `⚠️ SLA vencido há ${-dias} dias` :
                   sla === "atencao" ? `⏰ ${dias} dias restantes no SLA` :
                   dias < 999 ? `✅ ${dias} dias restantes` : "—"}
                </div>
              )}
            </div>
          </div>

          {/* Mover Etapa */}
          {lead.situacao === "ativo" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-3">Mover Etapa</p>
              <div className="space-y-1.5">
                {FRANQUIA_ETAPAS_ORDER.map((etapa) => {
                  const c = FRANQUIA_PIPELINE[etapa];
                  const isActive = lead.etapa === etapa;
                  return (
                    <button
                      key={etapa}
                      onClick={() => patch({ etapa })}
                      disabled={isActive || saving}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        isActive
                          ? "text-white border-transparent"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                      style={isActive ? { backgroundColor: c.color, borderColor: c.color } : {}}
                    >
                      {c.emoji} {c.label} {isActive && "◀"}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => patch({ action: "vendido" })}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                >
                  ✅ Marcar Vendido
                </Button>
                <Button
                  onClick={() => setPerdidoModal(true)}
                  disabled={saving}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-sm"
                >
                  ❌ Perdido
                </Button>
              </div>
            </div>
          )}

          {/* E-mails comerciais */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">✉️ E-mails de Franquia</p>
            <div className="space-y-2">
              {FRANQUIA_EMAIL_TEMPLATES_LIST.map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => sendEmail(tpl.key)}
                  disabled={sendingEmail === tpl.key || !lead.email}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                    !lead.email
                      ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200"
                      : "bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                  }`}
                >
                  <div className="font-semibold text-purple-900 text-xs">{sendingEmail === tpl.key ? "Enviando..." : tpl.label}</div>
                  <div className="text-xs text-purple-600 mt-0.5">{tpl.desc}</div>
                </button>
              ))}
              {!lead.email && <p className="text-xs text-red-500 text-center">Cadastre o e-mail do lead para enviar</p>}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">💬 WhatsApp de Franquia</p>

            <p className="text-xs font-semibold text-slate-400 mb-2">🔥 Leads Ativos</p>
            <div className="space-y-1.5 mb-3">
              {FRANQUIA_WHATS_TEMPLATES.filter((t) => t.categoria === "ativo").map((tpl) => {
                const url = buildFranquiaWhatsAppUrl(tpl.key, lead);
                return (
                  <a
                    key={tpl.key}
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => url && patch({ nota: `💬 WhatsApp enviado: ${tpl.label}`, tipoNota: "whatsapp" })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      !url ? "opacity-40 pointer-events-none bg-slate-50 border-slate-200" :
                      "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300"
                    }`}
                  >
                    <span>{tpl.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold text-green-900">{tpl.label}</div>
                      <div className="text-xs text-green-600">{tpl.descricao}</div>
                    </div>
                  </a>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-slate-400 mb-2">🧊 Reaquecimento</p>
            <div className="space-y-1.5">
              {FRANQUIA_WHATS_TEMPLATES.filter((t) => t.categoria === "reaquecimento").map((tpl) => {
                const url = buildFranquiaWhatsAppUrl(tpl.key, lead);
                return (
                  <a
                    key={tpl.key}
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => url && patch({ nota: `💬 WhatsApp de reaquecimento: ${tpl.label}`, tipoNota: "whatsapp" })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      !url ? "opacity-40 pointer-events-none bg-slate-50 border-slate-200" :
                      "bg-cyan-50 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300"
                    }`}
                  >
                    <span>{tpl.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold text-cyan-900">{tpl.label}</div>
                      <div className="text-xs text-cyan-600">{tpl.descricao}</div>
                    </div>
                  </a>
                );
              })}
            </div>
            {!lead.telefone && <p className="text-xs text-red-500 text-center mt-2">Cadastre o telefone do lead para enviar</p>}
          </div>
        </div>

        {/* ─── COLUNA DIREITA: Timeline + Tarefas ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Nova nota */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Adicionar Registro</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              placeholder="Anotação, resultado de ligação, e-mail enviado..."
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
                value={notaTipo}
                onChange={(e) => setNotaTipo(e.target.value)}
              >
                <option value="anotacao">📝 Anotação</option>
                <option value="email">✉️ E-mail (manual)</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="alerta">⚠️ Alerta</option>
              </select>
              <Button onClick={salvarNota} disabled={saving || !notaTexto.trim()} className="bg-blue-900">
                Salvar
              </Button>
            </div>
          </div>

          {/* Nova tarefa */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Nova Tarefa / Follow-up</p>
            <div className="flex gap-2">
              <Input
                placeholder="Descrever a tarefa ou follow-up..."
                value={tarefaTexto}
                onChange={(e) => setTarefaTexto(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={tarefaDue}
                onChange={(e) => setTarefaDue(e.target.value)}
                className="w-36"
              />
              <Button onClick={salvarTarefa} disabled={saving || !tarefaTexto.trim()} className="bg-orange-600 hover:bg-orange-700">
                + Tarefa
              </Button>
            </div>
          </div>

          {/* Tarefas pendentes */}
          {lead.tarefas.filter((t) => !t.done).length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 p-5">
              <p className="text-xs font-bold text-orange-600 uppercase mb-3">📋 Tarefas Pendentes</p>
              <div className="space-y-2">
                {lead.tarefas.filter((t) => !t.done).map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.descricao}</p>
                      {t.dueAt && (
                        <p className={`text-xs mt-0.5 ${new Date(t.dueAt) < new Date() ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                          📅 {new Date(t.dueAt).toLocaleDateString("pt-BR")}
                          {new Date(t.dueAt) < new Date() && " — VENCIDA"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => concluirTarefa(t.id)}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 font-medium"
                    >
                      ✓ Concluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-4">📅 Timeline</p>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum registro ainda. Adicione uma nota acima.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item, i) => {
                  if (item.type === "nota") {
                    const nota  = item.data as Lead["notas"][0];
                    const style = TIPO_NOTA_STYLE[nota.tipo] || TIPO_NOTA_STYLE.anotacao;
                    return (
                      <div key={`n-${nota.id}`} className={`rounded-xl px-4 py-3 ${style.bg}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${style.text}`}>{style.icon} {nota.tipo}</span>
                          <span className="text-xs text-slate-400">{new Date(nota.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className={`text-sm ${style.text}`}>{nota.texto}</p>
                      </div>
                    );
                  } else {
                    const tarefa = item.data as Lead["tarefas"][0];
                    return (
                      <div key={`t-${tarefa.id}`} className={`rounded-xl px-4 py-3 ${tarefa.done ? "bg-green-50" : "bg-orange-50"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${tarefa.done ? "text-green-700" : "text-orange-700"}`}>
                            {tarefa.done ? "✅ Tarefa concluída" : "📋 Tarefa"}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(tarefa.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className={`text-sm ${tarefa.done ? "text-green-700 line-through" : "text-orange-800"}`}>{tarefa.descricao}</p>
                        {tarefa.dueAt && <p className="text-xs text-slate-500 mt-1">Prazo: {new Date(tarefa.dueAt).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Perdido */}
      {perdidoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Marcar como Perdido</h2>
            <p className="text-sm text-slate-500 mb-4">Informe o motivo para registrar na timeline.</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none mb-4"
              rows={3}
              placeholder="Ex: Desistiu do investimento, sem retorno após 3 tentativas..."
              value={perdidoMotivo}
              onChange={(e) => setPerdidoMotivo(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPerdidoModal(false)} className="flex-1">Cancelar</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  await patch({ action: "perdido", motivo: perdidoMotivo });
                  setPerdidoModal(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
