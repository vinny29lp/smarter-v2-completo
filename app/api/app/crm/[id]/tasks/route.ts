import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  // Ownership check: verify the lead belongs to the user's franchise
  if (role !== "FRANQUEADORA") {
    const lead = await prisma.crmLead.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!lead || lead.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const task = await prisma.crmTask.create({
    data: {
      leadId:     params.id,
      descricao:  body.descricao,
      dueAt:      body.dueAt ? new Date(body.dueAt) : null,
      linkReuniao:body.linkReuniao || null,
      endereco:   body.endereco || null,
    },
  });
  return NextResponse.json({ task });
  } catch (e) {
    return handleApiError(e, "CRM_TASKS_POST");
  }
}
