import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenAvaliacaoValido } from "@/lib/automacao/token";

export const dynamic = "force-dynamic";

const CRITERIOS = ["pontualidade", "produtividade", "iniciativa", "comunicacao", "aprendizado", "postura"];
const RECOMENDACOES = ["Manter", "Renovar", "Encerrar"];
const INVALIDO = () => NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });

async function carregar(id: string, t: string) {
  if (!id || !t || !tokenAvaliacaoValido(id, t)) return null;
  const c = await prisma.contract.findUnique({
    where: { id },
    select: {
      id: true, status: true, dataInicio: true, dataFim: true,
      student: { select: { name: true, curso: true } },
      company: { select: { name: true } },
      evaluations: { where: { status: "respondido" }, select: { respondidoAt: true }, orderBy: { respondidoAt: "desc" }, take: 1 },
    },
  });
  if (!c || c.status !== "ATIVO") return null;
  return c;
}

/** Dados mínimos do estágio para a empresa preencher a avaliação sem login. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const c = await carregar(sp.get("c") || "", sp.get("t") || "");
  if (!c) return INVALIDO();
  const ultima = c.evaluations[0]?.respondidoAt;
  const recente = !!ultima && Date.now() - ultima.getTime() < 20 * 86_400_000;
  return NextResponse.json({
    aluno: c.student.name, curso: c.student.curso, empresa: c.company.name,
    inicio: c.dataInicio, fim: c.dataFim, jaRespondida: recente,
  });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const c = b ? await carregar(String(b.c || ""), String(b.t || "")) : null;
  if (!b || !c) return INVALIDO();

  const ultima = c.evaluations[0]?.respondidoAt;
  if (ultima && Date.now() - ultima.getTime() < 20 * 86_400_000) {
    return NextResponse.json({ error: "A avaliação deste estagiário já foi enviada recentemente. Obrigado!" }, { status: 409 });
  }

  const notas: Record<string, number> = {};
  for (const k of CRITERIOS) {
    const n = Number(b.notas?.[k]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return NextResponse.json({ error: "Informe uma nota de 1 a 5 em cada critério." }, { status: 400 });
    notas[k] = n;
  }
  const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const pontosFortes = txt(b.pontosFortes, 2000), pontosMelhoria = txt(b.pontosMelhoria, 2000), parecerFinal = txt(b.parecerFinal, 3000);
  if (!pontosFortes || !pontosMelhoria || !parecerFinal) return NextResponse.json({ error: "Preencha pontos fortes, pontos de melhoria e parecer final." }, { status: 400 });
  const recomendacao = RECOMENDACOES.includes(b.recomendacao) ? b.recomendacao : "Manter";

  await prisma.evaluation.create({
    data: {
      contractId: c.id, tipo: "semestral", status: "respondido", respondidoAt: new Date(),
      respostas: { ...notas, pontosFortes, pontosMelhoria, parecerFinal, recomendacao },
      observacoes: txt(b.observacoes, 2000) || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
