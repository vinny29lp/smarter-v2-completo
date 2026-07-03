/**
 * POST /api/app/financeiro/fechar-mes
 * Calcula e gera cobranças mensais para cada franqueado:
 *   - R$200 mensalidade (se cobrarMensalidade = true)
 *   - R$13 por contrato ATIVO (ativado até o dia 23 do mês)
 * Só disponível no dia 23+ do mês (ou com ?force=true para testes)
 *
 * ⚡ ESC-001: loop sequencial substituído por processamento paralelo em batches de 10.
 * Garante que o endpoint não estoure o timeout de 30s da Vercel com 100+ franqueados.
 *
 * Lógica compartilhada com o cron em app/api/cron/fechar-mes/route.ts —
 * ver lib/financeiro/fechar-mes.ts
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { fecharMes, previewFechamento } from "@/lib/financeiro/fechar-mes";

export async function GET() {
  try {
    // GET: retorna preview do fechamento sem criar registros
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { preview, totalGeral } = await previewFechamento();
    return NextResponse.json({ preview, totalGeral });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_FECHAR_GET");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const resultado = await fecharMes(force);
    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }

    return NextResponse.json(resultado);
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_FECHAR_POST");
  }
}
