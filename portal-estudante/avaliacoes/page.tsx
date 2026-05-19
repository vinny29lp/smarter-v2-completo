import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

const CRITERIOS = [
  { key:"pontualidade",  label:"Pontualidade e Assiduidade" },
  { key:"produtividade", label:"Produtividade e Qualidade" },
  { key:"iniciativa",    label:"Iniciativa e Proatividade" },
  { key:"comunicacao",   label:"Comunicação e Relacionamento" },
  { key:"aprendizado",   label:"Aprendizado e Desenvolvimento" },
  { key:"postura",       label:"Postura Profissional" },
];

export default async function EstudanteAvaliacoes() {
  const session = await getServerSession(authOptions);
  const studentId = session?.user?.studentId;

  if (!studentId) {
    return <p className="text-slate-400 text-center py-12">Perfil não encontrado.</p>;
  }

  const avaliacoes = await prisma.evaluation.findMany({
    where: { contract: { studentId } },
    include: { contract: { include: { company: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Minhas Avaliações</h1>

      {avaliacoes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-slate-600 font-semibold">Nenhuma avaliação ainda.</p>
          <p className="text-slate-400 text-sm mt-1">
            As avaliações feitas pela empresa aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {avaliacoes.map(aval => {
            const respostas = (aval.respostas as Record<string,number>) || {};
            const vals = Object.values(respostas);
            const media = vals.length > 0
              ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20)
              : 0;

            return (
              <Card key={aval.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-base font-black text-slate-800">
                      {aval.contract.company.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {aval.createdAt ? new Date(aval.createdAt).toLocaleDateString("pt-BR", { dateStyle: "long" }) : "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-[#0f2a5e]">{media}</p>
                    <p className="text-xs text-slate-400">de 100 pts</p>
                  </div>
                </div>

                {Object.keys(respostas).length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {CRITERIOS.map(crit => {
                      const nota = respostas[crit.key] || 0;
                      return (
                        <div key={crit.key} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 font-bold mb-1">{crit.label}</p>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className={`flex-1 h-2 rounded-full ${n <= nota ? "bg-[#0f2a5e]" : "bg-slate-200"}`}/>
                            ))}
                            <span className="text-xs font-bold ml-1.5 text-slate-600">{nota}/5</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {aval.observacoes && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-bold text-blue-700 mb-1">💬 Feedback da empresa</p>
                    <p className="text-sm text-slate-700 italic">"{aval.observacoes}"</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
