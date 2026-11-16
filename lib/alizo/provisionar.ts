/**
 * Conecta cada franquia à sua unidade na Alizo SEM passo manual:
 *  1) já mapeada → nada a fazer;
 *  2) procura na Alizo uma unidade que já exista para a franquia (external_id, nome ou cidade) e grava o mapeamento;
 *  3) se não existir e ALIZO_CRIAR_UNIDADE_ATIVO=true, pede a criação (POST /units, conforme o pedido
 *     docs/pedido-alizo-unidades-whatsapp.md). Enquanto a Alizo não expuser esse endpoint, devolve "aguardando".
 * Sem chave configurada → no-op. Nunca lança: quem chama decide o que fazer com o resultado.
 */
import { prisma } from "@/lib/prisma";
import { criarAlizoClient, AlizoError } from "./client";
import { casarUnidade } from "./provisionarRegras";

export type ResultadoProvisao =
  | { ok: true; estado: "ja_mapeada" | "mapeada" | "criada"; alizoUnitId: string }
  | { ok: false; estado: "alizo_nao_configurado" | "aguardando_alizo" | "erro"; detalhe?: string };

export async function provisionarAlizoDaFranquia(franchiseId: string): Promise<ResultadoProvisao> {
  const ja = await prisma.alizoUnidade.findUnique({ where: { franchiseKey: franchiseId } });
  if (ja) return { ok: true, estado: "ja_mapeada", alizoUnitId: ja.alizoUnitId };

  const client = criarAlizoClient();
  if (!client) return { ok: false, estado: "alizo_nao_configurado" };
  const f = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { id: true, name: true, cidade: true, uf: true, email: true } });
  if (!f) return { ok: false, estado: "erro", detalhe: "franquia_nao_encontrada" };

  try {
    const { units } = await client.units();
    const jaUsadas = new Set((await prisma.alizoUnidade.findMany({ select: { alizoUnitId: true } })).map(m => m.alizoUnitId));
    const achada = casarUnidade(f, units.filter(u => !jaUsadas.has(u.id)));
    if (achada) {
      await prisma.alizoUnidade.create({ data: { franchiseKey: f.id, alizoUnitId: achada.id, nome: achada.name } });
      return { ok: true, estado: "mapeada", alizoUnitId: achada.id };
    }
    if (process.env.ALIZO_CRIAR_UNIDADE_ATIVO === "true") {
      const r = await client.criarUnidade({ external_id: f.id, name: f.name, city: f.cidade, state: f.uf, timezone: "America/Sao_Paulo", contact_email: f.email });
      await prisma.alizoUnidade.create({ data: { franchiseKey: f.id, alizoUnitId: r.unit.id, nome: r.unit.name || f.name } });
      return { ok: true, estado: "criada", alizoUnitId: r.unit.id };
    }
    return { ok: false, estado: "aguardando_alizo" };
  } catch (e: any) {
    // 404/405 = a Alizo ainda não tem o endpoint de criação: segue "aguardando", sem alarde.
    if (e instanceof AlizoError && (e.status === 404 || e.status === 405)) return { ok: false, estado: "aguardando_alizo" };
    console.error("[alizo-provisionar] falhou:", e?.status, e?.message);
    return { ok: false, estado: "erro", detalhe: e?.message };
  }
}

/** Passa por todas as franquias ativas sem mapeamento (cron). Teto por execução para não estourar a API. */
export async function provisionarFranquiasPendentes(max = 10) {
  const mapeadas = new Set((await prisma.alizoUnidade.findMany({ select: { franchiseKey: true } })).map(m => m.franchiseKey));
  const todas = await prisma.franchise.findMany({ where: { status: "ATIVO" }, select: { id: true }, orderBy: { createdAt: "desc" } });
  const resumo = { mapeadas: 0, aguardando: 0, erros: 0 };
  for (const f of todas.filter(x => !mapeadas.has(x.id)).slice(0, max)) {
    const r = await provisionarAlizoDaFranquia(f.id);
    if (r.ok) resumo.mapeadas++; else if (r.estado === "erro") resumo.erros++; else resumo.aguardando++;
  }
  return resumo;
}
