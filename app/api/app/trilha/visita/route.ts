/** POST /api/app/trilha/visita — registra uma visita/apresentação a empresa. FRANQUEADO/FUNCIONARIO; a unidade vem da sessão. */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
const RESULTADOS = ["apresentou", "proposta", "agendou", "sem_interesse"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role || "";
    const franchiseId = (session.user as any).franchiseId as string | undefined;
    if (!["FRANQUEADO", "FUNCIONARIO"].includes(role) || !franchiseId || franchiseId === "FRANQUEADORA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const empresa = String(b.empresa ?? "").replace(/[<>]/g, "").trim().slice(0, 120);
    const resultado = RESULTADOS.includes(b.resultado) ? b.resultado : "apresentou";
    if (empresa.length < 2) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    let crmLeadId: string | null = null;
    if (b.crmLeadId) {
      const lead = await prisma.crmLead.findUnique({ where: { id: String(b.crmLeadId) }, select: { id: true, franchiseId: true } });
      if (lead && lead.franchiseId === franchiseId) crmLeadId = lead.id;
    }
    const v = await prisma.visitaEmpresa.create({
      data: { franchiseId, userId: (session.user as any).id, crmLeadId, empresa, resultado, observacao: String(b.observacao ?? "").slice(0, 500) || null },
    });
    return NextResponse.json({ ok: true, id: v.id });
  } catch (e) { return handleApiError(e, "TRILHA_VISITA"); }
}
