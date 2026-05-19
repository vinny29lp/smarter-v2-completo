import { toggleVacancyStatus, updateVacancy } from "@/lib/actions/vacancies";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.status) {
    const vaga = await toggleVacancyStatus(params.id, body.status);
    return NextResponse.json({ vaga });
  }
  const vaga = await updateVacancy(params.id, body);
  return NextResponse.json({ vaga });
}
