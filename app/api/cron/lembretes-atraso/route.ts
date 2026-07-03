/**
 * GET /api/cron/lembretes-atraso
 * Cron diário — envia lembretes de atraso para unidades com boleto vencido.
 *
 * Regras:
 *  - Dia 3 de atraso: primeiro lembrete
 *  - Dia 5, 7, 9... (a cada 2 dias após o dia 3): novos lembretes
 *
 * Configurado em vercel.json: "0 8 * * *" (08h00 BRT = 11h00 UTC)
 */
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FROM_FINANCEIRO = "Smarter Estágios <financeiro@smarterestagios.com.br>";

function fmt(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function lembreteHtml(
  nomeFranquia: string,
  descricao: string,
  valor: number,
  vencStr: string,
  diasAtraso: number,
  linkBoleto?: string | null,
  chavePix?: string | null,
): string {
  const cor = diasAtraso >= 10 ? "#991b1b" : "#dc2626";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
.wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:${cor};padding:20px 32px;text-align:center}
.ht{color:white;font-weight:900;font-size:18px}
.body{padding:32px}
.title{font-size:22px;font-weight:900;color:${cor};margin-bottom:8px}
.divider{height:3px;background:${cor};border-radius:2px;margin:16px 0}
.box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0}
.label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}
.value{font-size:15px;font-weight:600;color:#1e293b}
.pix-box{background:#f0fdf4;border:2px solid #10b981;border-radius:12px;padding:16px;margin:16px 0}
.pix-key{font-family:monospace;font-size:13px;color:#065f46;word-break:break-all;background:#d1fae5;padding:8px 12px;border-radius:6px;display:block;margin-top:6px}
.footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="wrap">
  <div class="header"><div class="ht">⚠️ Smarter Estágios — Cobrança em Atraso</div></div>
  <div class="body">
    <div class="title">Pagamento Pendente — ${diasAtraso} dias em atraso</div>
    <div class="divider"></div>
    <p style="color:#475569;margin-bottom:16px">Olá, <strong>${nomeFranquia}</strong>! Identificamos uma cobrança em aberto há <strong style="color:${cor}">${diasAtraso} dias</strong>. Por favor, regularize o pagamento.</p>
    <div class="box">
      <div class="label">Referência</div><div class="value">${descricao}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div><div class="label">Valor</div><div class="value" style="color:${cor};font-size:20px;font-weight:900">${fmt(valor)}</div></div>
        <div><div class="label">Vencimento</div><div class="value">${vencStr}</div></div>
      </div>
    </div>
    ${linkBoleto ? `<div style="margin:16px 0;padding:16px;background:#eff6ff;border:2px solid #3b82f6;border-radius:12px"><p style="font-weight:700;color:#1e40af;margin:0 0 8px">📄 Boleto Bancário</p><a href="${linkBoleto}" style="color:#1d4ed8;font-weight:700;word-break:break-all">Clique aqui para pagar o boleto</a></div>` : ""}
    ${chavePix ? `<div class="pix-box"><p style="font-weight:700;color:#065f46;margin:0 0 4px">💳 Pagamento via PIX</p><span class="pix-key">${chavePix}</span></div>` : ""}
    <p style="color:#64748b;font-size:13px;margin-top:16px">A regularização evita a suspensão dos serviços da sua unidade. Em caso de dúvidas, entre em contato: <strong>financeiro@smarterestagios.com.br</strong></p>
  </div>
  <div class="footer">Smarter Estágios — Sistema de Gestão de Estágios<br>Este é um aviso automático.</div>
</div></body></html>`;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Busca lançamentos PENDENTES com boleto Cora emitido e vencidos
  const vencidos: any[] = await (prisma.financial as any).findMany({
    where: {
      status: "PENDENTE",
      cancelado: false,
      coraInvoiceId: { not: null },
      vencimentoAt: { lt: hoje },
    },
    include: { franchise: true },
  });

  let enviados = 0;
  let pulados = 0;
  let erros = 0;

  for (const l of vencidos) {
    const franchise = l.franchise;
    if (!franchise?.email) { pulados++; continue; }

    const vencDt = new Date(l.vencimentoAt);
    vencDt.setHours(0, 0, 0, 0);
    const diasAtraso = Math.round((hoje.getTime() - vencDt.getTime()) / 86400000);

    // Enviar no dia 3 e depois a cada 2 dias (5, 7, 9...)
    const shouldSend = diasAtraso === 3 || (diasAtraso > 3 && (diasAtraso - 3) % 2 === 0);
    if (!shouldSend) { pulados++; continue; }

    const vencStr = vencDt.toLocaleDateString("pt-BR");
    const html = lembreteHtml(
      franchise.name,
      l.descricao,
      l.valor,
      vencStr,
      diasAtraso,
      l.linkPagamento,
      l.chavePix,
    );

    try {
      const ok = await sendMail(
        franchise.email,
        `⚠️ Cobrança em atraso (${diasAtraso} dias) — Smarter Estágios`,
        html,
        undefined,
        FROM_FINANCEIRO,
      );
      if (ok) {
        enviados++;
        // Loga o lembrete enviado
        await prisma.financialSendLog.create({
          data: {
            financialId: l.id,
            emailEnviado: franchise.email,
            enviadoPor: "cron/lembretes-atraso",
            status: "lembrete_atraso",
            mensagem: `Lembrete automático — ${diasAtraso} dias em atraso`,
          },
        });
      } else {
        erros++;
      }
    } catch {
      erros++;
    }
  }

  return NextResponse.json({
    ok: true,
    vencidos: vencidos.length,
    enviados,
    pulados,
    erros,
  });
}
