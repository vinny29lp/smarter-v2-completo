/**
 * status.ts — Status de abertura/fechamento do mês corrente para uma unidade.
 * Usado por app/api/app/mes/status e por app/dashboard/mes/page.tsx (RSC).
 */
import { prisma } from "@/lib/prisma";
import { mesAnteriorDe, computeMesStatusFlags } from "@/lib/mes/gate";

export function mesAtual() {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function ultimoDiaDoMes(): boolean {
  const now = new Date();
  const amanha = new Date(now);
  amanha.setDate(now.getDate() + 1);
  return amanha.getMonth() !== now.getMonth();
}

export async function getMesStatus(franchiseId: string) {
  const { mes, ano } = mesAtual();
  const dia = new Date().getDate();
  const mesAnterior = mesAnteriorDe(mes, ano);

  const [abertura, aberturaAnterior] = await Promise.all([
    prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
      include: { fechamento: true },
    }),
    prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes: mesAnterior.mes, ano: mesAnterior.ano } },
      include: { fechamento: true },
    }),
  ]);

  const fechamento = abertura?.fechamento ?? null;
  const { deveAbrir, bloqueado, mesAnteriorPendente } = computeMesStatusFlags({
    dia,
    aberturaAtualExiste: !!abertura,
    aberturaAnterior: { existe: !!aberturaAnterior, fechada: !!aberturaAnterior?.fechamento },
  });
  const deveFecha = ultimoDiaDoMes() && !!abertura && !fechamento;
  const diasParaBloquear = Math.max(0, 5 - dia);

  return {
    mesAtual: { mes, ano },
    dia,
    abertura,
    fechamento,
    deveAbrir,
    bloqueado,
    deveFecha,
    diasParaBloquear,
    mesAnteriorPendente,
    mesAnterior: mesAnteriorPendente ? mesAnterior : null,
  };
}
