/** GET /api/app/universidade/status — progresso do usuário logado na Universidade Smarter. */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { statusUniversidade } from "@/lib/universidade";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const st = await statusUniversidade(session.user.email);
  if (!st) return NextResponse.json({ indisponivel: true }, { status: 200 });
  return NextResponse.json(st);
}
