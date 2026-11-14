/** POST /api/app/lixeira/[id]/restaurar — #27: restaura estudante/empresa excluído (somente FRANQUEADORA). */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { restaurarDaLixeira } from "@/lib/lixeira";
import { logAudit, getClientIP } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r = await restaurarDaLixeira(params.id);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
  await logAudit({
    userId: session.user.id, role: session.user.role || "", acao: "LIXEIRA_RESTAURADO",
    modulo: "lixeira", detalhes: `lixeiraId:${params.id}`, ip: getClientIP(req),
  });
  return NextResponse.json({ ok: true });
}
