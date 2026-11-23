"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function VisitaForm() {
  const router = useRouter();
  const [empresa, setEmpresa] = useState(""); const [resultado, setResultado] = useState("apresentou"); const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/app/trilha/visita", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresa, resultado, observacao: obs }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Erro ao registrar."); return; }
      setEmpresa(""); setObs(""); setMsg("Visita registrada!"); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={salvar} className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
      <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Empresa visitada" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <select value={resultado} onChange={e => setResultado(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
        <option value="apresentou">Apresentou</option><option value="proposta">Deixou proposta</option><option value="agendou">Agendou retorno</option><option value="sem_interesse">Sem interesse</option>
      </select>
      <button disabled={busy} className="rounded-lg bg-[#0f2a5e] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "..." : "Registrar visita"}</button>
      <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)" className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {msg && <p className="md:col-span-3 text-xs font-semibold text-slate-600">{msg}</p>}
    </form>
  );
}
