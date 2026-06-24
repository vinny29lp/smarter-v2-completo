/**
 * POST /api/app/crm/[id]/whatsapp-click
 * Registra um clique no botão de WhatsApp como nota na timeline do lead.
 * Body: { templateLabel: string }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const label = body.templateLabel || "mensagem comercial";

    await prisma.crmNota.create({
      data: {
        leadId: params.id,
        texto: `📱 WhatsApp aberto — "${label}" enviado ao contato.`,
        tipo: "whatsapp",
      },
    });

    await prisma.crmLead.update({
      where: { id: params.id },
      data: { ultimoContato: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "CRM_WHATSAPP_CLICK");
  }
}
