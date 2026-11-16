import { prisma } from "@/lib/prisma";

export const soDigitosCnpj = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Procura empresa com o mesmo CNPJ ignorando pontuação (com/sem máscara é a mesma empresa). */
export async function empresaComCnpj(digitos: string, ignorarId?: string): Promise<{ id: string; name: string; franchiseId: string | null; origem: string | null } | null> {
  if (digitos.length !== 14) return null;
  const r = await prisma.$queryRaw<{ id: string; name: string; franchiseId: string | null; origem: string | null }[]>`
    SELECT id, name, "franchiseId", origem FROM companies
    WHERE regexp_replace(cnpj, '[^0-9]', '', 'g') = ${digitos} AND (${ignorarId ?? null}::text IS NULL OR id <> ${ignorarId ?? null}::text)
    LIMIT 1`;
  return r[0] ?? null;
}

export function mensagemCnpjDuplicado(e: { name: string; franchiseId: string | null; origem: string | null }, franchiseSessao?: string | null): string {
  const daUnidade = e.franchiseId && e.franchiseId === franchiseSessao;
  if (daUnidade) return `Este CNPJ já está cadastrado na sua unidade como "${e.name}". Procure na lista de empresas.`;
  if (e.origem === "MIGRADO" && !e.franchiseId) return `Este CNPJ já existe como empresa migrada do sistema antigo ("${e.name}"), visível na lista de empresas. Use esse cadastro; se precisar editá-lo, peça à Franqueadora.`;
  return `Este CNPJ já está cadastrado em outra unidade ("${e.name}"). Fale com a Franqueadora.`;
}
