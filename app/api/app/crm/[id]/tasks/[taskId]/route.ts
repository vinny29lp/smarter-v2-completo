import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  } catch (e) {
    return handleApiError(e, "CRM_TASK_PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: { taskId: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.crmTask.delete({ where: { id: params.taskId } });
  return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "CRM_TASK_DELETE");
  }
}
