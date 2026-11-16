/**
 * GET  /api/app/crm/contato-humano — empresas trazidas pelo Sales (Victor) que esperam contato humano da unidade.
 * POST /api/app/crm/contato-humano — { leadId, resultado: "contatado" | "agendou" | "sem_interesse" } registra o contato.
 * A unidade vem SEMPRE da sessão; o lead precisa ser da unidade (sem IDOR).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { MARCADOR_CONTATO_HUMANO, linkApresentacao, mensagemWhatsApp, linkWhatsApp, telefoneWa } from "@/lib/crm/contatoHumano";

export const dynamic = "force-dynamic";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

async function contexto() {
  const session = await getServerSession(authOptions);
  if (!session) return { erro: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (!["FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "") || !franchiseId || franchiseId === "FRANQUEADORA") {
    return { erro: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { franchiseId, userName: session.user.name || "" } as const;
}

export async function GET() {
  try {
    const c = await contexto();
    if ("erro" in c) return c.erro;
    const [f, leads] = await Promise.all([
      prisma.franchise.findUnique({ where: { id: c.franchiseId }, select: { name: true, responsavel: true } }),
      prisma.crmLead.findMany({
        where: { franchiseId: c.franchiseId, situacao: "ativo", convertido: false, proximaAcao: { startsWith: MARCADOR_CONTATO_HUMANO } },
        select: { id: true, empresa: true, contato: true, telefone: true, whatsapp: true, email: true, setor: true, cidade: true, createdAt: true },
        orderBy: { createdAt: "asc" }, take: 60,
      }),
    ]);
    if (!f) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    const link = linkApresentacao(APP_URL, c.franchiseId);
    return NextResponse.json({
      link,
      leads: leads.map(l => {
        const fone = l.whatsapp || l.telefone;
        const msg = mensagemWhatsApp({ contato: l.contato, empresa: l.empresa, unidade: f.name, responsavel: f.responsavel, link });
        return {
          id: l.id, empresa: l.empresa, contato: l.contato, setor: l.setor, cidade: l.cidade, telefone: fone, email: l.email,
          dias: Math.floor((Date.now() - (l.createdAt?.getTime() ?? Date.now())) / 86_400_000),
          whatsappUrl: linkWhatsApp(fone, msg), temWhatsapp: !!telefoneWa(fone), mensagem: msg,
        };
      }),
    });
  } catch (e) { return handleApiError(e, "CRM_CONTATO_HUMANO_GET"); }
}

export async function POST(req: Request) {
  try {
    const c = await contexto();
    if ("erro" in c) return c.erro;
    const body = await req.json().catch(() => ({}));
    const resultado = String(body.resultado || "");
    if (!["contatado", "agendou", "sem_interesse"].includes(resultado)) return NextResponse.json({ error: "Resultado inválido." }, { status: 400 });
    const lead = await prisma.crmLead.findUnique({ where: { id: String(body.leadId || "") }, select: { id: true, franchiseId: true } });
    if (!lead || lead.franchiseId !== c.franchiseId) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

    const agora = new Date();
    const texto = resultado === "agendou" ? "✅ Contato humano feito — apresentação/reunião combinada."
      : resultado === "sem_interesse" ? "🚫 Contato humano feito — empresa sem interesse agora."
      : "✅ Contato humano feito (WhatsApp/ligação).";
    await prisma.crmLead.update({
      where: { id: lead.id },
      data: {
        proximaAcao: null, retornoAt: resultado === "contatado" ? new Date(agora.getTime() + 3 * 86_400_000) : null,
        ultimoContato: agora, etapaChangedAt: agora,
        etapa: resultado === "agendou" ? "apresentacao" : "primeiro_contato",
        ...(resultado === "sem_interesse" ? { situacao: "perdido" } : {}),
      },
    });
    await prisma.crmNota.create({ data: { leadId: lead.id, tipo: "etapa", texto: `${texto} Registrado por ${c.userName || "unidade"}.` } });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e, "CRM_CONTATO_HUMANO_POST"); }
}
