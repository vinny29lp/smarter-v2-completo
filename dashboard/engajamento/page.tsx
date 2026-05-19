import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

type Periodo = "semana" | "mes";

export default async function EngajamentoPage({
  searchParams,
}: {
  searchParams: { periodo?: Periodo; id?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") redirect("/dashboard");

  const periodo: Periodo = searchParams.periodo === "semana" ? "semana" : "mes";
  const dataLimite = new Date();
  if (periodo === "semana") dataLimite.setDate(dataLimite.getDate() - 7);
  else dataLimite.setMonth(dataLimite.getMonth() - 1);

  const focusId = searchParams.id;

  const franqueados = await prisma.franchise.findMany({
    include: {
      _count: { select: { contracts: true, crmLeads: true, vacancies: true } },
    },
  });

  // Se tem foco em uma unidade, buscar detalhes
  let focusData: any = null;
  if (focusId) {
    const [contratos, vagas, leads, pontos] = await Promise.all([
      prisma.contract.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        include: { student: true, company: true },
      }),
      prisma.vacancy.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        include: { company: true },
      }),
      prisma.crmLead.findMany({
        where: { franchiseId: focusId, updatedAt: { gte: dataLimite } },
      }),
      prisma.gamificationPoint.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    focusData = { contratos, vagas, leads, pontos };
  }

  const scoreEngajamento = (f: any) => {
    const n = [f._count.contracts, f._count.crmLeads, f._count.vacancies];
    const score = Math.min(100, Math.round((n.reduce((a,b)=>a+b,0) / 10) * 10));
    const alertas: string[] = [];
    if (f._count.contracts === 0) alertas.push("Sem contratos ativos");
    if (f._count.crmLeads === 0) alertas.push("Sem leads no CRM");
    if (f._count.vacancies === 0) alertas.push("Sem vagas");
    const level = score >= 70 ? "green" : score >= 40 ? "yellow" : "red";
    return { score, alertas, level };
  };

  const focusFranq = focusId ? franqueados.find(f => f.id === focusId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Engajamento da Rede</h1>
          {focusFranq && <p className="text-slate-500 text-sm mt-1">Detalhando: <strong>{focusFranq.name}</strong></p>}
        </div>
        <div className="flex items-center gap-2">
          {focusId && (
            <Link href="/dashboard/engajamento" className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg font-semibold hover:border-blue-400 transition-colors">
              ← Voltar à rede
            </Link>
          )}
          <Link href={`?periodo=semana${focusId ? `&id=${focusId}` : ""}`}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${periodo==="semana"?"bg-[#0f2a5e] text-white":"border border-slate-200 hover:border-blue-400"}`}>
            Última Semana
          </Link>
          <Link href={`?periodo=mes${focusId ? `&id=${focusId}` : ""}`}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${periodo==="mes"?"bg-[#0f2a5e] text-white":"border border-slate-200 hover:border-blue-400"}`}>
            Último Mês
          </Link>
        </div>
      </div>

      {/* Detalhe de uma unidade */}
      {focusData && focusFranq && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            ["Contratos criados", focusData.contratos.length, "text-[#0f2a5e]"],
            ["Vagas publicadas", focusData.vagas.length, "text-blue-600"],
            ["Leads movimentados", focusData.leads.length, "text-purple-600"],
            ["Pontos ganhos", focusData.pontos.reduce((a:number,b:any)=>a+b.pontos,0).toLocaleString("pt-BR"), "text-[#f5c400]"],
          ].map(([l,v,c])=>(
            <Card key={String(l)} className="p-4 text-center">
              <p className="text-xs text-slate-400">{l}</p>
              <p className={`text-2xl font-black mt-1 ${c}`}>{v}</p>
              <p className="text-xs text-slate-300">no {periodo==="semana"?"último 7 dias":"último mês"}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de franqueados */}
      {!focusId && (
        <div className="space-y-3">
          {franqueados.map(f => {
            const { score, alertas, level } = scoreEngajamento(f);
            return (
              <Card key={f.id} className={`p-5 border-l-4 ${level==="green"?"border-emerald-400":level==="yellow"?"border-amber-400":"border-red-400"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-slate-800">{f.name}</p>
                      <Badge variant={level==="green"?"green":level==="yellow"?"yellow":"red"}>Score: {score}%</Badge>
                    </div>
                    <div className="flex gap-5 text-xs text-slate-500 mb-2">
                      <span>📄 {f._count.contracts} contratos</span>
                      <span>💼 {f._count.vacancies} vagas</span>
                      <span>📊 {f._count.crmLeads} leads</span>
                    </div>
                    {alertas.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {alertas.map(a=>(
                          <span key={a} className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">⚠️ {a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href={`?periodo=${periodo}&id=${f.id}`}
                    className="ml-4 text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-lg font-semibold transition-colors">
                    Ver detalhes →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
