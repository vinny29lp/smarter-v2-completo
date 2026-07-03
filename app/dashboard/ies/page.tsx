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

type Aba = "lista" | "acompanhamento";

export default function IESListPage() {
  const { data: session } = useSession();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("lista");

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

  // Lista de unidades únicas (para o filtro do admin)
  const unidades = isFranqueadora
    ? Array.from(new Map(institutions.filter(i => i.franchise).map(i => [i.franchise.id, i.franchise])).values())
    : [];

  const filtradas = institutions.filter(i => {
    const matchBusca = !busca
      || i.name.toLowerCase().includes(busca.toLowerCase())
      || (i.cidade || "").toLowerCase().includes(busca.toLowerCase())
      || (i.coordenador || "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || i.convenioStatus === filtroStatus;
    const matchUnidade = filtroUnidade === "todas" || i.franchiseId === filtroUnidade;
    return matchBusca && matchStatus && matchUnidade;
  });

  const totalFirmados = institutions.filter(i => i.convenioStatus === "FIRMADO").length;
  const totalPendentes = institutions.filter(i => i.convenioStatus === "PENDENTE").length;
  const totalAguardandoMinuta = institutions.filter(i => i.convenioStatus === "AGUARDANDO_MINUTA").length;

  const diasDesdeEnvio = (enviadoEm: string | null) => {
    if (!enviadoEm) return null;
    const dias = Math.floor((Date.now() - new Date(enviadoEm).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Total de convites", institutions.length, "text-slate-700"],
          ["Convênios firmados", totalFirmados, "text-emerald-600"],
          ["Aguardando resposta", totalPendentes, "text-amber-600"],
          ["Minuta própria", totalAguardandoMinuta, "text-purple-600"],
        ].map(([label, value, cor]) => (
          <div key={label as string} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-bold">{label}</p>
            <p className={`text-2xl font-black mt-1 ${cor}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          ["lista", "📋 Lista de convites"],
          ["acompanhamento", "📊 Acompanhamento"],
        ] as [Aba, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${aba === key ? "bg-white text-[#0f2a5e] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="search" placeholder="Buscar por nome, cidade ou coordenador..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="flex-1 min-w-48 border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white">
          <option value="todos">Todos os status</option>
          <option value="PENDENTE">Aguardando</option>
          <option value="FIRMADO">Firmados</option>
          <option value="AGUARDANDO_MINUTA">Minuta Própria</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
        {isFranqueadora && unidades.length > 0 && (
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white">
            <option value="todas">Todas as unidades</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
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
      ) : aba === "lista" ? (

        /* ── ABA: LISTA ── */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Instituição", isFranqueadora ? "Unidade" : "Cidade/UF", "Status", "Convite enviado", "Ações"].map(h => (
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
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {isFranqueadora
                      ? (ies.franchise?.name || <span className="text-slate-300 italic text-xs">Rede geral</span>)
                      : `${ies.cidade || "—"}/${ies.uf || "—"}`}
                  </td>
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

      ) : (

        /* ── ABA: ACOMPANHAMENTO ── */
        <div className="space-y-3">
          {filtradas.map(ies => {
            const dias = diasDesdeEnvio(ies.conviteEnviadoEm);
            const atrasado = ies.convenioStatus === "PENDENTE" && dias !== null && dias > 7;
            return (
              <div key={ies.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${atrasado ? "border-amber-200 bg-amber-50/30" : "border-slate-100"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Cabeçalho */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <p className="font-bold text-slate-800">{ies.name}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCor[ies.convenioStatus] || "bg-slate-100 text-slate-600"}`}>
                        {statusLabel[ies.convenioStatus] || ies.convenioStatus}
                      </span>
                      {isFranqueadora && ies.franchise && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                          🏢 {ies.franchise.name}
                        </span>
                      )}
                    </div>

                    {/* Grid de informações */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {/* Contato */}
                      <div>
                        <p className="text-slate-400 font-bold uppercase mb-1">Contato p/ cobrar assinatura</p>
                        {ies.coordenador ? (
                          <>
                            <p className="text-slate-700 font-semibold">{ies.coordenador}</p>
                            {ies.cargoCoord && <p className="text-slate-400">{ies.cargoCoord}</p>}
                          </>
                        ) : <p className="text-slate-300 italic">Não informado</p>}
                        {ies.email && (
                          <a href={`mailto:${ies.email}`} className="text-blue-600 hover:underline block mt-0.5 truncate">{ies.email}</a>
                        )}
                        {ies.telefone && <p className="text-slate-500">{ies.telefone}</p>}
                      </div>

                      {/* Localização */}
                      <div>
                        <p className="text-slate-400 font-bold uppercase mb-1">Localização</p>
                        <p className="text-slate-700">{ies.cidade || "—"}/{ies.uf || "—"}</p>
                        {ies.tipo && (
                          <p className="text-slate-400">{{ SUPERIOR: "Ens. Superior", TECNICO: "Ens. Técnico", MEDIO: "Ens. Médio", POS_GRADUACAO: "Pós-Grad." }[ies.tipo as string] || ies.tipo}</p>
                        )}
                      </div>

                      {/* Datas */}
                      <div>
                        <p className="text-slate-400 font-bold uppercase mb-1">Datas</p>
                        <p className="text-slate-700">
                          📨 Convite: {ies.conviteEnviadoEm ? new Date(ies.conviteEnviadoEm).toLocaleDateString("pt-BR") : "—"}
                        </p>
                        {dias !== null && ies.convenioStatus === "PENDENTE" && (
                          <p className={`font-semibold ${atrasado ? "text-amber-600" : "text-slate-500"}`}>
                            {atrasado ? "⚠️ " : ""}{dias} dia{dias !== 1 ? "s" : ""} sem resposta
                          </p>
                        )}
                        {ies.convenioAssinadoEm && (
                          <p className="text-emerald-600 font-semibold">
                            ✅ Assinado: {new Date(ies.convenioAssinadoEm).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {ies.updatedAt && (
                          <p className="text-slate-400 mt-0.5">
                            Atualizado: {new Date(ies.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>

                      {/* Assinante (quando firmado) */}
                      <div>
                        <p className="text-slate-400 font-bold uppercase mb-1">
                          {ies.convenioStatus === "FIRMADO" ? "Assinou pelo IES" : "Ações"}
                        </p>
                        {ies.convenioStatus === "FIRMADO" ? (
                          <>
                            <p className="text-slate-700 font-semibold">{ies.assinanteName || "—"}</p>
                            {ies.assinanteEmail && <p className="text-slate-400">{ies.assinanteEmail}</p>}
                          </>
                        ) : (
                          <div className="space-y-1">
                            {ies.token && (
                              <button onClick={() => copiarLink(ies.token)}
                                className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${linkCopiado === ies.token ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                {linkCopiado === ies.token ? "✓ Link copiado!" : "🔗 Copiar link do portal"}
                              </button>
                            )}
                            {ies.email && (
                              <a href={`mailto:${ies.email}?subject=Convênio Smarter Estágios&body=Olá ${ies.coordenador || "Coordenador"},\n\nSegue o link para assinar o convênio: ${typeof window !== "undefined" ? window.location.origin : ""}/ies/${ies.token}`}
                                className="block text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                                ✉️ Enviar cobrança por e-mail
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão Ver detalhes */}
                  <Link href={`/dashboard/ies/${ies.id}`}
                    className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-[#0f2a5e]/10 text-[#0f2a5e] hover:bg-[#0f2a5e]/20 transition-colors">
                    Ver →
                  </Link>
                </div>

                {/* Alerta para pendências antigas */}
                {atrasado && (
                  <div className="mt-3 pt-3 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                    <span>⚠️</span>
                    <span>Esta IES está há <strong>{dias} dias</strong> sem responder o convite. Considere enviar uma cobrança pelo e-mail ou telefone acima.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
