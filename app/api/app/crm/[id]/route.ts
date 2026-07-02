import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { sendMail } from "@/lib/email";
import { getEmailTemplate, resolveSubject } from "@/lib/crm/email-templates";
import { SLA_CONFIG } from "@/lib/crm/sla-config";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  const lead = await prisma.crmLead.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      tasks: { orderBy: { createdAt: "desc" } },
      notas: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership check: FRANQUEADO/FUNCIONARIO só acessa lead da própria franquia
  if (role !== "FRANQUEADORA" && lead.franchiseId !== franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ lead });
  } catch (e) {
    return handleApiError(e, "CRM_ID_GET");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  // Ação especial: adicionar nota ao histórico
  if (body.action === "add_nota") {
    const nota = await prisma.crmNota.create({
      data: {
        leadId: params.id,
        texto: body.texto,
        tipo: body.tipo || "anotacao",
      },
    });
    // Atualizar ultimoContato
    await prisma.crmLead.update({
      where: { id: params.id },
      data: { ultimoContato: new Date(), anotacao: body.texto },
    });
    return NextResponse.json({ nota });
  }

  // Ação especial: marcar como vendido
  if (body.action === "vendido") {
    const leadPre = await prisma.crmLead.findUnique({
      where: { id: params.id },
      select: { email: true, optIn: true, empresa: true, contato: true, setor: true },
    });
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { etapa: "fechado", situacao: "vendido", convertido: true, ultimoContato: new Date(), etapaChangedAt: new Date() },
    });
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: body.observacao || "🏆 Lead marcado como VENDIDO!", tipo: "anotacao" },
    });
    // E-mail de boas-vindas (módulo 5)
    if (leadPre?.email && leadPre.optIn) {
      try {
        const tpl = getEmailTemplate("fechado");
        if (tpl) {
          const subject = resolveSubject(tpl, leadPre.empresa);
          const html = tpl.html({ empresa: leadPre.empresa, contato: leadPre.contato, setor: leadPre.setor });
          const sent = await sendMail(leadPre.email, subject, html);
          if (sent) {
            await prisma.crmNota.create({
              data: { leadId: params.id, texto: `✉️ E-mail de boas-vindas enviado: "${subject}"`, tipo: "email" },
            });
          }
        }
      } catch (e) { console.error("[crm] vendido email error:", e); }
    }
    return NextResponse.json({ lead });
  }

  // Ação especial: marcar como perdido
  if (body.action === "perdido") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "perdido", ultimoContato: new Date() },
    });
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: body.motivo || "Lead marcado como PERDIDO.", tipo: "anotacao" },
    });
    return NextResponse.json({ lead });
  }

  // Ação especial: tirar da trilha (pausar)
  if (body.action === "pausar") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "pausado" },
    });
    return NextResponse.json({ lead });
  }

  // Ação especial: reativar
  if (body.action === "reativar") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "ativo" },
    });
    return NextResponse.json({ lead });
  }

  // Atualização geral
  const lead = await prisma.crmLead.update({
    where: { id: params.id },
    data: {
      ...(body.etapa          !== undefined ? { etapa: body.etapa, etapaChangedAt: new Date() } : {}),
      ...(body.prioridade     !== undefined ? { prioridade: body.prioridade }                 : {}),
      ...(body.valorNegociado !== undefined ? { valorNegociado: body.valorNegociado ? parseFloat(body.valorNegociado) : null } : {}),
      ...(body.retornoAt      !== undefined ? { retornoAt: body.retornoAt ? new Date(body.retornoAt) : null } : {}),
      ...(body.reuniaoAt      !== undefined ? { reuniaoAt: body.reuniaoAt ? new Date(body.reuniaoAt) : null } : {}),
      ...(body.linkReuniao    !== undefined ? { linkReuniao: body.linkReuniao }               : {}),
      ...(body.enderecoReuniao!== undefined ? { enderecoReuniao: body.enderecoReuniao }       : {}),
      ...(body.proximaAcao    !== undefined ? { proximaAcao: body.proximaAcao }               : {}),
      ...(body.anotacao       !== undefined ? { anotacao: body.anotacao, ultimoContato: new Date() } : {}),
      ...(body.empresa        !== undefined ? { empresa: body.empresa }                       : {}),
      ...(body.contato        !== undefined ? { contato: body.contato }                       : {}),
      ...(body.email          !== undefined ? { email: body.email }                           : {}),
      ...(body.telefone       !== undefined ? { telefone: body.telefone }                     : {}),
      ...(body.cargo          !== undefined ? { cargo: body.cargo }                           : {}),
      ...(body.cidade         !== undefined ? { cidade: body.cidade }                         : {}),
      ...(body.uf             !== undefined ? { uf: body.uf }                                 : {}),
      ...(body.whatsapp       !== undefined ? { whatsapp: body.whatsapp }                     : {}),
      ...(body.instagram      !== undefined ? { instagram: body.instagram }                   : {}),
      ...(body.linkedin       !== undefined ? { linkedin: body.linkedin }                     : {}),
      ...(body.setor          !== undefined ? { setor: body.setor }                           : {}),
      ...(body.origem         !== undefined ? { origem: body.origem }                         : {}),
    },
    include: {
      tasks: { orderBy: { createdAt: "desc" } },
      notas: { orderBy: { createdAt: "desc" } },
    },
  });
  // Módulo 5 — trigger de e-mail ao mover de etapa (somente se optIn e email)
  // Módulo 7 — nota de mudança de etapa na timeline
  if (body.etapa) {
    try {
      const fullLead = await prisma.crmLead.findUnique({
        where: { id: params.id },
        select: { email: true, optIn: true, empresa: true, contato: true, setor: true, etapa: true },
      });

      // Nota de etapa na timeline
      const novaEtapa = SLA_CONFIG[body.etapa]?.label || body.etapa;
      await prisma.crmNota.create({
        data: {
          leadId: params.id,
          texto: `📍 Etapa atualizada para "${novaEtapa}".`,
          tipo: "etapa",
        },
      });

      // E-mail comercial (só com optIn)
      if (fullLead?.email && fullLead.optIn) {
        const tpl = getEmailTemplate(body.etapa);
        if (tpl) {
          const subject = resolveSubject(tpl, fullLead.empresa);
          const html = tpl.html({
            empresa: fullLead.empresa,
            contato: fullLead.contato,
            setor: fullLead.setor,
          });
          const sent = await sendMail(fullLead.email, subject, html);
          if (sent) {
            await prisma.crmNota.create({
              data: {
                leadId: params.id,
                texto: `✉️ E-mail comercial enviado: "${subject}"`,
                tipo: "email",
              },
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("[crm] email trigger error:", emailErr);
      // Não interrompe a resposta
    }
  }

  return NextResponse.json({ lead });
  } catch (e) {
    return handleApiError(e, "CRM_ID_PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  // Ownership check: impede exclusão de lead de outra franquia
  if (role !== "FRANQUEADORA") {
    const lead = await prisma.crmLead.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!lead || lead.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.crmLead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "CRM_ID_DELETE");
  }
}
