import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card }  from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

// ─── helpers ────────────────────────────────────────────────────
async function getKpis(franchiseId?: string) {
  const w = franchiseId ? { franchiseId } : {};
  const [companies, studentsAtivos, studentsInativos, contrAtivos, contrPendentes, leads] =
    await Promise.all([
      prisma.company.count({ where: w }),
      prisma.student.count({ where: { ...w, status: "EM_ESTAGIO"  } }),
      prisma.student.count({ where: { ...w, status: "DISPONIVEL"  } }),
      prisma.contract.count({ where: { ...w, status: "ATIVO"       } }),
      prisma.contract.count({ where: { ...w, status: { in: ["PENDENTE","AGUARDANDO_ASSINATURA"] } } }),
      prisma.crmLead.count({ where: { ...w, situacao: "ativo"      } }),
    ]);
  return { companies, studentsAtivos, studentsInativos, contrAtivos, contrPendentes, leads };
}

async function getFranquias() {
  const [ativas, inativas] = await Promise.all([
    prisma.franchise.count({ where: { status: "ATIVO"   } }),
    prisma.franchise.count({ where: { status: "INATIVO" } }),
  ]);
  return { ativas, inativas };
}

async function getFinanceiro(franchiseId?: string) {
  const w = franchiseId ? { franchiseId } : {};
  const [pago, pendente] = await Promise.all([
    prisma.financial.aggregate({ where: { ...w, status: "PAGO",    tipo: "entrada", cancelado: false }, _sum: { valor: true } }),
    prisma.financial.aggregate({ where: { ...w, status: "PENDENTE",                 cancelado: false }, _sum: { valor: true } }),
  ]);
  return { pago: pago._sum.valor || 0, pendente: pendente._sum.valor || 0 };
}

async function getAlertas(franchiseId?: string) {
  const hoje   = new Date();
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  const w = franchiseId ? { franchiseId } : {};
  const [entrevistas, retornosCrm] = await Promise.all([
    prisma.application.findMany({
      where: { vacancy: franchiseId ? { franchiseId } : {}, entrevistaAt: { gte: hoje, lte: amanha } },
      include: { student: { select: { name: true } }, vacancy: { include: { company: { select: { name: true } } } } },
      orderBy: { entrevistaAt: "asc" },
      take: 6,
    }),
    prisma.crmLead.findMany({
      where: { ...w, situacao: "ativo", retornoAt: { lte: amanha } },
      select: { id: true, empresa: true, retornoAt: true, proximaAcao: true },
      orderBy: { retornoAt: "asc" },
      take: 6,
    }),
  ]);
  return { entrevistas, retornosCrm };
}

async function getRanking() {
  const pontos = await prisma.gamificationPoint.groupBy({
    by: ["franchiseId"],
    _sum: { pontos: true },
    orderBy: { _sum: { pontos: "desc" } },
    take: 10,
  });
  if (pontos.length === 0) return [];
  const ids      = pontos.map(p => p.franchiseId);
  const franquias = await prisma.franchise.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const map = Object.fromEntries(franquias.map(f => [f.id, f.name]));
  return pontos.map((p, i) => ({ pos: i+1, id: p.franchiseId, name: map[p.franchiseId] || "—", total: p._sum.pontos || 0 }));
}

