/**
 * http.ts — Leitura segura de respostas de fetch no cliente.
 *
 * Bug clássico: `await res.json()` direto quebra com
 * `SyntaxError: Unexpected token '...' is not valid JSON` sempre que o
 * servidor (ou algo na frente dele — proxy, CDN, o limite de tamanho de
 * requisição do Vercel) devolve texto puro ou HTML em vez de JSON. O caso
 * mais comum aqui: upload de arquivo grande estoura o limite de ~4,5 MB de
 * corpo de requisição das Serverless Functions do Vercel (não configurável
 * via Next.js) e a plataforma responde 413 "Request Entity Too Large" em
 * texto puro, antes até da nossa rota rodar — o front tenta fazer
 * `res.json()` nesse texto e quebra, mostrando o erro técnico cru pro
 * usuário em vez de uma mensagem clara.
 *
 * Toda tela que faz fetch pra uma rota de upload (ou qualquer rota onde uma
 * resposta não-JSON é plausível) deve usar `parseJsonResponse` no lugar de
 * `res.json()` direto.
 */

function mensagemPorStatus(status: number): string {
  if (status === 413) return "Arquivo muito grande para ser enviado. Reduza o tamanho e tente novamente.";
  if (status === 401) return "Sessão expirada. Recarregue a página e faça login novamente.";
  if (status === 403) return "Sem permissão para esta ação.";
  if (status === 502 || status === 503 || status === 504) return "Servidor indisponível no momento. Tente novamente em instantes.";
  if (status >= 500) return "Erro no servidor. Tente novamente em instantes.";
  return "Não foi possível processar a resposta do servidor. Tente novamente.";
}

/**
 * Lê o corpo de uma resposta de fetch como JSON. Se o corpo não for JSON
 * válido (ou estiver vazio numa resposta de erro), devolve
 * `{ error: <mensagem amigável baseada no status> }` em vez de lançar a
 * exceção de parse crua.
 */
export async function parseJsonResponse(res: Response): Promise<any> {
  const texto = await res.text();
  if (!texto.trim()) {
    return res.ok ? {} : { error: mensagemPorStatus(res.status) };
  }
  try {
    return JSON.parse(texto);
  } catch {
    return { error: mensagemPorStatus(res.status) };
  }
}
