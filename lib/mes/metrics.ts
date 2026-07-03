/**
 * metrics.ts — Calcula os números reais do mês para uma unidade.
 * Usado tanto na prévia (GET /api/app/mes/fechar) quanto no fechamento
 * definitivo (POST /api/app/mes/fechar, etapa "financeiro").
 */
import { prisma } from "@/lib/prisma";

export function periodoMes(mes: number, ano: number) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  return { inicio, fim };
}

export interface MetricasMes {
  empresasCadastradas: number;
  estudantesCadastrados: number;
  iesCadastradas: number;
  leadsNoMes: number;
  contratosFirmados: number;
  estagiariosAtivos: number;
  horasNoSistema: number;
}

export async function calcularMetricasMes(franchiseId: string, mes: number, ano: number): Promise<MetricasMes> {
  const { inicio, fim } = periodoMes(mes, ano);
  const createdAtNoMes = { gte: inicio, lt: fim };

  const [
    empresasCadastradas,
    estudantesCadastrados,
    iesCadastradas,
    leadsNoMes,
    contratosFirmados,
    estagiariosAtivos,
    sessoesNoMes,
  ] = await Promise.all([
    prisma.company.count({ where: { franchiseId, createdAt: createdAtNoMes } }),
    prisma.student.count({ where: { franchiseId, createdAt: createdAtNoMes } }),
    prisma.institution.count({ where: { franchiseId, createdAt: createdAtNoMes } }),
    prisma.crmLead.count({ where: { franchiseId, createdAt: createdAtNoMes } }),
    prisma.contract.count({ where: { franchiseId, createdAt: createdAtNoMes } }),
    prisma.contract.count({ where: { franchiseId, status: "ATIVO" } }),
    prisma.userSessionLog.findMany({
      where: { franchiseId, inicio: createdAtNoMes, duracaoMin: { not: null } },
      select: { duracaoMin: true },
    }),
  ]);

  const horasNoSistema = sessoesNoMes.reduce((total, s) => total + (s.duracaoMin || 0), 0) / 60;

  return {
    empresasCadastradas,
    estudantesCadastrados,
    iesCadastradas,
    leadsNoMes,
    contratosFirmados,
    estagiariosAtivos,
    horasNoSistema,
  };
}
