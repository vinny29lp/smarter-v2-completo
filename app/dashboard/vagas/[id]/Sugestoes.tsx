import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { rankear } from "@/lib/matching/matching";
import { linkWhatsApp } from "@/lib/crm/contatoHumano";
import { canaisDivulgacao, proximoPassoVaga, textoDivulgacao } from "@/lib/vagas/recrutamento";
import Link from "next/link";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

/** #7 — Estudantes disponíveis que mais combinam com a vaga (matching por curso, cidade, DISC, semestre e perfil). */
export async function Sugestoes({ vagaId }: { vagaId: string }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(role || "")) return null;

  const vaga = await prisma.vacancy.findUnique({
    where: { id: vagaId },
    select: { franchiseId: true, cursoRequerido: true, area: true, titulo: true, cidade: true, uf: true, discDesejado: true, requisitos: true, bolsa: true, publicSlug: true, status: true, company: { select: { name: true } }, applications: { select: { studentId: true, etapa: true } } },
  });
  if (!vaga) return null;
  if ((role === "FRANQUEADO" || role === "FUNCIONARIO") && vaga.franchiseId !== session.user.franchiseId) return null;

  const inscritos = new Set(vaga.applications.map(a => a.studentId));
  const estudantes = await prisma.student.findMany({
    where: { franchiseId: vaga.franchiseId, status: "DISPONIVEL" },
    select: { id: true, name: true, curso: true, cidade: true, uf: true, semestre: true, periodo: true, discResult: true, habilidades: true, celular: true, curriculo: true },
    take: 500,
  });
  const top = rankear(estudantes.filter(e => !inscritos.has(e.id)), vaga, 40).slice(0, 8);
  const linkVaga = vaga.publicSlug ? `${APP_URL}/vaga/${vaga.publicSlug}` : `${APP_URL}/vagas`;
  const passo = proximoPassoVaga(vaga.applications.length);
  const divulgacao = textoDivulgacao({ titulo: vaga.titulo, empresa: vaga.company?.name, cidade: vaga.cidade, bolsa: vaga.bolsa, curso: vaga.cursoRequerido, link: linkVaga });
  const canais = canaisDivulgacao({ titulo: vaga.titulo, cidade: vaga.cidade, uf: vaga.uf });
  const msgAluno = (nome: string) => `Olá, ${nome.split(" ")[0]}! Surgiu uma vaga de estágio que combina com o seu perfil: ${vaga.titulo}${vaga.cidade ? " em " + vaga.cidade : ""}${vaga.bolsa ? ", bolsa R$ " + Number(vaga.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}. Você tem interesse? Veja os detalhes e se candidate: ${linkVaga}`;

  return (
    <>
    {vaga.status === "ABERTA" && (
      <Card className={`p-4 mb-4 border-2 ${passo.id === "agendar" ? "border-green-300 bg-green-50" : "border-[#f5c400] bg-amber-50"}`}>
        <p className="text-xs font-bold tracking-wide text-[#0f2a5e]">LIA · PRÓXIMO PASSO DA VAGA</p>
        <p className="text-sm font-semibold text-slate-800 mt-1">{passo.texto}</p>
        {passo.id === "agendar" && <Link href="/dashboard/processos" className="mt-3 inline-block rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white">Marcar processo seletivo →</Link>}
      </Card>
    )}
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
              <div className="flex items-center gap-2">
                {linkWhatsApp(t.estudante.celular, msgAluno(t.estudante.name || "")) && (
                  <a href={linkWhatsApp(t.estudante.celular, msgAluno(t.estudante.name || ""))!} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">💬 WhatsApp</a>
                )}
                <span className="text-sm font-black text-emerald-600">{t.score}%</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
    {vaga.status === "ABERTA" && vaga.applications.length < 3 && (
      <Card className="p-4 mb-6">
        <p className="text-sm font-bold text-slate-700">📣 Onde divulgar esta vaga</p>
        <p className="text-xs text-slate-400 mb-3">Poucos candidatos ainda. Copie o texto abaixo e publique nos canais — cada candidato novo já cai no processo seletivo.</p>
        <textarea readOnly value={divulgacao} className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700" rows={3} />
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {canais.map(c => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <a href={c.href} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0f2a5e] hover:underline">{c.rotulo} ↗</a>
              <p className="text-xs text-slate-500 mt-0.5">{c.dica}</p>
            </li>
          ))}
        </ul>
      </Card>
    )}
    </>
  );
}
