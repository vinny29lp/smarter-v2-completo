import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Card }  from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import AlertasPanel from "@/components/dashboard/AlertasPanel";

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
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  if (!franchiseId) {
    // ── FRANQUEADORA ─────────────────────────────────────────────────
    // Franquia = receita para a Franqueadora (independente do tipo guardado no DB)
    const [entMes, franqMes, saiMes, aRecProp, aRecFranq, caPagar, totEnt, totSai] = await Promise.all([
      // Entradas próprias pagas no mês
      prisma.financial.aggregate({ where: { franchiseId: null, status: "PAGO", tipo: "entrada", cancelado: false, paidAt: { gte: inicioMes } }, _sum: { valor: true } }),
      // Franquias recebidas no mês (receita da rede — qualquer tipo)
      prisma.financial.aggregate({ where: { categoria: "Franquia", status: "PAGO", cancelado: false, paidAt: { gte: inicioMes } }, _sum: { valor: true } }),
      // Saídas próprias pagas no mês (excluindo Franquia)
      prisma.financial.aggregate({ where: { franchiseId: null, status: "PAGO", tipo: "saida", NOT: { categoria: "Franquia" }, cancelado: false, paidAt: { gte: inicioMes } }, _sum: { valor: true } }),
      // A Receber: entradas próprias pendentes
      prisma.financial.aggregate({ where: { franchiseId: null, status: "PENDENTE", tipo: "entrada", cancelado: false }, _sum: { valor: true } }),
      // A Receber: cobranças de Franquia pendentes (qualquer tipo)
      prisma.financial.aggregate({ where: { categoria: "Franquia", status: "PENDENTE", cancelado: false }, _sum: { valor: true } }),
      // Contas a Pagar: saídas próprias pendentes (excluindo Franquia)
      prisma.financial.aggregate({ where: { franchiseId: null, status: "PENDENTE", tipo: "saida", NOT: { categoria: "Franquia" }, cancelado: false }, _sum: { valor: true } }),
      // Caixa: total receitas (entradas próprias + franquias coletadas)
      prisma.financial.aggregate({ where: { OR: [{ franchiseId: null, tipo: "entrada" }, { categoria: "Franquia" }], status: "PAGO", cancelado: false }, _sum: { valor: true } }),
      // Caixa: total despesas (saídas próprias, sem Franquia)
      prisma.financial.aggregate({ where: { franchiseId: null, tipo: "saida", NOT: { categoria: "Franquia" }, status: "PAGO", cancelado: false }, _sum: { valor: true } }),
    ]);
    return {
      entradasMes:  (entMes._sum.valor || 0) + (franqMes._sum.valor || 0),
      saidasMes:    saiMes._sum.valor  || 0,
      aReceber:     (aRecProp._sum.valor || 0) + (aRecFranq._sum.valor || 0),
      contasAPagar: caPagar._sum.valor || 0,
      caixa:        (totEnt._sum.valor || 0) - (totSai._sum.valor || 0),
    };
  }

  // ── FRANQUEADO ───────────────────────────────────────────────────────
  // Franquia (categoria "Franquia") = DESPESA da unidade, independente do tipo no DB
  // Compatível com registros antigos (tipo:"entrada") e novos (tipo:"saida")
  const [entMes, saiMes, aRec, caPagar, totEnt, totSai] = await Promise.all([
    // Entradas pagas no mês — exclui Franquia (despesa, não receita)
    prisma.financial.aggregate({ where: { franchiseId, status: "PAGO", tipo: "entrada", NOT: { categoria: "Franquia" }, cancelado: false, paidAt: { gte: inicioMes } }, _sum: { valor: true } }),
    // Saídas pagas no mês + Franquia paga (qualquer tipo)
    prisma.financial.aggregate({ where: { franchiseId, status: "PAGO", cancelado: false, paidAt: { gte: inicioMes }, OR: [{ tipo: "saida" }, { categoria: "Franquia" }] }, _sum: { valor: true } }),
    // A Receber: entradas pendentes — exclui Franquia
    prisma.financial.aggregate({ where: { franchiseId, status: "PENDENTE", tipo: "entrada", NOT: { categoria: "Franquia" }, cancelado: false }, _sum: { valor: true } }),
    // Contas a Pagar: saídas pendentes + Franquia pendente (qualquer tipo)
    prisma.financial.aggregate({ where: { franchiseId, status: "PENDENTE", cancelado: false, OR: [{ tipo: "saida" }, { categoria: "Franquia" }] }, _sum: { valor: true } }),
    // Caixa total: entradas pagas (sem Franquia)
    prisma.financial.aggregate({ where: { franchiseId, status: "PAGO", tipo: "entrada", NOT: { categoria: "Franquia" }, cancelado: false }, _sum: { valor: true } }),
    // Caixa total: saídas pagas + Franquia paga
    prisma.financial.aggregate({ where: { franchiseId, status: "PAGO", cancelado: false, OR: [{ tipo: "saida" }, { categoria: "Franquia" }] }, _sum: { valor: true } }),
  ]);
  return {
    entradasMes:  entMes._sum.valor  || 0,
    saidasMes:    saiMes._sum.valor  || 0,
    aReceber:     aRec._sum.valor    || 0,
    contasAPagar: caPagar._sum.valor || 0,
    caixa:        (totEnt._sum.valor || 0) - (totSai._sum.valor || 0),
  };
}

