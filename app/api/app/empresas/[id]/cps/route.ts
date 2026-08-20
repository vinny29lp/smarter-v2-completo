import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { handleApiError } from "@/lib/api-response";
import { checkPermission } from "@/lib/permissions";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";

function gerarHtmlCPS(empresa: any, franchise: any, valorGestao: number): string {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const valorStr = valorGestao.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Contrato de Prestação de Serviços — ${empresa.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.7}
  .doc{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm 20mm;background:white;position:relative}
  .header{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
  .header img{height:36px;object-fit:contain}
  .header-center{flex:1;text-align:center;padding:0 16px}
  .header-title{color:white;font-size:13px;font-weight:900}
  .header-sub{color:rgba(255,255,255,.7);font-size:9px;margin-top:2px}
  .badge{display:inline-block;background:#22c55e;color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px}
  h1{font-size:13px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;color:#0f2a5e}
  h2{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e;border-bottom:1px solid #0f2a5e33;padding-bottom:3px;margin:14px 0 6px}
  p{margin-bottom:8px;text-align:justify}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}
  .party-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px}
  .party-label{font-size:8.5px;font-weight:900;text-transform:uppercase;color:#64748b;margin-bottom:5px}
  .party-name{font-size:12px;font-weight:900;color:#0f2a5e}
  .fld{margin-bottom:4px}
  .fld-label{font-size:8.5px;color:#9ca3af;font-weight:700;text-transform:uppercase}
  .fld-val{font-size:10.5px;color:#1f2937}
  .highlight{background:#f5c40022;border:1px solid #f5c40066;border-radius:6px;padding:8px 12px;margin:10px 0;font-weight:900;font-size:12px;text-align:center;color:#92400e}
  .sig-area{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
  .sig-box{text-align:center}
  .sig-line{border-top:1px solid #374151;margin-bottom:4px}
  .sig-name{font-size:10px;font-weight:700}
  .sig-role{font-size:9px;color:#64748b}
  .footer{position:absolute;bottom:10mm;left:16mm;right:16mm;border-top:1px solid #e2e8f0;padding-top:4px;display:flex;justify-content:space-between;font-size:8px;color:#9ca3af}
  @media print{body{background:white}.doc{margin:0}}
</style>
</head><body><div class="doc">

<div class="header">
  <img src="${appUrl}/logo-sistema.png" alt="Sistema Smarter"/>
  <div class="header-center">
    <div class="header-title">Contrato de Prestação de Serviços</div>
    <div class="header-sub">Gestão de Estágios — Lei 11.788/2008</div>
  </div>
  <div class="badge">CPS</div>
</div>

<h1>Contrato de Prestação de Serviços de Gestão de Estágios</h1>
<p style="text-align:center;font-size:10px;color:#64748b;margin-bottom:14px">${hoje}</p>

<div class="parties">
  <div class="party-box">
    <div class="party-label">CONTRATANTE</div>
    <div class="party-name">${empresa.name}</div>
    <div class="fld"><div class="fld-label">Razão Social</div><div class="fld-val">${empresa.razaoSocial || empresa.name}</div></div>
    <div class="fld"><div class="fld-label">CNPJ</div><div class="fld-val">${empresa.cnpj}</div></div>
    <div class="fld"><div class="fld-label">Endereço</div><div class="fld-val">${[empresa.endereco, empresa.bairro, empresa.cidade, empresa.uf].filter(Boolean).join(", ")}</div></div>
    <div class="fld"><div class="fld-label">Responsável</div><div class="fld-val">${empresa.responsavel || "—"} ${empresa.cargoResponsavel ? "— " + empresa.cargoResponsavel : ""}</div></div>
    <div class="fld"><div class="fld-label">E-mail</div><div class="fld-val">${empresa.email}</div></div>
  </div>
  <div class="party-box">
    <div class="party-label">CONTRATADA (Agente de Integração)</div>
    <div class="party-name">${franchise?.name || "Sistema Smarter"}</div>
    ${franchise?.cnpj ? `<div class="fld"><div class="fld-label">CNPJ</div><div class="fld-val">${franchise.cnpj}</div></div>` : ""}
    ${franchise?.endereco ? `<div class="fld"><div class="fld-label">Endereço</div><div class="fld-val">${[franchise.endereco, franchise.cidade, franchise.uf].filter(Boolean).join(", ")}</div></div>` : ""}
    ${franchise?.email ? `<div class="fld"><div class="fld-label">E-mail</div><div class="fld-val">${franchise.email}</div></div>` : ""}
    ${franchise?.telefone ? `<div class="fld"><div class="fld-label">Telefone</div><div class="fld-val">${franchise.telefone}</div></div>` : ""}
  </div>
</div>

<h2>Cláusula 1 — Objeto do Contrato</h2>
<p>O presente contrato tem por objeto a prestação de serviços de intermediação e gestão de estágios, conforme disposto na Lei nº 11.788, de 25 de setembro de 2008, pela CONTRATADA à CONTRATANTE, incluindo: captação e seleção de estagiários; elaboração e gestão de Termos de Compromisso de Estágio (TCE); acompanhamento pedagógico; emissão de documentos e relatórios; e demais obrigações legais relativas à relação de estágio.</p>

<h2>Cláusula 2 — Remuneração</h2>
<p>Pela prestação dos serviços descritos neste contrato, a CONTRATANTE pagará à CONTRATADA o valor de:</p>
<div class="highlight">R$ ${valorStr} por estagiário/mês</div>
<p>O pagamento deverá ser realizado até o dia 10 (dez) de cada mês, mediante emissão de Nota Fiscal pela CONTRATADA. O valor poderá ser reajustado anualmente pelo índice IPCA ou por acordo entre as partes, com aviso prévio de 30 (trinta) dias.</p>

<h2>Cláusula 3 — Obrigações da Contratada</h2>
<p>A CONTRATADA se obriga a: (a) realizar a triagem e seleção dos candidatos a estagiário; (b) elaborar, registrar e custodiar os Termos de Compromisso de Estágio; (c) orientar e acompanhar as atividades de estágio conforme a legislação vigente; (d) emitir os documentos obrigatórios previstos em lei; (e) comunicar à CONTRATANTE eventuais irregularidades observadas.</p>

<h2>Cláusula 4 — Obrigações da Contratante</h2>
<p>A CONTRATANTE se obriga a: (a) designar supervisor para orientação do estagiário; (b) pagar pontualmente a bolsa-auxílio e o auxílio-transporte ao estagiário; (c) oferecer instalações adequadas ao desenvolvimento das atividades de estágio; (d) manter atualizados os dados cadastrais junto à CONTRATADA; (e) efetuar o pagamento dos honorários da CONTRATADA no prazo estipulado.</p>

<h2>Cláusula 5 — Prazo de Vigência</h2>
<p>O presente contrato tem vigência de 12 (doze) meses a partir da data de assinatura, renovando-se automaticamente por igual período, salvo manifestação contrária de qualquer das partes com antecedência mínima de 30 (trinta) dias.</p>

<h2>Cláusula 6 — Rescisão</h2>
<p>Este contrato poderá ser rescindido por qualquer das partes, mediante notificação escrita com 30 (trinta) dias de antecedência, sem ônus para nenhuma das partes, desde que não haja estágios em andamento ou que os mesmos sejam regularmente encerrados.</p>

<h2>Cláusula 7 — Foro</h2>
<p>Fica eleito o foro da Comarca de ${empresa.cidade}/${empresa.uf} para dirimir quaisquer litígios decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${empresa.responsavel || "_________________________"}</div>
    <div class="sig-role">${empresa.cargoResponsavel || "Responsável Legal"}</div>
    <div class="sig-role">${empresa.name}</div>
    <div class="sig-role">CONTRATANTE</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${franchise?.name || "_________________________"}</div>
    <div class="sig-role">Representante Legal</div>
    <div class="sig-role">CONTRATADA</div>
  </div>
</div>

<div class="footer">
  <span>Contrato de Prestação de Serviços — ${empresa.name}</span>
  <span>Gerado pela plataforma Sistema Smarter · ${hoje}</span>
</div>
</div></body></html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const empresa = await prisma.company.findUnique({
    where: { id: params.id },
    include: { franchise: true },
  });
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  // SEC: escopo por franquia — unidade só gera CPS de empresa da própria franquia.
  const role = session.user.role || "";
  if (role !== "FRANQUEADORA" && empresa.franchiseId !== session.user.franchiseId) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  const valorGestao = (empresa as any).valorGestao || 0;
  if (!valorGestao) {
    return NextResponse.json({ error: "Defina o valor de gestão por estagiário antes de gerar o contrato." }, { status: 400 });
  }

  const html = wrapParaPDF(gerarHtmlCPS(empresa, empresa.franchise, valorGestao), `CPS — ${empresa.name}`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="cps-${empresa.name.replace(/\s+/g,"-").toLowerCase()}.html"`,
    },
  });
  } catch (e) {
    return handleApiError(e, "EMPRESA_CPS_GET");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const { valorGestao } = await req.json();
  if (!valorGestao || isNaN(Number(valorGestao))) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  // SEC: escopo por franquia — FRANQUEADO só altera empresa da própria franquia.
  if (session.user.role !== "FRANQUEADORA") {
    const alvo = await prisma.company.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!alvo || alvo.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }
  }

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: { valorGestao: Number(valorGestao) } as any,
  });

  return NextResponse.json({ ok: true, valorGestao: (updated as any).valorGestao });
}
