/**
 * diagnostico-mes-preso.ts
 *
 * Somente leitura. Lista franquias em que o mês anterior ao mês corrente
 * foi ABERTO mas nunca FECHADO — essa é a condição que hoje bloqueia a
 * abertura do mês atual no backend (/api/app/mes/abrir) mas que a tela
 * de fechamento (/dashboard/mes/fechar) não expõe, pois só opera sobre
 * o mês corrente. Essas unidades ficam sem caminho de saída pela UI.
 *
 * Execução: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/diagnostico-mes-preso.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function mesAnteriorDe(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano };
}

async function main() {
  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const { mes: mesAnt, ano: anoAnt } = mesAnteriorDe(mes, ano);

  console.log(`Mês corrente: ${mes}/${ano} — mês anterior avaliado: ${mesAnt}/${anoAnt}\n`);

  const franquias = await prisma.franchise.findMany({
    select: { id: true, name: true },
  });

  const presas: { franquia: string; id: string; abriuAnteriorEm: Date; abriuAtual: boolean }[] = [];

  for (const f of franquias) {
    const aberturaAnterior = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId: f.id, mes: mesAnt, ano: anoAnt } },
      include: { fechamento: true },
    });
    if (!aberturaAnterior || aberturaAnterior.fechamento) continue;

    const aberturaAtual = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId: f.id, mes, ano } },
    });

    presas.push({
      franquia: f.name,
      id: f.id,
      abriuAnteriorEm: aberturaAnterior.criadoEm,
      abriuAtual: !!aberturaAtual,
    });
  }

  console.log(`Total de franquias: ${franquias.length}`);
  console.log(`Franquias com mês anterior (${mesAnt}/${anoAnt}) ABERTO e NÃO FECHADO: ${presas.length}\n`);

  for (const p of presas) {
    console.log(
      `- ${p.franquia} (${p.id}) — abriu ${mesAnt}/${anoAnt} em ${p.abriuAnteriorEm.toISOString().slice(0, 10)} | já abriu ${mes}/${ano}? ${p.abriuAtual ? "SIM (inconsistente, ver abaixo)" : "NÃO — bloqueada sem caminho de saída na UI atual"}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
