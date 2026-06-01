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
            const respostas = (aval.respostas as Record<string, unknown>) || {};
            // Calcula média apenas com as notas numéricas dos critérios
            const notasNumericas = CRITERIOS.map(c => Number(respostas[c.key]) || 0);
            const media = notasNumericas.length > 0
              ? Math.round((notasNumericas.reduce((a, b) => a + b, 0) / notasNumericas.length) * 20)
              : 0;

            const pontosFortes   = respostas.pontosFortes   as string | undefined;
            const pontosMelhoria = respostas.pontosMelhoria as string | undefined;
            const parecerFinal   = respostas.parecerFinal   as string | undefined;
            const recomendacao   = respostas.recomendacao   as string | undefined;

            const recomCor =
              recomendacao === "Encerrar" ? "bg-red-50 border-red-200 text-red-700" :
              recomendacao === "Renovar"  ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                           "bg-blue-50 border-blue-200 text-blue-700";

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

                {/* Notas por critério */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {CRITERIOS.map(crit => {
                    const nota = Number(respostas[crit.key]) || 0;
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

                {/* Campos de feedback textual */}
                {(pontosFortes || pontosMelhoria || parecerFinal) && (
                  <div className="space-y-3 mb-4">
                    {pontosFortes && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 mb-1">✅ Pontos Fortes</p>
                        <p className="text-sm text-slate-700">{pontosFortes}</p>
                      </div>
                    )}
                    {pontosMelhoria && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-700 mb-1">💡 Pontos de Melhoria</p>
                        <p className="text-sm text-slate-700">{pontosMelhoria}</p>
                      </div>
                    )}
                    {parecerFinal && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-600 mb-1">📋 Parecer Final do Supervisor</p>
                        <p className="text-sm text-slate-700 italic">"{parecerFinal}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Recomendação */}
                {recomendacao && (
                  <div className={`p-3 border rounded-xl mb-3 ${recomCor}`}>
                    <p className="text-xs font-bold">
                      {recomendacao === "Encerrar" ? "❌" : recomendacao === "Renovar" ? "🔄" : "✅"} Recomendação: {recomendacao}
                    </p>
                  </div>
                )}

                {/* Observações adicionais */}
                {aval.observacoes && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-bold text-blue-700 mb-1">💬 Observações Adicionais</p>
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
