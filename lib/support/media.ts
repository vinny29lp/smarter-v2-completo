import type { SupportMedia } from "./ai-workforce";

export function parseSupportMedia(value: unknown, consent: unknown): { media: SupportMedia[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0) return { media: [] };
  if (consent !== true) return { media: [], error: "Autorize claramente a análise por IA antes de enviar imagem ou áudio." };
  if (value.length > 3) return { media: [], error: "Envie no máximo três arquivos." };
  const media: SupportMedia[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return { media: [], error: "Mídia inválida." };
    const record = item as Record<string, unknown>;
    const kind = record.kind;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "";
    const base64 = typeof record.base64 === "string" ? record.base64 : "";
    const sourceMessageId = typeof record.sourceMessageId === "string" ? record.sourceMessageId : "";
    if ((kind !== "image" && kind !== "audio") || !mimeType.startsWith(`${kind}/`) || !base64 || !sourceMessageId) return { media: [], error: "Mídia inválida." };
    const bytes = Math.floor(base64.length * 3 / 4);
    if ((kind === "image" && bytes > 8 * 1024 * 1024) || (kind === "audio" && bytes > 16 * 1024 * 1024)) return { media: [], error: `${kind === "image" ? "Imagem" : "Áudio"} acima do limite permitido.` };
    media.push({ kind, mimeType, base64, caption: typeof record.caption === "string" ? record.caption.slice(0, 500) : "", sourceMessageId });
  }
  return { media };
}
