"use client";
/**
 * CRM Módulo 10 — Dashboard multi-tenant Franqueadora
 * Acesso: FRANQUEADORA apenas (verificação também no API /crm/franqueadora).
 * Rota: /dashboard/crm/franqueadora
 */
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface FranchiseRow {
  name: string; cidade: string; uf: string;
  total: number; ativos: number; vendidos: number; perdidos: number;
  taxaConversao: number; mrrPonderado: number; mrrReal: number;
  etapas: Record<string, number>;
}

const fmt = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

export default function CRMFranqueadoraPage() {
  const [data, setData] = useState<{ ranking: FranchiseRow[]; totalMrrPonderado: number; totalMrrReal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/app/crm/franqueadora")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError("Erro ao carregar."); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Carregando dados das unidades...</div>;
  if (error)   return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data)   return null;

  const { ranking, totalMrrPonderado, totalMrrReal } = data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/crm" className="text-slate-400 hover:text-slate-600 text-sm">← CRM</Link>
        <span className="text-slate-300">/</span>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Ranking de Unidades</h1>
          <p className="text-slate-500 text-sm mt-1">{ranking.length} unidades ativas</p>
        </div>
      </div>

      {/* KPIs globais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] rounded-xl p-4 text-white col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase opacity-70 mb-1">MRR Forecast Total</p>
          <p className="text-2xl font-black">{fmt(totalMrrPonderado)}</p>
          <p className="text-[10px] opacity-60 mt-0.5">ponderado por etapa</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase opacity-70 mb-1">MRR Real Total</p>
          <p className="text-2xl font-black">{fmt(totalMrrReal)}</p>
          <p className="text-[10px] opacity-60 mt-0.5">contratos fechados</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 col-span-1">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Unidades</p>
          <p className="text-2xl font-black text-slate-800">{ranking.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 col-span-1">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Total de Leads</p>
          <p className="text-2xl font-black text-slate-800">{ranking.reduce((s,r)=>s+r.total,0)}</p>
        </div>
      </div>

      {/* Ranking */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Unidade</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Leads</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Ativos</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Fechados</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Conversão</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">MRR Forecast</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">MRR Real</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.name} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i===0?"bg-amber-50/50":""}`}>
                  <td className="px-4 py-3 font-black text-slate-400">
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}°`}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.cidade}/{r.uf}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{r.total}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{r.ativos}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{r.vendidos}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.taxaConversao>=50?"bg-green-500":r.taxaConversao>=20?"bg-amber-400":"bg-red-400"}`}
                          style={{width:`${r.taxaConversao}%`}}/>
                      </div>
                      <span className={`font-bold ${r.taxaConversao>=50?"text-green-700":r.taxaConversao>=20?"text-amber-600":"text-red-600"}`}>
                        {r.taxaConversao}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#0f2a5e]">
                    {r.mrrPonderado > 0 ? fmt(r.mrrPonderado) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {r.mrrReal > 0 ? fmt(r.mrrReal) : "—"}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhuma unidade com dados de CRM.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Funil por unidade */}
      {ranking.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-600 mb-3">Funil por Unidade</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ranking.map(r => (
              <Card key={r.name} className="p-4">
                <p className="text-sm font-black text-slate-800 mb-2">{r.name}</p>
                {Object.entries(r.etapas).map(([etapa, count]) => (
                  <div key={etapa} className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] text-slate-500 w-28 truncate capitalize">{etapa.replace(/_/g," ")}</p>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0f2a5e] rounded-full"
                        style={{width:`${r.total>0?Math.round((count/r.total)*100):0}%`}}/>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 w-4 text-right">{count}</span>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
