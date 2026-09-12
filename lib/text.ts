/**
 * text.ts — Normalização de texto para busca/comparação.
 *
 * Remove acentuação e caixa, pra "café" bater com "cafe" e "São Paulo" bater
 * com "sao paulo" — sem isso, uma busca digitada sem acento (comum em
 * teclados/hábitos diferentes) não encontra um nome cadastrado com acento,
 * mesmo o registro existindo.
 */
export function normalizarBusca(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** true se `texto` contém `busca`, ignorando acento e caixa. */
export function contemTexto(texto: string | null | undefined, busca: string): boolean {
  return normalizarBusca(texto).includes(normalizarBusca(busca));
}
