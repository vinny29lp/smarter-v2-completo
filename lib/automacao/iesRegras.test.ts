import { describe, it, expect } from "vitest";
import { convenioDevido, relatorioSemestralDevido, periodoSemestre } from "./iesRegras";

const agora = new Date("2026-11-16T12:00:00Z");
const ha = (d: number) => new Date(agora.getTime() - d * 86_400_000);

describe("convenioDevido", () => {
  const base = { status: "PENDENTE", temEstagios: true, emailValido: true, enviosLia: [] as Date[], agora };
  it("convida IES com estágios que nunca foi convidada", () => {
    expect(convenioDevido({ ...base })).toBe("convite");
    expect(convenioDevido({ ...base, temEstagios: false })).toBeNull();
  });
  it("não age se já firmado ou sem e-mail", () => {
    expect(convenioDevido({ ...base, status: "FIRMADO" })).toBeNull();
    expect(convenioDevido({ ...base, emailValido: false })).toBeNull();
  });
  it("lembra só após o intervalo e até o máximo", () => {
    expect(convenioDevido({ ...base, conviteEnviadoEm: ha(5) })).toBeNull();
    expect(convenioDevido({ ...base, conviteEnviadoEm: ha(11) })).toBe("lembrete");
    expect(convenioDevido({ ...base, conviteEnviadoEm: ha(60), enviosLia: [ha(40), ha(30), ha(20)] })).toBeNull();
    expect(convenioDevido({ ...base, conviteEnviadoEm: ha(60), enviosLia: [ha(3)] })).toBeNull();
  });
});

describe("relatorioSemestralDevido", () => {
  it("só envia avaliação recente e ainda não enviada", () => {
    expect(relatorioSemestralDevido({ respondidoAt: ha(3), jaEnviado: false, agora })).toBe(true);
    expect(relatorioSemestralDevido({ respondidoAt: ha(3), jaEnviado: true, agora })).toBe(false);
    expect(relatorioSemestralDevido({ respondidoAt: ha(200), jaEnviado: false, agora })).toBe(false);
    expect(relatorioSemestralDevido({ respondidoAt: null, jaEnviado: false, agora })).toBe(false);
  });
  it("periodo do semestre", () => {
    expect(periodoSemestre(new Date("2026-03-01"))).toBe("2026/1");
    expect(periodoSemestre(new Date("2026-09-01"))).toBe("2026/2");
  });
});
