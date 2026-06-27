"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const statusCor: Record<string, string> = {
  FIRMADO: "bg-emerald-100 text-emerald-700",
  PENDENTE: "bg-amber-100 text-amber-700",
  CANCELADO: "bg-red-100 text-red-700",
  AGUARDANDO_MINUTA: "bg-purple-100 text-purple-700",
};
const statusLabel: Record<string, string> = {
  FIRMADO: "✅ Firmado",
  PENDENTE: "⏳ Aguardando",
  CANCELADO: "❌ Cancelado",
  AGUARDANDO_MINUTA: "📋 Minuta Própria",
};

export default function IESListPage() {
  const { data: session } = useSession();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null);

  const isFranqueadora = session?.user?.role === "FRANQUEADORA";

  const load = () => {
    setLoading(true);
    fetch("/api/ies")
      .then(r => r.json())
      .then(d => { setInstitutions(d.institutions || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/ies/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopiado(token);
      setTimeout(() => setLinkCopiado(null), 2500);
    });
  };

  const filtradas = institutions.filter(i => {
    const matchBusca = !busca || i.name.toLowerCase().includes(busca.toLowerCase()) || (i.cidade || "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || i.convenioStatus === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totalFirmados = institutions.filter(i => i.convenioStatus === "FIRMADO").length;
  const totalPendentes = institutions.filter(i => i.convenioStatus === "PENDENTE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Portal de Adesão IES</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie convites e convênios com Instituições de Ensino Superior</p>
        </div>
        <Link href="/dashboard/ies/novo"
          className="bg-[#0f2a5e] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#1e4a8f] transition-colors">
          + Novo convite
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          ["Total de convites", institutions.length, "text-slate-700"],
          ["Convênios firmados", totalFirmados, "text-emerald-600"],
          ["Aguardando resposta", totalPendentes, "text-amber-600"],
        ].map(([label, value, cor]) => (
          <div key={label as string} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-bold">{label}</p>
            <p className={`text-2xl font-black mt-1 ${cor}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="search" placeholder="Buscar por nome ou cidade..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white">
          <option value="todos">Todos os status</option>
          <option value="PENDENTE">Aguardando</option>
          <option value="FIRMADO">Firmados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <div className="text-5xl mb-4">🏛️</div>
          <p className="text-slate-700 font-bold">Nenhuma IES encontrada</p>
          <p className="text-slate-400 text-sm mt-1">Crie o primeiro convite para uma Instituição de Ensino.</p>
          <Link href="/dashboard/ies/novo" className="inline-block mt-4 bg-[#0f2a5e] text-white text-sm font-bold px-5 py-2.5 rounded-xl">
            Criar convite
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Instituição","Cidade/UF","Status","Convite enviado","Ações"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(ies => (
                <tr key={ies.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800 text-sm">{ies.name}</p>
                    {ies.cnpj && <p className="text-xs text-slate-400">CNPJ: {ies.cnpj}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{ies.cidade || "—"}/{ies.uf || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusCor[ies.convenioStatus] || "bg-slate-100 text-slate-600"}`}>
                      {statusLabel[ies.convenioStatus] || ies.convenioStatus}
                    </span>
                    {ies.convenioAssinadoEm && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(ies.convenioAssinadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {ies.conviteEnviadoEm ? new Date(ies.conviteEnviadoEm).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {ies.token && (
                        <button
                          onClick={() => copiarLink(ies.token)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${linkCopiado === ies.token ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {linkCopiado === ies.token ? "✓ Copiado" : "🔗 Copiar link"}
                        </button>
                      )}
                      <Link href={`/dashboard/ies/${ies.id}`}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0f2a5e]/10 text-[#0f2a5e] hover:bg-[#0f2a5e]/20 transition-colors">
                        Ver detalhes
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
