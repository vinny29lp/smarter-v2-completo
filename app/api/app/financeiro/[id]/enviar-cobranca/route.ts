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
      include: { company: true, franchise: true },
    });

    if (!lancamento) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

    // Email de destino: body → empresa → franqueado (para cobranças de franquia)
    const email = emailDestino
      || lancamento.company?.emailFinanceiro
      || lancamento.company?.email
      || lancamento.franchise?.email;

    if (!email) {
      return NextResponse.json({ error: "Nenhum email de cobrança configurado." }, { status: 400 });
    }

    // Nome do destinatário
    const nomeDestino = lancamento.company?.name || lancamento.franchise?.name || "Cliente";

    // PIX: usa o do lançamento, senão busca da config do remetente
    let chavePix     = lancamento.chavePix     || body.chavePix     || undefined;
    let instrucao    = lancamento.instrucaoPagamento || body.instrucaoPagamento || undefined;
    let linkBoleto   = lancamento.linkPagamento || body.linkPagamento || undefined;
    let qrCodePixUrl = body.qrCodePixUrl || undefined;

    // Se não veio na request, busca da config do remetente
    if (!chavePix || !qrCodePixUrl) {
      const isFranqueadora = session.user.role === "FRANQUEADORA";
      if (isFranqueadora) {
        const cfg = await prisma.systemConfig.findUnique({
          where: { id: "default" },
          select: { chavePix: true, instrucaoPagamento: true, linkPagamento: true, qrCodePixUrl: true },
        });
        if (cfg) {
          if (!chavePix)     chavePix     = cfg.chavePix     || undefined;
          if (!instrucao)    instrucao    = cfg.instrucaoPagamento || undefined;
          if (!linkBoleto)   linkBoleto   = cfg.linkPagamento || undefined;
          if (!qrCodePixUrl) qrCodePixUrl = cfg.qrCodePixUrl || undefined;
        }
      } else if (session.user.franchiseId) {
        const fr = await prisma.franchise.findUnique({
          where: { id: session.user.franchiseId },
          select: { chavePix: true, instrucaoPagamento: true, linkPagamento: true },
        });
        if (fr) {
          if (!chavePix)   chavePix   = fr.chavePix   || undefined;
          if (!instrucao)  instrucao  = fr.instrucaoPagamento || undefined;
          if (!linkBoleto) linkBoleto = fr.linkPagamento || undefined;
        }
      }
    }

    const enviado = await enviarCobranca({
      email,
      nomeEmpresa: nomeDestino,
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      vencimento: lancamento.vencimentoAt?.toISOString(),
      chavePix,
      instrucao,
      linkBoleto,
      qrCodePixUrl,
      mensagemPersonalizada,
    });

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
