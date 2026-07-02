"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search, Download, Heart, Copy, ExternalLink, Check,
  Star, Library, X, MessageCircle, Mail, Link2, Briefcase, Lock, RotateCcw
} from "lucide-react";
import clsx from "clsx";

function formatBytes(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const CATEGORIAS = [
  { value: "",              label: "Todos" },
  { value: "marca",         label: "🎨 Marca" },
  { value: "comercial",     label: "💼 Comercial" },
  { value: "recrutamento",  label: "🎓 Recrutamento" },
  { value: "retencao",      label: "🤝 Retenção" },
  { value: "datas",         label: "📅 Datas Especiais" },
  { value: "rede",          label: "🏢 Rede/Resultados" },
  { value: "outros",        label: "📦 Outros" },
];

const TIPOS = [
  { value: "",              label: "Todos os formatos" },
  { value: "POST_FEED",     label: "Feed" },
  { value: "STORY",         label: "Story" },
  { value: "REELS",         label: "Reels" },
  { value: "CARROSSEL",     label: "Carrossel" },
  { value: "VIDEO",         label: "Vídeo" },
  { value: "COPY",          label: "Copy / Legenda" },
  { value: "ARTE_PDF",      label: "Arte PDF" },
  { value: "TEMPLATE",      label: "Template" },
  { value: "MATERIAL_MARCA",label: "Material de Marca" },
];

const CANAL_ICON: Record<string, any> = {
  instagram: Link2,
  linkedin: Briefcase,
  whatsapp: MessageCircle,
  email: Mail,
};

const TIPO_COR: Record<string, string> = {
  POST_FEED: "bg-blue-100 text-blue-700",
  STORY:     "bg-purple-100 text-purple-700",
  REELS:     "bg-pink-100 text-pink-700",
  CARROSSEL: "bg-indigo-100 text-indigo-700",
  VIDEO:     "bg-red-100 text-red-700",
  COPY:      "bg-green-100 text-green-700",
  ARTE_PDF:  "bg-orange-100 text-orange-700",
  TEMPLATE:  "bg-teal-100 text-teal-700",
  MATERIAL_MARCA: "bg-yellow-100 text-yellow-700",
};

const TIPO_LABEL: Record<string, string> = {
  POST_FEED: "Feed", STORY: "Story", REELS: "Reels", CARROSSEL: "Carrossel",
  VIDEO: "Vídeo", COPY: "Copy", ARTE_PDF: "PDF", TEMPLATE: "Template", MATERIAL_MARCA: "Marca",
};

export default function BibliotecaPage() {
  const { data: session } = useSession();
  const sp = useSearchParams();
  const router = useRouter();

  const [conteudos, setConteudos]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [busca, setBusca]           = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [categoria, setCategoria]   = useState(sp?.get("categoria") || "");
  const [tipo, setTipo]             = useState(sp?.get("tipo") || "");
  const [apenasDestaque, setApenasDestaque] = useState(sp?.get("destaque") === "true");
  const [apenasFavoritos, setApenasFavoritos] = useState(false);
  const [modalConteudo, setModalConteudo] = useState<any>(null);
  const [copiadoId, setCopiadoId]   = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // B5: debounce de 350ms na busca — não dispara fetch a cada tecla
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBuscaDebounced(busca), 350);
    return () => clearTimeout(debounceRef.current);
  }, [busca]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (buscaDebounced) params.set("busca", buscaDebounced);
    if (categoria)       params.set("categoria", categoria);
    if (tipo)            params.set("tipo", tipo);
    if (apenasDestaque)  params.set("destaque", "true");
    if (apenasFavoritos) params.set("favoritos", "true");

    const res = await fetch(`/api/app/marketing/conteudos?${params}`);
    const data = await res.json();
    setConteudos(data.conteudos || []);
    setLoading(false);
  }, [buscaDebounced, categoria, tipo, apenasDestaque, apenasFavoritos]);

  useEffect(() => { load(); }, [load]);

  async function toggleFavorito(conteudoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavoriteLoading(conteudoId);
    const res = await fetch("/api/app/marketing/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudoId }),
    });
    const data = await res.json();
    setConteudos(prev => prev.map(c =>
      c.id === conteudoId ? { ...c, isFavorito: data.favorito } : c
    ));
    if (modalConteudo?.id === conteudoId) {
      setModalConteudo((prev: any) => ({ ...prev, isFavorito: data.favorito }));
    }
    setFavoriteLoading(null);
  }

  async function registrarDownload(conteudoId: string) {
    await fetch("/api/app/marketing/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudoId }),
    });
    setConteudos(prev => prev.map(c =>
      c.id === conteudoId ? { ...c, totalDownloads: (c.totalDownloads || 0) + 1 } : c
    ));
  }

  // Download forçado: funciona mesmo com URLs cross-origin (Supabase, Drive, Canva)
  async function baixarArquivo(conteudo: any, e: React.MouseEvent) {
    e.stopPropagation();
    if (!conteudo.url) return;
    setDownloadingId(conteudo.id);
    try {
      // Registra o download no banco
      await registrarDownload(conteudo.id);
      // Tenta download via fetch (funciona para Supabase Storage público)
      const res = await fetch(conteudo.url);
      if (res.ok) {
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const ext    = conteudo.url.split("?")[0].split(".").pop() || "bin";
        const nome   = `${conteudo.titulo.replace(/[^a-zA-Z0-9\s]/g, "").trim()}.${ext}`;
        const a      = document.createElement("a");
        a.href       = objUrl;
        a.download   = nome;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      } else {
        // Fallback: abre em nova aba (ex: Canva, Drive — sem download direto)
        window.open(conteudo.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(conteudo.url, "_blank", "noopener,noreferrer");
    }
    setDownloadingId(null);
  }

  function copiarTexto(texto: string, id: string) {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conteúdos..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => setApenasDestaque(v => !v)}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              apenasDestaque ? "bg-[#F4B400] border-[#F4B400] text-[#0D2B5C]" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>
            <Star size={12} /> Destaques
          </button>
          <button onClick={() => setApenasFavoritos(v => !v)}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              apenasFavoritos ? "bg-red-50 border-red-300 text-red-600" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>
            <Heart size={12} /> Meus favoritos
          </button>
          {(busca || categoria || tipo || apenasDestaque || apenasFavoritos) && (
            <button onClick={() => { setBusca(""); setCategoria(""); setTipo(""); setApenasDestaque(false); setApenasFavoritos(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50">
              <X size={12} /> Limpar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 self-center">{conteudos.length} conteúdo{conteudos.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Grade de conteúdos */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <Library size={40} className="mx-auto mb-3 opacity-30" />
          <p>Carregando biblioteca...</p>
        </div>
      ) : conteudos.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Library size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum conteúdo encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou aguarde novos materiais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {conteudos.map(c => (
            <div key={c.id} onClick={() => setModalConteudo(c)}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group">
              {/* Thumbnail */}
              <div className="relative w-full h-40 bg-gradient-to-br from-[#0D2B5C]/5 to-[#0D2B5C]/10 flex items-center justify-center overflow-hidden">
                {c.thumbUrl ? (
                  <img src={c.thumbUrl} alt={c.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#0D2B5C]/30">
                    <Library size={32} />
                    <span className="text-xs">{TIPO_LABEL[c.tipo] || c.tipo}</span>
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", TIPO_COR[c.tipo] || "bg-slate-100 text-slate-700")}>
                    {TIPO_LABEL[c.tipo] || c.tipo}
                  </span>
                  {c.destaque && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F4B400] text-[#0D2B5C]">⭐</span>}
                </div>
                {/* Ações hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={e => toggleFavorito(c.id, e)}
                    className={clsx("w-9 h-9 rounded-full flex items-center justify-center transition-all",
                      c.isFavorito ? "bg-red-500 text-white" : "bg-white/90 text-slate-700 hover:bg-red-50")}
                    disabled={favoriteLoading === c.id}>
                    <Heart size={15} className={c.isFavorito ? "fill-white" : ""} />
                  </button>
                  {c.url && (
                    <button onClick={e => baixarArquivo(c, e)} disabled={downloadingId === c.id}
                      className="w-9 h-9 rounded-full bg-white/90 text-slate-700 hover:bg-blue-50 flex items-center justify-center disabled:opacity-60">
                      <Download size={15} className={downloadingId === c.id ? "animate-bounce" : ""} />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="font-semibold text-slate-800 text-sm line-clamp-2 leading-tight">{c.titulo}</div>
                {c.descricao && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{c.descricao}</div>}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-0.5"><Download size={10} /> {c.totalDownloads || 0}</span>
                    <span className="flex items-center gap-0.5"><Heart size={10} /> {c._count?.favoritos || 0}</span>
                    {c.tamanhoKb && <span>{formatBytes(c.tamanhoKb)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {c.isFixo
                      ? <Lock size={10} className="text-green-500" title="Conteúdo fixo" />
                      : <RotateCcw size={10} className="text-blue-400" title="Conteúdo rotativo" />}
                    {c.canalIdeal && (() => {
                      const Icon = CANAL_ICON[c.canalIdeal];
                      return Icon ? <Icon size={12} className="text-slate-400" /> : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhe */}
      {modalConteudo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalConteudo(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md", TIPO_COR[modalConteudo.tipo] || "bg-slate-100")}>
                    {TIPO_LABEL[modalConteudo.tipo] || modalConteudo.tipo}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                    {modalConteudo.categoria}
                  </span>
                  {modalConteudo.destaque && <span className="text-[10px] bg-[#F4B400] text-[#0D2B5C] font-bold px-2 py-0.5 rounded-md">⭐ Destaque</span>}
                </div>
                <h2 className="text-lg font-black text-slate-800">{modalConteudo.titulo}</h2>
                {modalConteudo.descricao && <p className="text-sm text-slate-500 mt-1">{modalConteudo.descricao}</p>}
              </div>
              <button onClick={() => setModalConteudo(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Imagem/thumb */}
              {modalConteudo.thumbUrl && (
                <img src={modalConteudo.thumbUrl} alt={modalConteudo.titulo}
                  className="w-full max-h-48 object-cover rounded-xl" />
              )}

              {/* Texto / Copy */}
              {modalConteudo.texto && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">📝 Copy / Legenda</span>
                    <button onClick={() => copiarTexto(modalConteudo.texto, `texto_${modalConteudo.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                      {copiadoId === `texto_${modalConteudo.id}` ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{modalConteudo.texto}</p>
                </div>
              )}

              {/* Hashtags */}
              {modalConteudo.hashtags && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider"># Hashtags sugeridas</span>
                    <button onClick={() => copiarTexto(modalConteudo.hashtags, `hash_${modalConteudo.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                      {copiadoId === `hash_${modalConteudo.id}` ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                  <p className="text-sm text-blue-700 font-medium">{modalConteudo.hashtags}</p>
                </div>
              )}

              {/* Canal ideal */}
              {modalConteudo.canalIdeal && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Canal ideal:</span>
                  <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md">{modalConteudo.canalIdeal}</span>
                </div>
              )}

              {/* Campanha */}
              {modalConteudo.campanha && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Campanha:</span>
                  <span className="px-2 py-0.5 rounded-md text-white text-xs font-bold"
                    style={{ backgroundColor: modalConteudo.campanha.cor || "#0D2B5C" }}>
                    {modalConteudo.campanha.nome}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3 flex-wrap">
                <span className="flex items-center gap-1"><Download size={12} /> {modalConteudo.totalDownloads || 0} downloads</span>
                <span className="flex items-center gap-1"><Heart size={12} /> {modalConteudo._count?.favoritos || 0} favoritos</span>
                {modalConteudo.tamanhoKb && (
                  <span className="flex items-center gap-1">📦 {formatBytes(modalConteudo.tamanhoKb)}</span>
                )}
                {modalConteudo.isFixo
                  ? <span className="flex items-center gap-1 text-green-600"><Lock size={11} /> Fixo</span>
                  : <span className="flex items-center gap-1 text-blue-500"><RotateCcw size={11} /> Rotativo</span>}
              </div>

              {/* Ações */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => toggleFavorito(modalConteudo.id, { stopPropagation: () => {} } as any)}
                  className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    modalConteudo.isFavorito ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 text-slate-700 hover:bg-red-50")}>
                  <Heart size={14} className={modalConteudo.isFavorito ? "fill-red-500 text-red-500" : ""} />
                  {modalConteudo.isFavorito ? "Favoritado" : "Favoritar"}
                </button>

                {modalConteudo.url && (
                  <button
                    onClick={e => baixarArquivo(modalConteudo, e)}
                    disabled={downloadingId === modalConteudo.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#0D2B5C] text-white hover:bg-[#1a4080] transition-all disabled:opacity-60">
                    <Download size={14} className={downloadingId === modalConteudo.id ? "animate-bounce" : ""} />
                    {downloadingId === modalConteudo.id ? "Baixando..." : "Baixar arquivo"}
                  </button>
                )}

                {modalConteudo.url && (
                  <a href={modalConteudo.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
                    <ExternalLink size={14} /> Abrir link
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
