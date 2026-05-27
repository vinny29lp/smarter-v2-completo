import { prisma } from "@/lib/prisma";
import { buildContratoData, saveDocumentHtml } from "@/lib/services/documentService";
import {
  gerarTCE, gerarReciboBolsa, gerarRescisao, gerarReciboRescisao,
  gerarTermoRecesso, gerarTermoRealizacao, gerarTermoAditivo, gerarContratoPrestacao,
  gerarAvaliacaoSemestral, gerarParecerTecnico,
} from "@/lib/documents/templates";
import { validateTCE } from "@/lib/documents/validate";
import { NextResponse } from "next/server";

// ── Helper: lançamento automático de taxa de administração ──────────────────
async function criarLancamentoTaxaAdmin(contractId: string) {
  try {
    const contrato = await prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        valorEmpresa: true, companyId: true, franchiseId: true,
        vencimento: true, student: { select: { name: true } },
      },
    });
    if (!contrato?.valorEmpresa || contrato.valorEmpresa <= 0) return;
    const jaExiste = await prisma.financial.findFirst({
      where: { contractId, categoria: "Taxa Admin" },
    });
    if (jaExiste) return;
    const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    await prisma.financial.create({
      data: {
        descricao: `Taxa Admin — ${contrato.student?.name} — ${mesAtual}`,
        tipo: "entrada",
        valor: contrato.valorEmpresa,
        categoria: "Taxa Admin",
        status: "PENDENTE",
        recorrente: true,
        diaVencimento: contrato.vencimento || 5,
        contractId,
        companyId: contrato.companyId,
        franchiseId: contrato.franchiseId,
      } as any,
    });
  } catch (e) {
    console.error("[Financeiro] criarLancamentoTaxaAdmin:", e);
  }
}

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
    case "as":
      // Avaliação Semestral — gera um documento de avaliação padrão
      html = gerarAvaliacaoSemestral(contratoData, body.periodo || "", body.notas || {});
      break;
    case "pt":
      // Parecer Técnico — gera parecer técnico do estágio
      html = gerarParecerTecnico(contratoData, body.parecer || "", body.recomendacao || "Aprovado");
      break;
    default:
      return NextResponse.json({ error: `Tipo '${doc.tipo}' não implementado` }, { status: 400 });
  }

  const updated = await saveDocumentHtml(params.docId, html);

  // Para TR: salvar ultimoDia e motivo no metaData (contrato fica INATIVO apenas ao ENVIAR para assinatura)
  if (doc.tipo === "tr" && (body.ultimoDia || body.motivo)) {
    await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        metaData: {
          ...((doc.metaData as any) || {}),
          ultimoDia: body.ultimoDia || null,
          motivo: body.motivo || null,
        },
      },
    });
  }

  return NextResponse.json({ document: updated, html });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const body = await req.json();
  const doc = await prisma.internshipDocument.findUnique({ where: { id: params.docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ─── Assinatura parcial para TCE/PE — qualquer parte pode assinar a qualquer momento ───
  if (body.assinarComo && (doc.tipo === "tce" || doc.tipo === "pe")) {
    const SIGNATARIOS = ["empresa", "instituicao", "estudante"] as const;
    type Signatario = typeof SIGNATARIOS[number];
    const quem: Signatario = body.assinarComo;
    if (!SIGNATARIOS.includes(quem)) return NextResponse.json({ error: "Signatário inválido" }, { status: 400 });

    const signers: Record<string, any> = (doc.signers as any) || {};
    signers[quem] = { assinado: true, assinadoAt: new Date().toISOString(), nome: body.nome || quem };

    const todosAssinaram = SIGNATARIOS.every(s => signers[s]?.assinado);
    const novoStatus = todosAssinaram ? "ASSINADO" : "AGUARDANDO_ASSINATURA";

    const updated = await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        signers,
        status: novoStatus as any,
        signedAt: todosAssinaram ? new Date() : undefined,
      },
    });

    // Auto-ativar contrato quando TCE 100% assinado pelos 3
    if (todosAssinaram && doc.tipo === "tce") {
      await prisma.contract.update({ where: { id: params.id }, data: { status: "ATIVO" as any } });
      // Lançamento automático de Taxa de Administração
      await criarLancamentoTaxaAdmin(params.id);
    }

    return NextResponse.json({ document: updated, todosAssinaram, novoStatus });
  }

  // ─── Update simples de status ───
  const updated = await prisma.internshipDocument.update({
    where: { id: params.docId },
    data: {
      status: body.status as any,
      metaData: body.metaData,
      signedAt: body.status === "ASSINADO" ? new Date() : undefined,
    },
  });

  // Auto-ativar contrato quando TCE marcado como ASSINADO diretamente
  if (body.status === "ASSINADO" && doc.tipo === "tce") {
    await prisma.contract.update({ where: { id: params.id }, data: { status: "ATIVO" as any } });
    await criarLancamentoTaxaAdmin(params.id);
  }

  return NextResponse.json({ document: updated });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const document = await prisma.internshipDocument.findUnique({
    where: { id: params.docId },
    include: {
      contract: {
        include: {
          student: { select: { email: true, name: true } },
          company: { select: { email: true, name: true } },
          institution: { select: { email: true, name: true } },
        },
      },
    },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Extrair emails do contrato para pré-preenchimento no frontend
  const contractEmails = {
    company: document.contract?.company?.email || null,
    companyName: document.contract?.company?.name || null,
    student: document.contract?.student?.email || null,
    studentName: document.contract?.student?.name || null,
    institution: document.contract?.institution?.email || null,
    institutionName: document.contract?.institution?.name || null,
  };

  return NextResponse.json({ document, contractEmails });
}
