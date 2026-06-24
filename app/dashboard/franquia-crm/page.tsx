"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FRANQUIA_PIPELINE,
  FRANQUIA_ETAPAS_ORDER,
  franquiaSlaStatus,
  franquiaDiasRestantes,
} from "@/lib/crm/franquia-pipeline";

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
  ultimoContato: string | null;
  etapaChangedAt: string | null;
  valorInvestimento: number | null;
  notas: { texto: string; tipo: string; createdAt: string }[];
  tarefas: { descricao: string; dueAt: string | null }[];
}

interface Kpis {
  total: number;
  ativos: number;
  vendidos: number;
  perdidos: number;
  frios: number;
}

// ─── Modal Novo Lead ─────────────────────────────────────────────────────────
function NovoLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nomeCompleto: "", email: "", telefone: "", cidade: "", estado: "", origem: "manual" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.nomeCompleto.trim()) return alert("Nome obrigatório");
    setSaving(true);
    try {
      const r = await fetch("/api/app/franquia-crm", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (r.ok) { onSaved(); onClose(); }
      else { const d = await r.json(); alert(d.error || "Erro ao salvar"); }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Novo Lead de Franquia</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome completo *</label>
            <Input value={form.nomeCompleto} onChange={(e) => set("nomeCompleto", e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">E-mail</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@ex.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">WhatsApp</label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Cidade</label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="São Paulo" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Estado</label>
              <Input value={form.estado} onChange={(e) => set("estado", e.target.value)} placeholder="SP" maxLength={2} className="uppercase" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Origem</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.origem} onChange={(e) => set("origem", e.target.value)}>
              <option value="manual">Manual</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="indicacao">Indicação</option>
              <option value="organico">Orgânico</option>
              <option value="evento">Evento</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {saving ? "Salvando..." : "Criar Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Lead no Kanban ──────────────────────────────────────────────────
function LeadCard({ lead }: { lead: Lead }) {
  const sla = franquiaSlaStatus(lead.etapa, lead.etapaChangedAt ? new Date(lead.etapaChangedAt) : null);
  const dias = franquiaDiasRestantes(lead.etapa, lead.etapaChangedAt ? new Date(lead.etapaChangedAt) : null);

  return (
    <Link href={`/dashboard/franquia-crm/${lead.id}`}>
      <div className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all ${lead.leadFrio ? "border-l-4 border-l-blue-400" : "border-slate-200"}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{lead.nomeCompleto}</p>
          {lead.leadFrio && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">🧊 Frio</span>
          )}
        </div>
        {lead.cidade && (
          <p className="text-xs text-slate-500 mb-1">📍 {lead.cidade}/{lead.estado}</p>
        )}
        {lead.telefone && (
          <p className="text-xs text-slate-400 mb-2">📱 {lead.telefone}</p>
        )}
        {lead.notas[0] && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 line-clamp-2 mb-2">{lead.notas[0].texto}</p>
        )}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            sla === "vencido" ? "bg-red-100 text-red-700" :
            sla === "atencao" ? "bg-yellow-100 text-yellow-700" :
            "bg-green-100 text-green-700"
          }`}>
            {sla === "vencido" ? `⚠️ SLA vencido` : sla === "atencao" ? `⏰ ${dias}d restantes` : dias < 999 ? `✅ ${dias}d` : "—"}
          </span>
          <span className="text-xs text-slate-400">
            {lead.ultimoContato ? new Date(lead.ultimoContato).toLocaleDateString("pt-BR") : "Sem contato"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function FranquiaCrmPage() {
  const router = useRouter();
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [kpis, setKpis]     = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [novoModal, setNovoModal] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroFrio, setFiltroFrio]   = useState("");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEtapa) params.set("etapa", filtroEtapa);
    if (filtroFrio)  params.set("frio", filtroFrio);
    if (q)           params.set("q", q);
    try {
      const r = await fetch(`/api/app/franquia-crm?${params}`);
      const d = await r.json();
      setLeads(d.leads || []);
      setKpis(d.kpis || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filtroEtapa, filtroFrio, q]);

  useEffect(() => { load(); }, [load]);

  const leadsAtivos = leads.filter((l) => l.situacao === "ativo");
  const leadsVendidos = leads.filter((l) => l.situacao === "vendido");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🏢 CRM de Franquias</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pipeline de vendas de unidades Smarter</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/franquia-crm/importar">
            <Button variant="ghost" className="text-sm">📥 Importar CSV</Button>
          </Link>
          <Button onClick={() => setNovoModal(true)} className="bg-blue-900 hover:bg-blue-800 text-sm">
            + Novo Lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total de Leads",   val: kpis.total,    color: "text-blue-900" },
            { label: "Ativos",           val: kpis.ativos,   color: "text-blue-600" },
            { label: "Vendidos",         val: kpis.vendidos, color: "text-green-600" },
            { label: "Perdidos",         val: kpis.perdidos, color: "text-red-500"  },
            { label: "🧊 Leads Frios",   val: kpis.frios,    color: "text-cyan-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
              <p className="text-xs text-slate-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-col md:flex-row gap-3 items-start md:items-center">
        <Input
          placeholder="🔍 Buscar por nome, e-mail, cidade..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {FRANQUIA_ETAPAS_ORDER.map((e) => (
            <option key={e} value={e}>{FRANQUIA_PIPELINE[e].emoji} {FRANQUIA_PIPELINE[e].label}</option>
          ))}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={filtroFrio}
          onChange={(e) => setFiltroFrio(e.target.value)}
        >
          <option value="">Todos os leads</option>
          <option value="true">🧊 Somente frios</option>
          <option value="false">🔥 Somente quentes</option>
        </select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setViewMode("kanban")} className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "kanban" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Kanban</button>
          <button onClick={() => setViewMode("lista")}  className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "lista"  ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Lista</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "kanban" ? (
        // ─── KANBAN ────────────────────────────────────────────────────────
        <div className="flex gap-4 overflow-x-auto pb-6">
          {FRANQUIA_ETAPAS_ORDER.filter((e) => !filtroEtapa || e === filtroEtapa).map((etapa) => {
            const cfg      = FRANQUIA_PIPELINE[etapa];
            const col      = leads.filter((l) => l.etapa === etapa && l.situacao === "ativo");
            return (
              <div key={etapa} className="flex-shrink-0 w-72">
                <div className="rounded-xl border mb-3 p-3" style={{ backgroundColor: cfg.bgColor, borderColor: cfg.color + "44" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: cfg.color }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cfg.color }}>
                      {col.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">SLA: {cfg.slaDias > 0 ? `${cfg.slaDias} dias` : "—"}</p>
                </div>
                <div className="space-y-2">
                  {col.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-6 border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum lead
                    </div>
                  ) : (
                    col.map((l) => <LeadCard key={l.id} lead={l} />)
                  )}
                </div>
              </div>
            );
          })}

          {/* Coluna de Vendidos */}
          {(!filtroEtapa) && (
            <div className="flex-shrink-0 w-72">
              <div className="rounded-xl border mb-3 p-3 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-700">🏆 Vendidos</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-green-600">{leadsVendidos.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {leadsVendidos.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 py-6 border-2 border-dashed border-slate-200 rounded-xl">Nenhuma venda ainda</div>
                ) : leadsVendidos.map((l) => <LeadCard key={l.id} lead={l} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        // ─── LISTA ─────────────────────────────────────────────────────────
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Cidade</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Etapa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Origem</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => {
                const cfg = FRANQUIA_PIPELINE[l.etapa];
                const sla = franquiaSlaStatus(l.etapa, l.etapaChangedAt ? new Date(l.etapaChangedAt) : null);
                const dias = franquiaDiasRestantes(l.etapa, l.etapaChangedAt ? new Date(l.etapaChangedAt) : null);
                return (
                  <tr key={l.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/dashboard/franquia-crm/${l.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{l.nomeCompleto}</div>
                      <div className="text-xs text-slate-400">{l.email || l.telefone || "—"}</div>
                      {l.leadFrio && <span className="text-xs text-blue-600">🧊 Lead Frio</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{l.cidade ? `${l.cidade}/${l.estado}` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg?.bgColor, color: cfg?.color }}>
                        {cfg?.emoji} {cfg?.label || l.etapa}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell capitalize">{l.origem || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sla === "vencido" ? "bg-red-100 text-red-700" :
                        sla === "atencao" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {sla === "vencido" ? "⚠️ Vencido" : dias < 999 ? `${dias}d` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">Nenhum lead encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {novoModal && <NovoLeadModal onClose={() => setNovoModal(false)} onSaved={load} />}
    </div>
  );
}
