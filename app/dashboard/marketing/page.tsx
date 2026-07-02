"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Library, Megaphone, CalendarDays, Lightbulb, Newspaper, TrendingUp, Download, Heart, ArrowRight, Sparkles, Star } from "lucide-react";

export default function MarketingHubPage() {
  const { data: session } = useSession();
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [conteudosDestaque, setConteudosDestaque] = useState<any[]>([]);
  const [noticias, setNoticias] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalConteudos: 0, totalDownloads: 0, totalCampanhas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/app/marketing/sugestoes").then(r => r.json()).catch(() => ({ sugestoes: [] })),
      fetch("/api/app/marketing/conteudos?destaque=true").then(r => r.json()).catch(() => ({ conteudos: [] })),
      fetch("/api/app/marketing/noticias").then(r => r.json()).catch(() => ({ noticias: [] })),
      fetch("/api/app/marketing/conteudos").then(r => r.json()).catch(() => ({ conteudos: [], total: 0 })),
      fetch("/api/app/marketing/campanhas").then(r => r.json()).catch(() => ({ campanhas: [] })),
    ]).then(([s, d, n, all, c]) => {
      setSugestoes((s.sugestoes || []).slice(0, 4));
      setConteudosDestaque((d.conteudos || []).slice(0, 6));
      setNoticias((n.noticias || []).slice(0, 3));
      setStats({
        totalConteudos: all.total || 0,
        totalDownloads: (all.conteudos || []).reduce((acc: number, c: any) => acc + (c.totalDownloads || 0), 0),
        totalCampanhas: (c.campanhas || []).length,
      });
      setLoading(false);
    });
  }, []);

  const isAdmin = session?.user?.role === "FRANQUEADORA" ||
    (session?.user?.role === "EQUIPE" && (session?.user?.permissoes as string[] | undefined)?.includes("marketing"));
  const nome = session?.user?.name?.split(" ")[0] || "Usuário";

  const CARDS = [
    { href: "/dashboard/marketing/biblioteca",  icon: Library,      label: "Biblioteca",    desc: "Artes, vídeos e copies prontos",    cor: "#0D2B5C" },
    { href: "/dashboard/marketing/campanhas",   icon: Megaphone,    label: "Campanhas",     desc: "Campanhas ativas da rede",           cor: "#7c3aed" },
    { href: "/dashboard/marketing/calendario",  icon: CalendarDays, label: "Calendário",    desc: "Datas e planejamento editorial",     cor: "#0891b2" },
    { href: "/dashboard/marketing/sugestoes",   icon: Lightbulb,    label: "Sugestões IA",  desc: "O que postar baseado nos seus dados",cor: "#d97706" },
    { href: "/dashboard/marketing/noticias",    icon: Newspaper,    label: "Notícias",      desc: "Novidades da rede Smarter",          cor: "#059669" },
  ];

  const TIPO_LABEL: Record<string, string> = {
    POST_FEED: "Feed",
    STORY: "Story",
    REELS: "Reels",
    CARROSSEL: "Carrossel",
    VIDEO: "Vídeo",
    COPY: "Copy",
    ARTE_PDF: "PDF",
    TEMPLATE: "Template",
    MATERIAL_MARCA: "Marca",
  };

  const PRIORIDADE_COR: Record<string, string> = {
    ALTA: "bg-red-50 border-red-200 text-red-700",
    MEDIA: "bg-yellow-50 border-yellow-200 text-yellow-700",
    BAIXA: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="bg-gradient-to-r from-[#0D2B5C] to-[#1a4080] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm">Olá, {nome}! 👋</p>
            <h2 className="text-2xl font-black mt-0.5">Marketing Hub</h2>
            <p className="text-blue-200 text-sm mt-1">Tudo que você precisa para crescer está aqui.</p>
          </div>
          <Sparkles className="text-[#F4B400]" size={32} />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{stats.totalConteudos}</div>
            <div className="text-blue-200 text-[11px]">Conteúdos</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{stats.totalDownloads}</div>
            <div className="text-blue-200 text-[11px]">Downloads</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{stats.totalCampanhas}</div>
            <div className="text-blue-200 text-[11px]">Campanhas</div>
          </div>
        </div>
      </div>

      {/* Menu principal */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CARDS.map(card => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-md transition-all group flex flex-col items-center text-center gap-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: card.cor + "15" }}>
              <card.icon size={22} style={{ color: card.cor }} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{card.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sugestões Inteligentes */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-[#F4B400]" />
              <span className="font-bold text-slate-800 text-sm">Sugestões Inteligentes</span>
            </div>
            <Link href="/dashboard/marketing/sugestoes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Carregando sugestões...</div>
            ) : sugestoes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Nenhuma sugestão no momento.</div>
            ) : sugestoes.map((s) => (
              <div key={s.id} className={`border rounded-xl p-3 ${PRIORIDADE_COR[s.prioridade] || "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{s.titulo}</div>
                    <div className="text-xs mt-0.5 opacity-80 line-clamp-2">{s.descricao}</div>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${
                    s.prioridade === "ALTA" ? "bg-red-200 text-red-800" :
                    s.prioridade === "MEDIA" ? "bg-yellow-200 text-yellow-800" : "bg-blue-200 text-blue-800"
                  }`}>{s.prioridade}</span>
                </div>
                {s.link && (
                  <Link href={s.link} className="text-xs font-semibold mt-1.5 inline-flex items-center gap-1 hover:underline opacity-80">
                    {s.acao} <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdos em destaque */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#F4B400]" />
              <span className="font-bold text-slate-800 text-sm">Destaques</span>
            </div>
            <Link href="/dashboard/marketing/biblioteca?destaque=true" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
            ) : conteudosDestaque.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhum conteúdo em destaque ainda.
                {isAdmin && <Link href="/dashboard/marketing/admin" className="block text-blue-600 mt-1 hover:underline text-xs">Adicionar conteúdo →</Link>}
              </div>
            ) : conteudosDestaque.map((c) => (
              <Link key={c.id} href={`/dashboard/marketing/biblioteca`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                {c.thumbUrl ? (
                  <img src={c.thumbUrl} alt={c.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#0D2B5C]/10 flex items-center justify-center shrink-0">
                    <Library size={20} className="text-[#0D2B5C]/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{c.titulo}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {TIPO_LABEL[c.tipo] || c.tipo}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Download size={9} /> {c.totalDownloads || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Heart size={9} /> {c._count?.favoritos || 0}
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Notícias da Rede */}
      {noticias.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Newspaper size={16} className="text-[#059669]" />
              <span className="font-bold text-slate-800 text-sm">Notícias da Rede</span>
            </div>
            <Link href="/dashboard/marketing/noticias" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {noticias.map((n) => (
              <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                {n.thumbUrl && (
                  <img src={n.thumbUrl} alt={n.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{n.titulo}</span>
                    {n.importante && <span className="text-[9px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded uppercase">Importante</span>}
                  </div>
                  {n.resumo && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.resumo}</p>}
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.publicadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {n.autor && ` · por ${n.autor}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Admin */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-[#F4B400] to-[#f59e0b] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="font-black text-[#0D2B5C]">Gerencie o Marketing Hub</div>
            <div className="text-[#0D2B5C]/70 text-sm">Adicione conteúdos, campanhas e notícias para toda a rede.</div>
          </div>
          <Link href="/dashboard/marketing/admin"
            className="bg-[#0D2B5C] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#1a4080] transition-colors shrink-0">
            Painel Admin
          </Link>
        </div>
      )}
    </div>
  );
}