async function getProximos5Dias(franchiseId?: string) {
  const hoje  = new Date();
  const fim5d = new Date(hoje); fim5d.setDate(fim5d.getDate() + 5);
  // IMPORTANTE: sempre filtrar pelo franchiseId exato do usuário.
  // CrmLead e Contract têm franchiseId NOT NULL — não aceita null como filtro.
  // Se o admin não tiver franchiseId vinculado, usa UUID impossível → retorna vazio (sem crash).
  const NONE = "00000000-0000-0000-0000-000000000000";
  const safeId = franchiseId ?? NONE;
  const wExato = { franchiseId: safeId };

  const [entrevistas, retornosCrm, reunioesCrm, contratosVencendo, cobrancasVencendo] = await Promise.all([
    // Entrevistas agendadas nos próximos 5 dias
    prisma.application.findMany({
      where: {
        vacancy: franchiseId ? { franchiseId } : {},
        entrevistaAt: { gte: hoje, lte: fim5d },
      },
      include: {
        student: { select: { name: true } },
        vacancy: { select: { titulo: true, company: { select: { name: true } } } },
      },
      orderBy: { entrevistaAt: "asc" },
      take: 10,
    }),
    // Retornos CRM vencidos ou nos próximos 5 dias — apenas da conta do usuário logado
    prisma.crmLead.findMany({
      where: { ...wExato, situacao: "ativo", retornoAt: { lte: fim5d } },
      select: { id: true, empresa: true, retornoAt: true, proximaAcao: true, prioridade: true },
      orderBy: { retornoAt: "asc" },
      take: 8,
    }),
    // Reuniões CRM nos próximos 5 dias — apenas da conta do usuário logado
    prisma.crmLead.findMany({
      where: { ...wExato, situacao: "ativo", reuniaoAt: { gte: hoje, lte: fim5d } },
      select: { id: true, empresa: true, reuniaoAt: true, linkReuniao: true, enderecoReuniao: true },
      orderBy: { reuniaoAt: "asc" },
      take: 6,
    }),
    // Contratos vencendo em 30 dias — apenas da conta do usuário logado
    prisma.contract.findMany({
      where: { ...wExato, status: "ATIVO", dataFim: { gte: hoje, lte: new Date(hoje.getTime() + 30*24*60*60*1000) } },
      include: { student: { select: { name: true } }, company: { select: { name: true } } },
      orderBy: { dataFim: "asc" },
      take: 5,
    }),
    // Cobranças vencendo nos próximos 5 dias — apenas da conta do usuário logado
    prisma.financial.findMany({
      where: { ...wExato, status: "PENDENTE", cancelado: false, tipo: "entrada", vencimentoAt: { gte: hoje, lte: fim5d } },
      include: { company: { select: { name: true } } },
      orderBy: { vencimentoAt: "asc" },
      take: 6,
    }),
  ]);

  return { entrevistas, retornosCrm, reunioesCrm, contratosVencendo, cobrancasVencendo };
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
    include: {
      _count: {
        select: {
          companies: true,
          students: { where: { status: "EM_ESTAGIO" } },
          contracts: { where: { status: "ATIVO" } },
        },
      },
    },
    orderBy: { pontuacao: "desc" },
    take: 10,
  });
}

