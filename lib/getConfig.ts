import { prisma } from "./prisma";

let _cache: any = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function getSystemConfig(): Promise<any | null> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    _cache = cfg;
    _cacheAt = Date.now();
    return cfg;
  } catch {
    return null;
  }
}

/** Clear config cache (call after PATCH /api/app/config) */
export function clearConfigCache() {
  _cache = null;
  _cacheAt = 0;
}
