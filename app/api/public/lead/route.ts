import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.empresa && !body.contato) {
    return NextResponse.json({ error: "Informe ao menos empresa ou nome." }, { status: 400 });
  }

  // Encontrar franquia pelo ref
  let franchiseId: string | undefined;
  if (body.franchiseRef) {
    const f = await prisma.franchise.findUnique({ where: { id: body.franchiseRef } });
    franchiseId = f?.id;
  }
  if (!franchiseId) {
    const f = await prisma.franchise.findFirst({ where: { status: "ATIVO" } });
    franchiseId = f?.id;
  }
  if (!franchiseId) return NextResponse.json({ error: "Franquia não encontrada." }, { status: 400 });

  const lead = await prisma.crmLead.create({
    data: {
      empresa:     body.empresa || body.contato,
      contato:     body.contato || null,
      email:       body.email || null,
      telefone:    body.telefone || null,
      etapa:       "novo_lead",
      situacao:    "ativo",
      proximaAcao: "Entrar em contato",
      anotacao:    body.observacao || null,
      franchiseId,
    },
  });

  // Nota inicial automática
  await prisma.crmNota.create({
    data: {
      leadId: lead.id,
      texto: `Lead captado via ${body.origem === "trafego_pago" ? "tráfego pago" : body.origem === "equipe_comercial" ? "equipe comercial" : "link público"}.${body.observacao ? " Observação: " + body.observacao : ""}`,
      tipo: "anotacao",
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
