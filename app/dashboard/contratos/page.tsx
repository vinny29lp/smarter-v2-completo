"use client";
import { useState, useEffect } from "react";
import { Card }  from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const statusBadge: Record<string,any> = {
  ATIVO:"green", PENDENTE:"yellow", AGUARDANDO_ASSINATURA:"blue",
  VENCIDO:"red", FINALIZADO:"gray", SUSPENSO:"red", INATIVO:"gray"
};

const STATUS_LABELS: Record<string,string> = {
  ATIVO:"✅ Ativos", PENDENTE:"⏳ Pendentes", AGUARDANDO_ASSINATURA:"✍️ Aguard. Assinatura",
  VENCIDO:"⚠️ Vencidos", FINALIZADO:"✓ Finalizados", INATIVO:"🔴 Inativos",
};

const LIMIT = 100;

export default function ContratosPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [filtro, setFiltro]       = useState("TODOS");
  const [busca, setBusca]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);

  const carregarContratos = (p: number = 1) => {
    setLoading(true);
    setFetchError("");
    fetch(`/api/app/contratos?page=${p}&limit=${LIMIT}`, { cache: "no-store" })
      .then(r => {
        if (r.status === 401) throw new Error("Sessão expirada. Recarregue a página.");
        if (!r.ok) throw new Error(`Erro ao carregar contratos (${r.status}).`);
        return r.json();
      })
      .then(d => {
        setContratos(d.contratos || []);
        setTotalPages(d.totalPages || 1);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(e => { setFetchError(e.message || "Erro ao carregar contratos."); setLoading(false); });
  };

  const irParaPagina = (p: number) => {
    setPage(p);
    setFiltro("TODOS");
    setBusca("");
    carregarContratos(p);
  };

  useEffect(() => { carregarContratos(1); }, []);

  // Detecta se há múltiplas unidades nos contratos (visão admin)
  const multiUnidade = contratos.some((c, _, arr) => c.franchise?.name && c.franchise?.name !== arr[0]?.franchise?.name);

  const filtrados = contratos
    .filter(c => filtro === "TODOS" || c.status === filtro)
    .filter(c => !busca || c.student?.name?.toLowerCase().includes(busca.toLowerCase()) || c.company?.name?.toLowerCase().includes(busca.toLowerCase()) || c.numero?.includes(busca) || c.franchise?.name?.toLowerCase().includes(busca.toLowerCase()));

  const contPorStatus = (s: string) => contratos.filter(c => c.status === s).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Contratos de Estágio</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total} contratos no total •{" "}
            {contratos.filter(c => c.status === "ATIVO").length} ativos nesta página
            {totalPages > 1 && ` • Página ${page} de ${totalPages}`}
          </p>
        </div>
        <Link href="/dashboard/contratos/novo">
          <Button>+ Novo Estágio</Button>
        </Link>
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFiltro("TODOS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filtro==="TODOS"?"bg-[#0f2a5e] text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
          Todos ({contratos.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([s, l]) => (
          contPorStatus(s) > 0 && (
            <button key={s} onClick={() => setFiltro(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filtro===s?"bg-[#0f2a5e] text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {l} ({contPorStatus(s)})
            </button>
          )
        ))}
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por estudante, empresa ou número..."
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
        />
      </div>

      <Card>
        {fetchError ? (
          <div className="text-center py-12">
            <p className="text-red-500 font-semibold text-sm mb-3">⚠️ {fetchError}</p>
            <button onClick={() => carregarContratos(page)} className="text-xs text-[#0f2a5e] font-bold hover:underline">↻ Tentar novamente</button>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-slate-400">Carregando contratos...</div>
        ) : (
          <div className="overflow-x-auto -mx-1"><table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Nº","Estudante","Empresa",...(multiUnidade ? ["Unidade"] : []),"Bolsa","Início","Término","Docs","Status","Ações"].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={multiUnidade ? 10 : 9} className="text-center py-12 text-slate-400">
                  {busca || filtro !== "TODOS" ? "Nenhum contrato com esses filtros." : "Nenhum contrato cadastrado ainda."}
                </td></tr>
              ) : filtrados.map(c => {
                const docsAssinados = (c.documents || []).filter((d:any) => d.status === "ASSINADO").length;
                const docsTotal     = (c.documents || []).length;
                const todasAssinadas = docsTotal > 0 && docsAssinados === docsTotal;
                return (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{c.numero || c.id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{c.student?.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.company?.name}</td>
                    {multiUnidade && <td className="px-4 py-3 text-xs text-slate-500 font-medium">{c.franchise?.name || "—"}</td>}
                    <td className="px-4 py-3 text-sm font-medium">R$ {c.bolsa?.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.dataFim).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${todasAssinadas ? "text-emerald-600" : "text-slate-500"}`}>
                        {todasAssinadas ? "✅ ASSINADO" : `${docsAssinados}/${docsTotal}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={(statusBadge[c.status || "PENDENTE"] || "gray")}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/contratos/${c.id}`}>
                        <Button variant="secondary" size="sm">📄 Docs</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => irParaPagina(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Anterior
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => irParaPagina(p)}
                disabled={loading}
                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                  p === page
                    ? "bg-[#0f2a5e] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => irParaPagina(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
