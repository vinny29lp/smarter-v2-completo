/**
 * /api/app/mes/fechar
 *
 * GET  → prévia do fechamento (números calculados em tempo real, nada é salvo).
 *        Usado no Passo 1 do wizard de fechamento (resumo rápido).
 * POST → executa o fechamento em 2 etapas via `etapa` no body:
 *   - "financeiro": recebe a reconciliação de contas (pagos/atrasados),
 *     calcula e salva os números reais do mês + score.
 *   - "confirmar-leitura": marca a leitura do relatório como confirmada,
 *     concluindo o fechamento.
 *
 * Aceita `mes`/`ano` opcionais (query string no GET, body no POST) para
 * permitir fechar um mês PASSADO pendente — não só o mês corrente. Sem isso,
 * uma unidade que abriu um mês e nunca fechou fica sem nenhuma rota capaz de
 * fechá-lo assim que o mês vira (o mês corrente muda e esta rota, hardcoded
 * em mesAtual(), passa a apontar para o mês novo).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { logAudit, getClientIP } from "@/lib/audit";
import { mesAtual } from "@/lib/mes/status";
import { calcularMetricasMes } from "@/lib/mes/metrics";
import { calcularScore } from "@/lib/mes/score";

export const dynamic = "force-dynamic";

function getFranchiseIdOrFail(session: any) {
  const franchiseId = session?.user?.franchiseId;
  if (!franchiseId || session.user.role === "FRANQUEADORA") return null;
  return franchiseId as string;
}

function resolverMesAno(mesParam: string | null, anoParam: string | null) {
  const padrao = mesAtual();
  const mes = mesParam ? parseInt(mesParam) : padrao.mes;
  const ano = anoParam ? parseInt(anoParam) : padrao.ano;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano)) return null;
  return { mes, ano };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const franchiseId = getFranchiseIdOrFail(session);
    if (!franchiseId) {
      return NextResponse.json({ error: "Este recurso é exclusivo de unidades franqueadas." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const alvo = resolverMesAno(searchParams.get("mes"), searchParams.get("ano"));
    if (!alvo) return NextResponse.json({ error: "mes/ano inválidos." }, { status: 400 });
    const { mes, ano } = alvo;
    const abertura = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
      include: { fechamento: true },
    });
    if (!abertura) {
      return NextResponse.json({ error: "Abra o mês antes de fechá-lo." }, { status: 409 });
    }

    const metricas = await calcularMetricasMes(franchiseId, mes, ano);
    const abriuNoPrazo = abertura.criadoEm.getDate() <= 5;
    const score = calcularScore({
      empresas: metricas.empresasCadastradas,
      metaEmpresas: abertura.metaEmpresas ?? 10,
      leads: metricas.leadsNoMes,
      metaLeads: abertura.metaLeads ?? 10,
      contratos: metricas.contratosFirmados,
      metaContratos: abertura.metaContratos ?? 10,
      horas: metricas.horasNoSistema,
      abriuNoPrazo,
    });

    return NextResponse.json({ abertura, fechamento: abertura.fechamento, metricas, score });
  } catch (e) {
    return handleApiError(e, "MES_FECHAR_GET");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const franchiseId = getFranchiseIdOrFail(session);
    if (!franchiseId) {
      return NextResponse.json({ error: "Este recurso é exclusivo de unidades franqueadas." }, { status: 403 });
    }

    const body = await req.json();
    const etapa = body.etapa;

    const alvo = resolverMesAno(body.mes != null ? String(body.mes) : null, body.ano != null ? String(body.ano) : null);
    if (!alvo) return NextResponse.json({ error: "mes/ano inválidos." }, { status: 400 });
    const { mes, ano } = alvo;
    const abertura = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
      include: { fechamento: true },
    });
    if (!abertura) {
      return NextResponse.json({ error: "Abra o mês antes de fechá-lo." }, { status: 409 });
    }

    if (etapa === "financeiro") {
      // Antes de aceitar mes/ano arbitrários, esta rota só alcançava o mês corrente —
      // uma vez virado o mês, o fechamento ficava naturalmente imutável por aqui. Agora
      // que qualquer mês passado pendente pode ser fechado, é preciso a mesma trava
      // explícita: um fechamento já confirmado (leituraConfirmada) não pode ser reaberto
      // e sobrescrito silenciosamente.
      if (abertura.fechamento?.leituraConfirmada) {
        return NextResponse.json(
          { error: "Este mês já foi fechado e confirmado — não pode ser reaberto." },
          { status: 409 }
        );
      }

      const pagos: string[] = Array.isArray(body.pagos) ? body.pagos : [];
      const atrasados: string[] = Array.isArray(body.atrasados) ? body.atrasados : [];

      // Marca como PAGO apenas lançamentos que pertencem a esta unidade
      if (pagos.length > 0) {
        await prisma.financial.updateMany({
          where: { id: { in: pagos }, franchiseId },
          data: { status: "PAGO", paidAt: new Date() },
        });
      }

      const [itensPagos, itensAtrasados] = await Promise.all([
        pagos.length > 0
          ? prisma.financial.findMany({ where: { id: { in: pagos }, franchiseId }, select: { id: true, descricao: true, valor: true, tipo: true } })
          : [],
        atrasados.length > 0
          ? prisma.financial.findMany({ where: { id: { in: atrasados }, franchiseId }, select: { id: true, descricao: true, valor: true, tipo: true, vencimentoAt: true } })
          : [],
      ]);

      const metricas = await calcularMetricasMes(franchiseId, mes, ano);
      const abriuNoPrazo = abertura.criadoEm.getDate() <= 5;
      const score = calcularScore({
        empresas: metricas.empresasCadastradas,
        metaEmpresas: abertura.metaEmpresas ?? 10,
        leads: metricas.leadsNoMes,
        metaLeads: abertura.metaLeads ?? 10,
        contratos: metricas.contratosFirmados,
        metaContratos: abertura.metaContratos ?? 10,
        horas: metricas.horasNoSistema,
        abriuNoPrazo,
      });

      const dataFechamento = {
        franchiseId,
        mes,
        ano,
        criadoPor: session.user.id,
        ...metricas,
        score,
        contasConfirmadas: true,
        contasJson: { pagos: itensPagos, atrasados: itensAtrasados },
      };

      const fechamento = await prisma.monthClosing.upsert({
        where: { openingId: abertura.id },
        create: { openingId: abertura.id, ...dataFechamento },
        update: dataFechamento,
      });

      logAudit({
        userId: session.user.id,
        role: session.user.role || "",
        franchiseId,
        acao: "MES_FECHAMENTO_FINANCEIRO",
        modulo: "mes",
        detalhes: `fechamento:${fechamento.id} | mes:${mes}/${ano} | score:${score}`,
        ip: getClientIP(req),
      });

      return NextResponse.json({ fechamento });
    }

    if (etapa === "confirmar-leitura") {
      if (!abertura.fechamento || !abertura.fechamento.contasConfirmadas) {
        return NextResponse.json({ error: "Conclua a reconciliação financeira antes de confirmar a leitura." }, { status: 409 });
      }

      const fechamento = await prisma.monthClosing.update({
        where: { openingId: abertura.id },
        data: { leituraConfirmada: true, leituraConfirmadaEm: new Date() },
      });

      logAudit({
        userId: session.user.id,
        role: session.user.role || "",
        franchiseId,
        acao: "MES_FECHADO",
        modulo: "mes",
        detalhes: `fechamento:${fechamento.id} | mes:${mes}/${ano}`,
        ip: getClientIP(req),
      });

      return NextResponse.json({ fechamento });
    }

    return NextResponse.json({ error: "Etapa inválida. Use 'financeiro' ou 'confirmar-leitura'." }, { status: 400 });
  } catch (e) {
    return handleApiError(e, "MES_FECHAR_POST");
  }
}
