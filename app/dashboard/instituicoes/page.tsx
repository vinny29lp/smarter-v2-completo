import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InstituicaoDeleteButton } from "@/components/instituicoes/InstituicaoDeleteButton";

export default async function InstituicoesPage() {
  const [session, instituicoes] = await Promise.all([
    getServerSession(authOptions),
    prisma.institution.findMany({
      include: { _count: { select: { students: true, contracts: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const isFranqueadora = session?.user?.role === "FRANQUEADORA";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Instituições de Ensino</h1>
          <p className="text-slate-500 text-sm mt-1">{instituicoes.length} instituições cadastradas</p>
        </div>
        <Link href="/dashboard/instituicoes/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3d8f] transition-colors">
          + Nova Instituição
        </Link>
      </div>

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
            {instituicoes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Nenhuma instituição cadastrada ainda.</td></tr>
            ) : instituicoes.map(i => (
              <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold">{i.name}</p>
                  {i.tipo && <p className="text-xs text-slate-400">{i.tipo}</p>}
                </td>
                <td className="px-5 py-3 text-xs font-mono text-slate-500">{i.cnpj || "—"}</td>
                <td className="px-5 py-3 text-sm">{i.cidade && i.uf ? `${i.cidade}/${i.uf}` : "—"}</td>
                <td className="px-5 py-3 text-sm text-slate-600">{i.coordenador || "—"}</td>
                <td className="px-5 py-3 text-center"><Badge variant="blue">{(i as any)._count.students}</Badge></td>
                <td className="px-5 py-3 text-center"><Badge variant="green">{(i as any)._count.contracts}</Badge></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/instituicoes/${i.id}`}>
                      <button className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors">Ver →</button>
                    </Link>
                    {isFranqueadora && (
                      <InstituicaoDeleteButton
                        id={i.id}
                        name={i.name}
                        studentCount={(i as any)._count.students}
                        contractCount={(i as any)._count.contracts}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
