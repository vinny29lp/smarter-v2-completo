import crypto from "node:crypto";

/**
 * Valida a assinatura de um webhook da Alizo: header `Alizo-Signature: t=<unix>,v1=<hex>`,
 * v1 = HMAC_SHA256(secret, "<t>." + corpo BRUTO). Rejeita replay (> 300 s) e compara em tempo constante.
 */
export function verificarAssinaturaAlizo(
  corpoBruto: string,
  header: string | null | undefined,
  secret: string | null | undefined,
  agoraMs: number = Date.now(),
): boolean {
  if (!secret) return false;
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? "");
  if (!m) return false;
  if (Math.abs(agoraMs / 1000 - Number(m[1])) > 300) return false;
  const esperado = crypto.createHmac("sha256", secret).update(`${m[1]}.${corpoBruto}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(m[2]));
}
