/**
 * Sincronização das franquias da Smarter com as unidades da Alizo (sem passo manual).
 * Vínculo por external_id (id permanente da franquia) — nunca por nome. Falha da Alizo grava
 * alizoSyncStatus = pending/error e permite reprocessar; nunca impede criar/editar a franquia.
 * Sem chave configurada → no-op.
 */
import { prisma } from "@/lib/prisma";
import { criarAlizoClient, AlizoError, mensagemAmigavel } from "./client";
import { sincronizarFranquiaCore, backfillCore, type RepoAlizo, type ResultadoSync } from "./unidadesCore";
import { erroSeguro } from "./unidadesRegras";

const repo: RepoAlizo = {
  getFranquia: async id => (await prisma.franchise.findUnique({
    where: { id },
    select: { id: true, name: true, responsavel: true, email: true, telefone: true, whatsapp: true, endereco: true, cep: true, cidade: true, uf: true, status: true, acessoBloqueado: true },
  })) as any,
  getMapa: async key => prisma.alizoUnidade.findUnique({ where: { franchiseKey: key }, select: { alizoUnitId: true } }),
  quemUsaUnidade: async u => (await prisma.alizoUnidade.findFirst({ where: { alizoUnitId: u }, select: { franchiseKey: true } }))?.franchiseKey ?? null,
  salvarMapa: async (key, unitId, nome) => { await prisma.alizoUnidade.upsert({ where: { franchiseKey: key }, create: { franchiseKey: key, alizoUnitId: unitId, nome }, update: {} }); },
  marcar: async (id, d) => {
    await prisma.franchise.update({
      where: { id },
      data: {
        alizoSyncStatus: d.status, alizoLastError: d.erro,
        ...(d.status === "synced" ? { alizoSyncedAt: new Date() } : {}),
        ...(d.templateVersion !== undefined ? { alizoTemplateVersion: d.templateVersion } : {}),
      },
    });
  },
};

export type ResultadoProvisao = ResultadoSync | { ok: false; classe: "nao_configurado"; mensagem: string; auth: false };

/** Cria/vincula/atualiza a unidade da franquia na Alizo. Nunca lança. */
export async function sincronizarFranquiaAlizo(franchiseId: string): Promise<ResultadoProvisao> {
  const client = criarAlizoClient();
  if (!client) return { ok: false, classe: "nao_configurado", mensagem: "Integração com a Alizo não configurada.", auth: false };
  try {
    return await sincronizarFranquiaCore({ repo, client }, franchiseId);
  } catch (e: any) {
    console.error("[alizo-sync-franquia] falhou:", e?.status, String(e?.message || "").slice(0, 120));
    return { ok: false, classe: "desconhecido", mensagem: erroSeguro(e?.status ?? 0, e?.message), auth: false };
  }
}
export const provisionarAlizoDaFranquia = sincronizarFranquiaAlizo;

/** Cron: franquias ativas ainda pendentes (nunca sincronizadas ou com falha temporária). */
export async function provisionarFranquiasPendentes(max = 10) {
  const pend = await prisma.franchise.findMany({ where: { status: "ATIVO", alizoSyncStatus: "pending" }, select: { id: true }, orderBy: { createdAt: "desc" }, take: max });
  const resumo = { mapeadas: 0, aguardando: 0, erros: 0 };
  for (const f of pend) {
    const r = await sincronizarFranquiaAlizo(f.id);
    if (r.ok) resumo.mapeadas++; else if (r.classe === "temporario" || r.classe === "nao_configurado") resumo.aguardando++; else resumo.erros++;
    if (!r.ok && r.auth) break;
  }
  return resumo;
}

/** Backfill de TODAS as franquias (idempotente); relatório sem dados sensíveis. */
export async function backfillAlizo(max = 50, excluirIds: string[] = []) {
  const client = criarAlizoClient();
  if (!client) return { ok: false as const, motivo: "alizo_nao_configurado" };
  const fora = new Set(excluirIds);
  const ids = (await prisma.franchise.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } })).map(f => f.id).filter(id => !fora.has(id));
  return { ok: true as const, total: ids.length, ...(await backfillCore({ repo, client }, ids, max)) };
}

/** Verifica se o vínculo salvo bate com o que a Alizo conhece pelo external_id. */
export async function verificarVinculoAlizo(franchiseId: string) {
  const client = criarAlizoClient();
  if (!client) return { ok: false as const, motivo: "alizo_nao_configurado" };
  const mapa = await prisma.alizoUnidade.findUnique({ where: { franchiseKey: franchiseId } });
  try {
    const r = await client.unidadePorExternalId(franchiseId);
    const remota = r.units.find(u => !u.external_id || u.external_id === franchiseId);
    return { ok: true as const, vinculoLocal: !!mapa, existeNaAlizo: !!remota, confere: !!mapa && !!remota && mapa.alizoUnitId === remota.id };
  } catch (e) { return { ok: false as const, motivo: mensagemAmigavel(e) }; }
}

/** Reaplica o modelo padrão da rede à unidade (POST /units/{id}/template/sync). */
export async function reaplicarModeloAlizo(franchiseId: string) {
  const client = criarAlizoClient();
  const mapa = await prisma.alizoUnidade.findUnique({ where: { franchiseKey: franchiseId } });
  if (!client || !mapa) return { ok: false as const, motivo: !client ? "alizo_nao_configurado" : "unidade_sem_vinculo" };
  try {
    const r: any = await client.sincronizarModeloUnidade(mapa.alizoUnitId);
    const versao = r?.template_version ?? r?.unit?.template_version ?? null;
    if (versao) await prisma.franchise.update({ where: { id: franchiseId }, data: { alizoTemplateVersion: String(versao) } });
    return { ok: true as const, versao };
  } catch (e) { return { ok: false as const, motivo: mensagemAmigavel(e), auth: e instanceof AlizoError && e.ehAutenticacao }; }
}
