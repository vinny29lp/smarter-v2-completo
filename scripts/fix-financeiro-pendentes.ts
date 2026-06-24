/**
 * fix-financeiro-pendentes.ts
 * 
 * Corrige dados históricos: cancela lançamentos financeiros vinculados
 * a contratos que ainda estão PENDENTE ou AGUARDANDO_ASSINATURA.
 * 
 * Regra de negócio: cobrança só é gerada quando o contrato fica ATIVO.
 * 
 * Execução: npx ts-node -e "require('./scripts/fix-financeiro-pendentes.ts')"
 * OU: via Prisma Client direto em /api/app/admin/fix-financeiro-pendentes
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Buscando contratos PENDENTE/AGUARDANDO com lançamentos financeiros...");

  // Buscar todos os lançamentos financeiros de contratos não-ATIVO
  const lancamentosIndevidos = await prisma.financial.findMany({
    where: {
      cancelado: false,
      status: "PENDENTE",
      contract: {
        status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] },
      },
    },
    include: {
      contract: { select: { id: true, numero: true, status: true } },
    },
  });

  console.log(`📋 Encontrados ${lancamentosIndevidos.length} lançamentos indevidos.`);

  if (lancamentosIndevidos.length === 0) {
    console.log("✅ Nenhum lançamento para corrigir.");
    return;
  }

  // Cancelar todos os lançamentos indevidos
  for (const l of lancamentosIndevidos) {
    console.log(`  ❌ Cancelando lançamento ${l.id} (R$${l.valor}) — contrato ${l.contract?.numero} [${l.contract?.status}]`);
    await prisma.financial.update({
      where: { id: l.id },
      data: {
        cancelado: true,
        descricao: l.descricao + " [CANCELADO — contrato não ativado]",
      },
    });
  }

  console.log(`\n✅ ${lancamentosIndevidos.length} lançamentos cancelados com sucesso.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
