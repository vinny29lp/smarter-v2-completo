"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Newspaper, Plus, X, Check, AlertCircle } from "lucide-react";

export default function NoticiasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "FRANQUEADORA";

  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    titulo: "", corpo: "", resumo: "", thumbUrl: "", autor: "", importante: false,
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/app/marketing/noticias");
    const data = await res.json();
    setNoticias(data.noticias || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function publicar() {
    if (!form.titulo || !form.corpo) return;
    setSaving(true);
    await fetch("/api/app/marketing/noticias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ titulo: "", corpo: "", resumo: "", thumbUrl: "", autor: "", importante: false });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Notícias da Rede</h2>
          <p className="text-sm text-slate-500">Comunicados e novidades para toda a rede Smarter</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors">
            <Plus size={15} /> Publicar notícia
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Carregando notícias...</div>
      ) : noticias.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma notícia publicada ainda</p>
          {isAdmin && <p className="text-sm mt-1">Publique a primeira notícia para a rede.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {noticias.map(n => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-sm transition-all">
              <div className="flex gap-4 p-5">
                {n.thumbUrl && (
                  <img src={n.thumbUrl} alt={n.titulo}
                    className="w-20 h-20 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-black text-slate-800 text-base flex-1">{n.titulo}</h3>
                    {n.importante && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full shrink-0">
                        <AlertCircle size={9} /> IMPORTANTE
                      </span>
                    )}
                  </div>
                  {n.resumo && <p className="text-sm text-slate-600 line-clamp-2">{n.resumo}</p>}
                  {!n.resumo && n.corpo && (
                    <p className="text-sm text-slate-600 line-clamp-2">{n.corpo}</p>
                  )}
                  <div className="text-xs text-slate-400 mt-2">
                    {new Date(n.publicadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    {n.autor && ` · Por ${n.autor}`}
                  </div>
                </div>
              </div>
              {/* Corpo completo (expansível) - simplificado: mostramos o corpo direto */}
              {n.corpo && n.corpo.length > 200 && (
                <details className="border-t border-slate-100">
                  <summary className="px-5 py-2 text-xs font-semibold text-blue-600 cursor-pointer hover:bg-slate-50">
                    Ler notícia completa
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {n.corpo}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal publicar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800">Publicar Notícia</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Título da notícia" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Resumo (opcional)</label>
                <input value={form.resumo} onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Resumo curto para a listagem" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Corpo completo *</label>
                <textarea value={form.corpo} onChange={e => setForm(f => ({ ...f, corpo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={8} placeholder="Escreva a notícia completa aqui..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Autor</label>
                  <input value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="Nome do autor" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">URL da imagem (thumb)</label>
                  <input value={form.thumbUrl} onChange={e => setForm(f => ({ ...f, thumbUrl: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="https://..." />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.importante} onChange={e => setForm(f => ({ ...f, importante: e.target.checked }))}
                  className="w-4 h-4 rounded accent-red-500" />
                <span className="text-sm font-semibold text-slate-700">Marcar como IMPORTANTE (envia notificação para todos)</span>
              </label>
            </div>
            <div className="flex gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={publicar} disabled={!form.titulo || !form.corpo || saving}
                className="flex-1 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Publicando..." : <><Check size={14} /> Publicar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
