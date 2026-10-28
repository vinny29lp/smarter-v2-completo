import type { SupportCategory } from "@/lib/support/ai-workforce";

export interface LiaSupportIntent {
  category: SupportCategory;
  title: string;
  description: string;
}

const MARKER = /\[\[LIA_SUPPORT:(\{[\s\S]*?\})\]\]/;
const CATEGORIES: SupportCategory[] = ["guidance", "bug", "access", "integration", "billing", "other"];

export function extractSupportIntent(content: string): { text: string; intent: LiaSupportIntent | null } {
  const match = content.match(MARKER);
  if (!match) return { text: content.trim(), intent: null };
  let intent: LiaSupportIntent | null = null;
  try {
    const value = JSON.parse(match[1]) as Record<string, unknown>;
    if (CATEGORIES.includes(value.category as SupportCategory) && typeof value.title === "string" && typeof value.description === "string") {
      intent = {
        category: value.category as SupportCategory,
        title: value.title.trim().slice(0, 140),
        description: value.description.trim().slice(0, 5000),
      };
      if (!intent.title || !intent.description) intent = null;
    }
  } catch { /* marcador inválido é ignorado com segurança */ }
  return { text: content.replace(MARKER, "").trim(), intent };
}
