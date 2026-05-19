import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContract, updateContractStatus } from "@/lib/actions/contracts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusBadge: Record<string,string> = {ATIVO:"green",PENDENTE:"yellow",AGUARDANDO_ASSINATURA:"blue",VENCIDO:"red",FINALIZADO:"gray",SUSPENSO:"red",INATIVO:"gray"};
const docStatusBadge: Record<string,string> = {NAO_GERADO:"gray",RASCUNHO:"yellow",GERADO:"purple",ENVIADO_ASSINATURA:"blue",AGUARDANDO_ASSINATURA:"blue",ASSINADO:"green",CANCELADO:"red"};
const docStatusLabel: Record<string,string> = {NAO_GERADO:"Não Gerado",RASCUNHO:"Rascunho",GERADO:"Gerado",ENVIADO_ASSINATURA:"Enviado",AGUARDANDO_ASSINATURA:"Aguardando",ASSINADO:"Assinado ✓",CANCELADO:"Cancelado"};

export default async function ContratoDetailPage({ params }: { params: { id: string } }) {
  const contract = await getContract(params.id);
  if (!contract) notFound();

  const assinados = contract.documents.filter(d => d.status === "ASSINADO").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/contratos" className="text-slate-400 hover:text-slate-600 text-sm">← Contratos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{contract.student.name}</h1>
        <Badge variant={(statusBadge[contract.status || "PENDENTE"]||"gray") as any}>{contract.status}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ["Bolsa","R$ "+contract.bolsa.toLocaleString("pt-BR",{minimumFractionDigits:2})],
          ["Início",new Date(contract.dataInicio).toLocaleDateString("pt-BR")],
          ["Término",new Date(contract.dataFim).toLocaleDateString("pt-BR")],
          ["Docs",`${assinados}/${contract.documents.length} assinados`],
        ].map(([l,v])=>(
          <Card key={l} className="p-4"><p className="text-xs text-slate-400">{l}</p><p className="font-black text-sm mt-1">{v}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Estagiário</h3>
          <p className="font-semibold text-sm">{contract.student.name}</p>
          <p className="text-xs text-slate-400">{contract.student.email}</p>
          <p className="text-xs text-slate-400 mt-1">{contract.student.curso} • {contract.student.periodo}º período</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Empresa</h3>
          <p className="font-semibold text-sm">{contract.company.name}</p>
          <p className="text-xs text-slate-400">{contract.company.email}</p>
          {contract.supervisorNome && <p className="text-xs text-slate-400 mt-1">Supervisor: {contract.supervisorNome}</p>}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Jornada</h3>
          <p className="text-xs text-slate-600">{contract.diasSemana}</p>
          <p className="text-xs text-slate-600">{contract.horarioInicio} — {contract.horarioFim}</p>
          <p className="text-xs text-slate-600">{contract.chSemanal}h/semana • {contract.chDiaria}h/dia</p>
          {contract.apoliceSeguro && <p className="text-xs text-slate-400 mt-1">Seguro: {contract.apoliceSeguro}</p>}
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">📄 Documentos do Estágio</h3>
          <p className="text-xs text-slate-400">{assinados} de {contract.documents.length} assinados</p>
        </div>
        <div className="space-y-2">
          {contract.documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div>
                <p className="text-sm font-semibold">{doc.titulo}</p>
                <p className="text-xs text-slate-400">Atualizado: {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : "-"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={(docStatusBadge[doc.status || "PENDENTE"]||"gray") as any}>{docStatusLabel[doc.status || "PENDENTE"]}</Badge>
                <Link href={`/dashboard/contratos/${contract.id}/documentos/${doc.id}`}
                  className="text-xs bg-[#0f2a5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a3d8f] transition-colors font-semibold">
                  {doc.status === "NAO_GERADO" ? "Gerar" : "Ver"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {contract.atividades && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Atividades do Estágio</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{contract.atividades}</p>
        </Card>
      )}
    </div>
  );
}
