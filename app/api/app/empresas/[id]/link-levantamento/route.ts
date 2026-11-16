/**
 * GET /api/app/empresas/[id]/link-levantamento — link do levantamento de perfil da vaga (com token),
 * mensagem pronta e link de WhatsApp. Quando a empresa envia, a vaga abre sozinha e a Lia chama candidatos.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { tokenLevantamentoVaga } from "@/lib/automacao/token";
import { linkWhatsApp } from "@/lib/crm/contatoHumano";

export const dynamic = "force-dynamic";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const perm = checkPermission(session, "empresas");
  if (perm) return perm;
  const c = await prisma.company.findUnique({ where: { id: params.id }, select: { id: true, name: true, responsavel: true, telefone: true, franchiseId: true } });
  if (!c) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  const master = ["FRANQUEADORA", "EQUIPE"].includes(session.user.role || "");
  const fs = (session.user as any).franchiseId as string | undefined;
  // Empresas migradas (sem unidade) e da própria unidade; nunca de outra franquia.
  if (!master && c.franchiseId && c.franchiseId !== fs) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  const link = `${APP_URL}/solicitar-vaga?empresa=${c.id}&t=${tokenLevantamentoVaga(c.id)}`;
  const nome = (c.responsavel || "").trim().split(" ")[0];
  const mensagem = `Olá${nome ? ", " + nome : ""}! Para abrirmos a vaga de estágio da ${c.name}, preencha este levantamento rápido de perfil (função, atividades, bolsa, horário e curso desejado). Assim que você enviar, já começamos a buscar os candidatos: ${link}`;
  return NextResponse.json({ link, mensagem, whatsappUrl: linkWhatsApp(c.telefone, mensagem) });
}
