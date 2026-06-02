/**
 * Rota de debug removida — retorna 404 em todos os métodos.
 * Esta rota foi desativada por razões de segurança (SEC-012).
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