// ─── Cache wrappers (unstable_cache – TTL 30s) ───────────────────
// Apenas operações de LEITURA são cacheadas.
// Escritas e mutações NUNCA passam por estas funções — sem risco de cache stale em dados críticos.
// Cache-key inclui os argumentos → entradas separadas por franchiseId.
// Após 30s o Next.js revalida automaticamente na próxima requisição (stale-while-revalidate).
const cachedGetKpis = unstable_cache(
  getKpis,
  ["dashboard-kpis"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetFranquias = unstable_cache(
  getFranquias,
  ["dashboard-franquias"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetFinanceiro = unstable_cache(
  getFinanceiro,
  ["dashboard-financeiro"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetProximos5Dias = unstable_cache(
  getProximos5Dias,
  ["dashboard-agenda"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetContratacoesRecentes = unstable_cache(
  getContratacoesRecentes,
  ["dashboard-recentes"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetFranqueadosResumo = unstable_cache(
  getFranqueadosResumo,
  ["dashboard-franqueados"],
  { revalidate: 30, tags: ["dashboard"] }
);
const cachedGetRanking = unstable_cache(
  getRanking,
  ["dashboard-ranking"],
  { revalidate: 30, tags: ["dashboard"] }
);

// ─── Page ────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session    = await getServerSession(authOptions);
  const role       = session!.user.role;
  const isMaster   = role === "FRANQUEADORA";
  const filtro: string | undefined = isMaster ? undefined : (session!.user.franchiseId ?? undefined);
  // Para agenda (follow-ups CRM, cobranças): sempre usa o próprio franchiseId do usuário logado.
  // Admin vê apenas os seus lembretes — para ver de outras unidades, acessa o cadastro delas.
  const filtroAgenda: string | undefined = session!.user.franchiseId ?? undefined;

  // ⚡ Todas as queries em paralelo com cache de 30s (unstable_cache)
  // Leituras: servidas do cache → reduz carga no banco.
  // Solicitações de usuário específico: não cacheadas (dado pessoal/tempo-real).
  const [kpis, fin, agenda, recentes, ranking, franquias, franqueados, solicitations] =
    await Promise.all([
      cachedGetKpis(filtro),
      cachedGetFinanceiro(filtro),
      cachedGetProximos5Dias(filtroAgenda),
      cachedGetContratacoesRecentes(filtro),
      cachedGetRanking(),
      isMaster ? cachedGetFranquias()         : Promise.resolve(null),
      isMaster ? cachedGetFranqueadosResumo() : Promise.resolve([]),
      // Solicitações NÃO cacheadas — dado pessoal e tempo-real por usuário
      (role === "FRANQUEADO" || role === "FUNCIONARIO")
        ? prisma.notification.findMany({
            where: { userId: (session!.user as any).id, tipo: "SOLICITACAO_ESTAGIARIO", lida: false },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

  const fmt  = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const hoje = new Date();

  const totalAgenda = agenda.entrevistas.length + agenda.retornosCrm.length + agenda.reunioesCrm.length + agenda.cobrancasVencendo.length;

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

      {/* ── Alertas e Lembretes ── */}
      <div className="mb-6">
        <AlertasPanel isMaster={isMaster} />
      </div>

      {/* ── Solicitações de Estagiário ── */}
      {solicitations.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-700">🎯 Solicitações de Estagiário</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{solicitations.length} nova{solicitations.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {solicitations.map(s => {
              const dt = new Date(s.createdAt ?? new Date());
              return (
                <Card key={s.id} className="p-4 border-l-4 border-blue-400 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-blue-700 mb-1">{s.titulo}</p>
                      <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed line-clamp-5">
                        {s.mensagem}
                      </pre>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                    <Link
                      href={`/dashboard/solicitacao/${s.id}`}
                      className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded font-bold hover:bg-blue-700 transition-colors"
                    >
                      Abrir
                    </Link>
                    <a
                      href={`/api/app/notificacao/${s.id}/pdf`}
                      target="_blank"
                      className="text-[11px] bg-slate-100 text-slate-700 px-3 py-1 rounded font-bold hover:bg-slate-200 transition-colors"
                    >
                      Baixar PDF
                    </a>
                    {s.link && (
                      <Link
                        href={s.link}
                        className="text-[11px] text-blue-500 px-3 py-1 rounded font-bold hover:underline ml-auto"
                      >
                        Ver empresa →
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KPIs exclusivos da Franqueadora ── */}
      {isMaster && franquias && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            { label: "Franquias Ativas",   value: franquias.ativas,   color: "text-emerald-600", href: "/dashboard/franqueados" },
            { label: "Franquias Inativas", value: franquias.inativas,  color: franquias.inativas > 0 ? "text-red-500" : "text-slate-400", href: "/dashboard/franqueados" },
            { label: "Leads CRM (rede)",   value: kpis.leads,          color: "text-blue-600",   href: "/dashboard/crm" },
            { label: "Financeiro Aberto",  value: fmt(fin.aReceber),   color: fin.aReceber > 0 ? "text-amber-600" : "text-slate-400", href: "/dashboard/financeiro" },
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

      {/* ── PRÓXIMOS 5 DIAS ── */}
      {totalAgenda > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-700">📅 Próximos 5 Dias</h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{totalAgenda} itens</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Entrevistas */}
            {agenda.entrevistas.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  🎤 ENTREVISTAS <span className="bg-blue-100 text-blue-600 px-1.5 rounded-full text-[10px]">{agenda.entrevistas.length}</span>
                </p>
                <div className="space-y-2">
                  {agenda.entrevistas.map(e => {
                    const dt = new Date(e.entrevistaAt!);
                    const isHoje = dt.toDateString() === hoje.toDateString();
                    return (
                      <div key={e.id} className={`flex items-start gap-2 p-2 rounded-lg ${isHoje ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                        <div className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${isHoje ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600"}`}>
                          {isHoje ? "HOJE" : dt.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{e.student.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{e.vacancy.titulo} — {e.vacancy.company.name}</p>
                          <p className="text-[10px] text-blue-600 font-bold">{dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Retornos CRM */}
            {agenda.retornosCrm.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  📊 FOLLOW-UPS CRM <span className="bg-purple-100 text-purple-600 px-1.5 rounded-full text-[10px]">{agenda.retornosCrm.length}</span>
                </p>
                <div className="space-y-2">
                  {agenda.retornosCrm.map(l => {
                    const dt = new Date(l.retornoAt!);
                    const vencido = dt < hoje;
                    const isHoje = dt.toDateString() === hoje.toDateString();
                    return (
                      <Link key={l.id} href={`/dashboard/crm/${l.id}`}>
                        <div className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 ${vencido ? "bg-red-50 border border-red-100" : isHoje ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                          <div className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${vencido ? "bg-red-200 text-red-800" : isHoje ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600"}`}>
                            {vencido ? "ATRAS." : isHoje ? "HOJE" : dt.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{l.empresa}</p>
                            {l.proximaAcao && <p className="text-[10px] text-slate-400 truncate">{l.proximaAcao}</p>}
                          </div>
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${l.prioridade==="alta"?"bg-red-400":l.prioridade==="media"?"bg-amber-400":"bg-slate-300"}`}/>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Reuniões */}
            {agenda.reunioesCrm.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  📅 REUNIÕES <span className="bg-green-100 text-green-600 px-1.5 rounded-full text-[10px]">{agenda.reunioesCrm.length}</span>
                </p>
                <div className="space-y-2">
                  {agenda.reunioesCrm.map(l => {
                    const dt = new Date(l.reuniaoAt!);
                    const isHoje = dt.toDateString() === hoje.toDateString();
                    return (
                      <Link key={l.id} href={`/dashboard/crm/${l.id}`}>
                        <div className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 ${isHoje ? "bg-green-50 border border-green-100" : "bg-slate-50"}`}>
                          <div className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${isHoje ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-600"}`}>
                            {isHoje ? "HOJE" : dt.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{l.empresa}</p>
                            <p className="text-[10px] text-slate-400">{dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
                            {l.enderecoReuniao && <p className="text-[10px] text-slate-400 truncate">📍 {l.enderecoReuniao}</p>}
                            {l.linkReuniao && <a href={l.linkReuniao} target="_blank" className="text-[10px] text-blue-500">🔗 Link</a>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Cobranças vencendo */}
            {agenda.cobrancasVencendo.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  💰 COBRANÇAS VENCENDO <span className="bg-amber-100 text-amber-600 px-1.5 rounded-full text-[10px]">{agenda.cobrancasVencendo.length}</span>
                </p>
                <div className="space-y-2">
                  {agenda.cobrancasVencendo.map(f => {
                    const dt = new Date(f.vencimentoAt!);
                    const isHoje = dt.toDateString() === hoje.toDateString();
                    return (
                      <Link key={f.id} href="/dashboard/financeiro">
                        <div className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 ${isHoje ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                          <div className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${isHoje ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600"}`}>
                            {isHoje ? "HOJE" : dt.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{f.company?.name || "—"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{f.descricao}</p>
                          </div>
                          <span className="text-xs font-black text-amber-700 flex-shrink-0">
                            R$ {f.valor.toLocaleString("pt-BR",{minimumFractionDigits:0})}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Contratos vencendo */}
            {agenda.contratosVencendo.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  📄 CONTRATOS VENCENDO (30d) <span className="bg-red-100 text-red-600 px-1.5 rounded-full text-[10px]">{agenda.contratosVencendo.length}</span>
                </p>
                <div className="space-y-2">
                  {agenda.contratosVencendo.map(c => {
                    const dias = Math.ceil((new Date(c.dataFim).getTime() - hoje.getTime()) / (1000*60*60*24));
                    return (
                      <Link key={c.id} href={`/dashboard/contratos/${c.id}`}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 ${dias <= 7 ? "bg-red-50 border border-red-100" : "bg-slate-50"}`}>
                          <div className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${dias <= 7 ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-600"}`}>
                            {dias}d
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{c.student.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.company.name}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs operacionais ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Empresas",              value: kpis.companies,       icon: "🏢", href: "/dashboard/empresas"   },
          { label: "Estagiários Ativos",    value: kpis.contrAtivos + kpis.contrPendentes,  icon: "🎓", color: "text-emerald-600", href: "/dashboard/estudantes" },
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

      {/* ── Financeiro resumido (5 KPIs — igual à página Financeiro) ── */}
      <Link href="/dashboard/financeiro">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 cursor-pointer group">
          <Card className="p-4 border-l-4 border-emerald-400 group-hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-400">{isMaster ? "↑ Receita da Rede" : "↑ Entradas"}</p>
            <p className="text-[10px] text-slate-400">pagas no mês</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{fmt(fin.entradasMes)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-red-300 group-hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-400">↓ Saídas Pagas</p>
            <p className="text-[10px] text-slate-400">pagas no mês</p>
            <p className="text-xl font-black text-red-500 mt-1">{fmt(fin.saidasMes)}</p>
          </Card>
          <Card className={`p-4 border-l-4 group-hover:shadow-md transition-shadow ${fin.contasAPagar > 0 ? "border-orange-400" : "border-slate-200"}`}>
            <p className="text-xs text-slate-400">📋 Contas a Pagar</p>
            <p className="text-[10px] text-slate-400">saídas pendentes</p>
            <p className={`text-xl font-black mt-1 ${fin.contasAPagar > 0 ? "text-orange-600" : "text-slate-400"}`}>{fmt(fin.contasAPagar)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-amber-400 group-hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-400">⏳ A Receber</p>
            <p className="text-[10px] text-slate-400">entradas pendentes</p>
            <p className="text-xl font-black text-amber-600 mt-1">{fmt(fin.aReceber)}</p>
          </Card>
          <Card className={`p-4 border-l-4 group-hover:shadow-md transition-shadow ${fin.caixa >= 0 ? "border-blue-500" : "border-red-500"}`}>
            <p className="text-xs text-slate-400">💵 Caixa</p>
            <p className="text-[10px] text-slate-400">entradas − saídas (total)</p>
            <p className={`text-xl font-black mt-1 ${fin.caixa >= 0 ? "text-[#0f2a5e]" : "text-red-600"}`}>{fmt(fin.caixa)}</p>
          </Card>
        </div>
      </Link>

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
                {["Unidade","Empresas","Em Estágio","Contratos Ativos","Status"].map(h => (
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
