import { describe, it, expect } from "vitest";
import { templateLiaEmail, linksPorTipo, enderecoResposta, extrairEnvioId, botao, esc, htmlParaTexto, modoEmail } from "./emailBrand";

const APP = "https://sistema.smarterestagios.com.br";
describe("identidade visual", () => {
  it("modo completo tem logo, cor da marca, assinatura e descadastro", () => {
    const h = templateLiaEmail({ modo: "completo", titulo: "Olá <b>", corpo: "<p>x</p>", app: APP, optoutUrl: `${APP}/optout?e=a`, links: linksPorTipo("AVALIACAO", APP) });
    expect(h).toContain(`${APP}/logo-branca.png`);
    expect(h).toContain("#0f2a5e");
    expect(h).toContain("Lia</b> · assistente digital");
    expect(h).toContain("/optout?e=a");
    expect(h).toContain("Olá &lt;b&gt;");
    expect(h).toContain("/portal-empresa/avaliacoes");
  });
  it("modo leve não tem imagem nem botão grande, mas mantém nome, cores e links", () => {
    const h = templateLiaEmail({ modo: "leve", titulo: "Aviso", corpo: botao("https://x.com", "Abrir", "leve"), app: APP, optoutUrl: `${APP}/optout?e=a`, links: linksPorTipo("AVALIACAO", APP) });
    expect(h).not.toMatch(/<img/i);
    expect(h).not.toContain("display:inline-block;background");
    expect(h).toContain("Smarter Estágios");
    expect(h).toContain("#f5c400");
    expect(h).toContain("Lia</b> — assistente digital");
    expect(h).toContain("/optout?e=a");
    expect(h).toContain("Abrir →");
  });
  it("modo texto (padrão) parece e-mail pessoal: sem imagem, botão, título em destaque e só 1 link de apoio", () => {
    expect(modoEmail()).toBe("texto");
    const h = templateLiaEmail({ titulo: "Aviso", corpo: "<p>Olá!</p>" + botao("https://x.com/a", "Veja"), app: APP, optoutUrl: `${APP}/optout?e=a`, links: linksPorTipo("AVALIACAO", APP) });
    expect(h).not.toMatch(/<img/i);
    expect(h).not.toContain("background");
    expect(h).not.toContain("Aviso");
    expect((h.match(/<a /g) || []).length).toBe(3); // botão + 1 link de apoio + descadastro
    expect(h).toContain("Smarter Estágios");
    expect(h).toContain("Assistente digital");
    expect(h).toContain("/optout?e=a");
  });
  it("versão em texto puro mantém links", () => {
    const t = htmlParaTexto(templateLiaEmail({ titulo: "Aviso", corpo: "<p>Olá &amp; tudo bem?</p>" + botao("https://x.com", "Abrir"), app: APP, optoutUrl: "https://o.com" }));
    expect(t).toContain("Olá & tudo bem?");
    expect(t).toContain("(https://x.com)");
    expect(t).not.toContain("<");
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
