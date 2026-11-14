import { describe, it, expect } from "vitest";
import { temConsentimento, perfilDaVaga, notasDoCandidato, tituloDaVaga } from "./recrutadorRegras";

describe("recrutador alizo", () => {
  it("só 'granted' vale como consentimento", () => {
    expect(temConsentimento("granted")).toBe(true);
    expect(temConsentimento("unknown")).toBe(false);
    expect(temConsentimento("revoked")).toBe(false);
    expect(temConsentimento(null)).toBe(false);
  });
  it("perfil da vaga", () => {
    expect(perfilDaVaga({ cursoRequerido: "Direito", cidade: "Rio", uf: "RJ" })).toEqual({ course: "Direito", city: "Rio", state: "RJ" });
    expect(perfilDaVaga({})).toEqual({});
  });
  it("título aparado", () => expect(tituloDaVaga({ titulo: "  Estágio  " })).toBe("Estágio"));
  it("notas do candidato sem dados sensíveis", () => {
    const n = notasDoCandidato({ curso: "Direito", semestre: "5", cidade: "Rio", uf: "RJ", discResult: "D" }, 80);
    expect(n).toContain("Curso: Direito"); expect(n).toContain("Matching Smarter: 80%");
    expect(n).not.toMatch(/cpf|rg/i);
  });
});
