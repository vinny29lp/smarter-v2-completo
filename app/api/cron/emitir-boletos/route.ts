/**
 * GET /api/cron/emitir-boletos
 * Cron mensal (dia 2) — emite automaticamente o boleto Cora das cobranças de
 * Franquia do mês corrente que ainda não têm boleto, e envia por e-mail à unidade.
 *
 * Fluxo de cobrança recorrente:
 *   dia 23 (cron fechar-mes)  → gera as cobranças da competência do mês seguinte
 *   dia 2  (este cron)        → emite boleto Cora + envia e-mail para a unidade
 *   diário (verificar-boletos-cora) → dá baixa automática nos boletos pagos
 *   diário (lembretes-atraso) → lembrete a cada 5 dias após o vencimento
 *
 * ⚠️ Não altera a integração Cora: apenas REUSA gerarBoleto() de lib/cora/boleto
 * (mesmo padrão da rota manual /api/app/financeiro/[id]/gerar-boleto).
 *
 * ?dryRun=true → apenas lista o que seria feito, sem gerar boleto nem enviar e-mail.
 *
 * Configurado em vercel.json: "0 11 2 * *" (dia 2, 11h UTC = 08h BRT)
 */
import { prisma } from "@/lib/prisma";
import { gerarBoleto } from "@/lib/cora/boleto";
import { enviarCobranca } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Aceita chamada via cron (sem auth) OU via FRANQUEADORA autenticada
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";

  // Competência do mês corrente (vencimentos são meia-noite UTC — usar mês UTC)
  const agora = new Date();
  const compAtual = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}`;
  const inicioMesUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  const fimMesUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1));

  // Cobranças de Franquia do mês corrente ainda sem boleto
  const pendentes: any[] = await (prisma.financial as any).findMany({
    where: {
      categoria: "Franquia",
      status: "PENDENTE",
      cancelado: { not: true },
      coraInvoiceId: null,
      franchiseId: { not: null },
      OR: [
        { competencia: compAtual },
        { competencia: null, vencimentoAt: { gte: inicioMesUTC, lt: fimMesUTC } },
      ],
    },
    include: { franchise: true },
  });

  const results: any[] = [];
  let emitidos = 0;
  let pulados = 0;
  let erros = 0;

  // Sequencial de propósito: poucas unidades, e evita rate limit na Cora
  for (const l of pendentes) {
    const franchise = l.franchise;
    const base = { lancamentoId: l.id, franquia: franchise?.name, valor: l.valor };

    const documento = franchise?.cnpj || franchise?.cpf;
    if (!franchise || !documento) {
      pulados++;
      results.push({ ...base, skipped: true, reason: "Unidade sem CNPJ/CPF cadastrado" });
      continue;
    }

    const vencimento = l.vencimentoAt
      ? new Date(l.vencimentoAt).toISOString().split("T")[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (dryRun) {
      emitidos++;
      results.push({ ...base, dryRun: true, vencimento, email: franchise.email || null });
      continue;
    }

    try {
      // Mesmo padrão da rota manual [id]/gerar-boleto — integração Cora intocada
      const invoice = await gerarBoleto({
        financialId: l.id,
        nomeCliente: franchise.razaoSocial || franchise.name,
        documento,
        tipoDocumento: franchise.cnpj ? "CNPJ" : "CPF",
        email: franchise.email,
        telefone: franchise.telefone || undefined,
        cep: franchise.cep || undefined,
        endereco: franchise.endereco || undefined,
        cidade: franchise.cidade,
        uf: franchise.uf,
        valor: l.valor,
        descricao: l.descricao,
        vencimento,
      });

      const boletoUrl = invoice.payment_options?.bank_slip?.url || null;
      const chavePix = invoice.pix?.emv || null;

      await (prisma.financial as any).update({
        where: { id: l.id },
        data: { coraInvoiceId: invoice.id, linkPagamento: boletoUrl, chavePix },
      });

      let emailOk = false;
      if (franchise.email) {
        try {
          emailOk = await enviarCobranca({
            email: franchise.email,
            nomeEmpresa: franchise.name,
            descricao: l.descricao,
            valor: l.valor,
            vencimento: l.vencimentoAt ? new Date(l.vencimentoAt).toISOString() : undefined,
            linkBoleto: boletoUrl || undefined,
            chavePix: chavePix || undefined,
          });
        } catch (emailErr) {
          console.error("[emitir-boletos] Erro email:", emailErr);
        }
      }

      await prisma.financialSendLog.create({
        data: {
          financialId: l.id,
          emailEnviado: franchise.email || "",
          enviadoPor: "cron/emitir-boletos",
          status: emailOk ? "enviado" : "boleto_gerado_sem_email",
          mensagem: `Boleto Cora emitido automaticamente (ID: ${invoice.id})`,
        },
      });

      emitidos++;
      results.push({ ...base, invoiceId: invoice.id, emailEnviado: emailOk });
      console.log(`[emitir-boletos] ✅ ${franchise.name} — R$${l.valor} — invoice ${invoice.id}`);
    } catch (e: any) {
      erros++;
      const msg = e?.body?.message || e?.message || "Erro ao gerar boleto";
      results.push({ ...base, error: msg });
      console.error(`[emitir-boletos] ❌ ${franchise.name}:`, msg);
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    competencia: compAtual,
    encontrados: pendentes.length,
    emitidos,
    pulados,
    erros,
    results,
  });
}
