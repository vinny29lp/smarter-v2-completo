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

/**
 * Reduz um texto a um nome de arquivo seguro — só ASCII, letras/números e
 * hífen. Usado onde o texto vira um filename dentro de um header HTTP (ex:
 * Content-Disposition de um upload multipart), que não é seguro carregar
 * acento/travessão cru: alguns parsers rejeitam ou corrompem o upload.
 *
 * Bug real: o envio do CPS pra assinatura via Autentique usava o título
 * ("CPS — Nome da Empresa", sempre com travessão e frequentemente com
 * acento no nome) direto como filename do multipart — o Node manda esse
 * caractere sem escapar (sem RFC 5987) no header, e o parser da Autentique
 * rejeitava o upload. Os outros documentos (TCE etc.) nunca tinham
 * caractere não-ASCII no título, por isso só o CPS falhava.
 */
export function nomeArquivoSeguro(texto: string): string {
  return normalizarBusca(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "documento";
}
