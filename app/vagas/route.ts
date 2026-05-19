import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVacancy, getVacancies } from "@/lib/actions/vacancies";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const vagas = await getVacancies(
    session?.user?.franchiseId,
    session?.user?.companyId
  );
  return NextResponse.json({ vagas });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const vaga = await createVacancy({ ...body, franchiseId: session.user.franchiseId });
  return NextResponse.json({ vaga });
}
