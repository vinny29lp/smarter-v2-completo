import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Manual de Implantação | Smarter Estágios", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PASSOS: { t: string; d: string }[] = [
  { t: "Entre no sistema", d: "Use o e-mail e a senha temporária que você recebeu. Troque a senha no primeiro acesso." },
  { t: "Faça o treinamento inicial", d: "Ao entrar, o sistema leva você ao treinamento da Universidade Smarter: equipe digital (Lia, Victor, Recrutador e Felipe), operação da unidade e a rota dos 30 contratos." },
  { t: "Passe no quiz: 8 acertos em 10", d: "O sistema só é liberado após a aprovação. Se não passar, revise o conteúdo e tente de novo com novas perguntas." },
  { t: "Conclua o assistente da Lia", d: "Confira os dados da unidade, a região de atuação, faça o tour das telas e abra o mês de operação." },
  { t: "Defina sua rotina semanal", d: "Comece todo dia pela tela Hoje. Trate os avisos de contato humano do Victor no mesmo dia." },
  { t: "Visite pelo menos 10 empresas por semana", d: "Apresente a Smarter, deixe a proposta e envie o link de levantamento de perfil no mesmo dia." },
  { t: "Rumo aos 30 contratos", d: "Esse é o objetivo inicial da sua unidade. Acompanhe o seu ritmo e peça apoio à Matriz sempre que precisar." },
];

export default async function Manual({ params }: { params: { token: string } }) {
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { nomeCompleto: true, contratoAssinadoEm: true } });
  if (!lead || !lead.contratoAssinadoEm) notFound();
  return (
    <main className="min-h-screen bg-[#f0f4f8] p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-[#0f2a5e] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5c400]">Manual de Implantação</p>
          <h1 className="mt-1 text-2xl font-black">Bem-vindo(a), {lead.nomeCompleto.split(" ")[0]}!</h1>
          <p className="mt-2 text-sm text-white/80">Siga estes passos, na ordem, para colocar a sua unidade para funcionar.</p>
        </div>
        {PASSOS.map((p, i) => (
          <div key={i} className="rounded-xl bg-white p-4 border border-slate-200 flex gap-3">
            <span className="h-8 w-8 shrink-0 rounded-full bg-[#f5c400] text-[#0f2a5e] font-black flex items-center justify-center">{i + 1}</span>
            <div><p className="font-bold text-slate-800">{p.t}</p><p className="mt-1 text-sm text-slate-600">{p.d}</p></div>
          </div>
        ))}
        <a href={`/api/public/franquia/contrato/${params.token}`} className="block rounded-xl bg-white border border-slate-300 py-3 text-center font-bold text-[#0f2a5e]">📄 Baixar meu contrato de franquia (PDF)</a>
        <a href="/login" className="block rounded-xl bg-[#0f2a5e] py-3 text-center font-black text-white">Entrar no sistema</a>
      </div>
    </main>
  );
}
