"use client";
import { useState } from "react";

export interface JornadaLead {
  id: string; tokenPublico: string | null; visualizacoes: number; apresentacaoAbertaEm: string | null; cofBaixadaEm: string | null;
  cadastroEm: string | null; contratoDocId: string | null; contratoEnviadoEm: string | null; contratoAssinadoEm: string | null;
  franchiseId: string | null; manualEnviadoEm: string | null;
}

const fmt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

export function JornadaCard({ lead, onChange }: { lead: JornadaLead; onChange: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  async function chamar(acao: "link" | "contrato") {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/app/franquia-crm/${lead.id}/jornada`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Erro"); return; }
      if (acao === "link") { setLink(d.url); try { await navigator.clipboard.writeText(d.url); setMsg("Link copiado!"); } catch { setMsg("Link gerado."); } }
      else { setMsg("Contrato enviado ao Autentique."); }
      onChange();
    } finally { setBusy(false); }
  }

  const passos: [string, string | null][] = [
    ["Apresentação aberta", lead.apresentacaoAbertaEm ? `${fmt(lead.apresentacaoAbertaEm)} (${lead.visualizacoes}x)` : null],
    ["COF baixada", fmt(lead.cofBaixadaEm)],
    ["Cadastro recebido", fmt(lead.cadastroEm)],
    ["Contrato enviado", fmt(lead.contratoEnviadoEm)],
    ["Contrato assinado", fmt(lead.contratoAssinadoEm)],
    ["Manual enviado", fmt(lead.manualEnviadoEm)],
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-500 uppercase mb-3">Jornada de fechamento</p>
      <ul className="space-y-1 text-sm">
        {passos.map(([t, v]) => <li key={t} className="flex justify-between"><span className={v ? "text-slate-800" : "text-slate-400"}>{v ? "✅" : "⬜"} {t}</span><span className="text-xs text-slate-500">{v || "—"}</span></li>)}
      </ul>
      <div className="mt-3 space-y-2">
        <button disabled={busy} onClick={() => chamar("link")} className="w-full rounded-lg bg-[#0f2a5e] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
          🔗 {lead.tokenPublico ? "Copiar link Apresentação + COF" : "Gerar link Apresentação + COF"}
        </button>
        {link && <input readOnly value={link} onFocus={e => e.target.select()} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />}
        {lead.cadastroEm && !lead.contratoDocId && (
          <button disabled={busy} onClick={() => chamar("contrato")} className="w-full rounded-lg bg-[#f5c400] px-3 py-2 text-sm font-black text-[#0f2a5e] disabled:opacity-50">✍️ Enviar contrato para assinatura</button>
        )}
        {lead.franchiseId && <a href="/dashboard/franqueados" className="block text-center text-xs font-bold text-blue-700 underline">Ver unidade criada</a>}
        {msg && <p className="text-xs font-semibold text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
