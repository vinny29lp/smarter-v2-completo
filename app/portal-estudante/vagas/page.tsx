import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VagaInscricaoButton } from "./VagaInscricaoButton";
import { redirect } from "next/navigation";

export default async function EstudanteVagas() {
  const session = await getServerSession(authOptions);

  // Garante que a sessão existe e pertence a um estudante com perfil vinculado.
  // Sem esse guard, studentId seria undefined e:
  //   1. findUnique({ where: { id: undefined } }) explode com server exception
  //   2. findMany({ where: { studentId: undefined } }) ignora o filtro e vaza
  //      as candidaturas de TODOS os estudantes do sistema.
  if (!session?.user) {
    redirect("/login");
  }

  const studentId = session.user.studentId;

  if (!studentId) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-800">Vagas Abertas</h1>
        </div>
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">💼</p>
          <p className="text-slate-600 font-semibold">Perfil de estudante não encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Seu cadastro ainda está sendo processado. Entre em contato com a Smarter Estágios.</p>
        </Card>
      </div>
    );
  }

  const [vagas, student, candidaturas] = await Promise.all([
    prisma.vacancy.findMany({
      where: { status: "ABERTA" },
      include: { company: { select: { name: true, cidade: true, uf: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.findUnique({ where: { id: studentId }, select: { discResult: true, curso: true } }),
    prisma.application.findMany({ where: { studentId }, select: { vacancyId: true } }),
  ]);

  const inscritoIds = new Set(candidaturas.map(c => c.vacancyId));

  const calcMatch = (v: any) => {
    let match = 60;
    if (student?.discResult && v.discDesejado) match = student.discResult === v.discDesejado ? 95 : 65;
    if (student?.curso && v.area) match = Math.max(match, 70);
    return match;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Vagas Abertas</h1>
        <p className="text-slate-500 text-sm mt-1">{vagas.length} vagas disponíveis</p>
      </div>
      {vagas.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-4xl mb-3">💼</p><p className="text-slate-400 text-sm">Nenhuma vaga aberta no momento.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {vagas.map(v => {
            const match = calcMatch(v);
            const inscrito = inscritoIds.has(v.id);
            return (
              <Card key={v.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{v.titulo}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{v.company.name}{v.company.cidade && v.company.uf ? ` • ${v.company.cidade}/${v.company.uf}` : ""}</p>
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-emerald-400 rounded-full" style={{width:`${match}%`}}/>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{match}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">match</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span>💰 R$ {v.bolsa.toLocaleString("pt-BR")}/mês</span>
                  <span>⏱ {v.cargaHoraria}h/sem</span>
                  {v.modalidade && <span>🏢 {v.modalidade}</span>}
                </div>
                {v.descricao && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{v.descricao}</p>}
                <div className="flex items-center justify-between">
                  {v.area && <Badge variant="blue">{v.area}</Badge>}
                  <VagaInscricaoButton vagaId={v.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
