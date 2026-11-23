/**
 * GET /api/public/franquia/contrato/[token] — o franqueado baixa o contrato em PDF.
 * Assinado: devolve o PDF assinado do Autentique. Enviado e ainda não assinado: devolve a minuta enviada (mesmos dados).
 * Antes de o contrato ser enviado não há o que baixar.
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buscarStatusAutentique } from "@/lib/autentique";
import { gerarContratoPdf } from "@/lib/franquia/contratoPdf";
import { enderecoDoCadastro } from "@/lib/franquia/contratoTemplate";
import type { CadastroFranquia } from "@/lib/franquia/cadastro";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const pdfResp = (buf: ArrayBuffer | Uint8Array, nome: string) =>
  new NextResponse(buf instanceof Uint8Array ? new Uint8Array(buf) : buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "private, no-store" } });

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token } });
  const c = lead?.cadastro as unknown as CadastroFranquia | null;
  if (!lead || !c || !lead.contratoDocId) return NextResponse.json({ error: "O contrato ainda não foi enviado." }, { status: 404 });

  if (lead.contratoAssinadoEm) {
    try {
      const st = await buscarStatusAutentique(lead.contratoDocId);
      if (st.signedUrl) {
        const r = await fetch(st.signedUrl, { signal: AbortSignal.timeout(20_000) });
        if (r.ok) return pdfResp(await r.arrayBuffer(), "Contrato-de-Franquia-Smarter-assinado.pdf");
      }
    } catch (e: any) { console.error("[contrato-pdf] assinado indisponível:", e?.message); }
  }
  const pdf = await gerarContratoPdf({ cadastro: c, regiao: lead.contratoRegiao, valor: lead.valorInvestimento, formaPagamento: lead.contratoFormaPagamento, enderecoCompleto: (lead.cadastro as any)?.enderecoCompleto || enderecoDoCadastro(c), dataContrato: lead.contratoEnviadoEm ?? undefined });
  return pdfResp(pdf, "Contrato-de-Franquia-Smarter.pdf");
}
