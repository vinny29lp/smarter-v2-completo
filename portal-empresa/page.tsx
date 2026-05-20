import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default async function PortalEmpresaHome() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return <div className="text-center py-12 text-slate-400">Empresa não vinculada à sua conta.</div>;

  const [empresa, contratos, avaliacoesPendentes, financeiros] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.contract.findMany({
      where: { companyId, status: { in: ["ATIVO","PENDENTE","AGUARDANDO_ASSINATURA"] } },
      include: { student: true, documents: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      where: { contract: { companyId }, status: "pendente" },
      include: { contract: { include: { student: true } } },
    }),
    prisma.financial.findMany({
      where: { companyId, status: "PENDENTE" },
      orderBy: { vencimentoAt: "asc" },
      take: 5,
    }),
  ]);

  const docsAguardando = contratos.flatMap(c =>
    c.documents.filter(d => d.status === "AGUARDANDO_ASSINATURA")
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">Olá, {empresa?.name}!</h1>
        <p className="text-slate-500 text-sm mt-1">Bem-vindo ao seu portal de gestão de estagiários.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Estagiários Ativos", value: contratos.filter(c => c.status === "ATIVO").length, color: "text-emerald-600", href: "/portal-empresa/estagiarios" },
          { label: "Docs para Assinar", value: docsAguardando.length, color: docsAguardando.length > 0 ? "text-amber-600" : "text-slate-400", href: "/portal-empresa/documentos" },
          { label: "Avaliações Pendentes", value: avaliacoesPendentes.length, color: avaliacoesPendentes.length > 0 ? "text-blue-600" : "text-slate-400", href: "/portal-empresa/avaliacoes" },
          { label: "Contas a Pagar", value: financeiros.length, color: financeiros.length > 0 ? "text-red-500" : "text-slate-400", href: "/portal-empresa/financeiro" },
        ].map(k => (
          <Link key={k.label} href={k.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-xs text-slate-400">{k.label}</p>
              <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alertas */}
      {docsAguardando.length > 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-bold text-amber-800 mb-2">📄 Documentos aguardando sua assinatura</p>
          {docsAguardando.slice(0,3).map(d => (
            <p key={d.id} className="text-xs text-amber-700">• {d.titulo}</p>
          ))}
          <Link href="/portal-empresa/documentos" className="text-xs text-amber-600 font-bold hover:underline mt-1 block">
            Ver todos →
          </Link>
        </div>
      )}

      {avaliacoesPendentes.length > 0 && (
        <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-bold text-blue-800 mb-2">📋 Avaliações de estagiários pendentes</p>
          {avaliacoesPendentes.map(a => (
            <p key={a.id} className="text-xs text-blue-700">• {a.contract.student.name}</p>
          ))}
          <Link href="/portal-empresa/avaliacoes" className="text-xs text-blue-600 font-bold hover:underline mt-1 block">
            Responder agora →
          </Link>
        </div>
      )}

      {/* Estagiários ativos */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">Estagiários Ativos</h2>
          <Link href="/portal-empresa/estagiarios" className="text-xs text-blue-500 hover:underline">Ver todos</Link>
        </div>
        {contratos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm mb-3">Nenhum estagiário ativo no momento.</p>
            <Link href="/portal-empresa/vagas"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f2a5e] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3d8f] transition-colors">
              + Solicitar Estagiário
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {contratos.slice(0, 4).map(c => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{c.student.name}</p>
                  <p className="text-xs text-slate-400">
                    R$ {c.bolsa.toLocaleString("pt-BR")}/mês •
                    Término: {new Date(c.dataFim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={c.status === "ATIVO" ? "green" : "yellow"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
