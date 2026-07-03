"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Check, Edit2, Trash2, Eye, EyeOff, Settings2,
  Download, Heart, TrendingUp, Upload, FileVideo, FileImage, File, Lock, RotateCcw,
} from "lucide-react";
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

// Tipos de conteúdo para cada aba
const TIPOS_SOCIAL = ["POST_FEED", "STORY", "REELS", "CARROSSEL", "VIDEO", "COPY"];
const TIPOS_BIBLIOTECA = ["ARTE_PDF", "TEMPLATE", "MATERIAL_MARCA"];

const TIPOS_SOCIAL_CARDS = [
  { value: "POST_FEED", label: "Feed",      icon: "🖼️",  hint: "1:1 ou 4:5" },
  { value: "STORY",     label: "Story",     icon: "📱",  hint: "9:16 vertical" },
  { value: "REELS",     label: "Reels",     icon: "🎬",  hint: "9:16 vídeo" },
  { value: "CARROSSEL", label: "Carrossel", icon: "🗂️",  hint: "múltiplos slides" },
  { value: "VIDEO",     label: "Vídeo",     icon: "🎥",  hint: "MP4 / MOV" },
  { value: "COPY",      label: "Copy",      icon: "✍️",  hint: "legenda pronta" },
];

const TIPOS_BIBLIOTECA_CARDS = [
  { value: "MATERIAL_MARCA", label: "Material de Marca", icon: "🎨", hint: "logos, cores, tipografia" },
  { value: "ARTE_PDF",       label: "Arte PDF",          icon: "📄", hint: "artes para impressão" },
  { value: "TEMPLATE",       label: "Template",          icon: "📋", hint: "modelos editáveis" },
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

// Cotas de arquivos rotativos por tipo
const COTAS: Record<string, number> = {
  REELS:     3,
  POST_FEED: 5,
  STORY:     5,
};

const FORM_INICIAL = {
  titulo: "", descricao: "", tipo: "POST_FEED", formato: "IMAGEM",
  categoria: "marca", url: "", thumbUrl: "", texto: "", hashtags: "",
  canalIdeal: "", publicoPara: "TODOS", destaque: false, campanhaId: "",
  isFixo: false,
  tags: [] as string[], tagInput: "",
};

function formatBytes(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function MarketingAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const isMarketingAdmin = (s: typeof session) =>
    s?.user?.role === "FRANQUEADORA" ||
    (s?.user?.role === "EQUIPE" && (s?.user?.permissoes as string[] | undefined)?.includes("marketing"));

  useEffect(() => {
    if (session && !isMarketingAdmin(session)) {
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
  const [tab, setTab]                 = useState<"redes-sociais" | "biblioteca" | "metricas">("redes-sociais");
  const [subTipo, setSubTipo]         = useState<string>("");
  const [form, setForm]               = useState({ ...FORM_INICIAL });

  // Upload state
  const fileRef                       = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadPreview, setUploadPreview] = useState("");

  // Contagem de cotas
  const cotaAtual: Record<string, number> = {};
  for (const tipo of Object.keys(COTAS)) {
    cotaAtual[tipo] = conteudos.filter(c => c.tipo === tipo && c.ativo && !c.isFixo).length;
  }

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

  function abrirModal(c?: any, defaultIsFixo?: boolean) {
    setUploadFile(null);
    setUploadPreview("");
    setUploadError("");
    setUploadProgress(0);
    if (c) {
      setEditId(c.id);
      setForm({
        titulo: c.titulo || "", descricao: c.descricao || "",
        tipo: c.tipo || "POST_FEED", formato: c.formato || "IMAGEM",
        categoria: c.categoria || "marca", url: c.url || "",
        thumbUrl: c.thumbUrl || "", texto: c.texto || "",
        hashtags: c.hashtags || "", canalIdeal: c.canalIdeal || "",
        publicoPara: c.publicoPara || "TODOS", destaque: c.destaque || false,
        isFixo: c.isFixo || false,
        campanhaId: c.campanhaId || "", tags: c.tags || [], tagInput: "",
      });
    } else {
      setEditId(null);
      const isFixoDefault = defaultIsFixo ?? (tab === "biblioteca");
      const tipoDefault = isFixoDefault ? "MATERIAL_MARCA" : (subTipo || "POST_FEED");
      setForm({
        ...FORM_INICIAL,
        isFixo: isFixoDefault,
        tipo: tipoDefault,
      });
    }
    setModalOpen(true);
  }

  // Limites de tamanho por tipo de arquivo
  const LIMITES = {
    video:  { mb: 200, label: "200 MB" },
    imagem: { mb: 20,  label: "20 MB"  },
    pdf:    { mb: 20,  label: "20 MB"  },
    outros: { mb: 20,  label: "20 MB"  },
  };

  function getLimite(file: File) {
    if (file.type.startsWith("video/"))      return LIMITES.video;
    if (file.type === "application/pdf")     return LIMITES.pdf;
    if (file.type.startsWith("image/"))      return LIMITES.imagem;
    return LIMITES.outros;
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho ANTES de qualquer upload
    const limite  = getLimite(file);
    const fileMb  = file.size / (1024 * 1024);
    if (fileMb > limite.mb) {
      setUploadError(
        `Arquivo muito grande: ${fileMb.toFixed(1)} MB. O limite para este tipo é ${limite.label}. Reduza o tamanho e tente novamente.`
      );
      e.target.value = "";
      return;
    }

    setUploadFile(file);
    setUploadError("");
    // Preview local para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview("");
    }
    // Auto-detectar formato
    if (file.type.startsWith("video/"))     setForm(f => ({ ...f, formato: "VIDEO" }));
    else if (file.type === "application/pdf") setForm(f => ({ ...f, formato: "PDF" }));
    else if (file.type.startsWith("image/")) setForm(f => ({ ...f, formato: "IMAGEM" }));
  }

  async function fazerUpload(): Promise<{ url: string; tamanhoKb: number } | null> {
    if (!uploadFile) return null;

    // Limite de 4 MB para arquivos não-vídeo (limite do Vercel é 4,5 MB)
    const isVideo = uploadFile.type.startsWith("video/");
    const MAX_BYTES = isVideo ? 100 * 1024 * 1024 : 4 * 1024 * 1024;
    if (uploadFile.size > MAX_BYTES) {
      const limitMsg = isVideo ? "100 MB" : "4 MB";
      setUploadError(
        `Arquivo muito grande (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB). ` +
        `O limite é ${limitMsg}. Reduza o tamanho e tente novamente.`
      );
      return null;
    }

    setUploadProgress(5);

    try {
      const fd = new FormData();
      fd.append("file",   uploadFile);
      fd.append("tipo",   form.tipo);
      fd.append("isFixo", String(form.isFixo));

      // Progresso simulado (fetch não expõe eventos de progresso de upload)
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 88 ? prev + 5 : prev));
      }, 500);

      let result: { url: string; tamanhoKb: number; path?: string };
      try {
        const res = await fetch("/api/app/marketing/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro no upload.");
        result = data;
      } finally {
        clearInterval(progressTimer);
      }

      setUploadProgress(100);
      return { url: result.url, tamanhoKb: result.tamanhoKb };

    } catch (err: any) {
      setUploadProgress(0);
      setUploadError(err.message || "Falha no upload. Verifique sua conexão e tente novamente.");
      return null;
    }
  }

  async function salvar() {
    if (!form.descricao || (!uploadFile && !form.url)) return;
    setSaving(true);
    setUploadError("");

    let url       = form.url;
    let thumbUrl  = form.thumbUrl;
    let tamanhoKb: number | undefined;

    try {
      // Se tem arquivo novo para upload
      if (uploadFile) {
        const result = await fazerUpload();
        if (!result) return; // fazerUpload já definiu uploadError; finally reseta saving
        url      = result.url;
        tamanhoKb = result.tamanhoKb;
        // Auto-usar a URL como thumbnail quando for imagem (evita card sem preview)
        if (uploadFile.type.startsWith("image/") && !thumbUrl) {
          thumbUrl = url;
        }
      }

      const payload: any = {
        ...form,
        url,
        thumbUrl,
        tags: form.tags,
        // Se título não foi preenchido, usa o início da descrição como título
        titulo: form.titulo.trim() || form.descricao.substring(0, 80).trim(),
      };
      delete payload.tagInput;
      if (tamanhoKb !== undefined) payload.tamanhoKb = tamanhoKb;

      const apiUrl  = editId ? `/api/app/marketing/conteudos/${editId}` : "/api/app/marketing/conteudos";
      const method  = editId ? "PUT" : "POST";
      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError((data as any).error || "Erro ao salvar conteúdo. Tente novamente.");
        return;
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setUploadError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSaving(false);
    }
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

  // Conteúdos separados por aba
  const redesSociaisAll = conteudos.filter(c => !c.isFixo);
  const redesSociaisFiltrado = redesSociaisAll.filter(c => !subTipo || c.tipo === subTipo);
  const bibliotecaAll = conteudos.filter(c => c.isFixo || TIPOS_BIBLIOTECA.includes(c.tipo));

  if (session && !isMarketingAdmin(session)) return null;

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
        <button onClick={() => abrirModal(undefined, tab === "biblioteca")}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors">
          <Plus size={15} /> {tab === "biblioteca" ? "Adicionar material" : tab === "redes-sociais" ? "Adicionar criativo" : "Adicionar conteúdo"}
        </button>
      </div>

      {/* Cards de cota */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(COTAS).map(([tipo, limite]) => {
          const usado = cotaAtual[tipo] || 0;
          const pct   = Math.round((usado / limite) * 100);
          return (
            <div key={tipo} className="bg-white rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-600">
                  {tipo === "REELS" ? "🎥 Reels" : tipo === "POST_FEED" ? "🖼️ Feed" : "📱 Story"}
                </span>
                <span className={clsx("text-xs font-black", usado >= limite ? "text-red-600" : "text-slate-500")}>
                  {usado}/{limite}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all", usado >= limite ? "bg-red-500" : "bg-[#0D2B5C]")}
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">rotativos ativos</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { value: "redes-sociais", label: "📲 Redes Sociais" },
          { value: "biblioteca",    label: "🗂️ Biblioteca" },
          { value: "metricas",      label: "📊 Métricas" },
        ] as const).map(t => (
          <button key={t.value} onClick={() => { setTab(t.value); setSubTipo(""); }}
            className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all",
              tab === t.value ? "bg-[#0D2B5C] text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-filtros de tipo para Redes Sociais */}
      {tab === "redes-sociais" && (
        <div className="flex gap-2 flex-wrap">
          {[{ value: "", label: "Todos" }, ...TIPOS_SOCIAL_CARDS.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))].map(t => (
            <button key={t.value} onClick={() => setSubTipo(t.value)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                subTipo === t.value ? "bg-[#0D2B5C]/10 text-[#0D2B5C] border border-[#0D2B5C]/30" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300")}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "metricas" ? (
        <div className="space-y-4">
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
      ) : loading ? (
        <div className="text-center py-16 text-slate-400">Carregando...</div>
      ) : (() => {
          const lista = tab === "redes-sociais" ? redesSociaisFiltrado : bibliotecaAll;
          const emptyMsg = tab === "redes-sociais"
            ? "Nenhum criativo de redes sociais ainda. Clique em \"Adicionar criativo\"."
            : "Nenhum material na biblioteca ainda. Clique em \"Adicionar material\".";
          const countLabel = tab === "redes-sociais"
            ? `${redesSociaisAll.length} criativo${redesSociaisAll.length !== 1 ? "s" : ""} de redes sociais${subTipo ? ` · filtrando por ${subTipo}` : ""}`
            : `${bibliotecaAll.length} material${bibliotecaAll.length !== 1 ? "is" : ""} na biblioteca`;
          return (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">{countLabel}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {lista.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="font-semibold">Nenhum conteúdo ainda</p>
                    <p className="text-sm mt-1">{emptyMsg}</p>
                  </div>
                ) : lista.map(c => (
                  <div key={c.id} className={clsx("flex items-center gap-3 px-4 py-3 transition-colors", !c.ativo && "opacity-50")}>
                    {c.thumbUrl ? (
                      <img src={c.thumbUrl} alt={c.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-slate-400">
                        {c.formato === "VIDEO" ? <FileVideo size={18} /> : c.formato === "PDF" ? <File size={18} /> : <FileImage size={18} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm truncate">{c.titulo}</span>
                        {c.destaque && <span className="text-[9px] bg-[#F4B400] text-[#0D2B5C] font-black px-1.5 rounded">⭐ DESTAQUE</span>}
                        {!c.ativo && <span className="text-[9px] bg-slate-200 text-slate-600 font-black px-1.5 rounded">OCULTO</span>}
                        {c.isFixo
                          ? <span className="text-[9px] bg-green-100 text-green-700 font-black px-1.5 rounded flex items-center gap-0.5"><Lock size={8} /> FIXO</span>
                          : <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-1.5 rounded flex items-center gap-0.5"><RotateCcw size={8} /> ROTATIVO</span>
                        }
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 rounded">{c.tipo}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {c.categoria} · {c.formato}
                        {c.tamanhoKb && <span className="ml-1 text-slate-300">· {formatBytes(c.tamanhoKb)}</span>}
                        {c.campanha && <> · <span style={{ color: c.campanha.cor || "#0D2B5C" }}>{c.campanha.nome}</span></>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-0.5"><Download size={9} /> {c.totalDownloads || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart size={9} /> {c._count?.favoritos || 0}</span>
                        <span>👁 {c.visualizacoes || 0}</span>
                      </div>
                    </div>
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
          );
        })()
      }

      {/* Modal adicionar/editar conteúdo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 py-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white rounded-t-2xl">
              <h3 className="font-black text-slate-800">{editId ? "Editar conteúdo" : "Novo conteúdo"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Título</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                  placeholder="Ex: Arte Dia do Estagiário — Feed Instagram" />
              </div>

              {/* Seletor visual de tipo */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-2">
                  Tipo de conteúdo
                  {form.isFixo
                    ? <span className="ml-1 font-normal text-green-600">(Biblioteca — fixo)</span>
                    : <span className="ml-1 font-normal text-blue-600">(Redes Sociais — rotativo)</span>}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(form.isFixo ? TIPOS_BIBLIOTECA_CARDS : TIPOS_SOCIAL_CARDS).map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                      className={clsx(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                        form.tipo === t.value
                          ? "border-[#0D2B5C] bg-[#0D2B5C]/5 text-[#0D2B5C]"
                          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      )}>
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-bold leading-tight">{t.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Formato do arquivo</label>
                  <select value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {FORMATOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] bg-white">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Upload de arquivo */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Arquivo
                  {COTAS[form.tipo] && !form.isFixo && (
                    <span className={clsx("ml-2 font-normal",
                      (cotaAtual[form.tipo] || 0) >= COTAS[form.tipo] ? "text-red-500" : "text-slate-400")}>
                      — cota rotativa: {cotaAtual[form.tipo] || 0}/{COTAS[form.tipo]} ativos
                    </span>
                  )}
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={clsx(
                    "relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center",
                    uploadFile ? "border-[#0D2B5C]/30 bg-[#0D2B5C]/5" : "border-slate-200 hover:border-[#0D2B5C]/40 hover:bg-slate-50"
                  )}>
                  <input ref={fileRef} type="file"
                    accept="image/*,video/mp4,video/quicktime,application/pdf"
                    className="hidden" onChange={onFileChange} />
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="preview" className="h-40 mx-auto rounded-lg object-cover" />
                  ) : uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-[#0D2B5C]">
                      {uploadFile.type.startsWith("video/") ? <FileVideo size={28} /> : <File size={28} />}
                      <div className="text-left">
                        <div className="text-sm font-semibold">{uploadFile.name}</div>
                        <div className="text-xs text-slate-400">{formatBytes(Math.ceil(uploadFile.size / 1024))}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Upload size={24} />
                      <span className="text-sm">Clique para selecionar ou arraste o arquivo</span>
                      <span className="text-xs">JPG, PNG, GIF, WebP, PDF: até 20 MB · MP4/MOV: até 200 MB</span>
                    </div>
                  )}
                  {uploadFile && (
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setUploadFile(null); setUploadPreview(""); setForm(f => ({ ...f, url: "" })); }}
                      className="absolute top-2 right-2 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0D2B5C] transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                <p className="text-xs text-slate-400 mt-1">
                  Ou cole uma URL diretamente no campo abaixo (Canva, Drive, etc.)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">URL do arquivo</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="https://... (ou use o upload acima)" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">URL do thumbnail</label>
                  <input value={form.thumbUrl} onChange={e => setForm(f => ({ ...f, thumbUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C]"
                    placeholder="https://... (imagem de preview)" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Descrição *</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D2B5C] resize-none"
                  rows={2} placeholder="Breve descrição do conteúdo" />
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

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#F4B400]" />
                  <span className="text-sm font-semibold text-slate-700">⭐ Marcar como destaque (aparece na página principal)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFixo} onChange={e => {
                    const isFixo = e.target.checked;
                    setForm(f => ({
                      ...f,
                      isFixo,
                      // Ao trocar de aba, sugere tipo padrão
                      tipo: isFixo
                        ? (TIPOS_BIBLIOTECA.includes(f.tipo) ? f.tipo : "MATERIAL_MARCA")
                        : (TIPOS_SOCIAL.includes(f.tipo) ? f.tipo : "POST_FEED"),
                    }));
                  }}
                    className="w-4 h-4 rounded accent-green-600" />
                  <span className="text-sm font-semibold text-slate-700">
                    🔒 Conteúdo fixo / Biblioteca (permanente — não entra na cota semanal)
                  </span>
                </label>
                {!form.isFixo && COTAS[form.tipo] && (
                  <p className="text-xs text-slate-400 pl-6">
                    Rotativos: {cotaAtual[form.tipo] || 0}/{COTAS[form.tipo]} ativos para {form.tipo}. Desative um antes de adicionar mais.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-100 bg-white rounded-b-2xl">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.descricao || (!uploadFile && !form.url) || saving}
                className="flex-1 px-4 py-2 bg-[#0D2B5C] text-white rounded-xl text-sm font-bold hover:bg-[#1a4080] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? (uploadFile && uploadProgress < 100 ? `Enviando ${uploadProgress}%...` : "Salvando...")
                  : <><Check size={14} /> {editId ? "Salvar alterações" : "Criar conteúdo"}</>}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
