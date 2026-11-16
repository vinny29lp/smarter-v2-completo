/**
 * GET /api/app/alizo/metricas[?franchiseId=&from=&to=] — métricas e consumo da unidade, EXATAMENTE como a Alizo devolve
 * (nada é calculado/inventado aqui). A unidade vem da sessão.
 */
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { contextoAlizo, franquiaAlvo, vinculoDaFranquia } from "@/lib/alizo/acesso";
import { criarAlizoClient, mensagemAmigavel } from "@/lib/alizo/client";

export const dynamic = "force-dynamic";
const dataOk = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 25) : undefined);

export async function GET(req: Request) {
  try {
    const ctx = await contextoAlizo({ rota: "metricas", max: 30 });
    if ("erro" in ctx) return ctx.erro;
    const q = new URL(req.url).searchParams;
    const fid = franquiaAlvo(ctx, q.get("franchiseId"));
    if (!fid) return NextResponse.json({ error: "Franquia não informada." }, { status: 400 });
    const v = await vinculoDaFranquia(fid);
    const client = criarAlizoClient();
    if (!v || !client) return NextResponse.json({ error: !client ? "Configuração administrativa necessária." : "A unidade ainda está sendo preparada." }, { status: !client ? 503 : 409 });
    const periodo = { from: dataOk(q.get("from")), to: dataOk(q.get("to")) };
    try {
      const [metricas, consumo] = await Promise.all([
        client.metricas(v.alizoUnitId, periodo),
        client.consumo({ unit_id: v.alizoUnitId, ...periodo }).catch(() => null),
      ]);
      return NextResponse.json({ metricas, consumo });
    } catch (e) { return NextResponse.json({ error: mensagemAmigavel(e) }, { status: 502 }); }
  } catch (e) { return handleApiError(e, "ALIZO_METRICAS_GET"); }
}
