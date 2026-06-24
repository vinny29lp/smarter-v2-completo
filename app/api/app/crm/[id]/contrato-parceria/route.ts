/**
 * GET /api/app/crm/[id]/contrato-parceria
 * Gera e retorna o HTML do Contrato de Parceria para o lead.
 * Salva o HTML no campo contratoHtml do lead.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { gerarContratoParceria } from "@/lib/crm/contrato-parceria";
import { handleApiError } from "@/lib/api-response";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await prisma.crmLead.findUnique({
      where: { id: params.id },
      include: { franchise: { select: { name: true, razaoSocial: true, cnpj: true, endereco: true, cidade: true, uf: true } } },
    });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    const fr = lead.franchise;
    const html = gerarContratoParceria({
      empresa:        lead.empresa,
      cnpjEmpresa:    null,
      contato:        lead.contato,
      cargoContato:   (lead as any).cargo || null,
      smarter: {
        razaoSocial: fr?.razaoSocial || fr?.name || "Smarter Estágios",
        cnpj:        fr?.cnpj || "00.000.000/0000-00",
        endereco:    fr ? `${fr.cidade}/${fr.uf}` : "São Paulo/SP",
      },
      unidade:     fr?.name || undefined,
      valorMensal: lead.valorNegociado || null,
    });

    // Salva no lead para histórico
    await prisma.crmLead.update({
      where: { id: params.id },
      data: { contratoHtml: html } as any,
    });

    // Nota na timeline
    await prisma.crmNota.create({
      data: {
        leadId: params.id,
        texto: "📄 Contrato de Parceria gerado.",
        tipo: "anotacao",
      },
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return handleApiError(e, "CRM_CONTRATO_PARCERIA");
  }
}
