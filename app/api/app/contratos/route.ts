import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContracts } from "@/lib/actions/contracts";
import { NextResponse } from "next/server";

// Force-dynamic: nunca cachear — cada requisição precisa ler a sessão do cookie
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", contratos: [] },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // FRANQUEADO filtra por franchiseId; EMPRESA filtra por companyId; FRANQUEADORA vê todos
  try {
    const contratos = await getContracts(
      session.user.franchiseId,
      session.user.companyId,
      false, // todos os status, inclusive INATIVO
    );

    return NextResponse.json(
      { contratos },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (e: any) {
    console.error("[contratos] getContracts error:", e?.message || e);
    return NextResponse.json(
      { error: "Erro ao carregar contratos. Tente novamente.", contratos: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
