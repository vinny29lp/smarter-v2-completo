import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContracts } from "@/lib/actions/contracts";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // FRANQUEADORA (admin) vê tudo; FRANQUEADO não vê contratos INATIVO
  const isAdmin = session.user.role === "FRANQUEADORA";
  const hideInativo = !isAdmin;

  const contratos = await getContracts(
    session?.user?.franchiseId,
    session?.user?.companyId,
    hideInativo,
  );
  return NextResponse.json({ contratos });
}
