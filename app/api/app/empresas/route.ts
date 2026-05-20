import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanies } from "@/lib/actions/companies";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const empresas = await getCompanies(session?.user?.franchiseId);
  return NextResponse.json({ empresas });
}
