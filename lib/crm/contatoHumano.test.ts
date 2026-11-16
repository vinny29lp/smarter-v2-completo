import { describe, it, expect } from "vitest";
import { pendenteContatoHumano, TEXTO_CONTATO_HUMANO, telefoneWa, linkWhatsApp, mensagemWhatsApp, linkApresentacao } from "./contatoHumano";
describe("contato humano", () => {
  it("reconhece o marcador", () => {
    expect(pendenteContatoHumano(TEXTO_CONTATO_HUMANO)).toBe(true);
    expect(pendenteContatoHumano("Ligar amanhã")).toBe(false);
    expect(pendenteContatoHumano(null)).toBe(false);
  });
  it("telefone e links", () => {
    expect(telefoneWa("(21) 99999-0000")).toBe("5521999990000");
    expect(telefoneWa("123")).toBeNull();
    expect(linkWhatsApp("21999990000", "oi a")).toBe("https://wa.me/5521999990000?text=oi%20a");
    expect(linkWhatsApp(null, "x")).toBeNull();
    expect(linkApresentacao("https://x.com/", "f1")).toBe("https://x.com/parceria?ref=f1");
  });
  it("mensagem cita empresa e link", () => {
    const m = mensagemWhatsApp({ contato: "Maria Souza", empresa: "Padaria X", unidade: "Smarter Niterói", responsavel: "João Silva", link: "https://l" });
    expect(m).toContain("Maria"); expect(m).toContain("Padaria X"); expect(m).toContain("https://l");
  });
});
