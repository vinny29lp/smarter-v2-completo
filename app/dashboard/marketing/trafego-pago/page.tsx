"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Rocket, TrendingUp } from "lucide-react";
import clsx from "clsx";

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  ativa:     { label: "Ativa",     cor: "bg-green-100 text-green-700" },
  pausada:   { label: "Pausada",   cor: "bg-amber-100 text-amber-700" },
  encerrada: { label: "Encerrada", cor: "bg-red-100 text-red-700" },
};

const PLATAFORMA_LABEL: Record<string, string> = {
  meta:   "Meta Ads",
  google: "Google Ads",
};

function formatMoeda(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function TrafegoPagoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "FRANQUEADORA" ||
    (session?.user?.role === "EQUIPE" && (session?.user?.permissoes as string[] | undefined)?.includes("marketing"));

  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/app/marketing/trafego-pago");
        const data = await res.json();
        setCampanhas(data.campanhas || []);
        if (!res.ok) setErro(data.error || "Erro ao carregar campanhas.");
      } catch {
        setErro("Erro ao carregar campanhas.");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Tráfego Pago</h2>
          <p className="text-sm text-slate-500">
            Campanhas de Meta e Google Ads {isAdmin ? "da rede" : "da sua unidade"}, gerenciadas pelo time de Tráfego Pago
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Carregando campanhas...</div>
      ) : erro ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-red-500">{erro}</div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <Rocket size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma campanha de tráfego pago ainda</p>
          <p className="text-sm mt-1">As campanhas aparecem aqui assim que o time de Tráfego Pago as configurar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase">
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Plataforma</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Orçamento/dia</th>
                  <th className="px-4 py-3 text-right">Gasto total</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">CPL</th>
                  <th className="px-4 py-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campanhas.map(c => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{c.nomeCampanha}</div>
                      {c.objetivo && <div className="text-xs text-slate-400">{c.objetivo}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{PLATAFORMA_LABEL[c.plataforma] || c.plataforma}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_LABEL[c.status]?.cor || "bg-slate-100")}>
                        {STATUS_LABEL[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoeda(c.orcamentoDiario)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatMoeda(c.gastoTotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.leadsGerados}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoeda(c.cpl)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.roas ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                          <TrendingUp size={12} /> {c.roas.toFixed(2)}x
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
