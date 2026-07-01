"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InstituicaoDeleteButton } from "@/components/instituicoes/InstituicaoDeleteButton";

interface Instituicao {
  id: string;
  name: string;
  tipo: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  coordenador: string | null;
  _count: { students: number; contracts: number };
}

export function InstituicoesTable({ instituicoes, isFranqueadora }: { instituicoes: Instituicao[]; isFranqueadora: boolean }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return instituicoes;
    return instituicoes.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.cidade || "").toLowerCase().includes(q) ||
      (i.cnpj || "").toLowerCase().includes(q)
    );
  }, [busca, instituicoes]);

  return (
    <>
      <input
        type="text"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome, cidade ou CNPJ..."
        className="w-full max-w-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e] mb-4"
      />

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Instituição","CNPJ","Cidade","Coordenador","Estudantes","Contratos","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                {instituicoes.length === 0 ? "Nenhuma instituição cadastrada ainda." : "Nenhuma instituição encontrada para essa busca."}
              </td></tr>
            ) : filtradas.map(i => (
              <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold">{i.name}</p>
                  {i.tipo && <p className="text-xs text-slate-400">{i.tipo}</p>}
                </td>
                <td className="px-5 py-3 text-xs font-mono text-slate-500">{i.cnpj || "—"}</td>
                <td className="px-5 py-3 text-sm">{i.cidade && i.uf ? `${i.cidade}/${i.uf}` : "—"}</td>
                <td className="px-5 py-3 text-sm text-slate-600">{i.coordenador || "—"}</td>
                <td className="px-5 py-3 text-center"><Badge variant="blue">{i._count.students}</Badge></td>
                <td className="px-5 py-3 text-center"><Badge variant="green">{i._count.contracts}</Badge></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/instituicoes/${i.id}`}>
                      <button className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors">Ver →</button>
                    </Link>
                    {isFranqueadora && (
                      <InstituicaoDeleteButton
                        id={i.id}
                        name={i.name}
                        studentCount={i._count.students}
                        contractCount={i._count.contracts}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
