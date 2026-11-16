/** Normaliza o estado do WhatsApp devolvido pela Alizo (sem "@/"; testável). */
export type EstadoWhatsapp = "connected" | "qr_pending" | "disconnected" | "banned" | "error" | "unknown";

const VALIDOS: EstadoWhatsapp[] = ["connected", "qr_pending", "disconnected", "banned", "error"];

export interface WhatsappNormalizado {
  estado: EstadoWhatsapp; qr: string | null; expiraEm: string | null; telefone: string | null; provedor: string | null; ultimaAtividade: string | null;
}

function mascarar(t: string | null | undefined) {
  const d = String(t || "").replace(/\D/g, "");
  return !d ? null : d.length <= 4 ? "****" : `${"*".repeat(d.length - 4)}${d.slice(-4)}`;
}

/** Só considera "connected" se a Alizo disse explicitamente `connected` — ler o QR não basta. */
export function normalizarWhatsapp(raw: any): WhatsappNormalizado {
  const r = raw?.whatsapp ?? raw ?? {};
  const bruto = String(r.status ?? "").toLowerCase();
  const estado: EstadoWhatsapp = (VALIDOS as string[]).includes(bruto) ? (bruto as EstadoWhatsapp) : "unknown";
  const qrBruto: string | null = r.qr_code ?? r.qr ?? null;
  const qr = qrBruto ? (/^data:image\//.test(qrBruto) ? qrBruto : /^[A-Za-z0-9+/=\s]+$/.test(qrBruto) && qrBruto.length > 100 ? `data:image/png;base64,${qrBruto.replace(/\s/g, "")}` : null) : null;
  return {
    estado, qr: estado === "qr_pending" ? qr : null, expiraEm: r.expires_at ?? null,
    telefone: mascarar(r.phone ?? r.whatsapp_phone), provedor: r.provider ?? null, ultimaAtividade: r.last_activity_at ?? null,
  };
}

/** Acompanhamento automático do QR: continua só enquanto aguarda leitura e dentro do prazo. */
export const INTERVALO_QR_MS = 4_000;
export const PRAZO_ACOMPANHAMENTO_MS = 3 * 60_000;
export function deveContinuarConsultando(estado: EstadoWhatsapp, inicioMs: number, agoraMs: number): boolean {
  if (estado === "connected" || estado === "banned" || estado === "error") return false;
  if (agoraMs - inicioMs > PRAZO_ACOMPANHAMENTO_MS) return false;
  return estado === "qr_pending" || estado === "unknown";
}
