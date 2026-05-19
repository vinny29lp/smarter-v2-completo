import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string; taskId: string } }) {
  const body = await req.json();
  const task = await prisma.crmTask.update({
    where: { id: params.taskId },
    data: {
      done:        body.done !== undefined ? body.done : undefined,
      descricao:   body.descricao || undefined,
      dueAt:       body.dueAt ? new Date(body.dueAt) : undefined,
      linkReuniao: body.linkReuniao !== undefined ? body.linkReuniao : undefined,
      endereco:    body.endereco !== undefined ? body.endereco : undefined,
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: { params: { taskId: string } }) {
  await prisma.crmTask.delete({ where: { id: params.taskId } });
  return NextResponse.json({ ok: true });
}
