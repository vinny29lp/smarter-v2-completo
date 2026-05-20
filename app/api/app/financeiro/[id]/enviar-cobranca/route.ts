import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarCobranca } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { emailDestino, mensagemPersonalizada } = body;

    const lancamento = await prisma.financial.findUnique({
      where: { id: params.id },
      include: { company: true },
    });

    if (!lancamento) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

    // Determinar email de destino
    const email = emailDestino
      || lancamento.company?.emailFinanceiro
      || lancamento.company?.email;

    if (!email) {
      return NextResponse.json({ error: "Nenhum email de cobrança configurado para esta empresa." }, { status: 400 });
    }

    const enviado = await enviarCobranca({
      email,
      nomeEmpresa: lancamento.company?.name || "Empresa",
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      vencimento: lancamento.vencimentoAt?.toISOString(),
      chavePix: lancamento.chavePix || undefined,
      instrucao: lancamento.instrucaoPagamento || undefined,
      linkBoleto: lancamento.linkPagamento || undefined,
      mensagemPersonalizada,
    });

    // Salvar log de envio
    await prisma.financialSendLog.create({
      data: {
        financialId: params.id,
        emailEnviado: email,
        enviadoPor: session.user.name || session.user.email || undefined,
        status: enviado ? "enviado" : "falhou",
        mensagem: mensagemPersonalizada || null,
      },
    });

    if (!enviado) {
      return NextResponse.json({ error: "Falha ao enviar email. Verifique as configurações SMTP." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, emailEnviado: email });
  } catch (e: any) {
    console.error("[enviar-cobranca]", e);
    return NextResponse.json({ error: e.message || "Erro interno." }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.financialSendLog.findMany({
    where: { financialId: params.id },
    orderBy: { enviadoAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ logs });
}
