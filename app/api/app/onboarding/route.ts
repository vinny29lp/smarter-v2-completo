/**
 * GET  /api/app/onboarding — status do assistente de primeiro acesso da unidade (FRANQUEADO/FUNCIONARIO).
 * POST /api/app/onboarding — { passo } confirma um passo manual | { dados } salva dados da unidade | { concluir:true }.
 * A unidade vem SEMPRE da sessão. Só FRANQUEADO escreve; FUNCIONARIO apenas lê.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { statusPassos, PASSOS_MANUAIS, normalizarRegioes } from "@/lib/onboarding/regras";
import { provisionarAlizoDaFranquia } from "@/lib/alizo/provisionar";

export const dynamic = "force-dynamic";

async function carregar(franchiseId: string) {
  const f: any = await prisma.franchise.findUnique({ where: { id: franchiseId } });
  if (!f) return null;
  const mapa = await prisma.alizoUnidade.findUnique({ where: { franchiseKey: franchiseId } }).catch(() => null);
  const regioes = normalizarRegioes(f.regioesAtuacao);
  const hoje = new Date();
  const abertura = await prisma.monthOpening.findUnique({
    where: { franchiseId_mes_ano: { franchiseId, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() } }, select: { id: true },
  }).catch(() => null);
  const st = statusPassos({
    franchise: f, regioes, passosManuais: (f.onboardingPassos as any) || {}, alizoMapeada: !!mapa, mesAberto: !!abertura,
  });
  return { f, st, regioes };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role || "";
    const franchiseId = (session.user as any).franchiseId as string | undefined;
    if (!["FRANQUEADO", "FUNCIONARIO"].includes(role) || !franchiseId || franchiseId === "FRANQUEADORA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const c = await carregar(franchiseId);
    if (!c) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    const { f, st, regioes } = c;
    const mesAberto = !!st.passos.find(p => p.id === "abrir_mes")?.feito;
    return NextResponse.json({
      unidade: { nome: f.name, responsavel: f.responsavel, endereco: f.endereco, cep: f.cep, cidade: f.cidade, uf: f.uf, whatsapp: f.whatsapp, telefone: f.telefone },
      regioes, obrigatorio: !!f.onboardingObrigatorio, concluidoEm: f.onboardingConcluidoEm,
      podeEditar: role === "FRANQUEADO", mesAberto, ...st,
    });
  } catch (e) { return handleApiError(e, "ONBOARDING_GET"); }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const franchiseId = (session.user as any).franchiseId as string | undefined;
    if (session.user.role !== "FRANQUEADO" || !franchiseId || franchiseId === "FRANQUEADORA") {
      return NextResponse.json({ error: "Somente o franqueado da unidade conclui o assistente." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    if (typeof body.passo === "string") {
      if (!PASSOS_MANUAIS.has(body.passo)) return NextResponse.json({ error: "Passo inválido." }, { status: 400 });
      const atual: any = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { onboardingPassos: true } as any });
      const passos = { ...((atual?.onboardingPassos as any) || {}), [body.passo]: true };
      await prisma.franchise.update({ where: { id: franchiseId }, data: { onboardingPassos: passos } as any });
    } else if (body.dados && typeof body.dados === "object") {
      const d = body.dados;
      const s = (v: unknown, n: number) => (v === undefined ? undefined : String(v ?? "").trim().slice(0, n) || null);
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: {
          endereco: s(d.endereco, 200), cep: s(d.cep, 12), whatsapp: s(d.whatsapp, 30), telefone: s(d.telefone, 30),
          ...(d.cidade ? { cidade: String(d.cidade).trim().slice(0, 80) } : {}),
          ...(d.uf ? { uf: String(d.uf).trim().toUpperCase().slice(0, 2) } : {}),
        },
      });
    } else if (body.concluir === true) {
      const c = await carregar(franchiseId);
      if (!c) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
      if (!c.st.concluido) return NextResponse.json({ error: "Ainda há passos obrigatórios pendentes." }, { status: 409 });
      await prisma.franchise.update({ where: { id: franchiseId }, data: { onboardingConcluidoEm: new Date() } as any });
      // Libera o Sales: tenta conectar a unidade à Alizo agora (best-effort; o cron repete se falhar).
      await provisionarAlizoDaFranquia(franchiseId).catch(e => console.error("[onboarding] provisionar Alizo:", e?.message));
    } else {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }
    const c = await carregar(franchiseId);
    return NextResponse.json({ ok: true, concluido: c?.st.concluido ?? false });
  } catch (e) { return handleApiError(e, "ONBOARDING_POST"); }
}
