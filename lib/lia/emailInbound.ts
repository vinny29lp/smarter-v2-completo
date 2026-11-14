/** Lia lê e-mails: heurísticas puras de segurança (sem "@/", testáveis). */

/** Remove o texto citado e assinaturas, deixando só o que a pessoa escreveu. */
export function limparTextoResposta(texto: string | null | undefined, max = 2000): string {
  const linhas = String(texto || "").replace(/\r/g, "").split("\n");
  const saida: string[] = [];
  for (const l of linhas) {
    if (/^>/.test(l)) break;
    if (/^(Em .{5,120} escreveu:?|On .{5,120} wrote:?|-{2,}\s*(Original Message|Mensagem original)|De:\s.+|From:\s.+|_{5,})/i.test(l.trim())) break;
    saida.push(l);
  }
  return saida.join("\n").trim().slice(0, max);
}

export function detectarOptOut(texto: string): boolean {
  return /\b(pare|parar|remov(a|er|am)|descadastr\w*|n[aã]o quero (mais )?receber|cancel(ar|e) (o )?(recebimento|envio|inscri[cç][aã]o)|unsubscribe|sair da lista|me tire(m)? da lista)\b/i.test(texto);
}

/** Assuntos sensíveis: a Lia NÃO responde sozinha — encaminha para a unidade. */
export function deveEscalar(texto: string): boolean {
  return /(processo judicial|judicial|advogad|procon|reclama[cç]|cancel\w*[^.\n]{0,15}contrato|rescis|cobran[cç]a indevida|pagamento|boleto|estorno|reembolso|fraude|golpe|den[uú]ncia|lgpd|exclus[aã]o (de|dos) dados|acidente|assédio|ass[eé]dio|demiss|demitid)/i.test(texto);
}

/** E-mails automáticos (férias, bounce, no-reply): nunca respondemos, para não criar loop. */
export function ehAutoResposta(p: { de?: string | null; assunto?: string | null; headers?: Record<string, string> | null }): boolean {
  const de = (p.de || "").toLowerCase();
  if (/(mailer-daemon|postmaster|no-?reply|nao-?responda|do-?not-?reply)@/.test(de)) return true;
  if (/(resposta autom|autom[aá]tic|out of office|auto-?reply|automatic reply|undeliverable|delivery status|fora do escrit[oó]rio|aus[eê]ncia)/i.test(p.assunto || "")) return true;
  const h = Object.fromEntries(Object.entries(p.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (h["x-auto-response-suppress"] || h["precedence"] === "bulk" || h["precedence"] === "auto_reply") return true;
  return false;
}

export const MAX_RESPOSTAS_AUTOMATICAS_SEMANA = 3;
export const podeResponderAutomaticamente = (qtdUltimos7Dias: number) => qtdUltimos7Dias < MAX_RESPOSTAS_AUTOMATICAS_SEMANA;

export const assuntoResposta = (assunto?: string | null) => {
  const a = (assunto || "Sua mensagem").trim();
  return /^re:/i.test(a) ? a : `Re: ${a}`;
};

/** Extrai o e-mail puro de "Nome <a@b.com>". */
export function emailDe(campo: string | null | undefined): string {
  const m = /<([^>]+)>/.exec(campo || "");
  return (m ? m[1] : campo || "").trim().toLowerCase();
}

/** Parse tolerante da resposta JSON do modelo. */
export function lerDecisaoIA(txt: string): { acao: "responder" | "encaminhar"; resposta: string; topicos: string[] } | null {
  try {
    const bruto = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const j = JSON.parse(bruto);
    if (j.acao !== "responder" && j.acao !== "encaminhar") return null;
    return { acao: j.acao, resposta: String(j.resposta || "").slice(0, 2500), topicos: Array.isArray(j.topicos) ? j.topicos.map(String) : [] };
  } catch { return null; }
}
