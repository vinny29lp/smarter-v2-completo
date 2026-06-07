/**
 * Rate Limiter in-memory — sem dependência externa (Redis, Upstash).
 * Adequado para até ~100 franqueados / escala atual do sistema.
 *
 * Estratégia: sliding window por IP.
 * Reset automático a cada cold start do Lambda (Vercel reinicia os módulos).
 *
 * ALTO-C: proteção de rotas públicas contra spam e abuso:
 *   - /api/public/estudante  → cadastro (bcrypt + email)
 *   - /api/public/lead       → CRM lead capture
 *   - /api/auth/forgot-password → bcrypt + email
 *
 * Upgrade: quando migrar para Supabase Pro / Upstash, trocar por:
 *   import { Ratelimit } from "@upstash/ratelimit"
 *   import { Redis }     from "@upstash/redis"
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Limpeza periódica para evitar memory leak em instâncias de longa duração
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Verifica se o IP pode fazer mais requests.
 * @param ip  - IP do cliente (x-forwarded-for ou fallback)
 * @param key - prefixo da rota (ex: "public_estudante")
 * @param max - máximo de requests por janela
 * @param windowMs - tamanho da janela em ms (padrão: 60s)
 * @returns true se permitido, false se bloqueado
 */
export function checkRateLimit(
  ip: string,
  key: string,
  max = 10,
  windowMs = 60_000,
): boolean {
  const id = `${key}:${ip}`;
  const now = Date.now();
  const entry = store.get(id);

  if (!entry || now > entry.resetAt) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/**
 * Extrai o IP real do cliente considerando proxies (Vercel, Cloudflare).
 */
export function getClientIpFromRequest(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
