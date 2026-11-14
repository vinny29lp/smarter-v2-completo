import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verificarSvix } from "./svix";

const segredoBruto = crypto.randomBytes(24);
const segredo = "whsec_" + segredoBruto.toString("base64");
const assinar = (id: string, ts: string, corpo: string) =>
  "v1," + crypto.createHmac("sha256", segredoBruto).update(`${id}.${ts}.${corpo}`).digest("base64");

describe("verificarSvix", () => {
  const agora = 1_800_000_000_000;
  const ts = String(agora / 1000);
  const corpo = '{"type":"email.received"}';
  it("aceita assinatura válida", () => expect(verificarSvix({ id: "msg_1", timestamp: ts, assinatura: assinar("msg_1", ts, corpo), corpo, segredo, agora })).toBe(true));
  it("aceita quando há várias assinaturas", () => expect(verificarSvix({ id: "msg_1", timestamp: ts, assinatura: "v1,AAAA " + assinar("msg_1", ts, corpo), corpo, segredo, agora })).toBe(true));
  it("recusa corpo adulterado", () => expect(verificarSvix({ id: "msg_1", timestamp: ts, assinatura: assinar("msg_1", ts, corpo), corpo: corpo + " ", segredo, agora })).toBe(false));
  it("recusa segredo errado", () => expect(verificarSvix({ id: "msg_1", timestamp: ts, assinatura: assinar("msg_1", ts, corpo), corpo, segredo: "whsec_" + crypto.randomBytes(24).toString("base64"), agora })).toBe(false));
  it("recusa replay antigo", () => expect(verificarSvix({ id: "msg_1", timestamp: ts, assinatura: assinar("msg_1", ts, corpo), corpo, segredo, agora: agora + 10 * 60_000 })).toBe(false));
  it("recusa cabeçalhos ausentes", () => expect(verificarSvix({ id: null, timestamp: ts, assinatura: "v1,x", corpo, segredo, agora })).toBe(false));
});
