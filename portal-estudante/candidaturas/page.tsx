import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const ETAPA_LABEL: Record<string,string> = {
  inscritos:"Inscrito", triagem:"Em Triagem", entrevista:"Entrevista",
  aprovado:"Aprovado ✓", reprovado:"Reprovado",
};
const ETAPA_BADGE: Record<string,"green"|"yellow"|"blue"|"red"|"gray"> = {
  inscritos:"gray", triagem:"blue", entrevista:"yellow", aprovado:"green", reprovado:"red",
};

export default async function EstudanteProcessos() {
  const session = await getServerSession(authOptions);
  const studentId = session?.user?.studentId;

  if (!studentId) {
    return <p className="text-slate-400 text-center py-12">Perfil de estudante não encontrado.</p>;
  }

  const candidaturas = await prisma.application.findMany({
    where: { studentId },
    include: {
      vacancy: { include: { company: { select: { name: true, cidade: true, uf: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Minhas Candidaturas</h1>

      {candidaturas.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-slate-600 font-semibold mb-1">Nenhuma candidatura ainda.</p>
          <p className="text-slate-400 text-sm">Acesse a aba Vagas para se inscrever.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {candidaturas.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-slate-800">{a.vacancy.titulo}</p>
                  <p className="text-sm text-slate-500">
                    {a.vacancy.company.name} • {a.vacancy.company.cidade}/{a.vacancy.company.uf}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    💰 R$ {a.vacancy.bolsa.toLocaleString("pt-BR")}/mês •
                    Inscrito em {a.createdAt ? new Date(a.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={ETAPA_BADGE[a.etapa || "INSCRITO"] || "gray"}>
                    {ETAPA_LABEL[a.etapa || "INSCRITO"] || a.etapa}
                  </Badge>
                  {a.matching && (
                    <span className="text-xs font-bold text-emerald-600">{a.matching}% match</span>
                  )}
                </div>
              </div>

              {/* Entrevista agendada */}
              {a.entrevistaAt && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800">📅 Entrevista agendada</p>
                  <p className="text-sm font-bold text-amber-900">
                    {new Date(a.entrevistaAt).toLocaleString("pt-BR", { dateStyle:"full", timeStyle:"short" })}
                  </p>
                  {a.entrevistaLocal && <p className="text-xs text-amber-700 mt-0.5">📍 {a.entrevistaLocal}</p>}
                  {a.entrevistaLink && (
                    <a href={a.entrevistaLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-bold hover:underline mt-1 block">
                      🔗 Entrar na reunião →
                    </a>
                  )}
                </div>
              )}

              {/* Feedback */}
              {a.recomendacao && a.recomendacao !== "em_analise" && (
                <div className={`mt-3 p-3 rounded-xl border ${
                  a.recomendacao === "aprovado"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  <p className={`text-xs font-bold ${a.recomendacao === "aprovado" ? "text-green-800" : "text-red-800"}`}>
                    {a.recomendacao === "aprovado"
                      ? "✓ Parabéns! Você foi aprovado(a) nesta vaga!"
                      : "Sua candidatura não avançou neste processo."}
                  </p>
                  {a.anotacao && <p className="text-xs mt-1 text-slate-600 italic">{a.anotacao}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
