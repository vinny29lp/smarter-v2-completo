/**
 * POST /api/app/franquia-crm/[id]/jornada — FRANQUEADORA.
 *  { acao: "link" }     gera (ou devolve) o link único Apresentação + COF do lead.
 *  { acao: "contrato" } envia o contrato de franquia ao Autentique (exige cadastro; bloqueado até o modelo ser aprovado).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { enviarParaAutentique, autentiqueConectado } from "@/lib/autentique";
import { gerarToken, APP_URL } from "@/lib/franquia/jornada";
import { contratoFranquiaHtml, CONTRATO_APROVADO } from "@/lib/franquia/contratoTemplate";
import type { CadastroFranquia } from "@/lib/franquia/cadastro";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
    const { acao } = await req.json().catch(() => ({}));
    const lead = await prisma.franquiaLead.findUnique({ where: { id: params.id } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    if (acao === "link") {
      let token = lead.tokenPublico;
      if (!token) { token = gerarToken(); await prisma.franquiaLead.update({ where: { id: lead.id }, data: { tokenPublico: token } }); }
      return NextResponse.json({ url: `${APP_URL}/franquia/p/${token}`, cadastroUrl: `${APP_URL}/franquia/cadastro/${token}` });
    }

    if (acao === "contrato") {
      if (!CONTRATO_APROVADO) return NextResponse.json({ error: "Envio bloqueado: o modelo do contrato de franquia ainda não foi aprovado/configurado (FRANQUIA_CONTRATO_LIBERADO)." }, { status: 409 });
      if (lead.contratoDocId) return NextResponse.json({ error: "O contrato deste lead já foi enviado." }, { status: 409 });
      const c = lead.cadastro as unknown as CadastroFranquia | null;
      if (!c) return NextResponse.json({ error: "O candidato ainda não preencheu o cadastro de fechamento." }, { status: 409 });
      if (!(await autentiqueConectado())) return NextResponse.json({ error: "Autentique não está conectado." }, { status: 503 });

      const signatarios = [{ email: c.email, nome: c.nome, action: "SIGN" as const }];
      const smarter = (process.env.FRANQUIA_SIGNATARIO_EMAIL || "").trim();
      if (smarter) signatarios.push({ email: smarter, nome: process.env.FRANQUIA_SIGNATARIO_NOME || "Smarter Estágios", action: "SIGN" });
      const doc = await enviarParaAutentique(`Contrato de Franquia — ${c.nomeUnidade}`, contratoFranquiaHtml(c, lead.valorInvestimento), signatarios);

      await prisma.franquiaLead.update({ where: { id: lead.id }, data: { contratoDocId: doc.id, contratoEnviadoEm: new Date(), etapa: "contrato_enviado", etapaChangedAt: new Date() } });
      await prisma.franquiaNota.create({ data: { leadId: lead.id, tipo: "etapa", texto: "Contrato de franquia enviado para assinatura (Autentique)." } });
      return NextResponse.json({ ok: true, docId: doc.id });
    }
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e) { return handleApiError(e, "FRANQUIA_JORNADA"); }
}
