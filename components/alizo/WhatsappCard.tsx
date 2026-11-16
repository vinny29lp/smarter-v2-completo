"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deveContinuarConsultando, INTERVALO_QR_MS, type EstadoWhatsapp } from "@/lib/alizo/whatsappRegras";

interface Estado { estado: EstadoWhatsapp; qr: string | null; expiraEm: string | null; telefone: string | null; provedor: string | null; ultimaAtividade: string | null }

const ROTULO: Record<string, { txt: string; cor: string }> = {
  connected: { txt: "● Conectado", cor: "text-green-700" },
  qr_pending: { txt: "● Aguardando leitura do QR Code", cor: "text-amber-700" },
  disconnected: { txt: "● Desconectado", cor: "text-slate-600" },
  banned: { txt: "● Número bloqueado pelo WhatsApp", cor: "text-red-700" },
  error: { txt: "● Erro de conexão", cor: "text-red-700" },
  unknown: { txt: "● Verificando…", cor: "text-slate-500" },
};

/** Conexão do WhatsApp da unidade, dentro do Smarter. "Conectado" só quando a Alizo confirmar. */
export function WhatsappCard({ franchiseId }: { franchiseId?: string }) {
  const [e, setE] = useState<Estado | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const inicio = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vivo = useRef(true);
  const q = franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : "";

  const consultar = useCallback(async () => {
    try {
      const r = await fetch(`/api/app/alizo/whatsapp${q}`, { cache: "no-store" });
      const j = await r.json();
      if (!vivo.current) return;
      if (!r.ok) { setMsg(j.error || "Não foi possível consultar agora."); setE(prev => prev ?? { estado: "error", qr: null, expiraEm: null, telefone: null, provedor: null, ultimaAtividade: null }); return; }
      setMsg(""); setE(j);
      if (deveContinuarConsultando(j.estado, inicio.current || Date.now(), Date.now())) {
        timer.current = setTimeout(consultar, INTERVALO_QR_MS);
      }
    } catch { if (vivo.current) setMsg("Erro de conexão ao consultar o WhatsApp."); }
  }, [q]);

  useEffect(() => {
    vivo.current = true; inicio.current = Date.now(); consultar();
    return () => { vivo.current = false; if (timer.current) clearTimeout(timer.current); };
  }, [consultar]);

  async function agir(acao: "connect" | "reconnect" | "disconnect") {
    setBusy(true); setMsg("");
    if (timer.current) clearTimeout(timer.current);
    try {
      const r = await fetch("/api/app/alizo/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, franchiseId }) });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Não foi possível concluir.");
      else { setE(j); inicio.current = Date.now(); if (deveContinuarConsultando(j.estado, inicio.current, Date.now())) timer.current = setTimeout(consultar, INTERVALO_QR_MS); }
    } catch { setMsg("Erro de conexão."); }
    setBusy(false);
  }

  const r = ROTULO[e?.estado ?? "unknown"];
  return (
    <div className="mt-4 rounded-lg border border-slate-100 p-3">
      <p className="text-xs font-bold text-slate-600">WhatsApp da unidade</p>
      <p className={`mt-1 text-sm ${r.cor}`}>{r.txt}{e?.estado === "connected" && e.telefone ? ` · ${e.telefone}` : ""}</p>
      {e?.provedor && <p className="text-[11px] text-slate-400">Provedor: {e.provedor}{e.ultimaAtividade ? ` · última atividade ${new Date(e.ultimaAtividade).toLocaleString("pt-BR")}` : ""}</p>}
      {e?.estado === "qr_pending" && e.qr && (
        <div className="mt-2">
          <img src={e.qr} alt="QR Code do WhatsApp" className="h-44 w-44 rounded border border-slate-200" />
          <p className="mt-1 text-xs text-slate-500">No celular: WhatsApp → Aparelhos conectados → Conectar aparelho. A conexão só vale quando este painel mostrar “Conectado”.</p>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {(e?.estado === "disconnected" || e?.estado === "unknown" || e?.estado === "error") && <button disabled={busy} onClick={() => agir("connect")} className="rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Conectar WhatsApp</button>}
        {e?.estado === "qr_pending" && <button disabled={busy} onClick={() => agir("reconnect")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Gerar novo QR</button>}
        {e?.estado === "connected" && <button disabled={busy} onClick={() => agir("reconnect")} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Reconectar</button>}
        {e && e.estado !== "disconnected" && <button disabled={busy} onClick={() => { if (confirm("Desconectar o WhatsApp da unidade? Os funcionários digitais param de enviar mensagens.")) agir("disconnect"); }} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">Desconectar</button>}
        <button disabled={busy} onClick={() => { inicio.current = Date.now(); consultar(); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-50">Verificar novamente</button>
      </div>
    </div>
  );
}
