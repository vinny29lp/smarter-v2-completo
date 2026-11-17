import { describe, it, expect, vi } from "vitest";
import { AlizoError } from "./client";
import { sincronizarFranquiaCore, backfillCore, vincularMatrizCore, type RepoAlizo, type ClienteUnidades } from "./unidadesCore";

const F = (id: string, extra: any = {}) => ({ id, name: "Franquia " + id, responsavel: "R", email: "r@x.com", telefone: "1", cidade: "Lorena", uf: "SP", status: "ATIVO", acessoBloqueado: false, ...extra });

function mundo(franquias: any[], remoto: Array<{ id: string; external_id: string; active?: boolean }> = []) {
  const mapa = new Map<string, string>();
  const marcas: any[] = [];
  const repo: RepoAlizo = {
    getFranquia: async id => franquias.find(f => f.id === id) ?? null,
    getMapa: async k => (mapa.has(k) ? { alizoUnitId: mapa.get(k)! } : null),
    quemUsaUnidade: async u => [...mapa.entries()].find(([, v]) => v === u)?.[0] ?? null,
    salvarMapa: async (k, u) => { mapa.set(k, u); },
    apagarMapa: async k => { mapa.delete(k); },
    marcar: async (id, d) => { marcas.push({ id, ...d }); },
  };
  let n = 0;
  const client = {
    unidadePorExternalId: vi.fn(async (ext: string) => ({ units: remoto.filter(u => u.external_id === ext) })),
    criarUnidade: vi.fn(async (p: any) => {
      const ja = remoto.find(u => u.external_id === p.external_id);
      if (ja) return { duplicate: true, unit: ja };
      const unit = { id: "alizo-" + ++n, external_id: p.external_id, active: true }; remoto.push(unit); return { unit };
    }),
    atualizarUnidade: vi.fn(async () => ({})),
    desativarUnidade: vi.fn(async () => ({})),
    reativarUnidade: vi.fn(async () => ({})),
  } satisfies ClienteUnidades;
  return { repo, client, mapa, marcas, remoto };
}

describe("sincronizarFranquiaCore", () => {
  it("cria a unidade e grava o vínculo; repetir não duplica", async () => {
    const m = mundo([F("a")]);
    const r1 = await sincronizarFranquiaCore(m, "a");
    const r2 = await sincronizarFranquiaCore(m, "a");
    expect(r1).toMatchObject({ ok: true, estado: "criada" });
    expect(r2).toMatchObject({ ok: true, estado: "atualizada" });
    expect(m.client.criarUnidade).toHaveBeenCalledTimes(1);
    expect(m.remoto).toHaveLength(1);
    expect(m.client.criarUnidade.mock.calls[0][0].external_id).toBe("a");
  });
  it("vincula unidade existente por external_id, sem criar", async () => {
    const m = mundo([F("a")], [{ id: "u9", external_id: "a" }]);
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: true, estado: "vinculada", alizoUnitId: "u9" });
    expect(m.client.criarUnidade).not.toHaveBeenCalled();
  });
  it("não vincula duas franquias à mesma unidade", async () => {
    const m = mundo([F("a"), F("b")]);
    m.mapa.set("a", "u1");
    m.client.unidadePorExternalId.mockResolvedValueOnce({ units: [{ id: "u1", external_id: "b" }] });
    const r = await sincronizarFranquiaCore(m, "b");
    expect(r).toMatchObject({ ok: false, classe: "conflito_vinculo" });
  });
  it("franquia suspensa → desativa; ativa de novo → reativa", async () => {
    const m = mundo([F("a", { status: "INATIVO" })], [{ id: "u1", external_id: "a", active: true }]);
    await sincronizarFranquiaCore(m, "a");
    expect(m.client.desativarUnidade).toHaveBeenCalledWith("u1");
    const m2 = mundo([F("a")], [{ id: "u1", external_id: "a", active: false }]);
    await sincronizarFranquiaCore(m2, "a");
    expect(m2.client.reativarUnidade).toHaveBeenCalledWith("u1");
  });
  it("Alizo indisponível → pending (não derruba) e retenta depois", async () => {
    const m = mundo([F("a")]);
    m.client.unidadePorExternalId.mockRejectedValueOnce(new AlizoError(503, "fora"));
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: false, classe: "temporario", auth: false });
    expect(m.marcas.at(-1)).toMatchObject({ status: "pending" });
    const r2 = await sincronizarFranquiaCore(m, "a");
    expect(r2.ok).toBe(true);
    expect(m.marcas.at(-1)).toMatchObject({ status: "synced", erro: null });
  });
  it("401 → error + auth; mensagem sem token", async () => {
    const m = mundo([F("a")]);
    m.client.unidadePorExternalId.mockRejectedValueOnce(new AlizoError(401, "token Bearer segredo123 inválido"));
    const r: any = await sincronizarFranquiaCore(m, "a");
    expect(r.auth).toBe(true);
    expect(m.marcas.at(-1).status).toBe("error");
    expect(JSON.stringify(m.marcas)).not.toContain("segredo123");
  });
});

