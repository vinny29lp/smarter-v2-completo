/**
 * DESATIVADO — diagnóstico temporário removido após resolução do problema.
 * Endpoint desabilitado intencionalmente.
 */
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ error: "Endpoint desativado." }, { status: 410 });
}
