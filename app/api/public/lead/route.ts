import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
import { enviarNotificacaoNovoLead } from "@/lib/email";
import { getSystemConfig } from "@/lib/getConfig";

const _rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = (_rawAppUrl && !_rawAppUrl.includes("localhost") && !_rawAppUrl.includes("127.0.0"))
  ? _rawAppUrl.replace(/\/$/, "")
  : "https://sistema.smarterestagios.com.br";

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
    origem === "trafego_pago"           ? "tráfego pago"
    : origem === "equipe_comercial"      ? "equipe comercial"
    : origem === "apresentacao_empresas" ? "apresentação comercial (aba Empresas)"
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

  // Notificação interna por e-mail para quem deve agir no lead — não bloqueia
  // a resposta ao formulário se o envio falhar (ex: RESEND_API_KEY ausente).
  try {
    let destinatarioEmail: string | null = null;
    if (franchiseId) {
      const franquia = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { email: true },
      });
      destinatarioEmail = franquia?.email || null;
    } else {
      const cfg = await getSystemConfig();
      destinatarioEmail = cfg?.email || null;
    }

    if (destinatarioEmail) {
      await enviarNotificacaoNovoLead({
        destinatarioEmail,
        nomeContato: lead.contato || lead.empresa,
        empresa: lead.empresa,
        whatsapp: lead.telefone,
        email: lead.email,
        origemLabel,
        leadUrl: `${APP_URL}/dashboard/crm/${lead.id}`,
      });
    }
  } catch (e) {
    console.error("[public/lead] falha ao enviar notificação de novo lead:", e);
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
