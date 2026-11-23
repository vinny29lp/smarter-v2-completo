/** Gera o PDF do contrato de franquia com a identidade visual da Smarter (capa, logo, marca d'água, rodapé e paginação). */
import PDFDocument from "pdfkit";
// @ts-ignore — pdfkit 0.21: sem tipos para o registro de fontes
import { registerStdFonts } from "pdfkit";
// @ts-ignore
import Helvetica from "pdfkit/standard-fonts/Helvetica";
// @ts-ignore
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
// @ts-ignore
import HelveticaOblique from "pdfkit/standard-fonts/HelveticaOblique";

// Fontes padrão importadas de forma explícita: na Vercel o pdfkit não consegue lê-las do disco (erro "Cannot load the standard font").
(registerStdFonts as any)(Helvetica, HelveticaBold, HelveticaOblique);
import { paragrafosContrato, localEData, cpfFormatado, type DadosContrato } from "./contratoTemplate";
import { LOGO_PNG_B64, ICONE_PNG_B64 } from "./identidadeVisual";
import { ASSINATURA_SMARTER_B64 } from "./assinaturaSmarter";

const M = { l: 62, r: 62, t: 92, b: 70 };
const logo = Buffer.from(LOGO_PNG_B64, "base64");
const icone = Buffer.from(ICONE_PNG_B64, "base64");
const assinatura = Buffer.from(ASSINATURA_SMARTER_B64, "base64");

export function gerarContratoPdf(d: DadosContrato): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: M.t, bottom: M.b, left: M.l, right: M.r }, bufferPages: true,
      info: { Title: "Contrato Empresarial de Franquia — Smarter Estágios", Author: "Smarter Estágios Agente de Integração LTDA" } });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);

    const W = doc.page.width, H = doc.page.height;
    const fundo = (capa: boolean) => {
      // marca d'água: ícone da marca, esmaecido, centralizado
      const tam = capa ? 380 : 330;
      doc.save().opacity(capa ? 0.16 : 0.1).image(icone, (W - tam) / 2, (H - tam * 0.95) / 2, { width: tam }).restore();
      doc.image(logo, M.l - 8, 24, { width: 150 });
    };
    fundo(true);
    doc.on("pageAdded", () => fundo(false));

    // ── Capa ──
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#000").text("CONTRATO EMPRESARIAL DE", M.l, H / 2 - 40, { width: W - M.l - M.r, align: "center" });
    doc.text("FRANQUIA", { align: "center" });
    doc.addPage();

    // ── Corpo ──
    doc.fillColor("#000").fontSize(11);
    for (const p of paragrafosContrato(d)) {
      if (p.titulo) {
        doc.moveDown(0.5).font("Helvetica-Bold").fontSize(11).text(p.trechos[0].t, { align: "left", paragraphGap: 4 });
        continue;
      }
      const largura = W - M.l - M.r;
      if (p.trechos.length === 1) {
        doc.font(p.trechos[0].b ? "Helvetica-Bold" : "Helvetica").fontSize(11).text(p.trechos[0].t, M.l, doc.y, { align: "justify", width: largura, lineGap: 2 });
      } else {
        // parágrafo com campos em negrito: texto corrido (sem justificar, pois o pdfkit não justifica trechos encadeados)
        p.trechos.forEach((t, i) => {
          doc.font(t.b ? "Helvetica-Bold" : "Helvetica").fontSize(11);
          if (i === 0) doc.text(t.t, M.l, doc.y, { width: largura, lineGap: 2, continued: true });
          else doc.text(t.t, { continued: i < p.trechos.length - 1, lineGap: 2 });
        });
      }
      doc.moveDown(0.55);
    }

    // ── Assinaturas ──
    if (doc.y > H - 330) doc.addPage();
    doc.font("Helvetica").fontSize(11).moveDown(1).text(localEData(d.dataContrato), M.l, doc.y, { align: "left" });
    const y0 = doc.y + 16, colW = (W - M.l - M.r) / 2;
    doc.image(assinatura, M.l + colW / 2 - 85, y0, { width: 170 });
    const yl = y0 + 112;
    doc.moveTo(M.l + 10, yl).lineTo(M.l + colW - 10, yl).strokeColor("#000").lineWidth(0.7).stroke();
    doc.moveTo(M.l + colW + 10, yl).lineTo(W - M.r - 10, yl).stroke();
    doc.font("Helvetica-Bold").fontSize(9.5);
    doc.text("SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA", M.l, yl + 6, { width: colW, align: "center" });
    doc.text(d.cadastro.nome, M.l + colW, yl + 6, { width: colW, align: "center" });
    doc.font("Helvetica").fontSize(9.5);
    doc.text("CNPJ: 65.358.303/0001-26", M.l, yl + 30, { width: colW, align: "center" });
    doc.text(`CPF: ${cpfFormatado(d.cadastro.cpf)}`, M.l + colW, yl + 30, { width: colW, align: "center" });
    doc.font("Helvetica-Bold").text("FRANQUEADORA", M.l, yl + 44, { width: colW, align: "center" });
    doc.text("FRANQUEADO", M.l + colW, yl + 44, { width: colW, align: "center" });

    // ── Rodapé em todas as páginas (barra cinza + paginação) ──
    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      const prev = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      doc.save().rect(M.l - 4, H - 50, W - M.l - M.r + 8, 18).fill("#d9d9d9").restore();
      doc.fillColor("#222").font("Helvetica").fontSize(7.5)
        .text("|DIREITOS: ", M.l, H - 45, { continued: true, lineBreak: false })
        .font("Helvetica-Oblique").text("Smarter Estágios FRANCHISING", { continued: true, lineBreak: false })
        .font("Helvetica").text(" | CONTRATO DE FRANQUIA EMPRESARIAL | REVISÃO AGOSTO 2023 |", { continued: false, lineBreak: false });
      doc.text(`Página: ${i + 1}`, W - M.r - 70, H - 45, { width: 66, align: "right", lineBreak: false });
      doc.page.margins.bottom = prev;
    }
    doc.end();
  });
}
