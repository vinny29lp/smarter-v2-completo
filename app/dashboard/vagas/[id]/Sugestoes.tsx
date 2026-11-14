import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { rankear } from "@/lib/matching/matching";

/** #7 — Estudantes disponíveis que mais combinam com a vaga (matching por curso, cidade, DISC, semestre e perfil). */
export async function Sugestoes({ vagaId }: { vagaId: string }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(role || "")) return null;

  const vaga = await prisma.vacancy.findUnique({
    where: { id: vagaId },
    select: { franchiseId: true, cursoRequerido: true, area: true, titulo: true, cidade: true, uf: true, discDesejado: true, requisitos: true, applications: { select: { studentId: true } } },
  });
  if (!vaga) return null;
  if ((role === "FRANQUEADO" || role === "FUNCIONARIO") && vaga.franchiseId !== session.user.franchiseId) return null;

  const inscritos = new Set(vaga.applications.map(a => a.studentId));
  const estudantes = await prisma.student.findMany({
    where: { franchiseId: vaga.franchiseId, status: "DISPONIVEL" },
    select: { id: true, name: true, curso: true, cidade: true, uf: true, semestre: true, periodo: true, discResult: true, habilidades: true, celular: true, curriculo: true },
    take: 500,
  });
  const top = rankear(estudantes.filter(e => !inscritos.has(e.id)), vaga, 40).slice(0, 5);

  return (
    <Card className="p-4 mb-6">
      <p className="text-sm font-bold text-slate-700">🎯 Candidatos sugeridos pela Lia</p>
      <p className="text-xs text-slate-400 mb-3">Estudantes disponíveis da unidade que ainda não se inscreveram. A Lia também os convida por e-mail automaticamente quando a vaga tem poucos candidatos.</p>
      {top.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum estudante disponível com aderência suficiente no momento.</p>
      ) : (
        <ul className="divide-y">
          {top.map(t => (
            <li key={t.estudante.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{t.estudante.name}</p>
                <p className="text-xs text-slate-500">{t.estudante.curso || "Curso não informado"} · {t.motivos.slice(0, 3).join(" · ") || "Aderência parcial"}</p>
              </div>
              <span className="text-sm font-black text-emerald-600">{t.score}%</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
