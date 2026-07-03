import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { mesAtual } from "@/lib/mes/status";
import { gerarMensagens } from "@/lib/mes/coaching";
import { Download } from "lucide-react";

type Periodo = "semana" | "mes";
type Aba = "atividade" | "abertura-fechamento";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function EngajamentoPage({
  searchParams,
}: {
  searchParams: { periodo?: Periodo; id?: string; aba?: Aba; mes?: string; ano?: string; unidade?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") redirect("/dashboard");

  const aba: Aba = searchParams.aba === "abertura-fechamento" ? "abertura-fechamento" : "atividade";

  const periodo: Periodo = searchParams.periodo === "semana" ? "semana" : "mes";
  const dataLimite = new Date();
  if (periodo === "semana") dataLimite.setDate(dataLimite.getDate() - 7);
  else dataLimite.setMonth(dataLimite.getMonth() - 1);

  const focusId = searchParams.id;

  const franqueados = await prisma.franchise.findMany({
    include: {
      _count: { select: { contracts: true, crmLeads: true, vacancies: true } },
      users: {
        where: { role: { in: ["FRANQUEADO", "FRANQUEADORA"] as any[] } },
        select: { lastLoginAt: true, name: true, email: true },
        orderBy: { lastLoginAt: "desc" },
        take: 1,
      },
    },
  });

  // Se tem foco em uma unidade, buscar detalhes.
  // take: 100 em todas as queries — evita timeout de 30s da Vercel em franqueadas com
  // histórico longo. A page de engajamento exibe métricas/contagens, não lista completa.
  let focusData: any = null;
  if (focusId) {
    const [contratos, vagas, leads, pontos] = await Promise.all([
      prisma.contract.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        select: {
          id: true, status: true, createdAt: true,
          student: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.vacancy.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        select: {
          id: true, titulo: true, status: true, createdAt: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.crmLead.findMany({
        where: { franchiseId: focusId, updatedAt: { gte: dataLimite } },
        select: { id: true, empresa: true, situacao: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.gamificationPoint.findMany({
        where: { franchiseId: focusId, createdAt: { gte: dataLimite } },
        select: { id: true, acao: true, pontos: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
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

  // ─── Aba: Abertura/Fechamento de Mês ──────────────────────────────────────
  const { mes: mesPadrao, ano: anoPadrao } = mesAtual();
  const mesRede = searchParams.mes ? parseInt(searchParams.mes) : mesPadrao;
  const anoRede = searchParams.ano ? parseInt(searchParams.ano) : anoPadrao;
  const unidadeId = searchParams.unidade;

  let redeMes: any[] = [];
  let unidadeRelatorio: any = null;
  if (aba === "abertura-fechamento") {
    const franquiasRede = await prisma.franchise.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true, name: true, cidade: true, uf: true,
        monthOpenings: { where: { mes: mesRede, ano: anoRede }, include: { fechamento: true } },
      },
      orderBy: { name: "asc" },
    });
    redeMes = franquiasRede.map(f => {
      const abertura = f.monthOpenings[0] ?? null;
      const fechamento = abertura?.fechamento ?? null;
      return {
        id: f.id, nome: f.name, cidade: f.cidade, uf: f.uf,
        abertura, fechamento,
      };
    });

    if (unidadeId) {
      const u = redeMes.find(r => r.id === unidadeId);
      if (u?.fechamento) {
        unidadeRelatorio = {
          unidade: u,
          mensagens: gerarMensagens(
            {
              empresasCadastradas: u.fechamento.empresasCadastradas,
              leadsNoMes: u.fechamento.leadsNoMes,
              contratosFirmados: u.fechamento.contratosFirmados,
              horasNoSistema: u.fechamento.horasNoSistema,
            },
            { metaEmpresas: u.abertura.metaEmpresas, metaLeads: u.abertura.metaLeads }
          ),
        };
      }
    }
  }

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

      {/* Abas */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
        <Link href="/dashboard/engajamento"
          className={`text-sm font-semibold px-4 py-2 border-b-2 -mb-px transition-colors ${aba==="atividade"?"border-[#0f2a5e] text-[#0f2a5e]":"border-transparent text-slate-400 hover:text-slate-600"}`}>
          Score de Atividade
        </Link>
        <Link href="/dashboard/engajamento?aba=abertura-fechamento"
          className={`text-sm font-semibold px-4 py-2 border-b-2 -mb-px transition-colors ${aba==="abertura-fechamento"?"border-[#0f2a5e] text-[#0f2a5e]":"border-transparent text-slate-400 hover:text-slate-600"}`}>
          Abertura / Fechamento de Mês
        </Link>
      </div>

      {/* Detalhe de uma unidade */}
      {aba === "atividade" && focusData && focusFranq && (
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
      {aba === "atividade" && !focusId && (
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
                      {f.users[0]?.lastLoginAt ? (
                        <span className="text-slate-400">
                          🕐 Último login: {new Date(f.users[0].lastLoginAt).toLocaleDateString("pt-BR")} às {new Date(f.users[0].lastLoginAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-slate-300">🕐 Nunca acessou</span>
                      )}
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

      {/* Aba: Abertura/Fechamento de Mês */}
      {aba === "abertura-fechamento" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href={`?aba=abertura-fechamento&mes=${mesRede === 1 ? 12 : mesRede - 1}&ano=${mesRede === 1 ? anoRede - 1 : anoRede}`}
                className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg font-semibold hover:border-blue-400 transition-colors">
                ← Mês anterior
              </Link>
              <span className="text-sm font-bold text-slate-700 px-2">{NOMES_MES[mesRede - 1]} de {anoRede}</span>
              <Link href={`?aba=abertura-fechamento&mes=${mesRede === 12 ? 1 : mesRede + 1}&ano=${mesRede === 12 ? anoRede + 1 : anoRede}`}
                className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg font-semibold hover:border-blue-400 transition-colors">
                Próximo mês →
              </Link>
            </div>
            <a href={`/api/app/mes/engajamento/pdf?mes=${mesRede}&ano=${anoRede}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs border border-slate-200 hover:border-blue-400 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              <Download size={14} /> Baixar relatório da rede em PDF
            </a>
          </div>

          {unidadeRelatorio ? (
            <div>
              <Link href={`?aba=abertura-fechamento&mes=${mesRede}&ano=${anoRede}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg font-semibold hover:border-blue-400 transition-colors inline-block mb-4">
                ← Voltar à rede
              </Link>
              <Card className="p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <p className="font-bold text-slate-800">{unidadeRelatorio.unidade.nome}</p>
                  <Badge variant={unidadeRelatorio.unidade.fechamento.score >= 70 ? "green" : unidadeRelatorio.unidade.fechamento.score >= 40 ? "yellow" : "red"}>
                    Score: {unidadeRelatorio.unidade.fechamento.score}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ["Empresas", unidadeRelatorio.unidade.fechamento.empresasCadastradas],
                    ["Leads", unidadeRelatorio.unidade.fechamento.leadsNoMes],
                    ["Contratos", unidadeRelatorio.unidade.fechamento.contratosFirmados],
                    ["Horas", unidadeRelatorio.unidade.fechamento.horasNoSistema.toFixed(1)],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="text-center">
                      <p className="text-xs text-slate-400">{l}</p>
                      <p className="text-xl font-black text-[#0f2a5e] mt-1">{v as any}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="space-y-3">
                {unidadeRelatorio.mensagens.map((m: any, i: number) => (
                  <Card key={i} className={`p-4 border-l-4 ${m.nivel === "critico" ? "border-red-400" : m.nivel === "atencao" ? "border-amber-400" : "border-emerald-400"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-800 text-sm">{m.indicador}</p>
                      <Badge variant={m.nivel === "critico" ? "red" : m.nivel === "atencao" ? "yellow" : "green"}>
                        {m.nivel === "critico" ? "Crítico" : m.nivel === "atencao" ? "Atenção" : "Bom"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">{m.mensagem}</p>
                    <p className="text-sm text-[#0f2a5e] font-semibold">→ {m.acao}</p>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                    <th className="pb-2 font-semibold">Unidade</th>
                    <th className="pb-2 font-semibold text-center">Abertura</th>
                    <th className="pb-2 font-semibold text-center">Fechamento</th>
                    <th className="pb-2 font-semibold text-center">Score</th>
                    <th className="pb-2 font-semibold text-center">Empresas</th>
                    <th className="pb-2 font-semibold text-center">Leads</th>
                    <th className="pb-2 font-semibold text-center">Contratos</th>
                    <th className="pb-2 font-semibold text-center">Horas</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {redeMes.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5">
                        <p className="font-semibold text-slate-800">{r.nome}</p>
                        <p className="text-xs text-slate-400">{r.cidade}/{r.uf}</p>
                      </td>
                      <td className="py-2.5 text-center">
                        {r.abertura ? <Badge variant="green">✓ {new Date(r.abertura.criadoEm).toLocaleDateString("pt-BR")}</Badge> : <Badge variant="red">✗</Badge>}
                      </td>
                      <td className="py-2.5 text-center">
                        {r.fechamento?.leituraConfirmada
                          ? <Badge variant="green">✓ {new Date(r.fechamento.leituraConfirmadaEm).toLocaleDateString("pt-BR")}</Badge>
                          : <Badge variant="red">✗</Badge>}
                      </td>
                      <td className="py-2.5 text-center font-bold text-[#0f2a5e]">{r.fechamento?.score ?? "—"}</td>
                      <td className="py-2.5 text-center">{r.fechamento?.empresasCadastradas ?? "—"}</td>
                      <td className="py-2.5 text-center">{r.fechamento?.leadsNoMes ?? "—"}</td>
                      <td className="py-2.5 text-center">{r.fechamento?.contratosFirmados ?? "—"}</td>
                      <td className="py-2.5 text-center">{r.fechamento?.horasNoSistema != null ? r.fechamento.horasNoSistema.toFixed(1) : "—"}</td>
                      <td className="py-2.5 text-right">
                        {r.fechamento && (
                          <Link href={`?aba=abertura-fechamento&mes=${mesRede}&ano=${anoRede}&unidade=${r.id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline">
                            Ver relatório →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
