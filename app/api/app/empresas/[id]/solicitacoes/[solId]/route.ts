import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { wrapParaPDF } from "@/lib/pdf-wrapper";

export const dynamic = "force-dynamic";

// GET — gera PDF da solicitação (abre no browser para impressão)
export async function GET(req: Request, { params }: { params: { id: string; solId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const sol = await (prisma as any).vagaSolicitacao.findUnique({
    where: { id: params.solId },
    include: { company: { select: { name: true, cnpj: true, cidade: true, uf: true, responsavel: true } } },
  });
  if (!sol) return new Response("Não encontrado", { status: 404 });

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const generoLabel: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", indiferente: "Indiferente" };
  const nivelLabel: Record<string, string> = { medio: "Ensino Médio", superior: "Ensino Superior", pos: "Pós-Graduação" };

  const fld = (label: string, value: string | null | undefined) =>
    value ? `<div class="fld"><p class="fld-label">${label}</p><p class="fld-val">${value}</p></div>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Solicitação de Vaga — ${sol.company.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.7}
  .doc{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm 20mm;background:white}
  .header{background:linear-gradient(135deg,#0f2a5e,#1a3d8f);border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
  .header-title{color:white;font-size:13px;font-weight:900}
  .header-sub{color:rgba(255,255,255,.7);font-size:9px;margin-top:2px}
  .badge{background:#f5c400;color:#0f2a5e;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px;display:inline-block}
  h2{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e;border-bottom:1px solid #0f2a5e33;padding-bottom:3px;margin:14px 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 12px}
  .fld{margin-bottom:5px}
  .fld-label{font-size:8.5px;color:#9ca3af;font-weight:700;text-transform:uppercase}
  .fld-val{font-size:10.5px;color:#1f2937;margin-top:1px}
  .texto-longo{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:8px;font-size:10px;line-height:1.6;white-space:pre-wrap;margin-top:4px}
  .empresa-box{background:#f0f4ff;border:1px solid #c7d6f7;border-radius:6px;padding:10px 14px;margin-bottom:14px}
  .empresa-name{font-size:14px;font-weight:900;color:#0f2a5e}
  .empresa-info{font-size:9px;color:#64748b;margin-top:2px}
  .footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
  .footer-text{font-size:8.5px;color:#9ca3af}
</style></head><body>
<div class="doc">
  <div class="header">
    <div>
      <div class="header-title">Smarter Estágios</div>
      <div class="header-sub">Solicitação de Abertura de Vaga</div>
    </div>
    <span class="badge">PERFIL DA VAGA</span>
  </div>

  <div class="empresa-box">
    <div class="empresa-name">${sol.company.name}</div>
    <div class="empresa-info">CNPJ: ${sol.company.cnpj} &nbsp;|&nbsp; ${sol.company.cidade}/${sol.company.uf} &nbsp;|&nbsp; Solicitado em: ${new Date(sol.createdAt).toLocaleDateString("pt-BR")}</div>
  </div>

  <h2>📋 Dados da Vaga</h2>
  <div class="grid">
    ${fld("Função / Cargo", sol.funcao)}
    ${fld("Modalidade", sol.modalidade)}
    ${fld("Valor da Bolsa", `R$ ${Number(sol.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)}
    ${fld("Auxílio Transporte", sol.auxTransporte ? `R$ ${Number(sol.auxTransporte).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado")}
    ${fld("Horário", sol.horario)}
    ${fld("Dias de Trabalho", sol.diasTrabalho)}
    ${fld("Carga Horária Semanal", sol.cargaHoraria ? `${sol.cargaHoraria}h` : "30h")}
  </div>

  <div class="fld" style="margin-top:8px">
    <p class="fld-label">Atividades a serem exercidas</p>
    <div class="texto-longo">${sol.atividades}</div>
  </div>

  ${sol.beneficios ? `<div class="fld" style="margin-top:8px"><p class="fld-label">Benefícios</p><div class="texto-longo">${sol.beneficios}</div></div>` : ""}

  <h2>🎓 Perfil do Candidato</h2>
  <div class="grid3">
    ${fld("Curso Desejado", sol.cursoDesejado || "Indiferente")}
    ${fld("Preferência de Gênero", generoLabel[sol.preferenciaGenero || "indiferente"] || "Indiferente")}
    ${fld("Nível de Ensino", sol.nivel ? nivelLabel[sol.nivel] || sol.nivel : "Indiferente")}
  </div>

  <h2>👤 Supervisor do Estagiário</h2>
  <div class="grid">
    ${fld("Nome", sol.supervisorNome)}
    ${fld("Cargo", sol.supervisorCargo)}
    ${fld("E-mail", sol.supervisorEmail)}
    ${fld("Telefone / WhatsApp", sol.supervisorTel)}
  </div>

  ${sol.observacoes ? `<h2>📝 Observações</h2><div class="texto-longo">${sol.observacoes}</div>` : ""}

  <div class="footer">
    <span class="footer-text">Smarter Estágios — sistema.smarterestagios.com.br</span>
    <span class="footer-text">Gerado em: ${hoje}</span>
  </div>
</div>
</body></html>`;

  return new Response(wrapParaPDF(html, `Solicitação de Vaga — ${sol.company.name}`), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// PATCH — atualizar status (REJEITADA)
export async function PATCH(req: Request, { params }: { params: { id: string; solId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const body = await req.json();
  const sol = await (prisma as any).vagaSolicitacao.update({
    where: { id: params.solId },
    data: { status: body.status },
  });

  return NextResponse.json({ ok: true, sol });
}
