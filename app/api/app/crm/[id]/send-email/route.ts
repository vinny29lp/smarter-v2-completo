/**
 * POST /api/app/crm/[id]/send-email
 * Envia manualmente um e-mail comercial para o lead.
 * Body: { template: "primeiro_contato" | "apresentacao" | "proposta" | "negociacao" | "fechado" }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { getEmailTemplate, resolveSubject } from "@/lib/crm/email-templates";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const template = body.template as string;

    if (!template) return NextResponse.json({ error: "Template obrigatório" }, { status: 400 });

    const lead = await prisma.crmLead.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, empresa: true, contato: true, setor: true },
    });

    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ error: "Lead sem e-mail cadastrado" }, { status: 422 });

    const tpl = getEmailTemplate(template);
    if (!tpl) return NextResponse.json({ error: "Template inválido" }, { status: 400 });

    const subject = resolveSubject(tpl, lead.empresa);
    const html = tpl.html({ empresa: lead.empresa, contato: lead.contato, setor: lead.setor });

    const sent = await sendMail(lead.email, subject, html);

    if (!sent) return NextResponse.json({ error: "Falha ao enviar e-mail" }, { status: 500 });

    // Registra na timeline
    await prisma.crmNota.create({
      data: {
        leadId: params.id,
        texto: `✉️ E-mail enviado manualmente: "${subject}"`,
        tipo: "email",
      },
    });

    await prisma.crmLead.update({
      where: { id: params.id },
      data: { ultimoContato: new Date() },
    });

    return NextResponse.json({ ok: true, subject });
  } catch (e) {
    return handleApiError(e, "CRM_SEND_EMAIL");
  }
}
