"use client";

import { useEffect, useState } from "react";

/** Prospecção por região: capturadas hoje, limite diário, histórico e execução manual (1 por dia). */
export function ProspeccaoCard({ franchiseId }: { franchiseId?: string }) {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const q = franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : "";

  async function carregar() {
    try {
      const r = await fetch(`/api/app/alizo/prospeccao${q}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setErro(j.error || "Não foi possível carregar."); else { setD(j); setErro(""); }
    } catch { setErro("Erro de conexão."); }
  }
  useEffect(() => { carregar(); }, [q]);

  async function rodar() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/app/alizo/prospeccao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ franchiseId }) });
      const j = await r.json();
      setMsg(r.ok ? `Prospecção concluída: ${j.capturadas ?? 0} empresa(s) capturada(s).` : j.error || "Não foi possível executar.");
      await carregar();
    } catch { setMsg("Erro de conexão."); }
    setBusy(false);
  }

  if (erro) return <p className="mt-4 text-xs text-slate-500">Prospecção: {erro}</p>;
  if (!d) return null;
  return (
    <div className="mt-4 rounded-lg border border-slate-100 p-3">
      <p className="text-xs font-bold text-slate-600">Prospecção por região</p>
      <p className="mt-1 text-sm text-slate-700"><b>{d.capturadasHoje}</b> de {d.limiteDiario} empresas capturadas hoje</p>
      <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#0f2a5e]" style={{ width: `${Math.min(100, (d.capturadasHoje / d.limiteDiario) * 100)}%` }} /></div>
      <p className="mt-1 text-[11px] text-slate-500">Regiões: {d.regioes.length ? d.regioes.join(" · ") : "nenhuma cadastrada"} · próxima execução: {d.proximaExecucao === "hoje" ? "hoje" : "amanhã"}</p>
      {d.regioes.length > 0 && d.proximaExecucao === "hoje" && <button disabled={busy} onClick={rodar} className="mt-2 rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Prospectar agora</button>}
      {msg && <p className="mt-2 text-xs text-slate-700">{msg}</p>}
      {d.historico.length > 0 && (
        <ul className="mt-2 space-y-1">
          {d.historico.slice(0, 5).map((h: any) => (
            <li key={h.id} className={`text-xs ${h.falhou ? "text-red-600" : "text-slate-600"}`}>
              <span className="text-slate-400">{new Date(h.quando).toLocaleDateString("pt-BR")}</span> — {h.resumo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
