// POST /api/ies/[token]/minuta-propria
// Fluxo: IES envia PDF da minuta própria → sistema envia ao Autentique com
// signatários: representante da IES + convenios@smarterestagios.com.br
// Rota PÚBLICA — IES não tem login no sistema

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { enviarParaAutentique } from "@/lib/autentique";
import { getSystemConfig } from "@/lib/getConfig";
import { enviarMiniutaPropriaParaSmarter } from "@/lib/email";

export const runtime = "nodejs";

// Next.js App Router: limite de tamanho de body para uploads
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const formData = await req.formData();
    const assinanteName = (formData.get("assinanteName") as string)?.trim();
    const assinanteCpf  = (formData.get("assinanteCpf")  as string)?.trim();
    const assinanteEmail = (formData.get("assinanteEmail") as string)?.trim().toLowerCase();
    const observacao    = (formData.get("observacao")    as string) || "";
    const arquivo       = formData.get("arquivo") as File | null;

    // Validações
    if (!assinanteName) return NextResponse.json({ error: "Nome do representante é obrigatório." }, { status: 400 });
    if (!assinanteCpf)  return NextResponse.json({ error: "CPF do representante é obrigatório." }, { status: 400 });
    if (!assinanteEmail) return NextResponse.json({ error: "E-mail do representante é obrigatório." }, { status: 400 });
    if (!arquivo || arquivo.size === 0) return NextResponse.json({ error: "O arquivo PDF da minuta é obrigatório." }, { status: 400 });
    if (arquivo.size > 20 * 1024 * 1024) return NextResponse.json({ error: "O arquivo PDF não pode ultrapassar 20 MB." }, { status: 400 });

    // Buscar IES
    const institution = await prisma.institution.findUnique({ where: { token: params.token } });
    if (!institution) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
    if (institution.convenioStatus === "FIRMADO")          return NextResponse.json({ error: "Este convênio já foi assinado." }, { status: 409 });
    if (institution.convenioStatus === "AGUARDANDO_MINUTA") return NextResponse.json({ error: "Já existe uma solicitação em andamento para esta IES." }, { status: 409 });
    if (institution.convenioStatus === "CANCELADO")        return NextResponse.json({ error: "Este convite foi cancelado." }, { status: 410 });

    // Captura metadados
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "IP não capturado";
    const userAgent = req.headers.get("user-agent") || "";
    const agora = new Date();

    // Buscar config da Smarter
    const smarter = await getSystemConfig();
    const nomeSmarter = smarter?.razaoSocial || "Smarter Estágios Agente de Integração Ltda.";
    const responsavelSmarter = smarter?.responsavel || "Vinicius Miranda de Freitas Paiva";

    // ── Enviar para Autentique ────────────────────────────────────────────────
    // O PDF da IES é enviado diretamente; Autentique adiciona campos de assinatura
    let autentiqueDocId: string | null = null;
    let autentiqueLinkIES: string | null = null;
    let autentiqueErro: string | null = null;

    try {
      const pdfBuffer = await arquivo.arrayBuffer();
      const pdfBlob   = new Blob([pdfBuffer], { type: "application/pdf" });

      // Usamos a GraphQL mutation do Autentique com arquivo PDF (mesma estrutura que HTML)
      const token_autentique = process.env.AUTHENTIQUE_API_TOKEN || smarter?.autentiqueToken || "";
      if (!token_autentique) throw new Error("Token Autentique não configurado.");

      const query = `
        mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
          createDocument(document: $document, signers: $signers, file: $file) {
            id name
            signatures { email name action { name } link { short_link } }
          }
        }
      `;
      const titulo = `Convênio de Estágio — ${institution.name}`;
      const variables = {
        document: { name: titulo },
        signers: [
          { email: assinanteEmail, name: assinanteName, action: "SIGN" },
          { email: "convenios@smarterestagios.com.br", name: responsavelSmarter, action: "SIGN" },
        ],
        file: null,
      };

      const fd = new FormData();
      fd.append("operations", JSON.stringify({ query, variables }));
      fd.append("map", JSON.stringify({ "0": ["variables.file"] }));
      fd.append("0", pdfBlob, arquivo.name || "minuta.pdf");

      const resp = await fetch("https://api.autentique.com.br/v2/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token_autentique}` },
        body: fd,
        signal: AbortSignal.timeout(25_000),
      });
      const json = await resp.json();
      if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));

      const doc = json.data?.createDocument;
      autentiqueDocId = doc?.id || null;
      // Link de assinatura para a IES (primeiro signatário)
      const sigIES = doc?.signatures?.find((s: any) => s.email === assinanteEmail);
      autentiqueLinkIES = sigIES?.link?.short_link || null;
    } catch (e: any) {
      autentiqueErro = e?.message || "Erro ao criar documento no Autentique.";
      // Não bloqueia o fluxo — registramos o erro e continuamos
    }

    // ── Atualizar banco ───────────────────────────────────────────────────────
    const assinaturaLog = {
      timestamp: agora.toISOString(),
      ip,
      userAgent,
      assinanteName,
      assinanteEmail,
      assinanteCpf: assinanteCpf.replace(/\D/g, ""),
      nomeInstituicao: institution.name,
      cnpjInstituicao: institution.cnpj || "",
      fluxo: "MINUTA_PROPRIA_AUTENTIQUE",
      tokenUsado: params.token,
      autentiqueDocId,
      autentiqueErro,
      observacao,
    };

    await prisma.institution.update({
      where: { token: params.token },
      data: {
        convenioStatus:    "AGUARDANDO_MINUTA",
        convenioAssinadoEm: agora,
        assinanteName,
        assinanteEmail,
        assinanteCpf: assinanteCpf.replace(/\D/g, ""),
        assinanteIp: ip,
        assinanteUserAgent: userAgent,
        assinaturaLog,
      },
    });

    // ── Notificar time de convênios (não-blocante) ────────────────────────────
    const portalUrl = `${req.headers.get("origin") || process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br"}/ies/${params.token}`;
    enviarMiniutaPropriaParaSmarter({
      nomeIES: institution.name,
      emailIES: assinanteEmail,
      assinanteName,
      assinanteCpf,
      observacao,
      portalUrl,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      minutaPropria: true,
      autentiqueDocId,
      autentiqueLinkIES,
      autentiqueErro,
      message: autentiqueErro
        ? "Solicitação registrada! Houve um problema ao criar o documento no Autentique — nossa equipe entrará em contato em breve."
        : "Documento enviado ao Autentique! Você receberá o link de assinatura por e-mail em instantes.",
    });
  } catch (e) {
    return handleApiError(e, "IES_MINUTA_PROPRIA_POST");
  }
}
