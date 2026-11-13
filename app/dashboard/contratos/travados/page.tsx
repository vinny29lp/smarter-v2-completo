"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ETAPAS: Record<string, { rotulo: string; cor: string }> = {
  SEM_TCE: { rotulo: "Sem TCE", cor: "bg-slate-100 text-slate-700" },
  TCE_NAO_ENVIADO: { rotulo: "Não enviado", cor: "bg-amber-100 text-amber-800" },
  AGUARDANDO_ASSINATURA: { rotulo: "Aguardando assinatura", cor: "bg-blue-100 text-blue-800" },
  ASSINADO_NAO_ATIVADO: { rotulo: "Assinado, não ativado", cor: "bg-purple-100 text-purple-800" },
  ATIVO_VENCIDO: { rotulo: "Ativo vencido", cor: "bg-red-100 text-red-800" },
};

export default function ContratosTravadosPage() {
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("TODOS");

  useEffect(() => {
    fetch("/api/app/contratos/travados", { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Erro"); return d; })
      .then(setDados)
      .catch(e => setErro(e.message));
  }, []);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!dados) return <p className="text-sm text-slate-500">Carregando…</p>;

  const itens = dados.itens.filter((i: any) => filtro === "TODOS" || i.etapa === filtro);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#0f2a5e]">Contratos travados</h2>
        <p className="text-sm text-slate-500">Cada contrato parado é um estágio que ainda não gera receita. Resolva do mais antigo para o mais novo.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltro("TODOS")} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filtro === "TODOS" ? "bg-[#0f2a5e] text-white" : "bg-slate-100 text-slate-600"}`}>
          Todos ({dados.total})
        </button>
        {Object.entries(ETAPAS).map(([k, v]) => dados.porEtapa[k] ? (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filtro === k ? "bg-[#0f2a5e] text-white" : "bg-slate-100 text-slate-600"}`}>
            {v.rotulo} ({dados.porEtapa[k]})
          </button>
        ) : null)}
      </div>
      {itens.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Nenhum contrato travado. 🎉</div>
      ) : (
        <div className="space-y-2">
          {itens.map((i: any) => (
            <div key={i.id} className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ETAPAS[i.etapa]?.cor}`}>{ETAPAS[i.etapa]?.rotulo}</span>
                  <span className="text-xs text-slate-400">{i.etapa === "ATIVO_VENCIDO" ? `vencido há ${i.dias} dia(s)` : `parado há ${i.dias} dia(s)`}</span>
                </div>
                <p className="mt-1 font-semibold text-slate-800 text-sm truncate">{i.aluno} · {i.empresa}</p>
                <p className="text-xs text-slate-500">{i.titulo}. {i.proximaAcao}</p>
                {i.faltamAssinar?.length > 0 && <p className="text-xs text-blue-700 mt-0.5">Falta assinar: {i.faltamAssinar.join(", ")}</p>}
                {i.unidade && <p className="text-[11px] text-slate-400">{i.unidade} · {i.numero}</p>}
              </div>
              <Link href={`/dashboard/contratos/${i.id}`} className="shrink-0 rounded-lg bg-[#0f2a5e] px-4 py-2 text-xs font-bold text-white hover:bg-[#143a7d] text-center">
                Abrir contrato →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
