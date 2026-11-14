/**
 * GET /api/app/admin/lia-teste-email?to=voce@gmail.com — FRANQUEADORA logada.
 * Envia 2 e-mails de teste (estilo leve e estilo completo) para conferir em qual aba do Gmail caem.
 * Sem `to`, envia para o e-mail do próprio usuário logado.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { tokenOptOut } from "@/lib/automacao/token";
import { emailValido, normalizarEmail } from "@/lib/automacao/regras";
import { templateLiaEmail, linksPorTipo, botao, remetenteLia, htmlParaTexto, type ModoEmail } from "@/lib/automacao/emailBrand";

export const dynamic = "force-dynamic";

const APP = "https://sistema.smarterestagios.com.br";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const to = normalizarEmail(new URL(req.url).searchParams.get("to") || session.user.email || "");
  if (!emailValido(to)) return NextResponse.json({ error: "E-mail de destino inválido." }, { status: 400 });

  const enviados: Record<string, boolean> = {};
  for (const modo of ["leve", "completo"] as ModoEmail[]) {
    const corpo = `<p>Olá!</p><p>Este é um <b>e-mail de teste</b> da Lia para você conferir a aparência e em qual aba do Gmail ele chega (Principal, Promoções ou Atualizações).</p><p>Se ele caiu fora da Principal, arraste para lá e escolha "Fazer isso nas próximas mensagens".</p>${botao(`${APP}/solicitar-vaga`, "Solicitar uma vaga", modo)}`;
    const html = templateLiaEmail({
      modo, titulo: "Teste de e-mail da Lia", corpo, app: APP,
      optoutUrl: `${APP}/optout?e=${encodeURIComponent(to)}&t=${tokenOptOut(to)}`, links: linksPorTipo("REATIVACAO", APP),
    });
    enviados[modo] = await sendMail(to, `[Teste ${modo}] Estagiários na sua empresa`, html, undefined, remetenteLia(), { text: htmlParaTexto(html) });
  }
  return NextResponse.json({ para: to, enviados });
}
