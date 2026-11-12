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

/**
 * Variações de um termo de busca de CPF. O CPF fica gravado de dois jeitos no
 * banco (a maioria só dígitos "13525375670", alguns formatados
 * "135.253.756-70"), e quem busca digita de qualquer jeito — então a busca
 * precisa casar com as duas formas. Devolve [] se o termo não parece CPF
 * (menos de 3 dígitos), pra não varrer a tabela por "ana" → "".
 */
export function variantesCpf(termo: string): string[] {
  const digitos = (termo || "").replace(/\D/g, "");
  if (digitos.length < 3) return [];
  const variantes = new Set<string>([digitos]);
  const t = (termo || "").trim();
  if (t) variantes.add(t);
  if (digitos.length === 11) {
    variantes.add(`${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`);
  }
  return Array.from(variantes);
}

/**
 * Padrão LIKE (já sem acento, minúsculo, espaços colapsados e com % _ \
 * escapados) para buscar nome ignorando acentuação no Postgres — que, sem a
 * extensão unaccent, não casa "Julia" com "Júlia".
 */
export function padraoLikeSemAcento(termo: string): string {
  const base = normalizarBusca(termo).replace(/\s+/g, " ");
  return `%${base.replace(/[\\%_]/g, c => "\\" + c)}%`;
}

