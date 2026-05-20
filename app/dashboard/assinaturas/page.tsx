"use client";
import { useState, useEffect } from "react";
import { Card }  from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const STATUS_BADGE: Record<string,"green"|"yellow"|"blue"|"red"|"gray"|"purple"> = {
  NAO_GERADO:"gray", RASCUNHO:"yellow", GERADO:"purple",
  ENVIADO_ASSINATURA:"blue", AGUARDANDO_ASSINATURA:"blue",
  ASSINADO:"green", CANCELADO:"red",
};
const STATUS_LABEL: Record<string,string> = {
  NAO_GERADO:"Não Gerado", RASCUNHO:"Rascunho", GERADO:"Gerado",
  ENVIADO_ASSINATURA:"Enviado", AGUARDANDO_ASSINATURA:"Aguardando ✍️",
  ASSINADO:"Assinado ✓", CANCELADO:"Cancelado",
};

const FILTROS = [
  { key: "TODOS",                label: "Todos" },
  { key: "AGUARDANDO_ASSINATURA",label: "Aguardando Assinatura" },
  { key: "ASSINADO",             label: "Assinados" },
  { key: "GERADO",               label: "Gerados" },
  { key: "ENVIADO_ASSINATURA",   label: "Enviados" },
];

export default function AssinaturasPage() {
  const [docs, setDocs]     = useState<any[]>([]);
  const [filtro, setFiltro] = useState("TODOS");
  const [busca, setBusca]   = useState("");

  useEffect(() => {
    fetch("/api/app/assinaturas").then(r => r.json()).then(d => setDocs(d.docs || []));
  }, []);

  const aguardando = docs.filter(d => d.status === "AGUARDANDO_ASSINATURA").length;
  const assinados  = docs.filter(d => d.status === "ASSINADO").length;
  const gerados    = docs.filter(d => d.status === "GERADO").length;

  const filtered = docs.filter(d => {
    if (filtro !== "TODOS" && d.status !== filtro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return d.titulo.toLowerCase().includes(q) ||
        d.contract?.student?.name?.toLowerCase().includes(q) ||
        d.contract?.company?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Assinaturas</h1>
        <p className="text-slate-500 text-sm mt-1">Controle de assinaturas digitais dos documentos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="p-5 text-center border-l-4 border-amber-400 cursor-pointer" onClick={() => setFiltro("AGUARDANDO_ASSINATURA")}>
          <p className="text-xs text-slate-400">Aguardando Assinatura</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{aguardando}</p>
        </Card>
        <Card className="p-5 text-center border-l-4 border-emerald-400 cursor-pointer" onClick={() => setFiltro("ASSINADO")}>
          <p className="text-xs text-slate-400">Assinados</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{assinados}</p>
        </Card>
        <Card className="p-5 text-center border-l-4 border-purple-400 cursor-pointer" onClick={() => setFiltro("GERADO")}>
          <p className="text-xs text-slate-400">Gerados (aguardando envio)</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{gerados}</p>
        </Card>
      </div>

      {/* Filtros + busca */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtro === f.key ? "bg-[#0f2a5e] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}>
              {f.label}
              {f.key !== "TODOS" && (
                <span className="ml-1 opacity-60">({docs.filter(d => d.status === f.key).length})</span>
              )}
            </button>
          ))}
        </div>
        <input
          className="flex-1 min-w-[200px] border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
          placeholder="Buscar por estagiário, empresa ou documento..."
          value={busca} onChange={e => setBusca(e.target.value)}
        />
        {filtro !== "TODOS" && (
          <button onClick={() => setFiltro("TODOS")} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
            ✕ Limpar filtro
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">✍️</p>
          <p className="text-slate-600 font-semibold">Nenhum documento encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Tente outro filtro ou gere documentos em um contrato.</p>
          <Link href="/dashboard/contratos" className="mt-3 inline-flex text-sm text-blue-500 hover:underline">→ Ir para Contratos</Link>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Documento","Contrato","Estagiário","Empresa","Atualizado","Status","Ações"].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm font-semibold">{d.titulo}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{d.contract?.numero || d.contractId?.slice(0,8)}</td>
                  <td className="px-4 py-3 text-sm">{d.contract?.student?.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.contract?.company?.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[d.status || "GERADO"]}>{STATUS_LABEL[d.status || "GERADO"]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/contratos/${d.contractId}/documentos/${d.id}`}
                      className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors">
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 px-4 py-3 border-t border-slate-100">
            Mostrando {filtered.length} de {docs.length} documentos
          </p>
        </Card>
      )}
    </div>
  );
}
