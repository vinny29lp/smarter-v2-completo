import { describe, it, expect } from "vitest";
import { temConsentimento, perfilDaVaga, linkPublicoDaVaga, notasDoCandidato, tituloDaVaga } from "./recrutadorRegras";

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
  it("perfil inclui o link público e os dados de divulgação quando existem", () => {
    const p = perfilDaVaga({ publicSlug: "abc-123", bolsa: 900, auxTransporte: 0, horario: "13h às 19h", modalidade: "Presencial" });
    expect(p.apply_url).toBe("https://sistema.smarterestagios.com.br/vaga/abc-123");
    expect(p.stipend).toBe(900); expect(p.schedule).toBe("13h às 19h"); expect(p.modality).toBe("Presencial");
    expect(p).not.toHaveProperty("transport_aid");
  });
  it("sem slug não há link", () => { expect(linkPublicoDaVaga(null)).toBeNull(); expect(linkPublicoDaVaga("  ")).toBeNull(); });
  it("título aparado", () => expect(tituloDaVaga({ titulo: "  Estágio  " })).toBe("Estágio"));
  it("notas do candidato sem dados sensíveis", () => {
    const n = notasDoCandidato({ curso: "Direito", semestre: "5", cidade: "Rio", uf: "RJ", discResult: "D" }, 80);
    expect(n).toContain("Curso: Direito"); expect(n).toContain("Matching Smarter: 80%");
    expect(n).not.toMatch(/cpf|rg/i);
  });
});
