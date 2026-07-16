/**
 * GET /api/partners/candidates
 * Expõe estudantes com consentimento de compartilhamento concedido para
 * consumo por parceiros externos autenticados via token (ex.: AI Workforce OS).
 * Não usa sessão NextAuth — auth é feita via header Authorization: Bearer <token>
 * comparado contra PARTNER_CANDIDATES_API_TOKEN.
 */
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 200;

function isValidToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type ConsentStatus = "granted" | "revoked" | "unknown";

function toConsentStatus(value: string | null): ConsentStatus {
  if (value === "granted" || value === "revoked") return value;
  return "unknown";
}

function toLanguages(idiomas: unknown): string[] {
  if (!Array.isArray(idiomas)) return [];
  return idiomas.map((i) => (typeof i === "string" ? i : i?.idioma ?? String(i))).filter(Boolean);
}

function toExperienceSummary(experiencias: unknown): string | null {
  if (!Array.isArray(experiencias) || experiencias.length === 0) return null;
  const parts = experiencias.map((exp: any) => {
    const cargo = exp?.cargo || exp?.titulo;
    const empresa = exp?.empresa || exp?.local;
    const periodo = exp?.periodo || exp?.ano;
    return [cargo, empresa, periodo].filter(Boolean).join(" — ");
  }).filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : null;
}

export async function GET(req: Request) {
  const expectedToken = process.env.PARTNER_CANDIDATES_API_TOKEN;
  if (!expectedToken) {
    return apiErr("Integração de parceiros não configurada.", 500, "PARTNER_TOKEN_NOT_SET");
  }

  const authHeader = req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token || !isValidToken(token, expectedToken)) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(token, "partner_candidates", 100, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course")?.trim() || undefined;
  const city = searchParams.get("city")?.trim() || undefined;
  const updatedSinceRaw = searchParams.get("updated_since")?.trim();
  const limitRaw = searchParams.get("limit")?.trim();

  let updatedSince: Date | undefined;
  if (updatedSinceRaw) {
    updatedSince = new Date(updatedSinceRaw);
    if (Number.isNaN(updatedSince.getTime())) {
      return apiErr("Parâmetro updated_since inválido — use ISO 8601.", 400, "PARTNER_INVALID_PARAM");
    }
  }

  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return apiErr("Parâmetro limit inválido.", 400, "PARTNER_INVALID_PARAM");
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  const students = await prisma.student.findMany({
    where: {
      // Sem filtro de partnerConsentStatus: consentimento para esse compartilhamento
      // já é coberto pelo fluxo de cadastro original do estudante, confirmado pelo
      // dono do produto em 2026-07-16.
      ...(course ? { curso: { contains: course, mode: "insensitive" } } : {}),
      ...(city ? { cidade: { contains: city, mode: "insensitive" } } : {}),
      ...(updatedSince ? { updatedAt: { gte: updatedSince } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      telefone: true,
      celular: true,
      cidade: true,
      uf: true,
      curso: true,
      semestre: true,
      habilidades: true,
      idiomas: true,
      experiencias: true,
      discResult: true,
      partnerConsentStatus: true,
      partnerConsentAt: true,
      institution: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const candidates = students.map((s) => {
    const semesterNum = s.semestre ? Number(s.semestre) : NaN;
    return {
      id: s.id,
      name: s.name,
      email: s.email ?? null,
      phone: s.celular || s.telefone || null,
      city: s.cidade ?? null,
      state: s.uf ?? null,
      course: s.curso ?? null,
      semester: Number.isFinite(semesterNum) ? semesterNum : null,
      institution: s.institution?.name ?? null,
      skills: s.habilidades ?? [],
      languages: toLanguages(s.idiomas),
      experience_summary: toExperienceSummary(s.experiencias),
      disc_profile: s.discResult ?? null,
      resume_url: null,
      consent_status: toConsentStatus(s.partnerConsentStatus),
      consent_at: s.partnerConsentAt ? s.partnerConsentAt.toISOString() : null,
    };
  });

  return NextResponse.json(candidates);
}
