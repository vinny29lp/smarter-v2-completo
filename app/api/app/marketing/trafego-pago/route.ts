import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "marketing");
  if (permCheck) return permCheck;

  // FRANQUEADORA (franchiseId null) vê apenas campanhas da rede (franchiseId IS NULL)
  // FRANQUEADO vê apenas campanhas da própria franquia
  const role = session.user.role;
  const franchiseFilter =
    role === "FRANQUEADORA"
      ? { franchiseId: null }
      : { franchiseId: session.user.franchiseId ?? "" };

  try {
    const campanhas = await prisma.marketingTrafegoPago.findMany({
      where: franchiseFilter,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ campanhas });
  } catch (e: any) {
    console.error("[marketing/trafego-pago] GET:", e?.message || e);
    return NextResponse.json({ error: "Erro ao carregar campanhas.", campanhas: [] }, { status: 500 });
  }
}
