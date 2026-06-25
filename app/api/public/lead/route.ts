import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // ALTO-C: rate limit — 10 leads/min por IP (formulário público de captação)
  const ip = getClientIpFromRequest(req);
  if (!checkRateLimit(ip, "public_lead", 10, 60_000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  const body = await req.json();
  if (!body.empresa && !body.contato) {
    return NextResponse.json({ error: "Informe ao menos empresa ou nome." }, { status: 400 });
  }

  // Roteamento de leads:
  //   ?ref=FRANCHISE_ID  → lead vai para aquela unidade (franchiseId = ID)
  //   sem ref (link do site principal) → lead vai para FRANQUEADORA (franchiseId = null)
  let franchiseId: string | null = null;

  if (body.franchiseRef) {
    const f = await prisma.franchise.findUnique({
      where: { id: body.franchiseRef },
      select: { id: true, status: true },
    });
    // Só roteia para a unidade se ela existir e estiver ativa
    if (f && f.status === "ATIVO") {
      franchiseId = f.id;
    }
    // Se ref inválido/inativo → cai para FRANQUEADORA (franchiseId null)
  }

  const origem = body.origem || "link_publico";
  const origemLabel =
    origem === "trafego_pago"      ? "tráfego pago"
    : origem === "equipe_comercial" ? "equipe comercial"
    : "link público";

  const lead = await prisma.crmLead.create({
    data: {
      empresa:        body.empresa || body.contato,
      contato:        body.contato || null,
      email:          body.email   || null,
      telefone:       body.telefone || null,
      etapa:          "novo_lead",
      situacao:       "ativo",
      proximaAcao:    "Entrar em contato",
      anotacao:       body.observacao || null,
      franchiseId,            // null = FRANQUEADORA; ID = unidade específica
      optIn:          body.optIn === true,
      optInAt:        body.optIn === true ? new Date() : null,
      origem,
      setor:          body.setor || null,
      etapaChangedAt: new Date(),
    } as any,
  });

  // Nota inicial automática com destino do lead
  const destino = franchiseId ? `unidade ${franchiseId}` : "FRANQUEADORA";
  await prisma.crmNota.create({
    data: {
      leadId: lead.id,
      texto:  `Lead captado via ${origemLabel}. Destino: ${destino}.${body.observacao ? " Observação: " + body.observacao : ""}`,
      tipo:   "anotacao",
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
