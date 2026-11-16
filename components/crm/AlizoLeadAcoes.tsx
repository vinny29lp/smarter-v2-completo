"use client";

import { useState } from "react";

/** Ações do Sales (Alizo) sobre um lead: enviar para atendimento, pausar e retomar. */
export function AlizoLeadAcoes({ leadId, alizoLeadId, pausadoInicial, optIn }: { leadId: string; alizoLeadId?: string | null; pausadoInicial?: boolean; optIn?: boolean }) {
  const [enviado, setEnviado] = useState(!!alizoLeadId);
  const [pausado, setPausado] = useState(!!pausadoInicial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function acao(a: "enviar" | "pausar" | "retomar") {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/app/alizo/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, acao: a }) });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Não foi possível concluir.");
      else {
        if (a === "enviar") { setEnviado(true); setMsg("Lead enviado ao Sales."); }
        if (a === "pausar") { setPausado(true); setMsg("Automação pausada."); }
        if (a === "retomar") { setPausado(false); setMsg("Automação retomada."); }
      }
    } catch { setMsg("Erro de conexão."); }
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
      <p className="font-bold text-slate-600">Atendimento automático (Sales)</p>
      <p className="mt-0.5 text-slate-500">{!enviado ? "Ainda não enviado ao Sales." : pausado ? "Pausado: um humano está atendendo." : "O Sales está atendendo este lead."}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!enviado && <button disabled={busy || optIn === false} onClick={() => acao("enviar")} className="rounded-lg bg-[#0f2a5e] px-3 py-1.5 font-bold text-white disabled:opacity-50">Enviar para o Sales</button>}
        {enviado && !pausado && <button disabled={busy} onClick={() => acao("pausar")} className="rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-white disabled:opacity-50">Pausar automação</button>}
        {enviado && pausado && <button disabled={busy || optIn === false} onClick={() => acao("retomar")} className="rounded-lg bg-green-600 px-3 py-1.5 font-bold text-white disabled:opacity-50">Retomar automação</button>}
      </div>
      {optIn === false && <p className="mt-2 text-red-600">Este contato não aceita mensagens automáticas.</p>}
      {msg && <p className="mt-2 text-slate-700">{msg}</p>}
    </div>
  );
}
