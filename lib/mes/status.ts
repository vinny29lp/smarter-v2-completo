/**
 * status.ts — Status de abertura/fechamento do mês corrente para uma unidade.
 * Usado por app/api/app/mes/status e por app/dashboard/mes/page.tsx (RSC).
 */
import { prisma } from "@/lib/prisma";

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

  const abertura = await prisma.monthOpening.findUnique({
    where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
    include: { fechamento: true },
  });

  const fechamento = abertura?.fechamento ?? null;
  const deveAbrir = !abertura;
  const bloqueado = dia >= 5 && !abertura;
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
  };
}
