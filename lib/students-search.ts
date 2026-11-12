import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { padraoLikeSemAcento, variantesCpf } from "@/lib/text";

/**
 * Filtro de busca de estudante por texto livre — nome (ignorando acento e
 * caixa), e-mail e CPF (com ou sem pontuação).
 *
 * Bugs reais que isso corrige: a busca por "Ana Julia" não achava
 * "Ana Júlia" (o contains do Prisma só ignora caixa, não acento) e a busca
 * por "135.253.756-70" não achava o CPF gravado como "13525375670".
 * O Postgres do projeto não tem a extensão unaccent, então o nome é casado
 * via translate() — sem precisar de migração.
 */
export async function filtroBuscaEstudante(q: string): Promise<Prisma.StudentWhereInput> {
  const termo = (q || "").trim();
  const ou: Prisma.StudentWhereInput[] = [
    { name: { contains: termo, mode: "insensitive" } },
    { email: { contains: termo, mode: "insensitive" } },
  ];
  for (const v of variantesCpf(termo)) ou.push({ cpf: { contains: v } });

  const padrao = padraoLikeSemAcento(termo);
  const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM students
    WHERE translate(lower(regexp_replace(name, '\\s+', ' ', 'g')),
                    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')
          LIKE ${padrao} ESCAPE '\\'
    LIMIT 500`);
  if (ids.length > 0) ou.push({ id: { in: ids.map(r => r.id) } });

  return { OR: ou };
}
