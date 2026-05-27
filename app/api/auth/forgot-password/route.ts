import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/email";

function gerarSenhaTemp(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 8; i++) senha += chars[Math.floor(Math.random() * chars.length)];
  return senha + "!2";
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Sempre retorna sucesso para não expor quais emails existem
    if (!user || !user.active) {
      return NextResponse.json({ ok: true });
    }

    const novaSenha = gerarSenhaTemp();
    const hash = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#0f2a5e;color:#f5c400;width:48px;height:48px;border-radius:12px;line-height:48px;font-size:22px;font-weight:900;text-align:center;">S</div>
          <h2 style="color:#0f2a5e;margin:12px 0 4px;">Recuperação de Senha</h2>
          <p style="color:#64748b;font-size:14px;margin:0;">Smarter Estágios</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:20px;">
          <p style="color:#334155;font-size:15px;margin:0 0 16px;">Olá, <strong>${user.name}</strong>!</p>
          <p style="color:#334155;font-size:14px;margin:0 0 16px;">
            Recebemos uma solicitação de recuperação de senha para a sua conta.
            Sua nova senha temporária é:
          </p>
          <div style="background:#f1f5f9;border:2px dashed #0f2a5e;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
            <span style="font-size:24px;font-weight:900;color:#0f2a5e;letter-spacing:3px;">${novaSenha}</span>
          </div>
          <p style="color:#64748b;font-size:13px;margin:16px 0 0;">
            Por segurança, recomendamos que altere essa senha após o primeiro acesso.
          </p>
        </div>
        <div style="text-align:center;">
          <a href="${appUrl}/login" style="display:inline-block;background:#0f2a5e;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
            Acessar o Sistema →
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;">
          Se você não solicitou a recuperação, ignore este e-mail.
        </p>
      </div>
    `;

    await sendMail(user.email, "Recuperação de Senha — Smarter Estágios", html);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
