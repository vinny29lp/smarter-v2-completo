import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanies } from "@/lib/actions/companies";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  // FRANQUEADORA vê todas; demais papéis só vêem as da sua unidade
  const franchiseId = role === "FRANQUEADORA" ? undefined : (session?.user?.franchiseId || null);
  const empresas = await getCompanies(franchiseId ?? undefined);
  return NextResponse.json({ empresas });
}
