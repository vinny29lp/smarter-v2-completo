/**
 * Rota de diagnóstico e teste de email — remover após confirmar funcionamento
 * GET  /api/debug/email → status da configuração
 * POST /api/debug/email → envia 2 emails de teste para viniciusmfp29@gmail.com
 */
import { NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/getConfig";

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

export async function POST() {
  const cfg = await getSystemConfig();
  const apiKey = process.env.RESEND_API_KEY || cfg?.resendApiKey || null;
  const from = process.env.RESEND_FROM || "Smarter Estágios <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json({ error: "API key não configurada" }, { status: 500 });
  }

  // Com onboarding@resend.dev só envia para o email do dono da conta Resend
  const testEmail = "viniciusmfp29@gmail.com";
  const results: Record<string, any> = { sentTo: testEmail, from };

  // Teste 1: Email de cobrança financeiro
  try {
    const r1 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [testEmail],
        subject: "Smarter Estágios — Cobrança Financeiro (Teste Real)",
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <div style="background:#0f2a5e;padding:24px 32px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px">
    <div style="background:#f5c400;color:#0f2a5e;font-weight:900;font-size:18px;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">S</div>
    <span style="color:white;font-weight:900;font-size:18px">Smarter Estágios</span>
  </div>
  <div style="padding:32px;background:white;border:1px solid #e2e8f0;border-top:none">
    <h2 style="color:#0f2a5e;margin:0 0 8px">Cobrança Pendente</h2>
    <div style="height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:0 0 20px"></div>
    <p style="color:#475569">Olá, <strong>Empresa Teste LTDA</strong>! Segue a cobrança referente aos serviços da <strong>Smarter Estágios</strong>.</p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
      <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase">Referência</div>
      <div style="font-size:16px;font-weight:700;color:#1e293b">Mensalidade Maio/2026</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div>
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase">Valor</div>
          <div style="font-size:22px;font-weight:900;color:#0f2a5e">R$ 350,00</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase">Vencimento</div>
          <div style="font-size:16px;font-weight:700;color:#1e293b">30/05/2026</div>
        </div>
      </div>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
      <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase">💳 Pagamento via PIX</div>
      <div style="font-size:17px;font-weight:700;color:#1e293b;margin-top:4px;letter-spacing:1px">12.345.678/0001-99</div>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    Smarter Estágios — Sistema de Gestão de Estágios<br>Este é um email automático, não responda.
  </div>
</div>`,
      }),
    });
    const b1 = await r1.json();
    results.cobranca = { status: r1.status, ok: r1.ok, id: b1.id, error: b1.message };
  } catch (e: any) {
    results.cobranca = { error: e.message };
  }

  // Teste 2: Email de boas-vindas empresa
  try {
    const r2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [testEmail],
        subject: "Smarter Estágios — Boas-vindas Empresa (Teste Real) [destinatário real: vinny29lp@gmail.com]",
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <div style="background:#0f2a5e;padding:24px 32px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px">
    <div style="background:#f5c400;color:#0f2a5e;font-weight:900;font-size:18px;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">S</div>
    <span style="color:white;font-weight:900;font-size:18px">Smarter Estágios</span>
  </div>
  <div style="padding:32px;background:white;border:1px solid #e2e8f0;border-top:none">
    <h2 style="color:#0f2a5e;margin:0 0 8px">Acesso da Empresa Criado!</h2>
    <div style="height:3px;background:linear-gradient(90deg,#0f2a5e,#f5c400);border-radius:2px;margin:0 0 20px"></div>
    <p style="color:#475569">Olá, <strong>Responsável Teste</strong>! O acesso da empresa <strong>Empresa Teste LTDA</strong> foi criado com sucesso.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px">Credenciais de acesso</div>
      <div style="margin-bottom:6px"><span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">E-mail: </span><span style="font-weight:600;color:#1e293b">vinny29lp@gmail.com</span></div>
      <div><span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Senha temporária: </span><span style="font-weight:600;color:#1e293b">Smarter@2026</span></div>
    </div>
    <p style="color:#475569;font-size:13px">Através do portal você pode gerenciar estagiários, assinar documentos e acompanhar o financeiro.</p>
    <a href="https://smarter-v2-completo.vercel.app/login"
       style="display:inline-block;background:#0f2a5e;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px">
      Acessar Portal da Empresa →
    </a>
    <div style="margin-top:20px;padding:12px;background:#fef9c3;border-radius:8px;font-size:12px;color:#854d0e">
      ⚠️ <strong>Obs. de teste:</strong> Enviado para viniciusmfp29@gmail.com pois o Resend ainda não tem domínio verificado. O destinatário real seria vinny29lp@gmail.com.
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    Smarter Estágios — Sistema de Gestão de Estágios<br>Este é um email automático, não responda.
  </div>
</div>`,
      }),
    });
    const b2 = await r2.json();
    results.boasVindasEmpresa = { status: r2.status, ok: r2.ok, id: b2.id, error: b2.message };
  } catch (e: any) {
    results.boasVindasEmpresa = { error: e.message };
  }

  return NextResponse.json({ apiKeyPreview: apiKey.slice(0, 8) + "...", from, results });
}
