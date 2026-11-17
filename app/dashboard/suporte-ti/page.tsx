"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Caso = {
  id: string; protocol: string | null; title: string; description: string; path: string; category: string;
  reporterName: string; franchiseId: string | null; remoteStatus: string | null; createdAt: string;
  felipeStatus: string; felipeRisk: string; felipeDiagnosis: string | null; felipeProposal: string | null;
  felipeChangeUrl: string | null; felipeNotes: string | null;
};

const ROTULO: Record<string, string> = {
  NOVO: "Novo", DIAGNOSTICADO: "Diagnosticado", AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado", REJEITADO: "Rejeitado", RESOLVIDO: "Resolvido",
};
const COR_RISCO: Record<string, string> = {
  BAIXO: "bg-green-100 text-green-700", MEDIO: "bg-amber-100 text-amber-700", ALTO: "bg-red-100 text-red-700",
};

function CasoCard({ c, onChange }: { c: Caso; onChange: () => void }) {
  const [diag, setDiag] = useState(c.felipeDiagnosis ?? "");
  const [prop, setProp] = useState(c.felipeProposal ?? "");
  const [url, setUrl] = useState(c.felipeChangeUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function enviar(corpo: Record<string, unknown>) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/app/support/felipe/${c.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
      });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Não foi possível salvar.");
      else {
        if (j.propostaDescartada) setMsg("Risco ALTO: só o diagnóstico foi salvo; a proposta de alteração foi descartada.");
        onChange();
      }
    } catch { setMsg("Erro de conexão."); }
    setBusy(false);
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-slate-800">{c.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${COR_RISCO[c.felipeRisk] ?? ""}`}>Risco {c.felipeRisk}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{ROTULO[c.felipeStatus] ?? c.felipeStatus}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {c.reporterName} · {c.path} · {c.category} · {new Date(c.createdAt).toLocaleString("pt-BR")}
        {c.protocol ? ` · protocolo ${c.protocol}` : ""}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700 line-clamp-6">{c.description}</p>

      <div className="mt-3 space-y-2">
        <textarea value={diag} onChange={e => setDiag(e.target.value)} rows={2} placeholder="Diagnóstico (causa provável)"
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs" />
        {c.felipeRisk !== "ALTO" ? (
          <>
            <textarea value={prop} onChange={e => setProp(e.target.value)} rows={2} placeholder="Proposta de correção (o que mudar)"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs" />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link da alteração (https://…), se houver"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs" />
          </>
        ) : (
          <p className="text-xs text-red-700">Risco ALTO (acesso, financeiro, banco, integrações): só diagnóstico, sem alteração automática.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={busy || !diag.trim()} onClick={() => enviar({ diagnostico: diag, proposta: prop || undefined, changeUrl: url || undefined })}
          className="rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Salvar parecer</button>
        {c.felipeStatus === "AGUARDANDO_APROVACAO" && c.felipeRisk !== "ALTO" && (
          <button disabled={busy} onClick={() => enviar({ acao: "APROVAR" })}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Aprovar correção</button>
        )}
        {["AGUARDANDO_APROVACAO", "DIAGNOSTICADO"].includes(c.felipeStatus) && (
          <button disabled={busy} onClick={() => enviar({ acao: "REJEITAR" })}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">Rejeitar</button>
        )}
        {["APROVADO", "DIAGNOSTICADO", "AGUARDANDO_APROVACAO"].includes(c.felipeStatus) && (
          <button disabled={busy} onClick={() => enviar({ acao: "RESOLVER" })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Marcar resolvido</button>
        )}
        {["REJEITADO", "RESOLVIDO"].includes(c.felipeStatus) && (
          <button disabled={busy} onClick={() => enviar({ acao: "REABRIR" })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Reabrir</button>
        )}
        {msg && <span className="text-xs text-slate-700">{msg}</span>}
      </div>
    </div>
  );
}

export default function SuporteTiPage() {
  const { data: session } = useSession();
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/app/support/felipe${filtro ? `?status=${filtro}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setErro(j.error || "Não foi possível carregar."); else { setErro(""); setCasos(j.casos); }
    } catch { setErro("Erro de conexão."); }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  if (session && session.user.role !== "FRANQUEADORA") return <p className="p-6 text-sm text-slate-600">Acesso restrito à franqueadora.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Suporte TI — Felipe</h1>
        <p className="text-xs text-slate-500">Chamados abertos pela Kai e pelo suporte. Nesta fase o Felipe só diagnostica e propõe; nada é alterado sem a sua aprovação.</p>
      </div>
      <select value={filtro} onChange={e => setFiltro(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
        <option value="">Todos os status</option>
        {Object.entries(ROTULO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {casos === null && !erro && <p className="text-sm text-slate-500">Carregando…</p>}
      {casos?.length === 0 && <p className="text-sm text-slate-500">Nenhum chamado neste filtro.</p>}
      {casos?.map(c => <CasoCard key={c.id} c={c} onChange={carregar} />)}
    </div>
  );
}