async function getContratacoesRecentes(franchiseId?: string) {
  const w = franchiseId ? { franchiseId } : {};
  return prisma.contract.findMany({
    where: { ...w, createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } },
    include: { student: { select: { name: true } }, company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

async function getFranqueadosResumo() {
  return prisma.franchise.findMany({
    include: { _count: { select: { companies: true, students: true, contracts: true } } },
    orderBy: { pontuacao: "desc" },
    take: 10,
  });
}

// ─── Page ────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session    = await getServerSession(authOptions);
  const role       = session!.user.role;
  const isMaster   = role === "FRANQUEADORA";

  // ⚠️ REGRA CRÍTICA: FRANQUEADORA passa undefined → vê TODA A REDE
  //                   FRANQUEADO   passa franchiseId → vê só sua unidade
  const filtro: string | undefined = isMaster ? undefined : (session!.user.franchiseId ?? undefined);

  const kpis       = await getKpis(filtro);
  const fin        = await getFinanceiro(filtro);
  const alertas    = await getAlertas(filtro);
  const recentes   = await getContratacoesRecentes(filtro);
  const ranking    = await getRanking();
  const franquias  = isMaster ? await getFranquias()         : null;
  const franqueados = isMaster ? await getFranqueadosResumo() : [];

  const fmt  = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const hoje = new Date();

  return (
    <div>
      {/* ── Título ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">
          {isMaster ? "Painel Executivo da Rede" : "Painel da Unidade"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isMaster
            ? "Visão consolidada de toda a rede Smarter"
            : `Sua unidade — ${session?.user?.name}`}
        </p>
      </div>

      {/* ── KPIs exclusivos da Franqueadora ── */}
      {isMaster && franquias && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: "Franquias Ativas",   value: franquias.ativas,   color: "text-emerald-600", href: "/dashboard/franqueados" },
            { label: "Franquias Inativas", value: franquias.inativas,  color: franquias.inativas > 0 ? "text-red-500" : "text-slate-400", href: "/dashboard/franqueados" },
            { label: "Leads CRM (rede)",   value: kpis.leads,          color: "text-blue-600",   href: "/dashboard/crm" },
            { label: "Financeiro Aberto",  value: fmt(fin.pendente),   color: fin.pendente > 0 ? "text-amber-600" : "text-slate-400", href: "/dashboard/financeiro" },
          ].map(k => (
            <Link key={k.label} href={k.href}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs text-slate-400">{k.label}</p>
                <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ── Alertas do dia ── */}
      {(alertas.entrevistas.length > 0 || alertas.retornosCrm.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          {alertas.entrevistas.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800 mb-2">⏰ Entrevistas hoje ({alertas.entrevistas.length})</p>
              <div className="space-y-1">
                {alertas.entrevistas.map(e => (
                  <div key={e.id} className="text-xs text-amber-700 flex items-center gap-2">
                    <span className="font-bold">
                      {new Date(e.entrevistaAt!).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                    </span>
                    <span>{e.student.name} → {e.vacancy.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {alertas.retornosCrm.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-bold text-blue-800 mb-2">📊 Retornos CRM ({alertas.retornosCrm.length})</p>
              <div className="space-y-1">
                {alertas.retornosCrm.map(l => (
                  <div key={l.id} className="text-xs flex items-center gap-2">
                    <span className={`font-bold ${new Date(l.retornoAt!) < hoje ? "text-red-600" : "text-blue-700"}`}>
                      {new Date(l.retornoAt!) < hoje
                        ? "⚠️ Vencido"
                        : new Date(l.retornoAt!).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                    </span>
                    <Link href={`/dashboard/crm/${l.id}`} className="text-blue-600 hover:underline">{l.empresa}</Link>
                    {l.proximaAcao && <span className="text-slate-400 truncate">— {l.proximaAcao}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs operacionais ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Empresas",              value: kpis.companies,       icon: "🏢", href: "/dashboard/empresas"   },
          { label: "Estagiários Ativos",    value: kpis.studentsAtivos,  icon: "🎓", color: "text-emerald-600", href: "/dashboard/estudantes" },
          { label: "Disponíveis p/ Vaga",   value: kpis.studentsInativos,icon: "📋", href: "/dashboard/estudantes" },
          { label: "Contratos Ativos",      value: kpis.contrAtivos,     icon: "📄", color: "text-emerald-600", href: "/dashboard/contratos"  },
          { label: "Contratos Pendentes",   value: kpis.contrPendentes,  icon: "⏳", color: kpis.contrPendentes > 0 ? "text-amber-600" : undefined, href: "/dashboard/assinaturas" },
          { label: isMaster ? "Leads (rede)" : "Leads da Unidade",
            value: kpis.leads, icon: "📊", href: "/dashboard/crm" },
        ].map(k => (
          <Link key={k.label} href={k.href}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">{k.label}</p>
                <span className="text-lg">{k.icon}</span>
              </div>
              <p className={`text-2xl font-black ${k.color || "text-[#0f2a5e]"}`}>{k.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Financeiro resumido ── */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card className="p-4 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-400">{isMaster ? "Receita da Rede (entradas pagas)" : "Receita Recebida"}</p>
          <p className="text-xl font-black text-emerald-600">{fmt(fin.pago)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-amber-400">
          <p className="text-xs text-slate-400">{isMaster ? "A Receber (rede inteira)" : "A Receber (sua unidade)"}</p>
          <p className="text-xl font-black text-amber-600">{fmt(fin.pendente)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* ── Últimos contratos ── */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">📄 Últimos Contratos (7 dias)</h3>
            <Link href="/dashboard/contratos" className="text-xs text-blue-500 hover:underline">Ver todos</Link>
          </div>
          {recentes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum contrato nos últimos 7 dias.</p>
          ) : (
            <div className="space-y-2">
              {recentes.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold">{c.student.name}</p>
                    <p className="text-[10px] text-slate-400">{c.company.name}</p>
                  </div>
                  <Badge variant={c.status === "ATIVO" ? "green" : "yellow"}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Ranking ── */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            🏆 {isMaster ? "Ranking da Rede" : "Sua Posição na Rede"}
          </h3>
          {ranking.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum dado de pontuação ainda.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map(r => {
                const isMe   = r.id === session?.user?.franchiseId;
                const medal  = r.pos===1?"🥇":r.pos===2?"🥈":r.pos===3?"🥉":`#${r.pos}`;
                const maxPts = ranking[0]?.total || 1;
                return (
                  <div key={r.id} className={`flex items-center gap-2 p-2 rounded-xl ${isMe ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}>
                    <span className="text-sm w-6 text-center">{medal}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold truncate">
                        {r.name} {isMe && <span className="text-blue-500 text-[10px]">← você</span>}
                      </p>
                      <div className="h-1 bg-slate-200 rounded-full mt-1">
                        <div className="h-1 bg-[#f5c400] rounded-full" style={{width:`${Math.round((r.total/maxPts)*100)}%`}}/>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-[#0f2a5e]">{r.total.toLocaleString("pt-BR")} pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Visão por unidade — SÓ FRANQUEADORA ── */}
      {isMaster && franqueados.length > 0 && (
        <Card className="p-5 mt-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">📋 Performance por Unidade</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Unidade","Empresas","Estudantes","Contratos","Status"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franqueados.map(f => (
                <tr key={f.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-semibold">{f.name}</td>
                  <td className="px-3 py-2 text-sm text-center">{(f._count as any).companies}</td>
                  <td className="px-3 py-2 text-sm text-center">{(f._count as any).students}</td>
                  <td className="px-3 py-2 text-sm text-center">{(f._count as any).contracts}</td>
                  <td className="px-3 py-2"><Badge variant={f.status==="ATIVO"?"green":"gray"}>{f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
