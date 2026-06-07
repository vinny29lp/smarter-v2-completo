import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVacancy, getVacancies } from "@/lib/actions/vacancies";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    // CRIT-002: paginação — evita OOM na view da Franqueadora com 100+ franqueados
    const result = await getVacancies(
      session.user?.franchiseId,
      session.user?.companyId,
      page,
      limit,
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/app/vagas]", err);
    return NextResponse.json({ error: err.message || "Erro ao carregar vagas", vagas: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.franchiseId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const body = await req.json();
    // Sanitize: only pass fields known to the Vacancy schema
    const {
      titulo, funcao, area, descricao, requisitos, beneficios,
      modalidade, bolsa, auxTransporte, cargaHoraria, chDiaria,
      horario, cidade, uf, discDesejado, companyId,
    } = body;
    const vaga = await createVacancy({
      titulo, funcao, area, descricao, requisitos, beneficios,
      modalidade, bolsa, auxTransporte, cargaHoraria, chDiaria,
      horario, cidade, uf, discDesejado, companyId,
      franchiseId: session.user.franchiseId,
    });
    return NextResponse.json({ vaga });
  } catch (err: any) {
    console.error("[POST /api/app/vagas]", err);
    return NextResponse.json({ error: err.message || "Erro ao criar vaga" }, { status: 500 });
  }
}
