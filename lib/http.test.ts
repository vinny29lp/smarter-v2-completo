import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "./http";

describe("parseJsonResponse", () => {
  it("faz parse normal de uma resposta JSON válida", async () => {
    const res = new Response(JSON.stringify({ ok: true, valor: 42 }), { status: 200 });
    expect(await parseJsonResponse(res)).toEqual({ ok: true, valor: 42 });
  });

  it("resposta de erro JSON válida (4xx com corpo {error})", async () => {
    const res = new Response(JSON.stringify({ error: "Campo obrigatório." }), { status: 400 });
    expect(await parseJsonResponse(res)).toEqual({ error: "Campo obrigatório." });
  });

  it("413 em texto puro (o bug relatado: Vercel manda \"Request Entity Too Large\" cru) vira mensagem amigável, não crash de parse", async () => {
    const res = new Response("Request Entity Too Large", { status: 413 });
    const data = await parseJsonResponse(res);
    expect(data.error).toBe("Arquivo muito grande para ser enviado. Reduza o tamanho e tente novamente.");
  });

  it("HTML de erro genérico (ex: página de erro de um proxy) também vira mensagem amigável", async () => {
    const res = new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 });
    const data = await parseJsonResponse(res);
    expect(data.error).toMatch(/servidor indisponível/i);
  });

  it("corpo vazio numa resposta de sucesso vira objeto vazio", async () => {
    const res = new Response("", { status: 200 });
    expect(await parseJsonResponse(res)).toEqual({});
  });

  it("corpo vazio numa resposta de erro vira mensagem amigável baseada no status", async () => {
    const res = new Response("", { status: 500 });
    const data = await parseJsonResponse(res);
    expect(data.error).toMatch(/erro no servidor/i);
  });

  it("401/403 viram mensagens específicas de sessão/permissão", async () => {
    expect((await parseJsonResponse(new Response("", { status: 401 }))).error).toMatch(/sessão/i);
    expect((await parseJsonResponse(new Response("", { status: 403 }))).error).toMatch(/permissão/i);
  });
});
