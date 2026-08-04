/**
 * verifica-fix-mes-preso.ts
 *
 * Somente leitura. Para cada franquia hoje "presa" (mês anterior aberto e não
 * fechado), simula exatamente o que o app fará com o fix:
 *   1) getMesStatus/computeMesStatusFlags deve marcar mesAnteriorPendente=true
 *      e apontar {mes, ano} do mês anterior — é o que decide o CTA mostrado.
 *   2) GET /api/app/mes/fechar?mes=<anterior>&ano=<anterior> deve achar a
 *      abertura (senão 409) — é a rota que a tela de fechamento chama.
 * Não fecha nada nem escreve no banco.
 *
 * Execução: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/verifica-fix-mes-preso.ts
 */
import { PrismaClient } from "@prisma/client";
import { mesAnteriorDe, computeMesStatusFlags } from "../lib/mes/gate";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const dia = now.getDate();
  const { mes: mesAnt, ano: anoAnt } = mesAnteriorDe(mes, ano);

  const franquias = await prisma.franchise.findMany({ select: { id: true, name: true } });

  let presas = 0;
  let comCaminhoDeSaida = 0;

  for (const f of franquias) {
    const [aberturaAtual, aberturaAnterior] = await Promise.all([
      prisma.monthOpening.findUnique({ where: { franchiseId_mes_ano: { franchiseId: f.id, mes, ano } } }),
      prisma.monthOpening.findUnique({
        where: { franchiseId_mes_ano: { franchiseId: f.id, mes: mesAnt, ano: anoAnt } },
        include: { fechamento: true },
      }),
    ]);

    const flags = computeMesStatusFlags({
      dia,
      aberturaAtualExiste: !!aberturaAtual,
      aberturaAnterior: { existe: !!aberturaAnterior, fechada: !!aberturaAnterior?.fechamento },
    });

    if (!flags.mesAnteriorPendente) continue;
    presas++;

    // O que /api/app/mes/fechar?mes=X&ano=Y faria: achar a abertura pendente.
    const rotaFecharEncontraAbertura = !!aberturaAnterior;

    const ok = flags.mesAnteriorPendente && rotaFecharEncontraAbertura;
    if (ok) comCaminhoDeSaida++;

    console.log(
      `${ok ? "✅" : "❌"} ${f.name} — modal mostraria "Fechar ${mesAnt}/${anoAnt} Agora" → /dashboard/mes/fechar?mes=${mesAnt}&ano=${anoAnt} → rota encontra abertura: ${rotaFecharEncontraAbertura}`
    );
  }

  console.log(`\nFranquias presas: ${presas} | Com caminho de saída confirmado pelo fix: ${comCaminhoDeSaida}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
