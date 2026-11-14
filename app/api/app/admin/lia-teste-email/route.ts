/**
 * GET /api/app/admin/lia-teste-email?to=voce@gmail.com — FRANQUEADORA logada.
 * Envia 2 e-mails de teste (um transacional e um comercial, estilo texto) para conferir em qual aba do Gmail caem.
 * Sem `to`, envia para o e-mail do próprio usuário logado.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { tokenOptOut } from "@/lib/automacao/token";
import { emailValido, normalizarEmail } from "@/lib/automacao/regras";
import { templateLiaEmail, linksPorTipo, botao, remetenteLia, htmlParaTexto } from "@/lib/automacao/emailBrand";

export const dynamic = "force-dynamic";

const APP = "https://sistema.smarterestagios.com.br";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const to = normalizarEmail(new URL(req.url).searchParams.get("to") || session.user.email || "");
  if (!emailValido(to)) return NextResponse.json({ error: "E-mail de destino inválido." }, { status: 400 });

  // Dois exemplos reais no estilo "texto" (padrão): um transacional (tende à caixa principal) e um comercial.
  const optoutUrl = `${APP}/optout?e=${encodeURIComponent(to)}&t=${tokenOptOut(to)}`;
  const modelos = [
    { chave: "transacional", assunto: "Lembrete: sua entrevista é amanhã", tipo: "ENTREVISTA_LEMBRETE", titulo: "Lembrete de entrevista",
      corpo: `<p>Olá, Vinicius!</p><p>Sua entrevista para <b>Estágio em Administração</b> está marcada para amanhã às 14h.</p><p>Dica: chegue 10 minutos antes e leve um documento com foto. Boa sorte!</p>` },
    { chave: "comercial", assunto: "Estagiários na Padaria Exemplo", tipo: "REATIVACAO", titulo: "Estagiários para a Padaria Exemplo",
      corpo: `<p>Olá, Maria!</p><p>Notamos que a <b>Padaria Exemplo</b> está cadastrada na Smarter, mas hoje não tem estagiário conosco. Temos estudantes prontos para começar e cuidamos de contrato, seguro e acompanhamento.</p>${botao(`${APP}/solicitar-vaga`, "Se quiser, conte o perfil que procura", "texto")}` },
  ];
  const enviados: Record<string, boolean> = {};
  for (const m of modelos) {
    const html = templateLiaEmail({ modo: "texto", titulo: m.titulo, corpo: m.corpo, app: APP, optoutUrl, links: linksPorTipo(m.tipo, APP) });
    enviados[m.chave] = await sendMail(to, `[Teste] ${m.assunto}`, html, undefined, remetenteLia(), { text: htmlParaTexto(html) });
  }
  return NextResponse.json({ para: to, enviados });
}
