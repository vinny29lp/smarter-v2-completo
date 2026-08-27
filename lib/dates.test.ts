import { describe, it, expect } from "vitest";
import { normalizarDataOpcional } from "./dates";

describe("normalizarDataOpcional", () => {
  it("undefined permanece undefined (campo não enviado, não mexe no valor atual)", () => {
    expect(normalizarDataOpcional(undefined)).toBeUndefined();
  });

  it("null permanece null", () => {
    expect(normalizarDataOpcional(null)).toBeNull();
  });

  it("string vazia vira null — este é o bug relatado: Prisma não aceita \"\" num DateTime? e quebrava o update do estudante", () => {
    expect(normalizarDataOpcional("")).toBeNull();
  });

  it("string só com espaços também vira null", () => {
    expect(normalizarDataOpcional("   ")).toBeNull();
  });

  it("string \"YYYY-MM-DD\" vira Date ao meio-dia UTC (evita cair no dia anterior por fuso horário)", () => {
    const d = normalizarDataOpcional("2000-05-20") as Date;
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2000-05-20T12:00:00.000Z");
  });

  it("string ISO completa (já com T) vira Date preservando o horário", () => {
    const d = normalizarDataOpcional("2000-05-20T03:00:00.000Z") as Date;
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2000-05-20T03:00:00.000Z");
  });

  it("Date já pronto passa direto", () => {
    const original = new Date("2000-05-20T12:00:00.000Z");
    expect(normalizarDataOpcional(original)).toBe(original);
  });

  it("string inválida vira null em vez de derrubar o Prisma com Invalid Date", () => {
    expect(normalizarDataOpcional("não é uma data")).toBeNull();
  });

  it("Date inválido (new Date(\"lixo\")) vira null", () => {
    expect(normalizarDataOpcional(new Date("lixo"))).toBeNull();
  });

  it("tipos inesperados (número, objeto) viram null", () => {
    expect(normalizarDataOpcional(12345)).toBeNull();
    expect(normalizarDataOpcional({})).toBeNull();
  });
});
