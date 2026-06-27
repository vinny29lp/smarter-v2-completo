import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstituicaoEdit } from "./InstituicaoEdit";
import CopyLinkButton from "./CopyLinkButton";

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

      {/* Portal de Adesão IES */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Portal de Adesão IES</h3>
            <p className="text-xs text-slate-400 mt-0.5">Link exclusivo para esta IES assinar o convênio eletronicamente</p>
          </div>
          {inst.convenioStatus && (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              inst.convenioStatus === "FIRMADO" ? "bg-emerald-100 text-emerald-700" :
              inst.convenioStatus === "AGUARDANDO_MINUTA" ? "bg-amber-100 text-amber-700" :
              inst.convenioStatus === "CANCELADO" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {inst.convenioStatus === "FIRMADO" ? "✅ Convênio Firmado" :
               inst.convenioStatus === "AGUARDANDO_MINUTA" ? "📋 Minuta Própria — Aguardando" :
               inst.convenioStatus === "CANCELADO" ? "❌ Cancelado" :
               "⏳ Aguardando assinatura"}
            </span>
          )}
        </div>

        {inst.token ? (
          <div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 mb-1">LINK DO PORTAL IES</p>
                <p className="text-sm font-mono text-slate-600 truncate">
                  {`${process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br"}/ies/${inst.token}`}
                </p>
              </div>
              <CopyLinkButton token={inst.token as string} />
            </div>
            {inst.convenioStatus === "FIRMADO" && inst.convenioAssinadoEm && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                <p><strong>Assinado por:</strong> {inst.assinanteName} ({inst.assinanteCpf})</p>
                <p className="mt-1"><strong>Data:</strong> {new Date((inst as any).convenioAssinadoEm).toLocaleString("pt-BR")}</p>
                {inst.assinanteEmail && <p className="mt-1"><strong>E-mail:</strong> {inst.assinanteEmail}</p>}
              </div>
            )}
            {inst.convenioStatus === "AGUARDANDO_MINUTA" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p>A IES optou por usar a <strong>própria minuta</strong>. Verifique o e-mail enviado para convenios@smarterestagios.com.br.</p>
                <p className="mt-1"><strong>Representante:</strong> {inst.assinanteName} — {inst.assinanteEmail}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p>Esta instituição ainda não tem um portal de adesão gerado.</p>
            <Link href="/dashboard/ies/novo" className="inline-block mt-2 font-bold text-[#0f2a5e] hover:underline text-xs">
              → Gerar convite pelo Portal IES
            </Link>
          </div>
        )}
      </Card>

      {/* Editar */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Editar Instituição</h3>
        <InstituicaoEdit instituicao={inst} />
      </Card>
    </div>
  );
}
