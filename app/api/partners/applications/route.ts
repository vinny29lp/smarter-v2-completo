/**
 * POST /api/partners/applications
 * Inscreve um Student existente em uma Vacancy existente (cria Application),
 * escopado à franquia do token de parceiro. Usada pelo funcionário de IA
 * "RH/Recruiter" do AI Workforce OS/Alizo para adicionar candidatos —
 * já lidos hoje via GET /api/partners/candidates — às vagas abertas.
 * Auth: Bearer token validado contra partner_api_tokens (ver lib/partner-auth.ts),
 * exigindo o escopo "recruitment".
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerCriarApplicationSchema, zodError } from "@/lib/api-schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await authenticatePartnerCrmToken(req, "recruitment");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_applications_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const rawBody = await req.json();
  const parsed = partnerCriarApplicationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const [student, vacancy] = await Promise.all([
    prisma.student.findUnique({
      where: { id: body.studentId },
      select: { franchiseId: true, discResult: true, curso: true },
    }),
    prisma.vacancy.findUnique({
      where: { id: body.vacancyId },
      select: { franchiseId: true, discDesejado: true, area: true },
    }),
  ]);

  if (!student) {
    return apiErr("Estudante não encontrado.", 404, "PARTNER_NOT_FOUND");
  }
  if (!vacancy) {
    return apiErr("Vaga não encontrada.", 404, "PARTNER_NOT_FOUND");
  }
  if (student.franchiseId !== auth.franchiseId) {
    return apiErr("Este estudante não pertence à franquia do token informado.", 403, "PARTNER_FORBIDDEN");
  }
  if (vacancy.franchiseId !== auth.franchiseId) {
    return apiErr("Esta vaga não pertence à franquia do token informado.", 403, "PARTNER_FORBIDDEN");
  }

  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId: body.studentId, vacancyId: body.vacancyId } },
  });
  if (existing) {
    return apiErr("Estudante já inscrito nesta vaga.", 409, "PARTNER_CONFLICT");
  }

  let matching = 60;
  if (student.discResult && vacancy.discDesejado) {
    matching = student.discResult === vacancy.discDesejado ? 95 : 65;
  } else if (student.curso && vacancy.area) {
    matching = 70;
  }

  const application = await prisma.application.create({
    data: {
      studentId: body.studentId,
      vacancyId: body.vacancyId,
      matching,
      etapa: "inscritos",
      status: "ativo",
    },
  });

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "APPLICATION_CRIADA_PARCEIRO",
    modulo: "processos",
    detalhes: `application:${application.id} | student:${body.studentId} | vacancy:${body.vacancyId} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ application }, { status: 201 });
}
