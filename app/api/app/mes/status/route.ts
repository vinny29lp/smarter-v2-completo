import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getMesStatus } from "@/lib/mes/status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const franchiseId = session.user.franchiseId;
    if (!franchiseId || session.user.role === "FRANQUEADORA") {
      return NextResponse.json({ error: "Este recurso é exclusivo de unidades franqueadas." }, { status: 403 });
    }

    const status = await getMesStatus(franchiseId);
    return NextResponse.json(status);
  } catch (e) {
    return handleApiError(e, "MES_STATUS_GET");
  }
}
