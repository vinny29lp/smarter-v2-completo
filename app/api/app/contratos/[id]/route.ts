import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContract } from "@/lib/actions/contracts";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await getContract(params.id);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Security: only franqueado can see their own contracts
  if (session.user.franchiseId && contract.franchiseId !== session.user.franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ contract });
}
