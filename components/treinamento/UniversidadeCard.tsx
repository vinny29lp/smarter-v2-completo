"use client";

import { useCallback, useEffect, useState } from "react";

type St = { existe: boolean; total: number; feitos: number; concluido: boolean } | { indisponivel: true } | null;

/** Card único de acesso ao treinamento: abre a Universidade Smarter já logada (login único) e mostra o progresso. */
export function UniversidadeCard({ onStatus, titulo = "Universidade Smarter" }: { onStatus?: (concluido: boolean) => void; titulo?: string }) {
  const [st, setSt] = useState<St>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/app/universidade/status", { cache: "no-store" });
      const d = r.ok ? await r.json() : { indisponivel: true };
      setSt(d);
      if ("concluido" in d) onStatus?.(!!d.concluido);
    } catch { setSt({ indisponivel: true }); }
    finally { setCarregando(false); }
  }, [onStatus]);

  useEffect(() => { carregar(); }, [carregar]);
  // Ao voltar da universidade para esta aba, atualiza o progresso.
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [carregar]);

  const ok = st && "total" in st ? st : null;
  const pct = ok && ok.total ? Math.round((ok.feitos / ok.total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[#c79a00]">Treinamento oficial da rede</p>
          <h2 className="mt-1 text-xl font-black text-[#0f2a5e]">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-600 max-w-xl">29 módulos com Lei do Estágio, equipe digital, comercial (CML), operação, Trilha dos 30 contratos e rotina. Você entra com o mesmo acesso do painel, sem digitar outra senha.</p>
        </div>
        <a href="/api/app/universidade/entrar" target="_blank" rel="noopener" className="rounded-xl bg-[#f5c400] px-5 py-3 text-sm font-black text-[#0f2a5e] whitespace-nowrap">Abrir a Universidade</a>
      </div>

      <div className="mt-5">
        {carregando && !st && <p className="text-sm text-slate-400">Carregando progresso...</p>}
        {st && "indisponivel" in st && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Não foi possível consultar o seu progresso agora. Você pode abrir a Universidade normalmente e tentar atualizar daqui a pouco.</p>}
        {ok && (<>
          <div className="flex justify-between text-xs font-semibold text-slate-500"><span>{ok.feitos} de {ok.total} módulos concluídos</span><span>{pct}%</span></div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-[#f5c400] transition-all" style={{ width: `${pct}%` }} /></div>
          {ok.concluido && <p className="mt-2 text-sm font-semibold text-green-700">✅ Todos os módulos concluídos.</p>}
        </>)}
        <button onClick={carregar} disabled={carregando} className="mt-3 text-xs font-bold text-[#0f2a5e] underline disabled:opacity-50">{carregando ? "Atualizando..." : "Atualizar progresso"}</button>
      </div>
    </div>
  );
}
