import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE ALL TEST DATA — apenas FRANQUEADORA pode chamar isso
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso negado. Apenas FRANQUEADORA." }, { status: 403 });
  }

  // Token de confirmação obrigatório para evitar reset acidental
  const body = await req.json().catch(() => ({}));
  if (body?.confirmar !== "CONFIRMO_RESET_TOTAL") {
    return NextResponse.json({
      error: 'Confirmação obrigatória. Envie { "confirmar": "CONFIRMO_RESET_TOTAL" } no body.',
    }, { status: 400 });
  }

  console.error(`[RESET-DATA] ⚠️ RESET TOTAL executado por: ${session.user.email} em ${new Date().toISOString()}`);

  const results: Record<string, number | string> = {};

  async function del(key: string, fn: () => Promise<{ count: number }>) {
    try {
      const r = await fn();
      results[key] = r.count;
    } catch (e: any) {
      results[key] = `ERR: ${e.message?.substring(0, 80)}`;
    }
  }

  // Delete in dependency order — children first
  await del("activityLog",    () => prisma.activityLog.deleteMany({}));
  await del("notification",   () => (prisma as any).notification?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("crmInteracao",   () => (prisma as any).cRMInteracao?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("crmContato",     () => (prisma as any).cRMContato?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("seguro",         () => (prisma as any).seguro?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("docAssinatura",  () => (prisma as any).documentoAssinatura?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contratoAssin",  () => (prisma as any).contratoAssinatura?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contratoItem",   () => (prisma as any).contratoItem?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("processo",       () => (prisma as any).processoSeletivo?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("contrato",       () => (prisma as any).contrato?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("lead",           () => (prisma as any).lead?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("vaga",           () => (prisma as any).vacancy?.deleteMany({}) ?? Promise.resolve({ count: 0 }));
  await del("employee",       () => prisma.employee.deleteMany({}));
  await del("student",        () => prisma.student.deleteMany({}));
  await del("company",        () => prisma.company.deleteMany({}));
  await del("institution",    () => prisma.institution.deleteMany({}));
  await del("franchise",      () => prisma.franchise.deleteMany({}));
  await del("user",           () => prisma.user.deleteMany({ where: { role: { not: "FRANQUEADORA" } } }));

  return NextResponse.json({ ok: true, results });
}