describe("backfillCore", () => {
  it("duas execuções não duplicam e o relatório confere", async () => {
    const m = mundo([F("a"), F("b"), F("c")], [{ id: "u7", external_id: "b" }]);
    const r1 = await backfillCore(m, ["a", "b", "c"]);
    expect(r1).toMatchObject({ criadas: 2, vinculadas: 1, jaSincronizadas: 0, comErro: 0 });
    const r2 = await backfillCore(m, ["a", "b", "c"]);
    expect(r2).toMatchObject({ criadas: 0, vinculadas: 0, jaSincronizadas: 3 });
    expect(m.remoto).toHaveLength(3);
  });
  it("para no erro de autenticação", async () => {
    const m = mundo([F("a"), F("b")]);
    m.client.unidadePorExternalId.mockRejectedValue(new AlizoError(403, "negado"));
    const r = await backfillCore(m, ["a", "b"]);
    expect(r.abortado).toBe(true);
    expect(r.comErro).toBe(1);
  });
});

import { lerAtiva, lerVersao } from "./unidadesCore";
describe("formato real da Alizo", () => {
  it("template_version numérico vira texto e is_active é lido", () => {
    expect(lerVersao(1)).toBe("1");
    expect(lerVersao(null)).toBeNull();
    expect(lerAtiva({ is_active: false })).toBe(false);
    expect(lerAtiva({ active: true })).toBe(true);
    expect(lerAtiva({})).toBeUndefined();
  });
});

describe("vínculo quebrado (404)", () => {
  it("unidade antiga inexistente na Alizo: descarta o vínculo e religa por external_id", async () => {
    const m = mundo([F("a")], [{ id: "u-certa", external_id: "a" }]);
    m.mapa.set("a", "u-fantasma");
    m.client.atualizarUnidade.mockRejectedValueOnce(new AlizoError(404, "Unidade não encontrada."));
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: true, estado: "vinculada", alizoUnitId: "u-certa" });
    expect(m.mapa.get("a")).toBe("u-certa");
    expect(m.client.criarUnidade).not.toHaveBeenCalled();
  });
  it("sem unidade correspondente: cria uma nova", async () => {
    const m = mundo([F("a")]);
    m.mapa.set("a", "u-fantasma");
    m.client.atualizarUnidade.mockRejectedValueOnce(new AlizoError(404, "x"));
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: true, estado: "criada" });
    expect(m.mapa.get("a")).not.toBe("u-fantasma");
  });
  it("403 continua sendo erro de acesso e mantém o vínculo", async () => {
    const m = mundo([F("a")]);
    m.mapa.set("a", "u1");
    m.client.atualizarUnidade.mockRejectedValueOnce(new AlizoError(403, "sem escopo"));
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: false, auth: true });
    expect(m.mapa.get("a")).toBe("u1");
  });
  it("não liga unidade sem external_id (evita vínculo errado)", async () => {
    const m = mundo([F("a")], [{ id: "outra", external_id: "" }]);
    const r = await sincronizarFranquiaCore(m, "a");
    expect(r).toMatchObject({ ok: true, estado: "criada" });
  });
});

describe("vincularMatrizCore", () => {
  const mk = (mapaId: string | null, remoto: any[]) => {
    const atualizar = vi.fn(async () => ({}));
    return { atualizar, d: { repo: { getMapa: async () => (mapaId ? { alizoUnitId: mapaId } : null) }, client: { unidadePorExternalId: async (e: string) => ({ units: remoto.filter(u => u.external_id === e) }), atualizarUnidade: atualizar } } as any };
  };
  it("grava external_id MATRIZ na unidade mapeada", async () => {
    const { d, atualizar } = mk("u1", []);
    expect(await vincularMatrizCore(d)).toEqual({ ok: true, estado: "vinculada" });
    expect(atualizar).toHaveBeenCalledWith("u1", { external_id: "MATRIZ" });
  });
  it("é idempotente quando já está ligada", async () => {
    const { d, atualizar } = mk("u1", [{ id: "u1", external_id: "MATRIZ" }]);
    expect(await vincularMatrizCore(d)).toEqual({ ok: true, estado: "ja_vinculada" });
    expect(atualizar).not.toHaveBeenCalled();
  });
  it("não liga se outra unidade já usa MATRIZ, nem sem unidade mapeada", async () => {
    const a = mk("u1", [{ id: "outra", external_id: "MATRIZ" }]);
    expect(await vincularMatrizCore(a.d)).toMatchObject({ ok: false, motivo: "conflito" });
    expect(a.atualizar).not.toHaveBeenCalled();
    expect(await vincularMatrizCore(mk(null, []).d)).toMatchObject({ ok: false, motivo: "sem_unidade_matriz" });
  });
});
