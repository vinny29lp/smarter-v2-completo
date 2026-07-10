import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { assunto, mensagem } = await req.json();
  if (!assunto || !mensagem) {
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios." }, { status: 400 });
  }

  const empresa = await prisma.company.findUnique({ where: { id: params.id } });
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

  // SEC: escopo por franquia — unidade só envia e-mail para empresa da própria franquia.
  // FRANQUEADORA (admin global) tem acesso a todas.
  const role = session.user.role || "";
  if (role !== "FRANQUEADORA" && empresa.franchiseId !== session.user.franchiseId) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  if (!empresa.email) return NextResponse.json({ error: "Empresa não possui e-mail cadastrado." }, { status: 400 });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0">
    <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <div style="background:#0f2a5e;padding:20px 32px;text-align:center">
        <p style="color:white;font-weight:900;font-size:16px;margin:0">Smarter Estágios</p>
      </div>
      <div style="padding:32px">
        <p style="white-space:pre-line;color:#334155;font-size:14px;line-height:1.6">${mensagem.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:11px;color:#94a3b8;text-align:center">Smarter Estágios · sistema.smarterestagios.com.br</p>
      </div>
    </div>
  </body></html>`;

  const ok = await sendMail(empresa.email, assunto, html);
  if (!ok) return NextResponse.json({ error: "Falha ao enviar e-mail. Verifique a configuração do Resend." }, { status: 500 });

  return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "EMPRESA_EMAIL_POST");
  }
}
