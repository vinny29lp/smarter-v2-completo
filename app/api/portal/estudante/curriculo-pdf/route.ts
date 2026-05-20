import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DISC_INFO: Record<string,{nome:string;desc:string}> = {
  D:{nome:"Dominância",    desc:"Focado em resultados, direto e assertivo"},
  I:{nome:"Influência",    desc:"Comunicativo, entusiasta e persuasivo"},
  S:{nome:"Estabilidade",  desc:"Colaborativo, paciente e confiável"},
  C:{nome:"Conformidade",  desc:"Analítico, meticuloso e preciso"},
};

export async function GET(req: Request) {
  const session   = await getServerSession(authOptions);
  const studentId = session?.user?.studentId;
  if (!studentId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { institution: true },
  });
  if (!student) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });

  const disc = student.discResult ? DISC_INFO[student.discResult] : null;

  const habilidades = (student.habilidades || []).join(" • ");
  const idiomas     = Array.isArray(student.idiomas)
    ? (student.idiomas as any[]).map((i:any) => i.idioma || i).join(", ")
    : "";
  const experiencias = Array.isArray(student.experiencias)
    ? (student.experiencias as any[]).map((e:any,i:number) =>
        `<div style="margin-bottom:10px"><p style="font-size:12px;color:#1a1a1a">${e.descricao||JSON.stringify(e)}</p></div>`
      ).join("")
    : (typeof student.experiencias === "string" ? `<p style="font-size:12px">${student.experiencias}</p>` : "");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#1a1a1a;background:#f1f5f9}
  .doc{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:16mm 18mm}
  .header{background:#0f2a5e;color:white;padding:20px 24px;border-radius:8px;margin-bottom:20px}
  .name{font-size:24px;font-weight:900}
  .sub{font-size:12px;opacity:.8;margin-top:4px}
  .contacts{display:flex;gap:16px;margin-top:8px;font-size:11px;opacity:.85}
  .section{margin-bottom:18px}
  .section-title{font-size:10px;font-weight:900;color:white;background:#0f2a5e;padding:3px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;display:inline-block}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .field{background:#f8fafc;border-radius:6px;padding:8px 10px}
  .field label{font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;display:block;margin-bottom:2px}
  .field p{font-size:12px;font-weight:500}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
  .disc-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin-bottom:18px}
  .disc-title{font-size:14px;font-weight:900;color:#0f2a5e}
  .disc-desc{font-size:11px;color:#374151;margin-top:2px}
  @media print{.doc{box-shadow:none;margin:0}}
</style></head><body>
<div class="doc">
  <div class="header">
    <div class="name">${student.name}</div>
    <div class="sub">${student.curso || ""}${student.periodo ? ` — ${student.periodo}º período` : ""}${student.institution ? ` • ${student.institution.name}` : ""}</div>
    <div class="contacts">
      ${student.email ? `<span>✉️ ${student.email}</span>` : ""}
      ${student.celular ? `<span>📱 ${student.celular}</span>` : ""}
      ${student.cidade ? `<span>📍 ${student.cidade}${student.uf?`/${student.uf}`:"" }</span>` : ""}
      ${student.linkedin ? `<span>🔗 ${student.linkedin}</span>` : ""}
    </div>
  </div>

  ${disc ? `
  <div class="disc-box">
    <span class="section-title">Perfil DISC</span>
    <p class="disc-title">${student.discResult} — ${disc.nome}</p>
    <p class="disc-desc">${disc.desc}</p>
  </div>` : ""}

  <div class="section">
    <span class="section-title">Dados Pessoais</span>
    <div class="grid">
      ${student.cpf ? `<div class="field"><label>CPF</label><p>${student.cpf}</p></div>` : ""}
      ${student.dataNasc ? `<div class="field"><label>Data de Nascimento</label><p>${new Date(student.dataNasc).toLocaleDateString("pt-BR")}</p></div>` : ""}
      ${student.previsaoConclusao ? `<div class="field"><label>Previsão de Conclusão</label><p>${student.previsaoConclusao}</p></div>` : ""}
    </div>
  </div>

  ${student.objetivos ? `
  <div class="section">
    <span class="section-title">Objetivo Profissional</span>
    <p style="font-size:12px;line-height:1.6;color:#374151">${student.objetivos}</p>
  </div>` : ""}

  ${habilidades ? `
  <div class="section">
    <span class="section-title">Habilidades</span>
    <div class="tags">${student.habilidades.map((h:string) => `<span class="tag">${h}</span>`).join("")}</div>
  </div>` : ""}

  ${idiomas ? `
  <div class="section">
    <span class="section-title">Idiomas</span>
    <p style="font-size:12px">${idiomas}</p>
  </div>` : ""}

  ${experiencias ? `
  <div class="section">
    <span class="section-title">Experiências</span>
    ${experiencias}
  </div>` : ""}

  <p style="margin-top:30px;font-size:9px;color:#9ca3af;text-align:center">
    Currículo gerado via Smarter Estágios — ${new Date().toLocaleDateString("pt-BR")}
  </p>
</div></body></html>`;

  return NextResponse.json({ html });
}
