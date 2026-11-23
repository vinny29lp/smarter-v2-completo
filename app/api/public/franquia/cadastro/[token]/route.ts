/** POST /api/public/franquia/cadastro/[token] — cadastro de fechamento enviado pelo candidato (link único). */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
import { validarCadastro } from "@/lib/franquia/cadastro";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = getClientIpFromRequest(req);
  if (!checkRateLimit(ip, "franquia_cadastro", 10, 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde e tente novamente." }, { status: 429 });
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { id: true, situacao: true, contratoDocId: true, nomeCompleto: true } });
  if (!lead || lead.situacao === "perdido") return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  if (lead.contratoDocId) return NextResponse.json({ error: "O contrato já foi enviado. Fale com a Smarter para qualquer ajuste." }, { status: 409 });
  const v = validarCadastro(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });

  await prisma.franquiaLead.update({ where: { id: lead.id }, data: { cadastro: v.dados as any, cadastroEm: new Date(), etapa: "cadastro_recebido", etapaChangedAt: new Date(), email: v.dados.email, telefone: v.dados.telefone } });
  await prisma.franquiaNota.create({ data: { leadId: lead.id, tipo: "etapa", texto: "Cadastro de fechamento recebido pelo link." } }).catch(() => {});
  const us = await prisma.user.findMany({ where: { role: "FRANQUEADORA", active: true }, select: { id: true } });
  if (us.length) await prisma.notification.createMany({ data: us.map(u => ({ userId: u.id, titulo: "📝 Cadastro de franquia recebido", mensagem: `${lead.nomeCompleto} preencheu o cadastro de fechamento. Confira e envie o contrato.`, tipo: "franquia_jornada", link: `/dashboard/franquia-crm/${lead.id}` })) }).catch(() => {});
  return NextResponse.json({ ok: true });
}
