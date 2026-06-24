/**
 * POST /api/app/financeiro/[id]/gerar-boleto
 * Gera boleto + PIX via Cora e envia email para a unidade.
 * Apenas FRANQUEADORA.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarBoleto, cancelarBoleto } from "@/lib/cora/boleto";
import { enviarCobranca } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const lancamento = await (prisma.financial as any).findUnique({
      where: { id: params.id },
      include: { franchise: true },
    });

    if (!lancamento) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    if (lancamento.coraInvoiceId) {
      return NextResponse.json({ error: "Boleto já gerado para este lançamento." }, { status: 400 });
    }

    if (lancamento.status === "PAGO" || lancamento.cancelado) {
      return NextResponse.json({ error: "Lançamento já pago ou cancelado." }, { status: 400 });
    }

    const franchise = lancamento.franchise;
    if (!franchise) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 400 });
    }

    const documento = franchise.cnpj || franchise.cpf;
    if (!documento) {
      return NextResponse.json({
        error: "CNPJ/CPF da unidade não cadastrado. Acesse o cadastro da unidade e preencha o CNPJ antes de gerar o boleto.",
      }, { status: 400 });
    }

    const vencimento = lancamento.vencimentoAt
      ? lancamento.vencimentoAt.toISOString().split("T")[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    // Gera boleto + PIX na Cora
    const invoice = await gerarBoleto({
      financialId: params.id,
      nomeCliente: franchise.razaoSocial || franchise.name,
      documento,
      tipoDocumento: franchise.cnpj ? "CNPJ" : "CPF",
      email: franchise.email,
      telefone: franchise.telefone || undefined,
      cep: franchise.cep || undefined,
      endereco: franchise.endereco || undefined,
      cidade: franchise.cidade,
      uf: franchise.uf,
      valor: lancamento.valor,
      descricao: lancamento.descricao,
      vencimento,
    });

    const boletoUrl = invoice.payment_options?.bank_slip?.url || null;
    const digitableLine = invoice.payment_options?.bank_slip?.digitable || null;
    const chavePix = invoice.pix?.emv || null;

    // Persiste os dados do boleto no lançamento
    await (prisma.financial as any).update({
      where: { id: params.id },
      data: {
        coraInvoiceId: invoice.id,
        linkPagamento: boletoUrl,
        chavePix,
      },
    });

    // Envia email para a unidade com boleto + PIX
    const emailDestino = franchise.email;
    let emailOk = false;
    try {
      emailOk = await enviarCobranca({
        email: emailDestino,
        nomeEmpresa: franchise.name,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        vencimento: lancamento.vencimentoAt?.toISOString(),
        linkBoleto: boletoUrl || undefined,
        chavePix: chavePix || undefined,
      });
    } catch (emailErr) {
      console.error("[gerar-boleto] Erro email:", emailErr);
    }

    await prisma.financialSendLog.create({
      data: {
        financialId: params.id,
        emailEnviado: emailDestino,
        enviadoPor: session.user.name || session.user.email || "sistema",
        status: emailOk ? "enviado" : "boleto_gerado_sem_email",
        mensagem: `Boleto Cora gerado (ID: ${invoice.id})`,
      },
    });

    return NextResponse.json({
      ok: true,
      invoiceId: invoice.id,
      boletoUrl,
      digitableLine,
      pixQrCode: chavePix,
      emailEnviado: emailOk,
    });
  } catch (e: any) {
    console.error("[gerar-boleto]", e);
    const msg = (e as any)?.body?.message || e?.message || "Erro ao gerar boleto.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: retorna situação atual do boleto consultando a Cora
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const lancamento = await (prisma.financial as any).findUnique({ where: { id: params.id } });
  if (!lancamento) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (!lancamento.coraInvoiceId) {
    return NextResponse.json({ hasInvoice: false });
  }

  try {
    const { consultarBoleto } = await import("@/lib/cora/boleto");
    const invoice = await consultarBoleto(lancamento.coraInvoiceId);

    // Se a Cora retornar PAID e o lançamento ainda estiver PENDENTE, dá baixa automática
    if (invoice.status === "PAID" && lancamento.status !== "PAGO") {
      await (prisma.financial as any).update({
        where: { id: lancamento.id },
        data: { status: "PAGO", paidAt: new Date() },
      });
      console.log("[gerar-boleto] Baixa automática por consulta Cora:", lancamento.id);
    }

    return NextResponse.json({ hasInvoice: true, invoice });
  } catch (e: any) {
    return NextResponse.json({ hasInvoice: true, coraInvoiceId: lancamento.coraInvoiceId, error: e.message });
  }
}

// DELETE: cancela boleto na Cora
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const lancamento = await (prisma.financial as any).findUnique({ where: { id: params.id } });
  if (!lancamento?.coraInvoiceId) {
    return NextResponse.json({ error: "Sem boleto ativo." }, { status: 400 });
  }

  try {
    await cancelarBoleto(lancamento.coraInvoiceId);
    await (prisma.financial as any).update({
      where: { id: params.id },
      data: { coraInvoiceId: null, linkPagamento: null, chavePix: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
