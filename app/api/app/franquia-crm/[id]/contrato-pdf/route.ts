/** GET /api/app/franquia-crm/[id]/contrato-pdf — FRANQUEADORA: PDF do contrato com os dados atuais do lead (conferência antes de enviar). */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { gerarContratoPdf } from "@/lib/franquia/contratoPdf";
import { enderecoDoCadastro } from "@/lib/franquia/contratoTemplate";
import type { CadastroFranquia } from "@/lib/franquia/cadastro";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
  const lead = await prisma.franquiaLead.findUnique({ where: { id: params.id } });
  const c = lead?.cadastro as unknown as CadastroFranquia | null;
  if (!lead || !c) return NextResponse.json({ error: "Lead sem cadastro de fechamento." }, { status: 404 });
  const pdf = await gerarContratoPdf({ cadastro: c, regiao: lead.contratoRegiao, valor: lead.valorInvestimento, formaPagamento: lead.contratoFormaPagamento, enderecoCompleto: (lead.cadastro as any)?.enderecoCompleto || enderecoDoCadastro(c) });
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Contrato-Franquia-${c.nomeUnidade.replace(/[^\w-]+/g, "-")}-conferencia.pdf"`, "Cache-Control": "no-store" } });
}
