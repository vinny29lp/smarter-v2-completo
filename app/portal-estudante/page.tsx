import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const DISC_INFO: Record<string,{nome:string;cor:string;emoji:string;desc:string}> = {
  D:{nome:"Dominância",cor:"text-red-600 bg-red-50",emoji:"🔴",desc:"Focado em resultados, direto e assertivo"},
  I:{nome:"Influência",cor:"text-amber-600 bg-amber-50",emoji:"🟡",desc:"Comunicativo, entusiasmado e persuasivo"},
  S:{nome:"Estabilidade",cor:"text-emerald-600 bg-emerald-50",emoji:"🟢",desc:"Colaborativo, paciente e confiável"},
  C:{nome:"Conformidade",cor:"text-blue-600 bg-blue-50",emoji:"🔵",desc:"Analítico, meticuloso e preciso"},
};

export default async function PortalEstudanteHome() {
  const session = await getServerSession(authOptions);
  const studentId = session?.user?.studentId;
  if (!studentId) return <div className="text-center py-12 text-slate-400">Perfil de estudante não encontrado.</div>;

  const [student, contratos, candidaturas, vagasAbertas] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: { institution: true },
    }),
    prisma.contract.findMany({
      where: { studentId, status: { in: ["ATIVO","PENDENTE"] } },
      include: { company: true, evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.application.findMany({
      where: { studentId },
      include: { vacancy: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.vacancy.count({ where: { status: "ABERTA" } }),
  ]);

  const temDisc = !!student?.discResult;

  return (
    <div>
      {/* Banner DISC — aparece primeiro e chamativo se não tiver feito */}
      {!temDisc && (
        <div className="mb-6 p-5 bg-gradient-to-r from-[#0f2a5e] to-[#1a3d8f] rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide font-bold mb-1">⚡ Ação recomendada</p>
              <h2 className="text-xl font-black mb-1">Faça seu Teste DISC!</h2>
              <p className="text-white/80 text-sm">Descubra seu perfil profissional e aumente seu matching com as vagas. Leva apenas 5 minutos!</p>
            </div>
            <Link href="/portal-estudante/disc"
              className="flex-shrink-0 ml-6 px-6 py-3 bg-[#f5c400] text-[#0f2a5e] rounded-xl font-black text-sm hover:bg-yellow-300 transition-colors">
              Fazer Teste →
            </Link>
          </div>
          <div className="flex gap-3 mt-4">
            {Object.entries(DISC_INFO).map(([k,v]) => (
              <div key={k} className="flex-1 bg-white/10 rounded-xl p-2 text-center">
                <p className="text-lg">{v.emoji}</p>
                <p className="text-[10px] text-white/70 font-bold">{v.nome}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perfil DISC se já tiver */}
      {temDisc && student?.discResult && (
        <div className={`mb-6 p-4 ${DISC_INFO[student.discResult].cor} rounded-2xl border`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{DISC_INFO[student.discResult].emoji}</span>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seu Perfil DISC</p>
                <p className="text-lg font-black text-slate-800">{DISC_INFO[student.discResult].nome}</p>
                <p className="text-xs text-slate-600">{DISC_INFO[student.discResult].desc}</p>
              </div>
            </div>
            <Link href="/portal-estudante/disc" className="text-xs font-bold text-slate-500 hover:underline">Refazer →</Link>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Olá, {student?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">{student?.curso} {student?.periodo ? `— ${student.periodo}º período` : ""} {student?.institution ? `• ${student.institution.name}` : ""}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {label:"Estágio Ativo", value:contratos.length>0?"Sim":"Não", color:contratos.length>0?"text-emerald-600":"text-slate-400", href:"/portal-estudante/contrato"},
          {label:"Candidaturas", value:candidaturas.length, color:"text-blue-600", href:"/portal-estudante/processos"},
          {label:"Vagas Abertas", value:vagasAbertas, color:"text-purple-600", href:"/portal-estudante/vagas"},
        ].map(k => (
          <Link key={k.label} href={k.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-xs text-slate-400">{k.label}</p>
              <p className={`text-3xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Candidaturas recentes */}
      {candidaturas.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Minhas Candidaturas</h2>
            <Link href="/portal-estudante/processos" className="text-xs text-blue-500 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {candidaturas.slice(0,3).map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{a.vacancy.titulo}</p>
                  <p className="text-xs text-slate-400">{a.vacancy.company.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.matching && (
                    <span className="text-xs font-bold text-emerald-600">{a.matching}% match</span>
                  )}
                  <Badge variant={a.etapa==="aprovado"?"green":a.etapa==="reprovado"?"red":"blue"}>
                    {a.etapa}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Estágio atual */}
      {contratos.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Meu Estágio Atual</h2>
          {contratos.map(c => (
            <div key={c.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold">{c.company.name}</p>
                  <p className="text-xs text-slate-400">
                    R$ {c.bolsa.toLocaleString("pt-BR")}/mês •
                    {new Date(c.dataInicio).toLocaleDateString("pt-BR")} →
                    {new Date(c.dataFim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Link href="/portal-estudante/contrato"
                  className="text-xs border border-slate-200 hover:border-[#0f2a5e] px-3 py-1.5 rounded-xl font-semibold transition-colors">
                  Ver detalhes →
                </Link>
              </div>
              {c.evaluations?.[0] && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs font-bold text-blue-800">📋 Avaliação disponível</p>
                  <Link href="/portal-estudante/avaliacoes" className="text-xs text-blue-600 hover:underline">Ver feedback →</Link>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
