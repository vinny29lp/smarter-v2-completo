import { describe, it, expect } from "vitest";
import { diagnosticarContrato, nomesQueFaltamAssinar } from "./travados";
import { motivoValido, rotuloMotivo } from "./motivoRescisao";

const agora = new Date("2026-11-13T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000);

describe("diagnosticarContrato (#15)", () => {
  it("contrato recente não é considerado travado", () => {
    expect(diagnosticarContrato({ status: "PENDENTE", createdAt: dias(1), dataFim: dias(-200) }, [], agora)).toBeNull();
  });
  it("sem TCE gerado", () => {
    const d = diagnosticarContrato({ status: "PENDENTE", createdAt: dias(10), dataFim: dias(-200) }, [{ tipo: "tce", status: "NAO_GERADO" }], agora);
    expect(d?.etapa).toBe("SEM_TCE");
    expect(d?.dias).toBe(10);
  });
  it("TCE gerado e não enviado", () => {
    expect(diagnosticarContrato({ status: "PENDENTE", createdAt: dias(5), dataFim: dias(-200) }, [{ tipo: "tce", status: "GERADO" }], agora)?.etapa).toBe("TCE_NAO_ENVIADO");
  });
  it("aguardando assinatura lista quem falta", () => {
    const d = diagnosticarContrato(
      { status: "AGUARDANDO_ASSINATURA", createdAt: dias(8), dataFim: dias(-200) },
      [{ tipo: "tce", status: "ENVIADO_ASSINATURA", signers: [{ name: "Ana", signed: true }, { name: "Empresa X", signed: false }, { email: "ies@x.com", signed: false }] }],
      agora,
    );
    expect(d?.etapa).toBe("AGUARDANDO_ASSINATURA");
    expect(d?.faltamAssinar).toEqual(["Empresa X", "ies@x.com"]);
  });
  it("assinado mas não ativado", () => {
    expect(diagnosticarContrato({ status: "PENDENTE", createdAt: dias(6), dataFim: dias(-200) }, [{ tipo: "tce", status: "ASSINADO" }], agora)?.etapa).toBe("ASSINADO_NAO_ATIVADO");
  });
  it("ativo com data final vencida", () => {
    const d = diagnosticarContrato({ status: "ATIVO", createdAt: dias(300), dataFim: dias(4) }, [], agora);
    expect(d?.etapa).toBe("ATIVO_VENCIDO");
    expect(d?.dias).toBe(4);
  });
  it("ativo em dia e contratos finalizados não aparecem", () => {
    expect(diagnosticarContrato({ status: "ATIVO", createdAt: dias(30), dataFim: dias(-30) }, [], agora)).toBeNull();
    expect(diagnosticarContrato({ status: "FINALIZADO", createdAt: dias(300), dataFim: dias(10) }, [], agora)).toBeNull();
  });
  it("nomesQueFaltamAssinar tolera dados inválidos", () => {
    expect(nomesQueFaltamAssinar(null)).toEqual([]);
    expect(nomesQueFaltamAssinar({})).toEqual([]);
  });
});

describe("motivos de rescisão (#18)", () => {
  it("aceita só valores da lista", () => {
    expect(motivoValido("ESTUDANTE_OUTRO_ESTAGIO")).toBe(true);
    expect(motivoValido("qualquer coisa")).toBe(false);
    expect(motivoValido(undefined)).toBe(false);
  });
  it("rótulo amigável e fallback", () => {
    expect(rotuloMotivo("TERMINO_NATURAL")).toBe("Término do prazo do contrato");
    expect(rotuloMotivo(null)).toBe("Não informado");
  });
});
