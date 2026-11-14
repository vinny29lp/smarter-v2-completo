/**
 * POST /api/app/processos/lote — #10: move várias candidaturas de etapa de uma vez.
 * Body: { ids: string[] (até 100), etapa: "inscritos"|"triagem"|"entrevista"|"aprovado"|"reprovado" }
 * FRANQUEADO/FUNCIONARIO só mexem em candidaturas de vagas da própria unidade.
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { etapaValida } from "@/lib/automacao/engajamento";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  if (ids.length === 0 || ids.length > 100) return NextResponse.json({ error: "Informe de 1 a 100 candidaturas." }, { status: 400 });
  if (!etapaValida(body?.etapa)) return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });

  const escopo: any = role === "FRANQUEADORA" ? {} : { vacancy: { franchiseId: session.user.franchiseId || "__nenhuma__" } };
  const r = await prisma.application.updateMany({ where: { id: { in: ids }, ...escopo }, data: { etapa: body.etapa } });
  return NextResponse.json({ ok: true, movidas: r.count, ignoradas: ids.length - r.count });
}
