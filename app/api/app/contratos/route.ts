import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContracts } from "@/lib/actions/contracts";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Todos os roles veem todos os status (inclusive INATIVO)
  const contratos = await getContracts(
    session?.user?.franchiseId,
    session?.user?.companyId,
    false,
  );
  return NextResponse.json({ contratos });
}
