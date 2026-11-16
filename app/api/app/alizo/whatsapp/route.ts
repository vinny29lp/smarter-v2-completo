/**
 * GET  /api/app/alizo/whatsapp[?franchiseId=]  — estado do WhatsApp da unidade (via Alizo).
 * POST /api/app/alizo/whatsapp { acao: "connect"|"reconnect"|"disconnect", franchiseId? }
 * A unidade vem da sessão; só franqueadora/equipe podem indicar outra franquia. Nenhum token vai ao navegador.
 */
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { contextoAlizo, franquiaAlvo, vinculoDaFranquia } from "@/lib/alizo/acesso";
import { criarAlizoClient, mensagemAmigavel } from "@/lib/alizo/client";
import { normalizarWhatsapp } from "@/lib/alizo/whatsappRegras";

export const dynamic = "force-dynamic";

async function resolver(pedida: string | null, ctxArgs: { rota: string; max?: number }) {
  const ctx = await contextoAlizo(ctxArgs);
  if ("erro" in ctx) return { erro: ctx.erro } as const;
  const fid = franquiaAlvo(ctx, pedida);
  if (!fid) return { erro: NextResponse.json({ error: "Franquia não informada." }, { status: 400 }) } as const;
  const vinculo = await vinculoDaFranquia(fid);
  if (!vinculo) return { erro: NextResponse.json({ error: "A unidade ainda está sendo preparada. Tente novamente em instantes.", estado: "pendente" }, { status: 409 }) } as const;
  const client = criarAlizoClient();
  if (!client) return { erro: NextResponse.json({ error: "Configuração administrativa necessária.", estado: "nao_configurado" }, { status: 503 }) } as const;
  return { client, unitId: vinculo.alizoUnitId } as const;
}

export async function GET(req: Request) {
  try {
    const r = await resolver(new URL(req.url).searchParams.get("franchiseId"), { rota: "whatsapp-get", max: 60 });
    if ("erro" in r) return r.erro;
    try { return NextResponse.json(normalizarWhatsapp(await r.client.whatsappStatus(r.unitId))); }
    catch (e) { return NextResponse.json({ error: mensagemAmigavel(e), estado: "error" }, { status: 502 }); }
  } catch (e) { return handleApiError(e, "ALIZO_WHATSAPP_GET"); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao || "");
    if (!["connect", "reconnect", "disconnect"].includes(acao)) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    const r = await resolver(body.franchiseId ? String(body.franchiseId) : null, { rota: "whatsapp-post", max: 20 });
    if ("erro" in r) return r.erro;
    try {
      const raw = acao === "connect" ? await r.client.whatsappConectar(r.unitId)
        : acao === "reconnect" ? await r.client.whatsappReconectar(r.unitId) : await r.client.whatsappDesconectar(r.unitId);
      return NextResponse.json(normalizarWhatsapp(raw));
    } catch (e) { return NextResponse.json({ error: mensagemAmigavel(e), estado: "error" }, { status: 502 }); }
  } catch (e) { return handleApiError(e, "ALIZO_WHATSAPP_POST"); }
}
