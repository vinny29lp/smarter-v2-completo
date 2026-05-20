import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstituicaoEdit } from "./InstituicaoEdit";

export default async function InstituicaoDetailPage({ params }: { params: { id: string } }) {
  const inst = await prisma.institution.findUnique({
    where: { id: params.id },
    include: {
      students: {
        include: { contracts: { include: { company: true }, take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      contracts: {
        include: { student: true, company: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { students: true, contracts: true } },
    },
  });
  if (!inst) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/instituicoes" className="text-slate-400 hover:text-slate-600 text-sm">← Instituições</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{inst.name}</h1>
        {inst.tipo && <Badge variant="blue">{inst.tipo}</Badge>}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ["Estudantes", (inst._count as any).students],
          ["Contratos", (inst._count as any).contracts],
          ["Cursos", inst.cursos?.length || 0],
          ["Coordenador", inst.coordenador || "—"],
        ].map(([l,v])=>(
          <Card key={String(l)} className="p-4">
            <p className="text-xs text-slate-400">{l}</p>
            <p className="font-black text-sm mt-1">{v}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Dados */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Dados Cadastrais</h3>
          <div className="space-y-2 text-sm">
            {[
              ["CNPJ", inst.cnpj],
              ["Tipo", inst.tipo],
              ["E-mail", inst.email],
              ["Telefone", inst.telefone],
              ["Endereço", inst.endereco],
              ["Cidade", inst.cidade && inst.uf ? `${inst.cidade}/${inst.uf}` : inst.cidade],
              ["CEP", inst.cep],
              ["Site", inst.site],
              ["Coordenador", inst.coordenador],
              ["Cargo", inst.cargoCoord],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="font-medium">{v}</p></div>
            ))}
          </div>
          {inst.cursos && inst.cursos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">Cursos</p>
              <div className="flex flex-wrap gap-1">
                {inst.cursos.map(c=><span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{c}</span>)}
              </div>
            </div>
          )}
        </Card>

        {/* Estudantes */}
        <Card className="col-span-2 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Estudantes Vinculados ({(inst._count as any).students})</h3>
          {inst.students.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum estudante vinculado.</p>
          ) : (
            <div className="overflow-auto max-h-64">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  {["Nome","Curso","Status","Empresa"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {inst.students.map(s=>{
                    const contrato = s.contracts[0];
                    return (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/estudantes/${s.id}`} className="text-sm font-semibold text-blue-600 hover:underline">{s.name}</Link>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">{s.curso||"—"}</td>
                        <td className="px-3 py-2"><Badge variant={s.status==="EM_ESTAGIO"?"green":s.status==="DISPONIVEL"?"yellow":"gray"}>{s.status}</Badge></td>
                        <td className="px-3 py-2 text-sm text-slate-500">{contrato?.company.name||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Contratos */}
      {inst.contracts.length > 0 && (
        <Card className="p-5 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Contratos ({inst.contracts.length})</h3>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              {["Estudante","Empresa","Bolsa","Início","Fim","Status"].map(h=>(
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {inst.contracts.map(c=>(
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-semibold">{c.student.name}</td>
                  <td className="px-3 py-2 text-sm">{c.company.name}</td>
                  <td className="px-3 py-2 text-sm">R$ {c.bolsa.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{new Date(c.dataFim).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2"><Badge variant={c.status==="ATIVO"?"green":c.status==="PENDENTE"?"yellow":"gray"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Editar */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Editar Instituição</h3>
        <InstituicaoEdit instituicao={inst} />
      </Card>
    </div>
  );
}
