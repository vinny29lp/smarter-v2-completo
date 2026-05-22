/**
 * Rota de diagnóstico de email — remove após testes
 * GET /api/debug/email → status da config
 * POST /api/debug/email → envia emails de teste reais
 */
import { NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/getConfig";
import {
  enviarCobranca,
  enviarBoasVindasEmpresa,
} from "@/lib/email";

export async function GET() {
  const cfg = await getSystemConfig();
  const apiKey = process.env.RESEND_API_KEY || cfg?.resendApiKey || null;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeySource: process.env.RESEND_API_KEY ? "env" : cfg?.resendApiKey ? "db" : "none",
    apiKeyPreview: apiKey ? apiKey.slice(0, 8) + "..." : null,
    fromAddress: from,
    autentiqueToken: cfg?.autentiqueToken ? cfg.autentiqueToken.slice(0, 8) + "..." : null,
  });
}

export async function POST(req: Request) {
  const results: Record<string, any> = {};

  // 1. Testar raw Resend API com detalhes completos
  const cfg = await getSystemConfig();
  const apiKey = process.env.RESEND_API_KEY || cfg?.resendApiKey || null;
  const from = process.env.RESEND_FROM || "Smarter Estágios <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json({ error: "API key não configurada", hasApiKey: false }, { status: 500 });
  }

  // Raw test to viniciusmfp29@gmail.com
  try {
    const res1 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: ["Viniciusmfp29@gmail.com"],
        subject: "Smarter Estágios — Teste de Cobrança Financeiro",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#0f2a5e;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">Smarter Estágios</h2>
          </div>
          <div style="padding:24px;background:white;border:1px solid #e2e8f0">
            <h3 style="color:#0f2a5e">Cobrança Pendente</h3>
            <p>Empresa: <strong>Empresa Teste LTDA</strong></p>
            <p>Referência: <strong>Mensalidade Maio/2026</strong></p>
            <p>Valor: <strong>R$ 350,00</strong></p>
            <p>Vencimento: <strong>30/05/2026</strong></p>
            <div style="background:#f0f9ff;border-left:4px solid #10b981;padding:12px;margin:16px 0">
              <strong>PIX:</strong> 12.345.678/0001-99
            </div>
          </div>
          <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
            Email de teste — Smarter Estágios
          </div>
        </div>`,
      }),
    });
    const body1 = await res1.json();
    results.cobranca = { status: res1.status, ok: res1.ok, body: body1 };
  } catch (e: any) {
    results.cobranca = { error: e.message };
  }

  // 2. Boas-vindas empresa para vinny29lp@gmail.com
  try {
    const res2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: ["vinny29lp@gmail.com"],
        subject: "Bem-vindo(a) à Smarter Estágios — Acesso da Empresa criado",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#0f2a5e;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">Smarter Estágios</h2>
          </div>
          <div style="padding:24px;background:white;border:1px solid #e2e8f0">
            <h3 style="color:#0f2a5e">Acesso da Empresa Criado!</h3>
            <p>Olá, <strong>Responsável Teste</strong>! O acesso da empresa <strong>Empresa Teste LTDA</strong> foi criado.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0"><strong>E-mail:</strong> vinny29lp@gmail.com</p>
              <p style="margin:8px 0 0"><strong>Senha temporária:</strong> Smarter@2026</p>
            </div>
            <a href="https://smarter-v2-completo.vercel.app/login"
               style="display:inline-block;background:#0f2a5e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">
              Acessar Portal →
            </a>
          </div>
          <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8">
            Email de teste — Smarter Estágios
          </div>
        </div>`,
      }),
    });
    const body2 = await res2.json();
    results.boasVindasEmpresa = { status: res2.status, ok: res2.ok, body: body2 };
  } catch (e: any) {
    results.boasVindasEmpresa = { error: e.message };
  }

  return NextResponse.json({
    apiKey: apiKey.slice(0, 8) + "...",
    from,
    results,
  });
}
