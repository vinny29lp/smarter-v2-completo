"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (k: string) => MESES[Number(k.slice(5)) - 1] + "/" + k.slice(2, 4);

function Card({ titulo, valor, sub }: { titulo: string; valor: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
      <p className="text-xs font-semibold text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-[#0f2a5e]">{valor}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ResultadosPage() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/app/resultados", { cache: "no-store" })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Erro"); return j; })
      .then(setD).catch(e => setErro(e.message));
  }, []);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!d) return <p className="text-sm text-slate-500">Carregando…</p>;

  const max = Math.max(1, ...d.criados, ...d.ativados);
  const maxSaida = Math.max(1, ...d.saidas.map((s: any) => s.qtd));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0f2a5e]">Resultados {d.escopo === "rede" ? "da rede" : "da unidade"}</h2>
        <p className="text-sm text-slate-500">Quanto a operação está crescendo e por que os estágios terminam.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card titulo="Contratos ativos" valor={d.ativos.contratos} sub={`${d.ativos.empresas} empresas · ${d.ativos.estudantes} estudantes`} />
        <Card titulo="Novos contratos no mês" valor={d.novosMes}
          sub={d.variacaoNovos === null ? "mês anterior sem contratos" : `${d.variacaoNovos >= 0 ? "+" : ""}${d.variacaoNovos}% vs. mês anterior (${d.novosMesAnterior})`} />
        <Card titulo="Aguardando ativação" valor={d.pendentes}
          sub="pendentes ou em assinatura" />
        <Card titulo="Dias até ativar" valor={d.diasParaAtivar === null ? "—" : d.diasParaAtivar}
          sub="média entre criar e ativar o contrato" />
      </div>
      {d.pendentes > 0 && (
        <Link href="/dashboard/contratos/travados" className="inline-block text-xs font-bold text-amber-700 underline">
          Ver o que está travando esses {d.pendentes} contratos →
        </Link>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-slate-700 mb-4">Contratos criados e ativados — últimos 6 meses</p>
        <div className="flex items-end gap-3 h-40">
          {d.meses.map((m: string, i: number) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-1 w-full justify-center flex-1">
                <div className="w-1/3 bg-slate-300 rounded-t" style={{ height: `${(d.criados[i] / max) * 100}%` }} title={`Criados: ${d.criados[i]}`} />
                <div className="w-1/3 bg-[#0f2a5e] rounded-t" style={{ height: `${(d.ativados[i] / max) * 100}%` }} title={`Ativados: ${d.ativados[i]}`} />
              </div>
              <span className="text-[11px] text-slate-500">{rotuloMes(m)}</span>
              <span className="text-[11px] font-bold text-slate-700">{d.criados[i]} / {d.ativados[i]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3"><span className="inline-block w-2 h-2 bg-slate-300 mr-1" />criados &nbsp; <span className="inline-block w-2 h-2 bg-[#0f2a5e] mr-1" />ativados</p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-slate-700">Por que os estágios terminam — últimos 12 meses</p>
        <p className="text-xs text-slate-400 mb-4">{d.totalSaidas12m} rescisão(ões). O motivo passou a ser obrigatório; as antigas aparecem como "Não informado".</p>
        {d.saidas.length === 0 ? <p className="text-sm text-slate-500">Nenhuma rescisão no período.</p> : (
          <div className="space-y-2">
            {d.saidas.map((s: any) => (
              <div key={s.rotulo}>
                <div className="flex justify-between text-xs text-slate-600 mb-0.5"><span>{s.rotulo} <span className="text-slate-400">· {s.grupo}</span></span><b>{s.qtd}</b></div>
                <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-[#f5c400]" style={{ width: `${(s.qtd / maxSaida) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
