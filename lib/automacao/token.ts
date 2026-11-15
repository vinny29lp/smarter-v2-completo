import { createHmac, timingSafeEqual } from "crypto";

/** Token do link "não quero mais receber" (LGPD): HMAC do e-mail, sem precisar de login. */
function segredo(): string {
  return process.env.NEXTAUTH_SECRET || "dev-optout-secret";
}

export function tokenOptOut(email: string): string {
  return createHmac("sha256", segredo()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function tokenOptOutValido(email: string, token: string): boolean {
  const esperado = Buffer.from(tokenOptOut(email));
  const recebido = Buffer.from(String(token || ""));
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

/** Token do link público do relatório semestral enviado à IES (sem login). */
export function tokenRelatorio(evalId: string): string {
  return createHmac("sha256", segredo()).update("relatorio:" + evalId).digest("hex").slice(0, 32);
}
export function tokenRelatorioValido(evalId: string, token: string): boolean {
  const esperado = Buffer.from(tokenRelatorio(evalId));
  const recebido = Buffer.from(String(token || ""));
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
