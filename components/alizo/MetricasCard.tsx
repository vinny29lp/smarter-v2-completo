"use client";

import { useState } from "react";

/** Métricas e consumo, exatamente como a Alizo devolve (nada é calculado no navegador). Carrega sob demanda. */
export function MetricasCard({ franchiseId }: { franchiseId?: string }) {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  async function carregar() {
    setBusy(true); setErro("");
    try {
      const r = await fetch(`/api/app/alizo/metricas${franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setErro(j.error || "Não foi possível carregar."); else setD(j);
    } catch { setErro("Erro de conexão."); }
    setBusy(false);
  }
  const linhas = (o: any): Array<[string, string]> =>
    o && typeof o === "object" ? Object.entries(o.metrics ?? o).filter(([, v]) => ["number", "string"].includes(typeof v)).map(([k, v]) => [k.replace(/_/g, " "), String(v)]) : [];
  return (
    <div className="mt-4 rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-600">Métricas e consumo (Alizo)</p>
        <button disabled={busy} onClick={carregar} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 disabled:opacity-50">{d ? "Atualizar" : "Carregar"}</button>
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      {d && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[...linhas(d.metricas), ...linhas(d.consumo).map(([k, v]) => [`uso: ${k}`, v] as [string, string])].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-2 text-center"><p className="text-lg font-black text-[#0f2a5e]">{v}</p><p className="text-[10px] text-slate-500">{k}</p></div>
          ))}
          {linhas(d.metricas).length === 0 && <p className="col-span-2 text-xs text-slate-400">A Alizo ainda não devolveu métricas para esta unidade.</p>}
        </div>
      )}
    </div>
  );
}
