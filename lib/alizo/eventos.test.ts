import { describe, it, expect, vi, beforeEach } from "vitest";

// Banco em memória mínimo para os eventos/leads/candidaturas.
const db = vi.hoisted(() => ({
  eventos: new Map<string, any>(), mapa: [] as any[], leads: [] as any[], notas: [] as any[], apps: [] as any[], avisos: [] as any[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alizoEvento: {
      findUnique: async ({ where }: any) => db.eventos.get(where.id) ?? null,
      create: async ({ data }: any) => { if (db.eventos.has(data.id)) throw Object.assign(new Error("dup"), { code: "P2002" }); db.eventos.set(data.id, { ...data, tentativas: 0 }); return data; },
      update: async ({ where, data }: any) => { const e = db.eventos.get(where.id); Object.assign(e, { ...data, tentativas: e.tentativas + (data.tentativas?.increment ?? 0) }); return e; },
    },
    alizoUnidade: {
      findUnique: async ({ where }: any) => db.mapa.find(m => m.franchiseKey === where.franchiseKey) ?? null,
      findFirst: async ({ where }: any) => db.mapa.find(m => m.alizoUnitId === where.alizoUnitId) ?? null,
    },
    crmLead: {
      findFirst: async ({ where }: any) => db.leads.find(l => l.alizoLeadId === where.alizoLeadId) ?? null,
      update: async ({ where, data }: any) => Object.assign(db.leads.find(l => l.id === where.id), data),
    },
    crmNota: { findFirst: async () => null, create: async ({ data }: any) => { db.notas.push(data); return data; } },
    application: {
      findFirst: async ({ where }: any) => db.apps.find(a => a.alizoCandidateId === where.alizoCandidateId) ?? null,
      update: async ({ where, data }: any) => Object.assign(db.apps.find(a => a.id === where.id), data),
    },
  },
}));
vi.mock("@/lib/lia/avisoResposta", () => ({ avisarResposta: async (p: any) => { db.avisos.push(p); } }));
vi.mock("./recrutador", () => ({ sincronizarRecrutador: async () => ({}) }));
vi.mock("./provisionar", () => ({ provisionarFranquiasPendentes: async () => ({}) }));

import { processarEventoAlizo } from "./sync";

beforeEach(() => {
  db.eventos.clear(); db.notas.length = 0; db.avisos.length = 0;
  db.mapa.splice(0, db.mapa.length, { franchiseKey: "fA", alizoUnitId: "uA" }, { franchiseKey: "fB", alizoUnitId: "uB" });
  db.leads.splice(0, db.leads.length, { id: "l1", alizoLeadId: "al1", franchiseId: "fA", empresa: "Emp A", optIn: true });
  db.apps.splice(0, db.apps.length, { id: "ap1", alizoCandidateId: "c1", vacancy: { franchiseId: "fA", titulo: "Vaga X" } });
});

describe("processarEventoAlizo", () => {
  it("evento duplicado é ignorado", async () => {
    const ev = { id: "e1", type: "lead.status_changed", unit_id: "uA", external_id: "fA", data: { lead_id: "al1", status: "x" } };
    expect((await processarEventoAlizo(ev)).processado).toBe(true);
    expect(await processarEventoAlizo(ev)).toMatchObject({ processado: false, motivo: "duplicado" });
    expect(db.notas).toHaveLength(1);
  });
  it("rejeita unit_id que não bate com o vínculo (e deixa o evento reprocessável)", async () => {
    await expect(processarEventoAlizo({ id: "e2", type: "unit.whatsapp.disconnected", unit_id: "uB", external_id: "fA", data: {} })).rejects.toThrow();
    expect(db.eventos.get("e2").status).toBe("falhou");
    expect(db.eventos.get("e2").payload).toBeTruthy();
  });
  it("isolamento: lead de outra unidade não é alterado", async () => {
    const r = await processarEventoAlizo({ id: "e3", type: "lead.opted_out", unit_id: "uB", external_id: "fB", data: { lead_id: "al1" } });
    expect(r).toMatchObject({ motivo: "lead_de_outra_unidade" });
    expect(db.leads[0].optIn).toBe(true);
  });
  it("opt-out pausa e remove o consentimento", async () => {
    await processarEventoAlizo({ id: "e4", type: "lead.opted_out", unit_id: "uA", external_id: "fA", data: { lead_id: "al1" } });
    expect(db.leads[0]).toMatchObject({ optIn: false, alizoPausado: true });
  });
  it("candidato interessado atualiza o status e avisa a unidade", async () => {
    await processarEventoAlizo({ id: "e5", type: "candidate.interested", unit_id: "uA", external_id: "fA", data: { candidate_id: "c1" } });
    expect(db.apps[0].alizoStatus).toBe("interested");
    expect(db.avisos[0]).toMatchObject({ franchiseId: "fA" });
  });
  it("candidato de outra unidade não é tocado", async () => {
    const r = await processarEventoAlizo({ id: "e6", type: "candidate.declined", unit_id: "uB", external_id: "fB", data: { candidate_id: "c1" } });
    expect(r).toMatchObject({ acao: "candidato_de_outra_unidade" });
    expect(db.apps[0].alizoStatus).toBeUndefined();
  });
  it("evento que falhou pode ser reprocessado com sucesso depois", async () => {
    const ev = { id: "e7", type: "lead.status_changed", unit_id: "uA", external_id: "fA", data: { lead_id: "al1" } };
    db.eventos.set("e7", { id: "e7", status: "falhou", payload: ev, tentativas: 1 });
    expect((await processarEventoAlizo(ev)).processado).toBe(true);
    expect(db.eventos.get("e7").status).toBe("processado");
  });
});
