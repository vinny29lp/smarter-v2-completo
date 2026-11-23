import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Franquia Smarter Estágios | Seu material", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MaterialFranquia({ params }: { params: { token: string } }) {
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { id: true, nomeCompleto: true, situacao: true, contratoDocId: true, apresentacaoAbertaEm: true } });
  if (!lead || lead.situacao === "perdido") notFound();
  await prisma.franquiaLead.update({
    where: { id: lead.id },
    data: { visualizacoes: { increment: 1 }, ...(lead.apresentacaoAbertaEm ? {} : { apresentacaoAbertaEm: new Date() }) },
  }).catch(() => {});
  const temCof = (process.env.FRANQUIA_COF_URL || "").startsWith("https://");
  const nome = lead.nomeCompleto.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#f0f4f8] font-sans">
      <section className="bg-gradient-to-br from-[#0f2a5e] to-[#1d4a9a] text-white">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <p className="text-sm font-bold uppercase tracking-widest text-[#f5c400]">Franquia Smarter Estágios</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-black">Olá, {nome}! Este é o seu material.</h1>
          <p className="mt-3 text-white/80">Tudo o que você precisa para decidir com segurança está nesta página: a apresentação do negócio e a Circular de Oferta de Franquia (COF).</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-5 py-8 space-y-4">
        <Passo n={1} titulo="Veja a apresentação" texto="Entenda o modelo, a equipe de funcionários digitais e como é a primeira semana da unidade." href="/franquia" rotulo="Abrir a apresentação" />
        {temCof
          ? <Passo n={2} titulo="Leia a COF" texto="A Circular de Oferta de Franquia traz as informações que a lei exige. Leia com calma: ela deve ser entregue com pelo menos 10 dias de antecedência da assinatura do contrato." href={`/api/public/franquia/cof/${params.token}`} rotulo="Baixar a COF" />
          : <div className="rounded-2xl bg-white p-5 border border-slate-200"><p className="font-black text-[#0f2a5e]">2. COF</p><p className="mt-1 text-sm text-slate-600">O seu consultor enviará a COF por e-mail.</p></div>}
        {!lead.contratoDocId
          ? <Passo n={3} titulo="Quero avançar: cadastro de fechamento" texto="Preencha seus dados e os da unidade. Com eles a Smarter prepara o contrato de franquia para assinatura eletrônica." href={`/franquia/cadastro/${params.token}`} rotulo="Preencher cadastro" destaque />
          : <div className="rounded-2xl bg-green-50 p-5 border border-green-200 text-sm text-green-800">✅ Seu contrato já foi enviado para assinatura. Confira o seu e-mail.</div>}
      </div>
    </main>
  );
}

function Passo({ n, titulo, texto, href, rotulo, destaque }: { n: number; titulo: string; texto: string; href: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200">
      <p className="font-black text-[#0f2a5e]">{n}. {titulo}</p>
      <p className="mt-1 text-sm text-slate-600">{texto}</p>
      <a href={href} className={`mt-3 inline-block rounded-xl px-5 py-2.5 text-sm font-black ${destaque ? "bg-[#f5c400] text-[#0f2a5e]" : "bg-[#0f2a5e] text-white"}`}>{rotulo}</a>
    </div>
  );
}
