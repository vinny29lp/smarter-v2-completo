"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { montarTarefas, resumoTarefas, assinaturaTarefas, type TarefaLia } from "@/lib/lia/tarefas";

const CHAVE = "lia-central-acoes";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Central de Ações da Lia: aviso grande, 1x por dia (ou quando as pendências mudam),
 * listando o que a unidade precisa fazer, com botão de ação. Depois de fechado, vira um
 * botão flutuante discreto para reabrir.
 */
export function CentralAcoes({ financeiro }: { financeiro: boolean }) {
  const [tarefas, setTarefas] = useState<TarefaLia[]>([]);
  const [aberto, setAberto] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/app/alertas", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!vivo || !d?.alertas) return;
        const lista = montarTarefas(d.alertas, { financeiro });
        setTarefas(lista);
        setPronto(true);
        if (lista.length === 0) return;
        let visto: { dia?: string; sig?: string } = {};
        try { visto = JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch {}
        const sig = assinaturaTarefas(lista);
        if (visto.dia !== hoje() || visto.sig !== sig) setAberto(true);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [financeiro]);

  function fechar() {
    setAberto(false);
    try { localStorage.setItem(CHAVE, JSON.stringify({ dia: hoje(), sig: assinaturaTarefas(tarefas) })); } catch {}
  }

  if (!pronto || tarefas.length === 0) return null;
  const { criticas, atencao } = resumoTarefas(tarefas);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-24 z-40 flex items-center gap-2 rounded-full bg-[#0f2a5e] text-white text-xs font-bold pl-3 pr-4 py-2.5 shadow-lg hover:bg-[#143a7d]"
        aria-label="Abrir pendências da Lia"
      >
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#f5c400] text-[#0f2a5e] px-1">
          {criticas + atencao}
        </span>
        Pendências da Lia
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="bg-[#0f2a5e] text-white px-6 py-5">
          <p className="text-xs font-semibold text-[#f5c400] tracking-wide">LIA · SUA ASSISTENTE</p>
          <h2 className="text-xl font-bold mt-1">Você tem pendências que precisam de ação</h2>
          <p className="text-sm text-blue-100 mt-1">
            {criticas > 0 && <><b>{criticas}</b> urgente{criticas > 1 ? "s" : ""}</>}
            {criticas > 0 && atencao > 0 && " · "}
            {atencao > 0 && <><b>{atencao}</b> pedindo atenção</>}
          </p>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {tarefas.map(t => (
            <div key={t.id} className={`rounded-xl border p-4 ${t.prioridade === "critico" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{t.titulo}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t.detalhe}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${t.prioridade === "critico" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>{t.qtd}</span>
              </div>
              <Link href={t.href} onClick={fechar} className="mt-3 inline-block rounded-lg bg-[#0f2a5e] px-4 py-2 text-xs font-bold text-white hover:bg-[#143a7d]">
                {t.acao} →
              </Link>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-4 py-3 flex justify-end">
          <button onClick={fechar} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Vou resolver depois
          </button>
        </div>
      </div>
    </div>
  );
}
