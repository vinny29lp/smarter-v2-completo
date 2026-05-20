import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const STATUS_BADGE: Record<string,"green"|"yellow"|"blue"|"red"|"gray"|"purple"> = {
  NAO_GERADO:"gray", RASCUNHO:"yellow", GERADO:"purple",
  ENVIADO_ASSINATURA:"blue", AGUARDANDO_ASSINATURA:"blue",
  ASSINADO:"green", CANCELADO:"red",
};
const STATUS_LABEL: Record<string,string> = {
  NAO_GERADO:"Não Gerado", RASCUNHO:"Rascunho", GERADO:"Gerado",
  ENVIADO_ASSINATURA:"Enviado", AGUARDANDO_ASSINATURA:"Aguardando",
  ASSINADO:"Assinado ✓", CANCELADO:"Cancelado",
};

export default async function AssinaturasPage() {
  const session = await getServerSession(authOptions);
  const where = session?.user?.franchiseId
    ? { contract: { franchiseId: session.user.franchiseId } }
    : {};

  const docs = await prisma.internshipDocument.findMany({
    where: { ...where, status: { not: "NAO_GERADO" } },
    include: {
      contract: {
        include: { student: true, company: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const aguardando = docs.filter(d => d.status === "AGUARDANDO_ASSINATURA").length;
  const assinados = docs.filter(d => d.status === "ASSINADO").length;
  const gerados = docs.filter(d => d.status === "GERADO").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Assinaturas</h1>
        <p className="text-slate-500 text-sm mt-1">Controle de assinaturas digitais dos documentos</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 text-center border-l-4 border-amber-400">
          <p className="text-xs text-slate-400">Aguardando Assinatura</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{aguardando}</p>
        </Card>
        <Card className="p-5 text-center border-l-4 border-emerald-400">
          <p className="text-xs text-slate-400">Assinados</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{assinados}</p>
        </Card>
        <Card className="p-5 text-center border-l-4 border-purple-400">
          <p className="text-xs text-slate-400">Gerados (sem assinar)</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{gerados}</p>
        </Card>
      </div>

      {docs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">✍️</p>
          <p className="text-slate-600 font-semibold">Nenhum documento gerado ainda</p>
          <p className="text-slate-400 text-sm mt-1">
            Acesse um contrato e gere os documentos para começar o processo de assinatura.
          </p>
          <Link href="/dashboard/contratos" className="mt-3 inline-flex text-sm text-blue-500 hover:underline">
            → Ir para Contratos
          </Link>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Documento","Contrato","Estagiário","Empresa","Status","Ações"].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-sm font-semibold">{d.titulo}</td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-400">{d.contract.numero || d.contractId.slice(0,8)}</td>
                  <td className="px-5 py-3 text-sm">{d.contract.student.name}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{d.contract.company.name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_BADGE[d.status || "PENDENTE"]}>{STATUS_LABEL[d.status || "PENDENTE"]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/contratos/${d.contractId}/documentos/${d.id}`}
                      className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
