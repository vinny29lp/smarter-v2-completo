import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function validateAIRequest(req: Request): Promise<{
  session: any;
  franchiseId: string;
  body: any;
  error?: NextResponse;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      session: null, franchiseId: "", body: null,
      error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  // M3: FRANQUEADORA não tem franchiseId na sessão — usa sentinel "FRANQUEADORA" para controle
  const franchiseId: string = session.user.franchiseId
    ?? (session.user.role === "FRANQUEADORA" ? "FRANQUEADORA" : "");
  if (!franchiseId) {
    return {
      session, franchiseId: "", body: null,
      error: NextResponse.json({ error: "Franquia não identificada" }, { status: 403 }),
    };
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  return { session, franchiseId, body };
}
