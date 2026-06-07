/**
 * GET /api/app/notificacao/[id]/pdf
 * Retorna uma página HTML formatada para impressão/PDF da solicitação de estagiário.
 * O browser abre a janela de impressão automaticamente ao carregar.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) return new NextResponse("Not found", { status: 404 });

  if ((notification as any).userId !== (session.user as any).id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const dt = new Date(notification.createdAt ?? new Date()).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Escapa HTML para evitar XSS
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitação — ${esc(notification.titulo)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 48px;
      color: #1e293b;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .logo span { color: #f59e0b; }
    .badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 4px 10px;
      border-radius: 99px;
      letter-spacing: 0.5px;
    }
    .date {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    h1 {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 20px;
      line-height: 1.4;
    }
    .content-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }
    pre {
      font-size: 13px;
      line-height: 1.8;
      white-space: pre-wrap;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #334155;
    }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Smarter<span>Estágios</span></div>
      <div class="date">${esc(dt)}</div>
    </div>
    <div class="badge">Solicitação de Estagiário</div>
  </div>

  <h1>${esc(notification.titulo)}</h1>

  <div class="content-box">
    <pre>${esc(notification.mensagem)}</pre>
  </div>

  <div class="footer">
    <span>Documento gerado pelo sistema Smarter Estágios</span>
    <span>Impresso em: ${new Date().toLocaleDateString("pt-BR")}</span>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  } catch (e) {
    return handleApiError(e, "NOTIFICACAO_PDF_GET");
  }
}
