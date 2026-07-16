/**
 * POST /api/partners/vacancies
 * Cria uma Vacancy nova, escopada à franquia do token de parceiro.
 * Usada pelo funcionário de IA "RH/Recruiter" do AI Workforce OS/Alizo para
 * abrir vagas direto no Kanban de Processos Seletivos da unidade correspondente.
 * Auth: Bearer token validado contra partner_api_tokens (ver lib/partner-auth.ts),
 * exigindo o escopo "recruitment".
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerCriarVagaSchema, zodError } from "@/lib/api-schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await authenticatePartnerCrmToken(req, "recruitment");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_vacancies_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const rawBody = await req.json();
  const parsed = partnerCriarVagaSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const company = await prisma.company.findUnique({
    where: { id: body.companyId },
    select: { franchiseId: true },
  });
  if (!company) {
    return apiErr("Empresa não encontrada.", 404, "PARTNER_NOT_FOUND");
  }
  if (company.franchiseId !== auth.franchiseId) {
    return apiErr("Esta empresa não pertence à franquia do token informado.", 403, "PARTNER_FORBIDDEN");
  }

  const vacancy = await prisma.vacancy.create({
    data: {
      titulo:         body.titulo,
      funcao:         body.funcao || null,
      area:           body.area || null,
      descricao:      body.descricao || null,
      requisitos:     body.requisitos || null,
      beneficios:     body.beneficios || null,
      modalidade:     body.modalidade || "Presencial",
      bolsa:          body.bolsa,
      auxTransporte:  body.auxTransporte,
      cargaHoraria:   body.cargaHoraria ?? 30,
      chDiaria:       body.chDiaria ?? 6,
      horario:        body.horario || null,
      diasSemana:     body.diasSemana || null,
      cidade:         body.cidade || null,
      uf:             body.uf || null,
      discDesejado:   body.discDesejado || null,
      nivel:          body.nivel || null,
      cursoRequerido: body.cursoRequerido || null,
      companyId:      body.companyId,
      franchiseId:    auth.franchiseId,
    },
  });

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "VAGA_CRIADA_PARCEIRO",
    modulo: "processos",
    detalhes: `vacancy:${vacancy.id} | titulo:${body.titulo} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ vacancy }, { status: 201 });
}
