"use client";

import { useEffect, useState } from "react";

const ROTULO: Record<string, string> = { synced: "Sincronizada", pending: "Pendente", error: "Erro", disabled: "Desativada" };
const COR: Record<string, string> = { synced: "text-green-700", pending: "text-amber-700", error: "text-red-700", disabled: "text-slate-500" };

/** Painel Super Admin: vínculo de cada franquia, sincronizar, verificar, reaplicar modelo, backfill e eventos com falha. */
export function AdminAlizo() {
  const [d, setD] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ignorar, setIgnorar] = useState<string[]>([]);

  async function carregar() {
    const r = await fetch("/api/app/alizo/admin", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }
  useEffect(() => { carregar(); }, []);

  async function agir(acao: string, extra: Record<string, unknown> = {}, chave = acao) {
    setBusy(chave); setMsg("");
    try {
      const r = await fetch("/api/app/alizo/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, ...extra }) });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Falhou.");
      else if (acao === "backfill") setMsg(j.ok ? `Backfill: ${j.criadas} criada(s), ${j.vinculadas} vinculada(s), ${j.jaSincronizadas} já sincronizada(s), ${j.comErro} com erro${j.abortado ? " (interrompido: acesso à Alizo recusado)" : ""}.` : "Integração não configurada.");
      else if (acao === "reprocessar_eventos") setMsg(`Eventos reprocessados: ${j.ok} ok, ${j.falharam} ainda com falha.`);
      else if (acao === "verificar") setMsg(j.ok ? (j.confere ? "Vínculo confere com a Alizo." : j.existeNaAlizo ? "Existe na Alizo, mas o vínculo local difere." : "Não existe na Alizo ainda.") : (j.motivo || "Não foi possível verificar."));
      else setMsg(j.ok === false ? (j.mensagem || j.motivo || "Não foi possível concluir.") : "Concluído.");
      await carregar();
    } catch { setMsg("Erro de conexão."); }
    setBusy(null);
  }

  if (!d) return null;
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-700">Administração da integração Alizo</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={!!busy} onClick={() => agir("backfill", { excluirIds: ignorar })} className="rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{ignorar.length ? `Vincular todas (menos ${ignorar.length} ignorada${ignorar.length > 1 ? "s" : ""})` : "Vincular todas as franquias"}</button>
          <button disabled={!!busy || d.eventosFalhos === 0} onClick={() => agir("reprocessar_eventos")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Reprocessar eventos com falha ({d.eventosFalhos})</button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {d.configurado ? "Acesso à Alizo configurado." : "Acesso à Alizo NÃO configurado."} {d.segredoWebhook ? "Segredo do webhook configurado." : "Segredo do webhook ausente."}{" "}
        {d.webhooks ? `${d.webhooks.length} webhook(s) cadastrado(s) na Alizo.` : ""}
      </p>
      {msg && <p className="mt-2 text-xs text-slate-800">{msg}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-400"><th className="py-1">Franquia</th><th>Situação</th><th>Último erro</th><th>Modelo</th><th>Ignorar</th><th></th></tr></thead>
          <tbody>
            {d.franquias.map((f: any) => (
              <tr key={f.id} className="border-t border-slate-100 align-top">
                <td className="py-1.5 pr-2 font-semibold text-slate-700">{f.name}</td>
                <td className={`pr-2 ${COR[f.alizoSyncStatus] || ""}`}>{ROTULO[f.alizoSyncStatus] || f.alizoSyncStatus}{f.vinculada ? "" : " · sem vínculo"}</td>
                <td className="pr-2 text-slate-500 max-w-[220px] break-words">{f.alizoLastError || "—"}</td>
                <td className="pr-2 text-slate-500">{f.alizoTemplateVersion || "—"}</td>
                <td className="pr-2"><input type="checkbox" checked={ignorar.includes(f.id)} onChange={e => setIgnorar(a => e.target.checked ? [...a, f.id] : a.filter(x => x !== f.id))} aria-label={`Ignorar ${f.name} no backfill`} /></td>
                <td className="py-1 whitespace-nowrap">
                  {[["verificar", "Verificar"], ["sincronizar", "Sincronizar"], ["modelo", "Reaplicar modelo"]].map(([a, t]) => (
                    <button key={a} disabled={!!busy} onClick={() => agir(a, { franchiseId: f.id }, `${a}:${f.id}`)} className="mr-1 rounded border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 disabled:opacity-50">{busy === `${a}:${f.id}` ? "…" : t}</button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
