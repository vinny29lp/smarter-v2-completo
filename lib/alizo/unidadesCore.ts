/**
 * Núcleo (sem banco/sem "@/") da sincronização franquia ⇄ unidade Alizo. Recebe repositório e cliente por injeção,
 * o que permite testar tudo com fakes. Regras: vínculo SEMPRE por external_id (id permanente da franquia),
 * nunca por nome; criação idempotente; desativar nunca apaga; falha da Alizo nunca derruba a Smarter.
 */
import { AlizoError } from "./client";
import { payloadUnidade, franquiaDeveOperar, classificarErro, statusAposErro, erroSeguro, type FranquiaParaAlizo, type ClasseErro } from "./unidadesRegras";

/** A Alizo devolve `is_active` e `template_version` numérico; aceitamos as duas grafias e sempre guardamos texto. */
export function lerAtiva(u: any): boolean | undefined {
  const v = u?.is_active ?? u?.active;
  return typeof v === "boolean" ? v : undefined;
}
export function lerVersao(v: unknown): string | null {
  return v === null || v === undefined || v === "" ? null : String(v);
}

export interface FranquiaRow extends FranquiaParaAlizo { status?: string | null; acessoBloqueado?: boolean | null }
export interface RepoAlizo {
  getFranquia(id: string): Promise<FranquiaRow | null>;
  getMapa(franchiseKey: string): Promise<{ alizoUnitId: string } | null>;
  quemUsaUnidade(alizoUnitId: string): Promise<string | null>;
  salvarMapa(franchiseKey: string, alizoUnitId: string, nome: string): Promise<void>;
  /** Remove um vínculo local que aponta para unidade inexistente na Alizo (404). */
  apagarMapa(franchiseKey: string): Promise<void>;
  marcar(id: string, d: { status: "pending" | "synced" | "error" | "disabled"; erro: string | null; templateVersion?: string | null }): Promise<void>;
}
export interface ClienteUnidades {
  unidadePorExternalId(externalId: string): Promise<{ units: Array<{ id: string; name?: string; active?: boolean; is_active?: boolean; template_version?: string | number | null; external_id?: string | null }> }>;
  criarUnidade(p: any): Promise<{ duplicate?: boolean; unit: { id: string; name?: string; active?: boolean; is_active?: boolean; template_version?: string | number | null } }>;
  atualizarUnidade(id: string, p: Record<string, unknown>): Promise<{ unit?: { active?: boolean; is_active?: boolean; template_version?: string | number | null } } | any>;
  desativarUnidade(id: string): Promise<any>;
  reativarUnidade(id: string): Promise<any>;
}

export type ResultadoSync =
  | { ok: true; estado: "criada" | "vinculada" | "atualizada"; alizoUnitId: string }
  | { ok: false; classe: ClasseErro | "franquia_inexistente" | "conflito_vinculo"; mensagem: string; auth: boolean };

export async function sincronizarFranquiaCore(d: { repo: RepoAlizo; client: ClienteUnidades }, franchiseId: string): Promise<ResultadoSync> {
  const f = await d.repo.getFranquia(franchiseId);
  if (!f) return { ok: false, classe: "franquia_inexistente", mensagem: "Franquia não encontrada.", auth: false };
  const deveOperar = franquiaDeveOperar(f);
  try {
    let estado: "criada" | "vinculada" | "atualizada" = "atualizada";
    let unitId = "";
    let ativa: boolean | undefined;
    let versao: string | null | undefined;

    let mapa = await d.repo.getMapa(f.id);
    if (mapa) {
      unitId = mapa.alizoUnitId;
      try {
        const r = await d.client.atualizarUnidade(unitId, payloadUnidade(f) as any);
        ativa = lerAtiva(r?.unit); versao = lerVersao(r?.unit?.template_version);
      } catch (e: any) {
        // Vínculo antigo apontando para unidade que não existe mais na Alizo: descarta e religa por external_id.
        if (e instanceof AlizoError && e.status === 404) { await d.repo.apagarMapa(f.id); mapa = null; } else throw e;
      }
    }
    if (!mapa) {
      // 1) já existe na Alizo com este external_id? (nunca por nome)
      const achadas = (await d.client.unidadePorExternalId(f.id)).units.filter(u => u.external_id === f.id);
      let unit = achadas[0];
      if (unit) {
        estado = "vinculada";
      } else {
        // 2) cria (idempotente na Alizo: repetir devolve a mesma unidade)
        const r = await d.client.criarUnidade(payloadUnidade(f));
        unit = r.unit; estado = "criada";
      }
      const dono = await d.repo.quemUsaUnidade(unit.id);
      if (dono && dono !== f.id) {
        const msg = "Esta unidade da Alizo já está vinculada a outra franquia.";
        await d.repo.marcar(f.id, { status: "error", erro: msg });
        return { ok: false, classe: "conflito_vinculo", mensagem: msg, auth: false };
      }
      unitId = unit.id; ativa = lerAtiva(unit); versao = lerVersao(unit.template_version);
      await d.repo.salvarMapa(f.id, unitId, unit.name || f.name);
    }

    // Situação: suspensa/bloqueada → desativa (sem apagar); ativa → reativa se estava desativada.
    if (ativa === undefined ? !deveOperar : ativa !== deveOperar) {
      if (deveOperar) await d.client.reativarUnidade(unitId); else await d.client.desativarUnidade(unitId);
    }
    await d.repo.marcar(f.id, { status: "synced", erro: null, templateVersion: versao ?? undefined });
    return { ok: true, estado, alizoUnitId: unitId };
  } catch (e: any) {
    const status = e instanceof AlizoError ? e.status : 0;
    const classe = classificarErro(status);
    const msg = erroSeguro(status, e?.message);
    await d.repo.marcar(f.id, { status: statusAposErro(classe), erro: msg }).catch(() => {});
    return { ok: false, classe, mensagem: msg, auth: classe === "autenticacao" };
  }
}

