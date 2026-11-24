/**
 * Integração com a Universidade Smarter (universidade.smarterestagios.com.br).
 * - Login único: o sistema assina um token curto (HMAC) e a universidade cria a sessão por ele.
 * - Progresso: o sistema consulta, assinado, quantos módulos o usuário concluiu.
 * O segredo (UNIVERSIDADE_SSO_SECRET) é o mesmo guardado na tabela sso_config do Supabase da universidade.
 */
import { createHmac } from "crypto";

export const UNIVERSIDADE_URL = process.env.UNIVERSIDADE_URL || "https://universidade.smarterestagios.com.br/Universidade%20Smarter";
const SUPABASE_FN = process.env.UNIVERSIDADE_SUPABASE_URL || "https://ahkfjpwlyqgypsbpogwx.supabase.co/functions/v1";
const SUPABASE_ANON = process.env.UNIVERSIDADE_SUPABASE_ANON || "";

const segredo = () => process.env.UNIVERSIDADE_SSO_SECRET || "";

export function universidadeConfigurada() { return segredo().length >= 32; }

const b64url = (s: string) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Token de login único: base64url(payload).hmac — expira em 2 minutos. */
export function gerarTokenSso(email: string, nome: string, agora = Math.floor(Date.now() / 1000)): string {
  const payload = b64url(JSON.stringify({ email: email.trim().toLowerCase(), name: (nome || "").slice(0, 120), exp: agora + 120 }));
  const sig = createHmac("sha256", segredo()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function urlDeEntrada(email: string, nome: string): string {
  return `${UNIVERSIDADE_URL}#sso=${encodeURIComponent(gerarTokenSso(email, nome))}`;
}

export type StatusUniversidade = { existe: boolean; total: number; feitos: number; concluido: boolean };

/** Consulta o progresso na universidade. Retorna null se indisponível (nunca libera por falha). */
export async function statusUniversidade(email: string): Promise<StatusUniversidade | null> {
  if (!universidadeConfigurada()) return null;
  try {
    const e = email.trim().toLowerCase();
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", segredo()).update(`${e}|${ts}`).digest("hex");
    const r = await fetch(`${SUPABASE_FN}/training-status`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", ...(SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}) },
      body: JSON.stringify({ email: e, ts, sig }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.ok) return null;
    return { existe: !!d.existe, total: Number(d.total) || 0, feitos: Number(d.feitos) || 0, concluido: !!d.concluido };
  } catch { return null; }
}
