"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, X, Check, Edit2, Trash2, Eye, EyeOff, Settings2, AlertCircle, Download, Heart, TrendingUp } from "lucide-react";
import clsx from "clsx";

const TIPOS = [
  { value: "POST_FEED",      label: "Feed" },
  { value: "STORY",          label: "Story" },
  { value: "REELS",          label: "Reels" },
  { value: "CARROSSEL",      label: "Carrossel" },
  { value: "VIDEO",          label: "Vídeo" },
  { value: "COPY",           label: "Copy / Legenda" },
  { value: "ARTE_PDF",       label: "Arte PDF" },
  { value: "TEMPLATE",       label: "Template" },
  { value: "MATERIAL_MARCA", label: "Material de Marca" },
];

const CATEGORIAS = [
  { value: "marca",        label: "🎨 Marca" },
  { value: "comercial",    label: "💼 Comercial" },
  { value: "recrutamento", label: "🎓 Recrutamento" },
  { value: "retencao",     label: "🤝 Retenção" },
  { value: "datas",        label: "📅 Datas Especiais" },
  { value: "rede",         label: "🏢 Rede/Resultados" },
  { value: "outros",       label: "📦 Outros" },
];

const FORMATOS = [
  { value: "IMAGEM", label: "🖼️ Imagem" },
  { value: "VIDEO",  label: "🎥 Vídeo" },
  { value: "PDF",    label: "📄 PDF" },
  { value: "TEXTO",  label: "📝 Só texto / Copy" },
  { value: "LINK",   label: "🔗 Link externo" },
];

const CANAIS = [
  { value: "",           label: "Todos os canais" },
  { value: "instagram",  label: "Instagram" },
  { value: "linkedin",   label: "LinkedIn" },
  { value: "whatsapp",   label: "WhatsApp" },
  { value: "email",      label: "E-mail" },
];

const PUBLICO = [
  { value: "TODOS",        label: "Todos (Franqueadora + Franqueado)" },
  { value: "FRANQUEADO",   label: "Apenas Franqueados" },
  { value: "FRANQUEADORA", label: "Apenas Franqueadora" },
];

const FORM_INICIAL = {
  titulo: "", descricao: "", tipo: "POST_FEED", formato: "IMAGEM",
  categoria: "marca", url: "", thumbUrl: "", texto: "", hashtags: "",
  canalIdeal: "", publicoPara: "TODOS", destaque: false, campanhaId: "",
  tags: [] as string[], tagInput: "",
};