export interface RelatorioBackfill {
  criadas: number; vinculadas: number; jaSincronizadas: number; comErro: number; abortado: boolean;
  erros: Array<{ franchiseId: string; motivo: string }>;
}

/** Percorre as franquias; idempotente (quem já está sincronizada só é atualizada, nunca recriada). Para no 1º erro de autenticação. */
export async function backfillCore(d: { repo: RepoAlizo; client: ClienteUnidades }, ids: string[], max = 50): Promise<RelatorioBackfill> {
  const rel: RelatorioBackfill = { criadas: 0, vinculadas: 0, jaSincronizadas: 0, comErro: 0, abortado: false, erros: [] };
  for (const id of ids.slice(0, max)) {
    const r = await sincronizarFranquiaCore(d, id);
    if (r.ok) {
      if (r.estado === "criada") rel.criadas++; else if (r.estado === "vinculada") rel.vinculadas++; else rel.jaSincronizadas++;
    } else {
      rel.comErro++; rel.erros.push({ franchiseId: id, motivo: r.mensagem });
      if (r.auth) { rel.abortado = true; break; }
    }
  }
  return rel;
}

/** external_id da unidade da Matriz (os webhooks já identificam a Matriz por "MATRIZ"). */
export const EXTERNAL_ID_MATRIZ = "MATRIZ";

export type ResultadoMatriz =
  | { ok: true; estado: "ja_vinculada" | "vinculada" }
  | { ok: false; motivo: "sem_unidade_matriz" | "conflito" | "erro"; mensagem: string; auth: boolean };

/**
 * Grava external_id="MATRIZ" na unidade da Matriz (já mapeada). Idempotente: se a Alizo já devolve a unidade
 * pelo external_id, não faz PUT. Nunca cria unidade; só liga a existente.
 */
export async function vincularMatrizCore(d: { repo: Pick<RepoAlizo, "getMapa">; client: Pick<ClienteUnidades, "unidadePorExternalId" | "atualizarUnidade"> }): Promise<ResultadoMatriz> {
  const mapa = await d.repo.getMapa(EXTERNAL_ID_MATRIZ);
  if (!mapa) return { ok: false, motivo: "sem_unidade_matriz", mensagem: "Matriz sem unidade mapeada.", auth: false };
  try {
    const achadas = (await d.client.unidadePorExternalId(EXTERNAL_ID_MATRIZ)).units.filter(u => u.external_id === EXTERNAL_ID_MATRIZ);
    if (achadas.some(u => u.id === mapa.alizoUnitId)) return { ok: true, estado: "ja_vinculada" };
    if (achadas.length) return { ok: false, motivo: "conflito", mensagem: "Outra unidade já usa o external_id MATRIZ.", auth: false };
    await d.client.atualizarUnidade(mapa.alizoUnitId, { external_id: EXTERNAL_ID_MATRIZ });
    return { ok: true, estado: "vinculada" };
  } catch (e: any) {
    return { ok: false, motivo: "erro", mensagem: erroSeguro(e?.status ?? 0, e?.message), auth: e instanceof AlizoError && e.ehAutenticacao };
  }
}
