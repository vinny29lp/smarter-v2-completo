import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudents } from "@/lib/actions/students";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const estudantes = await getStudents(session?.user?.franchiseId);
  return NextResponse.json({ estudantes });
}
