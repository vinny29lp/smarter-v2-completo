import { toggleVacancyStatus, updateVacancy } from "@/lib/actions/vacancies";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ownership check: impede alteração de vaga de outra franquia
  if (role !== "FRANQUEADORA") {
    const vaga = await prisma.vacancy.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!vaga || vaga.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  if (body.status) {
    const vaga = await toggleVacancyStatus(params.id, body.status);
    return NextResponse.json({ vaga });
  }
  const vaga = await updateVacancy(params.id, body);
  return NextResponse.json({ vaga });
  } catch (e) {
    return handleApiError(e, "VAGAS_ID_PATCH");
  }
}
