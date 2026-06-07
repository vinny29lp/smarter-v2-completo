import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/app/franqueados/[id]/crm
// Retorna leads de CRM de uma unidade específica — acessível apenas pela FRANQUEADORA
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const leads = await prisma.crmLead.findMany({
    where: { franchiseId: params.id },
    include: {
      company: { select: { id: true, name: true } },
      tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 3 },
      notas: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { notas: true, tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ leads });
  } catch (e) {
    return handleApiError(e, "FRANQUEADO_CRM_GET");
  }
}
