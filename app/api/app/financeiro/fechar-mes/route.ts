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
import { gerarCobrancasGestaoMensal, previewCobrancaGestao } from "@/lib/financeiro/cobrancaGestaoMensal";

export async function GET() {
  try {
    // GET: retorna preview dos dois fechamentos, sem criar registros.
    // Campos no nível raiz (preview/totalGeral) continuam sendo só da
    // Franquia — não mexe no formato que o front já lê. `gestao` é um
    // campo novo, adicionado ao lado, com o preview da Taxa de Gestão.
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const [franquia, gestao] = await Promise.all([previewFechamento(), previewCobrancaGestao()]);
    return NextResponse.json({ preview: franquia.preview, totalGeral: franquia.totalGeral, gestao });
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

    // Os dois fechamentos são independentes — um falhar não impede o outro.
    // Campos no nível raiz continuam sendo o resultado da Franquia (mesmo
    // formato de sempre); `gestao` é o resultado novo da Taxa de Gestão.
    const resultado = await fecharMes(force);
    const gestao = await gerarCobrancasGestaoMensal(force);

    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error, gestao }, { status: resultado.status });
    }

    return NextResponse.json({ ...resultado, gestao });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_FECHAR_POST");
  }
}
