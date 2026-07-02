"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Megaphone, Plus, Calendar, Target, X, Check } from "lucide-react";
import clsx from "clsx";

const OBJETIVOS: Record<string, string> = {
  awareness:    "🎯 Reconhecimento de marca",
  conversao:    "💼 Conversão de leads",
  retencao:     "🤝 Retenção de parceiros",
  recrutamento: "🎓 Recrutamento de estagiários",
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  ATIVA:    { label: "Ativa",    cor: "bg-green-100 text-green-700" },
  RASCUNHO: { label: "Rascunho", cor: "bg-slate-100 text-slate-600" },
  ENCERRADA:{ label: "Encerrada",cor: "bg-red-100 text-red-700" },
};

export default function CampanhasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "FRANQUEADORA" ||
    (session?.user?.role === "EQUIPE" && (session?.user?.permissoes as string[] | undefined)?.includes("marketing"));

  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    nome: "", descricao: "", objetivo: "", status: "ATIVA",
    inicioAt: "", fimAt: "", cor: "#0D2B5C",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/app/marketing/campanhas" + (filtro ? `?status=${filtro}` : ""));
    const data = await res.json();
    setCampanhas(data.campanhas || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filtro]);

  async function salvar() {
    if (!form.nome) return;
    setSaving(true);
    await fetch("/api/app/marketing/campanhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ nome: "", descricao: "", objetivo: "", status: "ATIVA", inicioAt: "", fimAt: "", cor: "#0D2B5C" });
    load();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Campanhas de Marketing</h2>
          <p className="text-sm text-slate-500">Organize os esforços de marketing por campanhas temáticas</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors">
            <Plus size={15} /> Nova campanha
          </button>
        )}
      </div>

      {/* Filtro rápido status */}
      <div className="flex gap-2 flex-wrap">
        {["", "ATIVA", "RASCUNHO", "ENCERRADA"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              filtro === s ? "bg-[#0D2B5C] text-white border-[#0D2B5C]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
            {s === "" ? "Todas" : STATUS_LABEL[s]?.label}
          </button>
        ))}
      </div>

      {/* Lista de campanhas */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Carregando campanhas...</div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma campanha encontrada</p>
          {isAdmin && <p className="text-sm mt-1">Clique em "Nova campanha" para começar.</p>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campanhas.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all">
              {/* Cor da campanha */}
              <div className="h-2" style={{ backgroundColor: c.cor || "#0D2B5C" }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{c.nome}</h3>
                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", STATUS_LABEL[c.status]?.cor || "bg-slate-100")}>
                    {STATUS_LABEL[c.status]?.label || c.status}
                  </span>
                </div>

                {c.descricao && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.descricao}</p>}

                {c.objetivo && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                    <Target size={11} />
                    <span>{OBJETIVOS[c.objetivo] || c.objetivo}</span>
                  </div>
                )}

                {(c.inicioAt || c.fimAt) && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Calendar size={11} />
                    <span>
                      {c.inicioAt ? new Date(c.inicioAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                      {" → "}
                      {c.fimAt ? new Date(c.fimAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>{c._count?.conteudos || 0} conteúdo{c._count?.conteudos !== 1 ? "s" : ""}</span>
                  <span>{c._count?.calendario || 0} evento{c._count?.calendario !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova campanha */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800">Nova Campanha</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Ex: Campanha Dia do Estagiário" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={2} placeholder="Objetivo e contexto da campanha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Objetivo</label>
                  <select value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    <option value="">Selecionar</option>
                    {Object.entries(OBJETIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    <option value="ATIVA">Ativa</option>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="ENCERRADA">Encerrada</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Início</label>
                  <input type="date" value={form.inicioAt} onChange={e => setForm(f => ({ ...f, inicioAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Fim</label>
                  <input type="date" value={form.fimAt} onChange={e => setForm(f => ({ ...f, fimAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Cor da campanha</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                  <span className="text-sm text-slate-600 font-mono">{form.cor}</span>
                  <div className="flex gap-1 ml-2">
                    {["#0D2B5C", "#F4B400", "#7c3aed", "#059669", "#ef4444", "#0891b2"].map(cor => (
                      <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                        className="w-6 h-6 rounded-full border-2 transition-all"
                        style={{ backgroundColor: cor, borderColor: form.cor === cor ? "#000" : "transparent" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.nome || saving}
                className="flex-1 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Salvando..." : <><Check size={14} /> Criar campanha</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
