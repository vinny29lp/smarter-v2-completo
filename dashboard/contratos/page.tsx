import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContracts } from "@/lib/actions/contracts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const statusBadge: Record<string,string> = {
  ATIVO:"green",PENDENTE:"yellow",AGUARDANDO_ASSINATURA:"blue",
  VENCIDO:"red",FINALIZADO:"gray",SUSPENSO:"red",INATIVO:"gray"
};

export default async function ContratosPage() {
  const session = await getServerSession(authOptions);
  const contratos = await getContracts(session?.user?.franchiseId, session?.user?.companyId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Contratos de Estágio</h1>
          <p className="text-slate-500 text-sm mt-1">
            {contratos.filter(c => c.status === "ATIVO").length} ativos •{" "}
            {contratos.filter(c => c.status === "PENDENTE").length} pendentes
          </p>
        </div>
        <Link href="/dashboard/contratos/novo">
          <Button>+ Novo Estágio</Button>
        </Link>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Nº","Estudante","Empresa","Bolsa","Início","Término","Docs","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contratos.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">Nenhum contrato cadastrado ainda.</td></tr>
            ) : contratos.map(c => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{c.numero || c.id.slice(0,8)}</td>
                <td className="px-4 py-3 text-sm font-semibold">{c.student.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.company.name}</td>
                <td className="px-4 py-3 text-sm font-medium">R$ {c.bolsa.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.dataFim).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="text-xs text-slate-500">{c.documents.filter(d => d.status === "ASSINADO").length}/{c.documents.length}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={(statusBadge[c.status || "PENDENTE"] || "gray") as any}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/contratos/${c.id}`}>
                    <Button variant="secondary" size="sm">📄 Docs</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
