/**
 * POST /api/app/franquia-crm/[id]/send-email
 * Envia um e-mail comercial de franquia para o lead.
 * Body: { template: "apresentacao_negocio" | "follow_up" | "proposta_financeira" | "boas_vindas" | "reaquecimento_30d" | "reaquecimento_frio" }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { getFranquiaEmailTemplate, resolveFranquiaSubject } from "@/lib/crm/franquia-email-templates";
import { handleApiError } from "@/lib/api-response";
import { nanoid } from "nanoid";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const templateKey = body.template as string;
    if (!templateKey) return NextResponse.json({ error: "Template obrigatório" }, { status: 400 });

    const lead = await prisma.franquiaLead.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, nomeCompleto: true, cidade: true, estado: true },
    });

    if (!lead)       return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ error: "Lead sem e-mail cadastrado" }, { status: 422 });

    const tpl = getFranquiaEmailTemplate(templateKey);
    if (!tpl) return NextResponse.json({ error: "Template inválido" }, { status: 400 });

    const subject = resolveFranquiaSubject(tpl, lead.nomeCompleto);
    const html    = tpl.html({ nome: lead.nomeCompleto, cidade: lead.cidade, estado: lead.estado });

    const sent = await sendMail(lead.email, subject, html);
    if (!sent) return NextResponse.json({ error: "Falha ao enviar e-mail" }, { status: 500 });

    await prisma.franquiaNota.create({
      data: {
        id: nanoid(),
        leadId: params.id,
        texto: `✉️ E-mail enviado: "${subject}"`,
        tipo: "email",
      },
    });

    await prisma.franquiaLead.update({
      where: { id: params.id },
      data: { ultimoContato: new Date() },
    });

    return NextResponse.json({ ok: true, subject });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_SEND_EMAIL");
  }
}
