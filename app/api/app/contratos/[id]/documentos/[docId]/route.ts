import { prisma } from "@/lib/prisma";
import { buildContratoData, saveDocumentHtml } from "@/lib/services/documentService";
import {
  gerarTCE, gerarReciboBolsa, gerarRescisao, gerarReciboRescisao,
  gerarTermoRecesso, gerarTermoRealizacao, gerarTermoAditivo, gerarContratoPrestacao,
} from "@/lib/documents/templates";
import { validateTCE } from "@/lib/documents/validate";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const body = await req.json().catch(() => ({}));
  const doc = await prisma.internshipDocument.findUnique({ where: { id: params.docId } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const contratoData = await buildContratoData(params.id);
  if (!contratoData) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

  let html = "";

  // Validate TCE before generating
  if (doc.tipo === "tce" || doc.tipo === "pe") {
    const erros = validateTCE(contratoData);
    if (erros.length > 0) {
      return NextResponse.json({ error: erros.join(" | "), alertas: erros }, { status: 422 });
    }
  }

  switch (doc.tipo) {
    case "tce":
    case "pe":
      html = gerarTCE(contratoData);
      break;
    case "rpb":
      html = gerarReciboBolsa(contratoData, body.mesRef || new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
      break;
    case "tr":
      html = gerarRescisao(contratoData, body.ultimoDia || "—", body.motivo || "");
      break;
    case "rr":
      html = gerarReciboRescisao(contratoData, body.diasBolsa || 30, body.mesesRecesso || 1, body.descontos || 0);
      break;
    case "rec":
      html = gerarTermoRecesso(contratoData, body.diasRecesso || 30, body.dataIni || "", body.dataFim || "", body.periodo || "");
      break;
    case "re":
      html = gerarTermoRealizacao(contratoData, body.chTotal || contratoData.estagio.chSemanal * 26, body.desempenho || "Bom");
      break;
    case "ta":
      html = gerarTermoAditivo(contratoData, body.clausula || "", body.descricao || "", body.vigencia || "");
      break;
    case "cps":
      html = gerarContratoPrestacao(contratoData, body.valorMensal || 200);
      break;
    default:
      return NextResponse.json({ error: `Tipo de documento '${doc.tipo}' não implementado` }, { status: 400 });
  }

  const updated = await saveDocumentHtml(params.docId, html);
  return NextResponse.json({ document: updated, html });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const body = await req.json();
  const doc = await prisma.internshipDocument.update({
    where: { id: params.docId },
    data: { status: body.status as any, metaData: body.metaData },
  });
  return NextResponse.json({ document: doc });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const document = await prisma.internshipDocument.findUnique({ where: { id: params.docId } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document });
}
