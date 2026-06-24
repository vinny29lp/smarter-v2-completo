/**
 * POST /api/app/financeiro/gerar-cobranca-cora
 * Cria lançamento de Franquia + gera boleto/PIX na Cora + envia email.
 * Apenas FRANQUEADORA.
 *
 * Body: { franchiseId, valor, descricao, vencimento (YYYY-MM-DD) }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarBoleto } from "@/lib/cora/boleto";
import { enviarCobranca } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { franchiseId, valor, descricao, vencimento } = body;

    if (!franchiseId || !valor || !descricao || !vencimento) {
      return NextResponse.json({ error: "franchiseId, valor, descricao e vencimento são obrigatórios." }, { status: 400 });
    }

    const franchise = await prisma.franchise.findUnique({
      where: { id: franchiseId },
    });

    if (!franchise) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
    }

    const documento = (franchise as any).cnpj || (franchise as any).cpf;
    if (!documento) {
      return NextResponse.json({
        error: "CNPJ/CPF da unidade não cadastrado. Cadastre o CNPJ antes de gerar boleto.",
      }, { status: 400 });
    }

    const valorNum = parseFloat(String(valor));
    const vencDate = new Date(vencimento + "T12:00:00");

    // 1. Cria o lançamento financeiro
    const lancamento = await (prisma.financial as any).create({
      data: {
        descricao: String(descricao).slice(0, 500),
        tipo: "entrada",
        valor: valorNum,
        categoria: "Franquia",
        status: "PENDENTE",
        recorrente: false,
        vencimentoAt: vencDate,
        franchiseId: franchiseId,
      },
    });

    // 2. Gera boleto + PIX na Cora
    const invoice = await gerarBoleto({
      financialId: lancamento.id,
      nomeCliente: (franchise as any).razaoSocial || franchise.name,
      documento,
      tipoDocumento: (franchise as any).cnpj ? "CNPJ" : "CPF",
      email: franchise.email,
      telefone: (franchise as any).telefone || undefined,
      cep: (franchise as any).cep || undefined,
      endereco: (franchise as any).endereco || undefined,
      cidade: (franchise as any).cidade,
      uf: (franchise as any).uf,
      valor: valorNum,
      descricao: String(descricao),
      vencimento,
    });

    // 3. Salva dados do boleto no lançamento
    await (prisma.financial as any).update({
      where: { id: lancamento.id },
      data: {
        coraInvoiceId: invoice.id,
        linkPagamento: invoice.bank_slip?.url || null,
        chavePix: invoice.pix?.qr_code || null,
      },
    });

    // 4. Envia email para a unidade
    let emailOk = false;
    if (franchise.email) {
      try {
        emailOk = await enviarCobranca({
          email: franchise.email,
          nomeEmpresa: franchise.name,
          descricao: String(descricao),
          valor: valorNum,
          vencimento: vencDate.toISOString(),
          linkBoleto: invoice.bank_slip?.url,
          chavePix: invoice.pix?.qr_code,
          qrCodePixUrl: invoice.pix?.qr_code_image || invoice.pix?.qr_code_url,
        });
      } catch (emailErr) {
        console.error("[gerar-cobranca-cora] Erro email:", emailErr);
      }
    }

    // 5. Log
    await prisma.financialSendLog.create({
      data: {
        financialId: lancamento.id,
        emailEnviado: franchise.email || "",
        enviadoPor: session.user.name || session.user.email || "sistema",
        status: emailOk ? "enviado" : "boleto_gerado_sem_email",
        mensagem: `Cobrança criada + Boleto Cora (ID: ${invoice.id})`,
      },
    });

    return NextResponse.json({
      ok: true,
      lancamentoId: lancamento.id,
      invoiceId: invoice.id,
      boletoUrl: invoice.bank_slip?.url,
      digitableLine: invoice.bank_slip?.digitable_line,
      pixQrCode: invoice.pix?.qr_code,
      emailEnviado: emailOk,
    });
  } catch (e: any) {
    console.error("[gerar-cobranca-cora]", e);
    const msg = e?.body?.message || e?.message || "Erro ao gerar cobrança.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
