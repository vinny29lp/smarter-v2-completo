import { describe, it, expect } from "vitest";
import { templateLiaEmail, linksPorTipo, enderecoResposta, extrairEnvioId, botao, esc } from "./emailBrand";

const APP = "https://sistema.smarterestagios.com.br";
describe("identidade visual", () => {
  it("template tem logo, cor da marca, assinatura e descadastro", () => {
    const h = templateLiaEmail({ titulo: "Olá <b>", corpo: "<p>x</p>", app: APP, optoutUrl: `${APP}/optout?e=a`, links: linksPorTipo("AVALIACAO", APP) });
    expect(h).toContain(`${APP}/logo-branca.png`);
    expect(h).toContain("#0f2a5e");
    expect(h).toContain("Lia</b> · assistente digital");
    expect(h).toContain("/optout?e=a");
    expect(h).toContain("Olá &lt;b&gt;");
    expect(h).toContain("/portal-empresa/avaliacoes");
  });
  it("links por tipo são reais e sem repetição", () => {
    const l = linksPorTipo("PORTAL_ATIVACAO", APP, ["portal"]);
    expect(new Set(l.map(x => x.href)).size).toBe(l.length);
    expect(linksPorTipo("CONVITE_VAGA", APP).map(x => x.href)).toContain(`${APP}/vagas`);
    expect(linksPorTipo("DESCONHECIDO", APP)[0].href).toContain("smarterestagios.com.br");
  });
  it("botão escapa o texto", () => expect(botao("https://x", "<a>")).toContain("&lt;a&gt;"));
  it("endereço de resposta rastreável ida e volta", () => {
    const id = "0a1b2c3d-1111-2222-3333-444455556666";
    const e = enderecoResposta("lia@respostas.exemplo.com", id)!;
    expect(e).toBe(`lia+${id}@respostas.exemplo.com`);
    expect(extrairEnvioId([`Lia <${e}>`])).toBe(id);
    expect(extrairEnvioId(["contato@x.com"])).toBeNull();
    expect(enderecoResposta("", id)).toBeUndefined();
    expect(esc("&")).toBe("&amp;");
  });
});
