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

    // Persiste os dados do boleto no lançamento
    await (prisma.financial as any).update({
      where: { id: params.id },
      data: {
        coraInvoiceId: invoice.id,
        linkPagamento: invoice.bank_slip?.url || null,
        chavePix: invoice.pix?.qr_code || null,
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
        linkBoleto: invoice.bank_slip?.url,
        chavePix: invoice.pix?.qr_code,
        qrCodePixUrl: invoice.pix?.qr_code_image || invoice.pix?.qr_code_url,
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
      boletoUrl: invoice.bank_slip?.url,
      digitableLine: invoice.bank_slip?.digitable_line,
      pixQrCode: invoice.pix?.qr_code,
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
