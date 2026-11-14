/** Verificação de assinatura de webhooks no padrão Svix (usado pela Resend). Função pura, sem "@/". */
import crypto from "crypto";

export function verificarSvix(p: {
  id: string | null; timestamp: string | null; assinatura: string | null; corpo: string; segredo: string; agora?: number; toleranciaSeg?: number;
}): boolean {
  if (!p.id || !p.timestamp || !p.assinatura || !p.segredo) return false;
  const ts = Number(p.timestamp);
  const agora = (p.agora ?? Date.now()) / 1000;
  if (!Number.isFinite(ts) || Math.abs(agora - ts) > (p.toleranciaSeg ?? 300)) return false;
  const chave = Buffer.from(p.segredo.startsWith("whsec_") ? p.segredo.slice(6) : p.segredo, "base64");
  const esperado = crypto.createHmac("sha256", chave).update(`${p.id}.${p.timestamp}.${p.corpo}`).digest();
  for (const par of p.assinatura.split(" ")) {
    const [versao, sig] = par.split(",");
    if (versao !== "v1" || !sig) continue;
    const recebido = Buffer.from(sig, "base64");
    if (recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado)) return true;
  }
  return false;
}
