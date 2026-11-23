/**
 * POST /api/app/franquia-crm/[id]/jornada — FRANQUEADORA.
 *  { acao: "link" }     gera (ou devolve) o link único Apresentação + COF do lead.
 *  { acao: "contrato" } envia o contrato de franquia ao Autentique (exige cadastro; bloqueado até o modelo ser aprovado).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { enviarParaAutentique, autentiqueConectado } from "@/lib/autentique";
import { gerarToken, APP_URL } from "@/lib/franquia/jornada";
import { CONTRATO_APROVADO, faltandoParaContrato, enderecoDoCadastro } from "@/lib/franquia/contratoTemplate";
import { validarCadastro } from "@/lib/franquia/cadastro";
import { gerarContratoPdf } from "@/lib/franquia/contratoPdf";
import { novoPrazo, linkValido } from "@/lib/franquia/link";
import type { CadastroFranquia } from "@/lib/franquia/cadastro";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
    const corpo = await req.json().catch(() => ({}));
    const { acao } = corpo;
    const lead = await prisma.franquiaLead.findUnique({ where: { id: params.id } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    if (acao === "link") {
      // O prazo de 30 dias conta do envio ao lead: gera na 1ª vez e renova só quando pedido ou já vencido.
      const b = corpo;
      const token = lead.tokenPublico || gerarToken();
      let expira = lead.linkExpiraEm;
      if (!lead.tokenPublico || !expira || b.renovar || !linkValido(expira)) {
        expira = novoPrazo();
        await prisma.franquiaLead.update({ where: { id: lead.id }, data: { tokenPublico: token, linkExpiraEm: expira } });
      }
      return NextResponse.json({ url: `${APP_URL}/franquia/p/${token}`, cadastroUrl: `${APP_URL}/franquia/cadastro/${token}`, expiraEm: expira });
    }

    if (acao === "dados") {
      // Matriz ajusta, lead a lead, os dados pessoais, a região, o valor negociado e a forma de pagamento do contrato.
      const b = corpo;
      const atual = (lead.cadastro as any) || {};
      const v = validarCadastro({ ...atual, ...(b.cadastro || {}) });
      if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
      const valor = b.valor === "" || b.valor == null ? null : Number(b.valor);
      if (valor !== null && (!isFinite(valor) || valor < 0)) return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
      if (lead.contratoDocId) return NextResponse.json({ error: "O contrato já foi enviado; os dados não podem mais ser alterados." }, { status: 409 });
      await prisma.franquiaLead.update({ where: { id: lead.id }, data: {
        cadastro: { ...v.dados, enderecoCompleto: String(b.enderecoCompleto ?? "").slice(0, 250) || undefined } as any,
        contratoRegiao: String(b.regiao ?? "").slice(0, 150) || null,
        contratoFormaPagamento: String(b.formaPagamento ?? "").slice(0, 400) || null,
        valorInvestimento: valor,
      } });
      return NextResponse.json({ ok: true });
    }

    if (acao === "contrato") {
      if (!CONTRATO_APROVADO) return NextResponse.json({ error: "Envio bloqueado: o modelo do contrato de franquia ainda não foi aprovado/configurado (FRANQUIA_CONTRATO_LIBERADO)." }, { status: 409 });
      if (lead.contratoDocId) return NextResponse.json({ error: "O contrato deste lead já foi enviado." }, { status: 409 });
      const c = lead.cadastro as unknown as CadastroFranquia | null;
      if (!c) return NextResponse.json({ error: "O candidato ainda não preencheu o cadastro de fechamento." }, { status: 409 });
      if (!(await autentiqueConectado())) return NextResponse.json({ error: "Autentique não está conectado." }, { status: 503 });

      const dados = { cadastro: c, regiao: lead.contratoRegiao, valor: lead.valorInvestimento, formaPagamento: lead.contratoFormaPagamento, enderecoCompleto: (lead.cadastro as any)?.enderecoCompleto || enderecoDoCadastro(c) };
      const falta = faltandoParaContrato(dados);
      if (falta.length) return NextResponse.json({ error: `Preencha antes de enviar: ${falta.join(" e ")}.` }, { status: 409 });
      const signatarios = [{ email: c.email, nome: c.nome, action: "SIGN" as const }];
      const smarter = (process.env.FRANQUIA_SIGNATARIO_EMAIL || "").trim();
      if (smarter) signatarios.push({ email: smarter, nome: process.env.FRANQUIA_SIGNATARIO_NOME || "Smarter Estágios", action: "SIGN" });
      const pdf = await gerarContratoPdf(dados);
      const doc = await enviarParaAutentique(`Contrato de Franquia — ${c.nomeUnidade}`, "", signatarios, { buffer: pdf, nomeOriginal: "Contrato-de-Franquia-Smarter.pdf" });

      await prisma.franquiaLead.update({ where: { id: lead.id }, data: { contratoDocId: doc.id, contratoEnviadoEm: new Date(), etapa: "contrato_enviado", etapaChangedAt: new Date() } });
      await prisma.franquiaNota.create({ data: { leadId: lead.id, tipo: "etapa", texto: "Contrato de franquia enviado para assinatura (Autentique)." } });
      return NextResponse.json({ ok: true, docId: doc.id });
    }
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e) { return handleApiError(e, "FRANQUIA_JORNADA"); }
}