export default function MarketingAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "FRANQUEADORA") {
      router.replace("/dashboard/marketing");
    }
  }, [session]);

  const [conteudos, setConteudos]     = useState<any[]>([]);
  const [campanhas, setCampanhas]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [tab, setTab]                 = useState<"conteudos" | "metricas">("conteudos");
  const [form, setForm]               = useState({ ...FORM_INICIAL });

  async function load() {
    setLoading(true);
    const [c, camp] = await Promise.all([
      fetch("/api/app/marketing/conteudos?publicoPara=todos").then(r => r.json()).catch(() => ({ conteudos: [] })),
      fetch("/api/app/marketing/campanhas").then(r => r.json()).catch(() => ({ campanhas: [] })),
    ]);
    setConteudos(c.conteudos || []);
    setCampanhas(camp.campanhas || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function abrirModal(c?: any) {
    if (c) {
      setEditId(c.id);
      setForm({
        titulo: c.titulo || "", descricao: c.descricao || "",
        tipo: c.tipo || "POST_FEED", formato: c.formato || "IMAGEM",
        categoria: c.categoria || "marca", url: c.url || "",
        thumbUrl: c.thumbUrl || "", texto: c.texto || "",
        hashtags: c.hashtags || "", canalIdeal: c.canalIdeal || "",
        publicoPara: c.publicoPara || "TODOS", destaque: c.destaque || false,
        campanhaId: c.campanhaId || "", tags: c.tags || [], tagInput: "",
      });
    } else {
      setEditId(null);
      setForm({ ...FORM_INICIAL });
    }
    setModalOpen(true);
  }

  async function salvar() {
    if (!form.titulo || !form.tipo || !form.categoria) return;
    setSaving(true);
    const payload = { ...form, tags: form.tags };
    delete (payload as any).tagInput;

    const url    = editId ? `/api/app/marketing/conteudos/${editId}` : "/api/app/marketing/conteudos";
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este conteúdo? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    await fetch(`/api/app/marketing/conteudos/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  async function toggleAtivo(c: any) {
    await fetch(`/api/app/marketing/conteudos/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    setConteudos(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function toggleDestaque(c: any) {
    await fetch(`/api/app/marketing/conteudos/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destaque: !c.destaque }),
    });
    setConteudos(prev => prev.map(x => x.id === c.id ? { ...x, destaque: !x.destaque } : x));
  }

  function addTag() {
    const t = form.tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    }
  }

  const totalDownloads = conteudos.reduce((acc, c) => acc + (c.totalDownloads || 0), 0);
  const totalFavoritos = conteudos.reduce((acc, c) => acc + (c._count?.favoritos || 0), 0);

  if (session?.user?.role !== "FRANQUEADORA") return null;

  return (
    <div className="space-y-4">
      {/* Header Admin */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-[#0D2B5C]" />
          <div>
            <h2 className="text-lg font-black text-slate-800">Painel Admin — Marketing Hub</h2>
            <p className="text-sm text-slate-500">Gerencie todos os conteúdos da rede</p>
          </div>
        </div>
        <button onClick={() => abrirModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors">
          <Plus size={15} /> Adicionar conteúdo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["conteudos", "metricas"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize",
              tab === t ? "bg-[#0D2B5C] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300")}>
            {t === "conteudos" ? "Conteúdos" : "Métricas"}
          </button>
        ))}
      </div>

      {tab === "metricas" ? (
        <div className="space-y-4">
          {/* Cards de métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-[#0D2B5C]">{conteudos.length}</div>
              <div className="text-xs text-slate-500 mt-1">Total de conteúdos</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-[#0D2B5C]">{conteudos.filter(c => c.ativo).length}</div>
              <div className="text-xs text-slate-500 mt-1">Conteúdos ativos</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-[#0D2B5C]">{totalDownloads}</div>
              <div className="text-xs text-slate-500 mt-1">Downloads totais</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-[#0D2B5C]">{totalFavoritos}</div>
              <div className="text-xs text-slate-500 mt-1">Total de favoritos</div>
            </div>
          </div>

          {/* Top conteúdos */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp size={15} className="text-[#F4B400]" /> Top Conteúdos por Download
            </div>
            <div className="divide-y divide-slate-50">
              {[...conteudos].sort((a, b) => (b.totalDownloads || 0) - (a.totalDownloads || 0)).slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-black text-slate-300 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{c.titulo}</div>
                    <div className="text-xs text-slate-400">{c.categoria} · {c.tipo}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1"><Download size={11} /> {c.totalDownloads || 0}</span>
                    <span className="flex items-center gap-1"><Heart size={11} /> {c._count?.favoritos || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Lista de conteúdos */
        loading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">{conteudos.length} conteúdo{conteudos.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {conteudos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-semibold">Nenhum conteúdo ainda</p>
                  <p className="text-sm mt-1">Clique em "Adicionar conteúdo" para começar.</p>
                </div>
              ) : conteudos.map(c => (
                <div key={c.id} className={clsx("flex items-center gap-3 px-4 py-3 transition-colors", !c.ativo && "opacity-50")}>
                  {c.thumbUrl ? (
                    <img src={c.thumbUrl} alt={c.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm truncate">{c.titulo}</span>
                      {c.destaque && <span className="text-[9px] bg-[#F4B400] text-[#0D2B5C] font-black px-1.5 rounded">⭐ DESTAQUE</span>}
                      {!c.ativo && <span className="text-[9px] bg-slate-200 text-slate-600 font-black px-1.5 rounded">OCULTO</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {c.categoria} · {c.tipo} · {c.formato}
                      {c.campanha && <> · <span style={{ color: c.campanha.cor || "#0D2B5C" }}>{c.campanha.nome}</span></>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5"><Download size={9} /> {c.totalDownloads || 0}</span>
                      <span className="flex items-center gap-0.5"><Heart size={9} /> {c._count?.favoritos || 0}</span>
                      <span>👁 {c.visualizacoes || 0}</span>
                    </div>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleDestaque(c)} title={c.destaque ? "Remover destaque" : "Marcar destaque"}
                      className={clsx("p-1.5 rounded-lg transition-colors", c.destaque ? "bg-[#F4B400]/20 text-[#F4B400]" : "hover:bg-slate-100 text-slate-400")}>
                      ⭐
                    </button>
                    <button onClick={() => toggleAtivo(c)} title={c.ativo ? "Ocultar" : "Mostrar"}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      {c.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => abrirModal(c)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => excluir(c.id)} disabled={deletingId === c.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Modal adicionar/editar conteúdo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-black text-slate-800">{editId ? "Editar conteúdo" : "Novo conteúdo"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Ex: Arte Dia do Estagiário — Feed Instagram" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Formato</label>
                  <select value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {FORMATOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={2} placeholder="Breve descrição do conteúdo" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">URL do arquivo</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="https://... (link do Canva, Drive, etc.)" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">URL do thumbnail</label>
                  <input value={form.thumbUrl} onChange={e => setForm(f => ({ ...f, thumbUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="https://... (imagem de preview)" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Copy / Legenda pronta</label>
                <textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={4} placeholder="Cole aqui a legenda / copy pronta para o franqueado usar" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Hashtags sugeridas</label>
                <input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="#smarterestagios #estagio #rh" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Canal ideal</label>
                  <select value={form.canalIdeal} onChange={e => setForm(f => ({ ...f, canalIdeal: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Público</label>
                  <select value={form.publicoPara} onChange={e => setForm(f => ({ ...f, publicoPara: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {PUBLICO.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Campanha</label>
                  <select value={form.campanhaId} onChange={e => setForm(f => ({ ...f, campanhaId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    <option value="">Sem campanha</option>
                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tags internas</label>
                <div className="flex gap-2">
                  <input value={form.tagInput} onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="Adicionar tag e pressionar Enter" />
                  <button onClick={addTag} type="button" className="px-3 py-2 bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200">
                    Adicionar
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {form.tags.map(t => (
                      <span key={t} className="bg-[#0D2B5C]/10 text-[#0D2B5C] text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                        {t}
                        <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#F4B400]" />
                <span className="text-sm font-semibold text-slate-700">⭐ Marcar como destaque (aparece na página principal)</span>
              </label>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.titulo || !form.tipo || !form.categoria || saving}
                className="flex-1 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Salvando..." : <><Check size={14} /> {editId ? "Salvar alterações" : "Criar conteúdo"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
