/**
 * POST /api/app/crm/[id]/enviar-apresentacao
 *
 * Gera (ou reutiliza) o token rastreável da apresentação comercial para o lead,
 * retorna as mensagens prontas por canal e registra o envio na timeline.
 *
 * Body: { canal: "email" | "whatsapp" | "instagram" | "linkedin" | "link" }
 *
 * Response: {
 *   link: string,
 *   mensagem: string,
 *   assunto?: string,  // só para email
 *   htmlEmail?: string, // só para email
 * }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { sendMail } from "@/lib/email";
import { randomUUID } from "crypto";
import {
  msgEmail, msgWhatsApp, msgInstagram, msgLinkedIn,
  htmlEmailApresentacao,
  ApresentacaoMsgParams,
} from "@/lib/crm/apresentacao-messages";

const APP_URL = process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { canal } = await req.json() as { canal: string };
    const canaisValidos = ["email", "whatsapp", "instagram", "linkedin", "link"];
    if (!canaisValidos.includes(canal)) {
      return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
    }

    // Busca o lead
    const lead = await prisma.crmLead.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        empresa: true,
        contato: true,
        email: true,
        telefone: true,
        whatsapp: true,
        setor: true,
        franchiseId: true,
        apresentacaoToken: true,
      },
    });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    // Ownership check
    if (role !== "FRANQUEADORA" && lead.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Busca dados da unidade (para personalizar a mensagem)
    let franquia: {
      name: string;
      responsavel: string;
      email: string;
      telefone?: string | null;
      whatsapp?: string | null;
      cidade: string;
      uf: string;
    } | null = null;

    if (lead.franchiseId) {
      franquia = await prisma.franchise.findUnique({
        where: { id: lead.franchiseId },
        select: {
          name: true,
          responsavel: true,
          email: true,
          telefone: true,
          whatsapp: true,
          cidade: true,
          uf: true,
        },
      }) as any;
    }

    // Reutiliza token existente para não invalidar links já enviados por outros canais.
    // Só gera um novo token se o lead ainda não tiver um (primeiro envio).
    // Para forçar um reset de campanha, o franqueado deve usar o botão "Novo envio" (futuro).
    const isFirstSend = !lead.apresentacaoToken;
    const token = lead.apresentacaoToken || randomUUID();

    // Atualiza o lead — reseta métricas apenas no primeiro envio
    const updateBase: Record<string, any> = {
      apresentacaoToken: token,
      apresentacaoCanal: canal,
      ultimoContato: new Date(),
    };
    if (isFirstSend) {
      updateBase.apresentacaoEnviadaEm = new Date();
      updateBase.apresentacaoAcessos   = 0;
      updateBase.apresentacaoAbertaEm  = null;
      updateBase.apresentacaoTempoSeg  = 0;
      updateBase.apresentacaoScrollMax = 0;
      updateBase.apresentacaoCliques   = null;
      updateBase.leadScore             = 0;
    }

    await prisma.crmLead.update({
      where: { id: params.id },
      data: updateBase as any,
    });

    const link = `https://sistema.smarterestagios.com.br/comercial/${token}`;

    const msgParams: ApresentacaoMsgParams = {
      contato:           lead.contato || "responsável",
      empresa:           lead.empresa,
      segmento:          lead.setor || undefined,
      franqueadoNome:    franquia?.responsavel || "Equipe Smarter",
      franqueadoTelefone: franquia?.whatsapp || franquia?.telefone || undefined,
      franqueadoEmail:   franquia?.email || undefined,
      franqueadoCidade:  franquia ? `${franquia.cidade}/${franquia.uf}` : undefined,
      link,
    };

    // Seleciona mensagem pelo canal
    let resposta: { mensagem: string; assunto?: string; htmlEmail?: string } = { mensagem: "" };

    switch (canal) {
      case "email": {
        const msg = msgEmail(msgParams);
        resposta = {
          mensagem: msg.mensagem,
          assunto: msg.assunto,
          htmlEmail: htmlEmailApresentacao(msgParams),
        };
        // Se tiver e-mail, envia automaticamente
        if (lead.email) {
          try {
            await sendMail(lead.email, msg.assunto!, htmlEmailApresentacao(msgParams));
            // Nota na timeline
            await prisma.crmNota.create({
              data: {
                leadId: params.id,
                texto: `✉️ Apresentação comercial enviada por e-mail para ${lead.email}`,
                tipo: "email",
              },
            });
          } catch (e) {
            console.error("[apresentacao] email send error:", e);
          }
        }
        break;
      }
      case "whatsapp": {
        const msg = msgWhatsApp(msgParams);
        resposta = { mensagem: msg.mensagem };
        break;
      }
      case "instagram": {
        const msg = msgInstagram(msgParams);
        resposta = { mensagem: msg.mensagem };
        break;
      }
      case "linkedin": {
        const msg = msgLinkedIn(msgParams);
        resposta = { mensagem: msg.mensagem };
        break;
      }
      case "link": {
        resposta = { mensagem: link };
        break;
      }
    }

    // Nota na timeline (exceto email — já criado acima)
    if (canal !== "email") {
      const canalLabel: Record<string, string> = {
        whatsapp:  "WhatsApp",
        instagram: "Instagram",
        linkedin:  "LinkedIn",
        link:      "link copiado",
      };
      await prisma.crmNota.create({
        data: {
          leadId: params.id,
          texto: `📤 Apresentação comercial enviada por ${canalLabel[canal] || canal}`,
          tipo: canal === "whatsapp" ? "whatsapp" : "anotacao",
        },
      });
    }

    return NextResponse.json({ ok: true, link, ...resposta });
  } catch (e) {
    return handleApiError(e, "ENVIAR_APRESENTACAO");
  }
}
