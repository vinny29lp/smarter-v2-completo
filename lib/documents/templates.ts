import type { ContratoData } from "./types";
import { valorExtenso, numeroExtenso, dataExtenso } from "./utils";

const SMARTER_STAMP_B64 = "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";

// ── PREMIUM CSS ───────────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif}
.doc{font-size:11px;color:#1a1a1a;width:210mm;min-height:297mm;margin:0 auto;
  padding:12mm 14mm 20mm;background:white;line-height:1.55;position:relative}

/* ── HEADER ── */
.dh{background:linear-gradient(135deg,#0f2a5e 0%,#1a3d8f 100%);
  border-radius:6px;padding:12px 16px;margin-bottom:8px;display:flex;
  align-items:center;justify-content:space-between}
.dh-logo{display:flex;align-items:center}
.dh-logo img{height:36px;object-fit:contain}
.dh-center{text-align:center;flex:1;padding:0 16px}
.dh-type{color:rgba(255,255,255,.7);font-size:8.5px;text-transform:uppercase;letter-spacing:1px}
.dh-title{color:white;font-size:15px;font-weight:900;text-transform:uppercase;margin:2px 0}
.dh-sub{color:rgba(255,255,255,.65);font-size:8.5px}
.dh-right{text-align:right}
.dh-badge{display:inline-block;background:#22c55e;color:white;font-size:8px;font-weight:900;
  padding:2px 7px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.dh-num{color:#f5c400;font-size:10px;font-weight:700}
.dh-num2{color:rgba(255,255,255,.65);font-size:8px;margin-top:1px}

/* ── INFO BAR ── */
.info-bar{display:grid;grid-template-columns:repeat(4,1fr);
  border:1px solid #e2e8f0;border-radius:5px;overflow:hidden;margin-bottom:10px}
.info-cell{padding:5px 8px;border-right:1px solid #e2e8f0}
.info-cell:last-child{border-right:none}
.info-cell label{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;display:block;margin-bottom:1px}
.info-cell span{font-size:9.5px;font-weight:700;color:#1f2937}
.id-strip{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;
  padding:4px 10px;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:9px;color:#6b7280}
.id-strip strong{color:#0f2a5e}

/* ── SECTIONS ── */
.sec{margin:8px 0}
.sec-head{display:flex;align-items:center;gap:8px;margin-bottom:5px;
  padding-bottom:3px;border-bottom:2px solid #0f2a5e}
.sec-n{background:#0f2a5e;color:white;font-size:10px;font-weight:900;
  width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  flex-shrink:0}
.sec-t{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#0f2a5e}

/* ── FIELD GRID ── */
.fg{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden}
.fg.cols1{grid-template-columns:1fr}
.fld{padding:4px 8px;border-bottom:1px solid #f1f5f9;min-height:28px}
.fld:nth-child(odd):not(.full){border-right:1px solid #f1f5f9}
.fld.full{grid-column:1/-1}
.fld label{font-size:8px;font-weight:700;text-transform:uppercase;color:#9ca3af;display:block;margin-bottom:1px}
.fld span{font-size:10px;color:#1f2937}

/* ── SCHEDULE TABLE ── */
.sch-table{width:100%;border-collapse:collapse;margin:4px 0;font-size:10px}
.sch-table thead th{background:#0f2a5e;color:white;padding:4px 8px;text-align:left;font-size:9px;font-weight:700}
.sch-table thead th:not(:first-child){text-align:center}
.sch-table tbody td{border-bottom:1px solid #f1f5f9;padding:3px 8px;color:#1f2937}
.sch-table tbody td:not(:first-child){text-align:center;color:#374151}
.sch-table tbody tr:last-child td{border-bottom:none}
.sch-table tbody tr.ativo{background:#f0f9ff}
.sch-summary{display:grid;grid-template-columns:repeat(4,1fr);
  border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;margin-top:4px}
.sch-sum-cell{padding:5px 8px;border-right:1px solid #e2e8f0;text-align:center}
.sch-sum-cell:last-child{border-right:none}
.sch-sum-cell .v{font-size:12px;font-weight:900;color:#0f2a5e}
.sch-sum-cell .l{font-size:8px;color:#9ca3af;margin-top:1px}

/* ── CLAUSES ── */
.cls-block{border:1px solid #e2e8f0;border-radius:5px;padding:7px 10px;margin-bottom:5px}
.cls-head{display:flex;align-items:flex-start;gap:8px;margin-bottom:4px}
.cls-n{background:#0f2a5e;color:white;font-size:9px;font-weight:900;
  min-width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;margin-top:1px}
.cls-title{font-size:10px;font-weight:900;color:#0f2a5e;text-transform:uppercase;letter-spacing:.3px}
.cls-body{font-size:10px;color:#374151;line-height:1.6;text-align:justify}
.cls-ref{font-size:8px;color:#9ca3af;margin-top:3px;display:flex;align-items:center;gap:4px}
.cls-ref::before{content:"§";font-weight:700;color:#d1d5db}

/* ── ACTIVITIES LIST ── */
.act-item{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9}
.act-item:last-child{border-bottom:none}
.act-n{background:#0f2a5e;color:white;font-size:9px;font-weight:900;
  min-width:16px;height:16px;border-radius:3px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;margin-top:1px}
.act-text{font-size:10px;color:#374151;line-height:1.5}

/* ── SIGNATURES ── */
.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
.sign-box{text-align:center}
.sign-line{border-bottom:1px solid #374151;margin-bottom:5px;padding-top:36px;position:relative}
.sign-name{font-size:10px;font-weight:700;color:#1f2937}
.sign-role{font-size:8.5px;color:#6b7280;margin-top:2px}
.sign-detail{font-size:8px;color:#9ca3af;margin-top:1px}
.sign-cert{background:#f0f9ff;border:1px solid #bfdbfe;border-radius:4px;
  padding:6px 10px;margin-top:12px;display:flex;align-items:flex-start;gap:6px;font-size:8.5px;color:#1d4ed8}
.sign-cert-icon{font-size:14px;flex-shrink:0}

/* ── FOOTER ── */
.page-footer{position:absolute;bottom:10mm;left:14mm;right:14mm;
  border-top:1px solid #e2e8f0;padding-top:4px;
  display:flex;align-items:center;justify-content:space-between}
.pf-left{display:flex;flex-direction:column;gap:1px}
.pf-doc{font-size:8px;font-weight:700;color:#0f2a5e}
.pf-id{font-size:7.5px;color:#9ca3af}
.pf-right{text-align:right}
.pf-legal{font-size:7.5px;color:#9ca3af;line-height:1.4}
.pf-num{font-size:8px;font-weight:700;color:#374151}

/* ── BRAND SECTION ── */
.brand-sec{margin-top:16px;padding:12px 14px;background:#f8fafc;
  border:1px solid #e2e8f0;border-radius:6px;text-align:center}
.brand-tag{font-size:11px;font-weight:900;color:#0f2a5e;text-transform:uppercase;letter-spacing:1px}
.brand-sub{font-size:8.5px;color:#6b7280;margin-top:1px}
.brand-items{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.bi{padding:6px 8px;background:white;border:1px solid #e2e8f0;border-radius:4px;font-size:8px;color:#374151;text-align:center}
.bi strong{display:block;font-size:9px;color:#0f2a5e;margin-bottom:1px}

/* ── UTIL ── */
.obj-box{background:#f8fafc;border-left:3px solid #0f2a5e;
  padding:8px 12px;border-radius:0 4px 4px 0;margin:4px 0;font-size:10px;
  color:#374151;line-height:1.6;text-align:justify}
.sup-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
.sup-box{border:1px solid #e2e8f0;border-radius:4px;padding:8px 10px}
.sup-role{font-size:8px;font-weight:900;text-transform:uppercase;color:#6b7280;
  border-bottom:1px solid #f1f5f9;padding-bottom:3px;margin-bottom:5px}
.sup-name{font-size:10.5px;font-weight:700;color:#1f2937}
.sup-detail{font-size:9px;color:#6b7280;margin-top:2px}
.sup-line{margin-top:10px;padding-top:5px;border-top:1px solid #e2e8f0;
  font-size:9px;color:#374151}
.seg-box{display:flex;align-items:center;gap:8px;background:#fef3c7;
  border:1px solid #fcd34d;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:9.5px;color:#92400e}
.pagebreak{page-break-before:always;padding-top:12mm}
@page{size:A4 portrait;margin:0}
@media print{
  html,body{margin:0!important;padding:0!important;background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .doc{width:100%!important;max-width:100%!important;margin:0!important;box-shadow:none!important;min-height:0!important}
  .sec,.fg,.cls-block,.info-bar{break-inside:avoid;page-break-inside:avoid}
  h2,h3,.sec-head,.dh{break-after:avoid;page-break-after:avoid}
}
`;

// ── HELPERS ──────────────────────────────────────────────────────────────────
function fld(label: string, value: string, full?: boolean): string {
  return `<div class="fld${full ? " full" : ""}"><label>${label}</label><span>${value || "—"}</span></div>`;
}
function secHead(n: number | string, title: string): string {
  return `<div class="sec-head"><div class="sec-n">${n}</div><div class="sec-t">${title}</div></div>`;
}
function docId(numero: string, ies: string, cidade: string): string {
  const ano = new Date().getFullYear();
  const iesPart = ies.split(/\s+/).filter(w => w.length > 3).map(w => w[0]).join("").slice(0,5).toUpperCase();
  const cidPart = cidade.split("/")[0].substring(0,3).toUpperCase();
  return `SMR-${ano}-${String(numero).replace("/","-")}-${iesPart || "IES"}-${cidPart}`;
}
function pageFooter(tceNum: string, did: string, smarter: ContratoData["smarter"]): string {
  return `<div class="page-footer">
    <div class="pf-left">
      <div class="pf-doc">TCE Nº ${tceNum}</div>
      <div class="pf-id">ID: ${did}</div>
    </div>
    <div class="pf-right">
      <div class="pf-legal">Lei 11.788/2008 · LGPD 13.709/2018 · MP 2.200-2/2001 · Lei 14.063/2020</div>
      <div class="pf-legal">${smarter.cnpj}</div>
    </div>
  </div>`;
}
function schTable(horarios: Array<{dia:string;inicio:string;fim:string;ativo?:boolean;chDiaria?:number}>, chDiariaDefault: number): string {
  const rows = horarios.map(h => {
    const ativo = h.inicio !== "—" && h.inicio;
    const ch = ativo ? (h.chDiaria !== undefined ? h.chDiaria : chDiariaDefault) : null;
    const chStr = ch !== null ? (Number.isInteger(ch) ? `${ch}h` : `${ch.toFixed(1)}h`) : "—";
    return `<tr class="${ativo ? "ativo" : ""}">
      <td>${h.dia}</td>
      <td>${h.inicio || "—"}</td>
      <td>${h.fim || "—"}</td>
      <td>${chStr}</td>
    </tr>`;
  }).join("");
  return `<table class="sch-table">
    <thead><tr><th>Dia da Semana</th><th>Início</th><th>Fim</th><th>C.H. Diária</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
function schSummary(chSemanal: number, chDiaria: number, intervalo: number, local: string): string {
  const intStr = intervalo ? `${intervalo} min` : "—";
  return `<div class="sch-summary">
    <div class="sch-sum-cell"><div class="v">${chSemanal}h</div><div class="l">Semanal</div></div>
    <div class="sch-sum-cell"><div class="v">${chDiaria}h</div><div class="l">Diária</div></div>
    <div class="sch-sum-cell"><div class="v">${intStr}</div><div class="l">Intervalo</div></div>
    <div class="sch-sum-cell"><div class="v" style="font-size:9px">${local.split("/")[0].substring(0,10)}</div><div class="l">Local</div></div>
  </div>`;
}
function clause(n: number, title: string, body: string, ref: string): string {
  return `<div class="cls-block">
    <div class="cls-head"><div class="cls-n">${n}</div><div class="cls-title">Cláusula ${n}ª — ${title}</div></div>
    <div class="cls-body">${body}</div>
    <div class="cls-ref">${ref}</div>
  </div>`;
}
function actItem(n: number, text: string): string {
  return `<div class="act-item"><div class="act-n">${n}</div><div class="act-text">${text}</div></div>`;
}
function docHeader(tceNum: string, mainTitle: string, subTitle: string, badge: string = "DOCUMENTO ATIVO"): string {
  return `<div class="dh">
    <div class="dh-logo"><img src="https://sistema.smarterestagios.com.br/logo-sistema.png" alt="Sistema Smarter"/></div>
    <div class="dh-center">
      <div class="dh-type">TCE · Nº ${tceNum}</div>
      <div class="dh-title">${mainTitle}</div>
      <div class="dh-sub">${subTitle}</div>
    </div>
    <div class="dh-right">
      <div class="dh-badge">${badge}</div>
      <div class="dh-num">Nº ${tceNum}</div>
    </div>
  </div>`;
}
function infoBar(cells: Array<{l:string;v:string}>): string {
  return `<div class="info-bar">${cells.map(c=>`<div class="info-cell"><label>${c.l}</label><span>${c.v}</span></div>`).join("")}</div>`;
}

// ── TCE + PLANO DE ESTÁGIO ────────────────────────────────────────────────────
export function gerarTCE(c: ContratoData): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const did = docId(c.numero, ies.razaoSocial, c.cidadeAssinatura);
  const bolsaFmt = `R$ ${Number(est.valorBolsa).toLocaleString("pt-BR",{minimumFractionDigits:2})} (${valorExtenso(Number(est.valorBolsa))})`;
  const auxFmt = est.auxilioTransporte > 0 ? `R$ ${Number(est.auxilioTransporte).toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "Não previsto";
  const diasDesc = (() => {
    const ativos = est.horarios.filter((h:any) => h.inicio !== "—" && h.inicio);
    if (!ativos.length) return "A definir";
    const dias = ativos.map((h:any) => h.dia.split("-")[0]);
    return dias.length === 5 && dias[0].startsWith("Segunda") && dias[4].startsWith("Sexta")
      ? "de segunda a sexta-feira" : dias.join(", ");
  })();
  // Agrupa dias ativos por faixa de horário para descrever múltiplos turnos corretamente
  const jornadaDesc = (() => {
    const ativos = (est.horarios as any[]).filter(h => h.ativo && h.inicio && h.inicio !== "—");
    if (!ativos.length) return `${diasDesc}, horário a definir`;
    // Verificar se todos os dias têm o mesmo horário
    const uniqueKeys = [...new Set(ativos.map((h:any) => `${h.inicio}|${h.fim}`))];
    if (uniqueKeys.length === 1) {
      return `${diasDesc}, das ${ativos[0].inicio} às ${ativos[0].fim}`;
    }
    // Múltiplos turnos: agrupar dias por horário
    const groups = new Map<string, string[]>();
    ativos.forEach((h:any) => {
      const key = `${h.inicio}|${h.fim}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h.dia.replace("-feira",""));
    });
    const parts: string[] = [];
    groups.forEach((dias, key) => {
      const [ini, fim] = key.split("|");
      const label = dias.length > 1 ? `${dias[0]} a ${dias[dias.length-1]}` : dias[0];
      parts.push(`${label} das ${ini} às ${fim}`);
    });
    return parts.join("; ");
  })();

  // Parse activities into a list
  const actList = est.atividades.split(/[;()\d+\.]/).map(a => a.trim()).filter(a => a.length > 10);
  const actHtml = actList.length > 1
    ? actList.map((a, i) => actItem(i+1, a)).join("")
    : `<div class="obj-box">${est.atividades}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>TCE ${c.numero}</title><style>${CSS}</style></head><body>
<div class="doc">

${docHeader(c.numero, "Termo de Compromisso de Estágio", `Estágio ${c.tipoEstagio} · Conforme Lei Nº 11.788, de 25 de setembro de 2008`)}

${infoBar([
  {l:"Data de Celebração", v: dataExtenso ? dataExtenso(c.dataAssinatura) : c.dataAssinatura},
  {l:"Vigência", v: `${est.dataInicio} ⟶ ${est.dataFim}`},
  {l:"Cidade", v: c.cidadeAssinatura},
  {l:"ID do Documento", v: did},
])}

<div class="id-strip">🔒 ID DO DOCUMENTO: <strong>${did}</strong> &nbsp;·&nbsp; Assinatura digital processada via plataforma Authentique</div>

<!-- SEÇÃO 1 -->
<div class="sec">${secHead(1, "Instituição de Ensino")}
<div class="fg">
${fld("Razão Social", ies.razaoSocial)}${fld("Nome Fantasia", ies.nomeFan)}
${fld("CNPJ", ies.cnpj)}${fld("Telefone", ies.telefone)}
${fld("Endereço", ies.endereco, true)}
${fld("Cidade / UF", ies.cidade + "/" + ies.estado)}${fld("CEP", ies.cep)}
${fld("Orientador(a) Responsável", ies.orientador)}${fld("Cargo", ies.cargoOrientador)}
${fld("E-mail Institucional", ies.email)}${fld("E-mail do Orientador", ies.emailOrientador)}
</div></div>

<!-- SEÇÃO 2 -->
<div class="sec">${secHead(2, "Unidade Concedente")}
<div class="fg">
${fld("Razão Social", emp.razaoSocial)}${fld("Nome Fantasia", emp.nomeFan)}
${fld("CNPJ", emp.cnpj)}${fld("Ramo de Atividade", "—")}
${fld("Endereço", emp.endereco, true)}
${fld("Cidade / UF", emp.cidade + "/" + emp.estado)}${fld("CEP", emp.cep)}
${fld("Supervisor(a)", emp.supervisor)}${fld("Cargo do Supervisor", emp.cargoSupervisor)}
${fld("E-mail do Supervisor", emp.emailSupervisor)}${fld("Telefone do Supervisor", emp.telefoneSupervisor)}
</div></div>

<!-- SEÇÃO 3 -->
<div class="sec">${secHead(3, "Estagiário(a)")}
<div class="fg">
${fld("Nome Completo", e.nome)}${fld("E-mail", e.email)}
${fld("CPF", e.cpf)}${fld("RG", e.rg)}
${fld("Celular", e.celular)}${fld("Telefone", e.telefone)}
${fld("Endereço", e.endereco, true)}
${fld("Cidade / UF", e.cidade + "/" + e.estado)}${fld("CEP", e.cep)}
${fld("Curso", e.curso)}${fld("Período / Semestre", e.periodo + "°")}
</div></div>

<!-- SEÇÃO 4 -->
<div class="sec">${secHead(4, "Agente de Integração")}
<div class="fg">
${fld("Razão Social", sm.razaoSocial)}${fld("CNPJ", sm.cnpj)}
${fld("Endereço", sm.endereco, true)}
${fld("Cidade / UF", sm.cidade + "/" + sm.estado)}${fld("Telefone", sm.telefone)}
${fld("E-mail", sm.email)}${fld("Responsável", sm.responsavel)}
</div></div>

<!-- SEÇÃO 5 -->
<div class="sec">${secHead(5, "Jornada e Horários")}
${schTable(est.horarios, est.chDiaria)}
${schSummary(est.chSemanal, est.chDiaria, est.intervalo, est.localEstagio)}
</div>

<!-- SEÇÃO 6 — 20 CLÁUSULAS -->
<div class="sec">${secHead(6, "Cláusulas do Termo")}

${clause(1, "Inexistência de Vínculo Empregatício",
  `O presente Termo de Compromisso de Estágio não caracteriza vínculo empregatício entre o(a) ESTAGIÁRIO(A) e a UNIDADE CONCEDENTE. O presente Termo visa assegurar a complementação de aprendizagem por meio de treinamento prático, integração social, profissional e desenvolvimento do(a) ESTAGIÁRIO(A), sendo regido exclusivamente pela Lei n° 11.788/2008.`,
  "Art. 3°, Lei 11.788/2008")}

${clause(2, "Vigência e Rescisão",
  `Este Termo terá vigência de <strong>${est.dataInicio}</strong> até <strong>${est.dataFim}</strong>, podendo ser rescindido a qualquer momento mediante comunicação formal entre as partes, ou prorrogado mediante Termo Aditivo. O prazo máximo de permanência na mesma concedente é de 2 (dois) anos, exceto nos casos de portadores de deficiência.`,
  "Art. 11 e 12, Lei 11.788/2008")}

${clause(3, "Jornada e Compatibilidade Escolar",
  `As atividades de estágio serão realizadas <strong>${jornadaDesc}</strong>, perfazendo <strong>${est.chSemanal} (${numeroExtenso(est.chSemanal)}) horas semanais</strong> e <strong>${est.chDiaria} (${numeroExtenso(est.chDiaria)}) horas diárias</strong>, compatíveis com o horário escolar do(a) ESTAGIÁRIO(A). Durante férias ou recessos escolares, outra jornada poderá ser estabelecida entre as partes, respeitando os limites legais.`,
  "Art. 10, Lei 11.788/2008")}

${clause(4, "Redução de Jornada em Período de Avaliação",
  `Durante o período de avaliação, previamente comunicado pelo(a) ESTAGIÁRIO(A) no início do período letivo à UNIDADE CONCEDENTE, a jornada diária poderá ser reduzida à metade, sem prejuízo do pagamento integral da bolsa-auxílio.`,
  "Art. 10, §2°, Lei 11.788/2008")}

${clause(5, "Recesso Remunerado",
  `O(A) ESTAGIÁRIO(A) tem direito ao recesso remunerado de 30 (trinta) dias após 12 (doze) meses de estágio na mesma empresa. Caso a vigência seja inferior a 12 meses, o recesso será concedido proporcionalmente, calculado à razão de 2,5 (dois vírgula cinco) dias por mês trabalhado, a ser gozado preferencialmente durante as férias ou recessos escolares.`,
  "Art. 13, Lei 11.788/2008")}

${clause(6, "Compatibilidade das Atividades com o Curso",
  `As atividades desenvolvidas deverão ser compatíveis com o contexto básico da profissão e do curso de <strong>${e.curso}</strong> do(a) ESTAGIÁRIO(A), propiciando aprendizagem profissional, social e cultural. Alterações nas atividades somente terão validade mediante formalização de Termo Aditivo assinado por todas as partes.`,
  "Art. 7°, I, Lei 11.788/2008")}

${clause(7, "Atividades a Serem Desenvolvidas",
  `São atividades inicialmente previstas para o(a) ESTAGIÁRIO(A): ${est.atividades}`,
  "Art. 7°, Lei 11.788/2008")}

${clause(8, "Bolsa-Auxílio e Benefícios",
  `A UNIDADE CONCEDENTE remunerará o(a) ESTAGIÁRIO(A) com bolsa-auxílio no valor de <strong>${bolsaFmt}</strong> mensais, paga a partir do mês subsequente ao vencimento, podendo variar conforme frequência mensal. Vale-Transporte: <strong>${auxFmt}</strong>. O não pagamento da bolsa configura inadimplência e é causa de rescisão imediata.`,
  "Art. 12, Lei 11.788/2008")}

${clause(9, "Normas Internas e Programa de Estágio",
  `O(A) ESTAGIÁRIO(A) deverá cumprir o programa de estágio estabelecido, bem como as normas internas da UNIDADE CONCEDENTE. Sempre que necessário, o(a) ESTAGIÁRIO(A) deverá fornecer informações para o acompanhamento e supervisão do programa de estágio, dentro do prazo estipulado.`,
  "Art. 7°, III, Lei 11.788/2008")}

${clause(10, "Encerramento Automático",
  `Na eventual conclusão, abandono ou trancamento do curso, bem como o não cumprimento das normas estabelecidas neste Termo, haverá a interrupção automática do presente instrumento, independentemente de comunicação prévia. A INSTITUIÇÃO DE ENSINO deverá notificar imediatamente as demais partes sobre qualquer fato impeditivo da continuidade do estágio.`,
  "Art. 11, parágrafo único, Lei 11.788/2008")}

${clause(11, "Papel do Agente de Integração",
  `Fica <strong>${sm.razaoSocial}</strong> como centralizadora do processo de estágio entre a UNIDADE CONCEDENTE e o(a) ESTAGIÁRIO(A). Quaisquer alterações que se façam necessárias neste Termo deverão ser previamente comunicadas ao Agente. Cabe ao Agente: ajustar as condições de realização; fazer acompanhamento administrativo; encaminhar a negociação do seguro; disponibilizar relatórios periódicos; e notificar a UNIDADE CONCEDENTE sobre suas responsabilidades legais caso identifique violação dos compromissos assumidos.`,
  "Art. 5°, Lei 11.788/2008")}

${clause(12, "Seguro Contra Acidentes Pessoais",
  `Na vigência do presente Termo, o(a) ESTAGIÁRIO(A) estará incluído(a) na cobertura do Seguro Contra Acidentes Pessoais, sob responsabilidade do AGENTE DE INTEGRAÇÃO — <strong>${sm.razaoSocial}</strong>. A apólice será providenciada e mantida pelo Agente durante toda a vigência deste instrumento, conforme exigência legal.`,
  "Art. 9°, IV, Lei 11.788/2008")}

${clause(13, "Obrigações da Unidade Concedente",
  `No desenvolvimento do estágio, caberá à UNIDADE CONCEDENTE: (a) garantir ao(à) ESTAGIÁRIO(A) o cumprimento das exigências escolares, inclusive quanto ao horário; (b) proporcionar atividades de aprendizagem social, profissional e cultural compatíveis com sua formação; (c) proporcionar condições de treinamento prático e de relacionamento humano; (d) proporcionar à INSTITUIÇÃO DE ENSINO subsídios que possibilitem o acompanhamento, supervisão e avaliação do estágio.`,
  "Art. 9°, Lei 11.788/2008")}

${clause(14, "Obrigações do(a) Estagiário(a)",
  `No desenvolvimento do estágio, caberá ao(à) ESTAGIÁRIO(A): (a) cumprir com empenho e interesse a programação estabelecida; (b) observar as diretrizes e normas internas da UNIDADE CONCEDENTE e os dispositivos legais aplicáveis; (c) comunicar à INSTITUIÇÃO DE ENSINO qualquer fato relevante sobre seu estágio; (d) elaborar e entregar relatório sobre o estágio na forma estabelecida pela IES, para posterior análise.`,
  "Art. 7°, Lei 11.788/2008")}

${clause(15, "Obrigações da Instituição de Ensino",
  `No desenvolvimento do estágio, caberá à INSTITUIÇÃO DE ENSINO: (a) avaliar as instalações do local de realização do estágio quanto à adequação à formação profissional e ao horário do(a) ESTAGIÁRIO(A); (b) notificar a UNIDADE CONCEDENTE quando ocorrer transferência, trancamento, abandono ou outro fato impeditivo da continuidade; (c) indicar orientador da área desenvolvida no estágio para acompanhar e avaliar as atividades.`,
  "Art. 7°, Lei 11.788/2008")}

${clause(16, "Relatórios e Acompanhamento",
  `O AGENTE DE INTEGRAÇÃO disponibilizará ao(à) ESTAGIÁRIO(A) o relatório de acompanhamento periodicamente, e disponibilizará para a INSTITUIÇÃO DE ENSINO as informações do relatório preenchido pelo(a) aluno(a), para acompanhamento, avaliação, supervisão e controle do estágio. O(A) ESTAGIÁRIO(A) deverá preencher e entregar os relatórios bimestralmente, registrados na plataforma digital da <strong>${sm.razaoSocial}</strong>.`,
  "Art. 7°, IV e Art. 5°, III, Lei 11.788/2008")}

${clause(17, "LGPD — Proteção e Tratamento de Dados",
  `As partes autorizam o tratamento de dados pessoais necessários à execução deste Termo, nos termos da Lei n° 13.709/2018 (LGPD). A <strong>${sm.razaoSocial}</strong> atua como Operadora de Dados, com uso restrito às finalidades de gestão do estágio. Os dados serão armazenados com segurança e compartilhados entre as partes signatárias exclusivamente para fins deste contrato. O(A) ESTAGIÁRIO(A) tem direito de acessar, corrigir ou solicitar a exclusão de seus dados a qualquer tempo.`,
  "Lei 13.709/2018 — LGPD")}

${clause(18, "Validade da Assinatura Digital",
  `As partes concordam expressamente que as assinaturas eletrônicas e digitais apostas neste documento possuem plena validade jurídica, nos termos da Medida Provisória n° 2.200-2/2001, da Lei n° 14.063/2020 e do Marco Civil da Internet (Lei n° 12.965/2014), produzindo os mesmos efeitos das assinaturas físicas em papel. A coleta de assinaturas eletrônicas é processada por plataforma certificada de assinatura digital.`,
  "MP 2.200-2/2001 · Lei 14.063/2020")}

${clause(19, "Alterações — Termo Aditivo",
  `Quaisquer alterações nas condições deste Termo — incluindo jornada, atividades, bolsa-auxílio, supervisores ou vigência — somente terão validade mediante formalização por escrito em Termo Aditivo, assinado por todas as partes e registrado no sistema da <strong>${sm.razaoSocial}</strong>. O AGENTE DE INTEGRAÇÃO deverá ser comunicado previamente a qualquer modificação.`,
  "Art. 5°, Lei 11.788/2008")}

${clause(20, "Conformidade Legal e Foro",
  `O presente Termo é celebrado em estrita conformidade com a Lei n° 11.788/2008 e demais normas aplicáveis. Para dirimir eventuais controvérsias, as partes elegem o foro da Comarca de <strong>${c.cidadeAssinatura}</strong>, com renúncia expressa a qualquer outro, por mais privilegiado que seja. O presente instrumento é firmado em 4 (quatro) vias de igual teor e forma.`,
  "Lei 11.788/2008 — Conformidade integral")}

</div>

<!-- ASSINATURAS -->
<p style="font-size:10px;text-align:justify;margin:14px 0">
Em <strong>${c.cidadeAssinatura}</strong>, ${dataExtenso ? dataExtenso(c.dataAssinatura) : c.dataAssinatura}. As partes declaram ter lido e compreendido integralmente o presente Termo, concordando com todos os seus termos, assinando-o eletronicamente pela plataforma Sistema Smarter, com plena validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020.
</p>

<div class="sign-grid">
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${ies.razaoSocial}</div>
    <div class="sign-role">INSTITUIÇÃO DE ENSINO</div>
    <div class="sign-detail">${ies.orientador}</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${emp.razaoSocial}</div>
    <div class="sign-role">UNIDADE CONCEDENTE</div>
    <div class="sign-detail">${emp.supervisor}</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${e.nome}</div>
    <div class="sign-role">ESTAGIÁRIO(A)</div>
    <div class="sign-detail">CPF: ${e.cpf}</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"><img src="data:image/png;base64,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" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/></div>
    <div class="sign-name">${sm.razaoSocial}</div>
    <div class="sign-role">AGENTE DE INTEGRAÇÃO</div>
    <div class="sign-detail">CNPJ: ${sm.cnpj}</div>
  </div>
${e.responsavel?.nome ? `  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${e.responsavel.nome}</div>
    <div class="sign-role">RESPONSÁVEL LEGAL</div>
    <div class="sign-detail">Responsável pelo menor ${e.nome}</div>
  </div>` : ""}
</div>

<div class="sign-cert">
  <div class="sign-cert-icon">🔐</div>
  <div>Área de Assinatura Digital — As assinaturas eletrônicas deste documento são coletadas e certificadas por plataforma de assinatura digital certificada (ICP-Brasil / MP 2.200-2/2001), com registro de identidade, data, hora e IP de cada signatário.</div>
</div>

<div class="brand-sec">
  <div class="brand-tag">O JEITO SMARTER</div>
  <div class="brand-sub">Gestão de Estágios de outro nível.</div>
  <div class="brand-items">
    <div class="bi"><strong>🖥 Tecnologia própria</strong>Gestão sistêmica em tempo real</div>
    <div class="bi"><strong>🤝 Atendimento humanizado</strong>Compliance total Lei 11.788/2008</div>
    <div class="bi"><strong>🔏 Assinatura digital</strong>Validade legal · Segurança LGPD</div>
  </div>
</div>

<p style="font-size:8px;text-align:center;color:#9ca3af;margin-top:8px">
  Documento gerado pela plataforma Sistema Smarter · ${did} · ${new Date().toLocaleDateString("pt-BR")} · Conforme Lei 11.788/2008 · LGPD 13.709/2018 · MP 2.200-2/2001
</p>

${pageFooter(c.numero, did, sm)}

<!-- ════════════════════════════════════════════════════════
     PLANO DE ESTÁGIO — PÁGINA SEGUINTE
════════════════════════════════════════════════════════ -->
<div class="pagebreak">

${docHeader(c.numero, "Plano de Estágio", `Vinculado ao TCE N° ${c.numero} · Lei N° 11.788/2008`)}

${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Curso · Período", v: `${e.curso} · ${e.periodo}°`},
  {l:"Período", v: `${est.dataInicio} ⟶ ${est.dataFim}`},
  {l:"ID do Documento", v: did},
])}

<div class="id-strip">🔒 ID DO DOCUMENTO: <strong>${did}</strong> &nbsp;·&nbsp; Assinatura digital processada via plataforma Authentique</div>

<!-- SEÇÃO 1 -->
<div class="sec">${secHead(1, "Identificação do Plano")}
<div class="fg">
${fld("Aluno(a)", e.nome)}${fld("E-mail", e.email)}
${fld("Curso", e.curso)}${fld("Período / Semestre", e.periodo + "°")}
${fld("Instituição de Ensino", ies.razaoSocial)}${fld("CNPJ da IES", ies.cnpj)}
${fld("Empresa Concedente", emp.razaoSocial)}${fld("CNPJ da Empresa", emp.cnpj)}
${fld("Ramo de Atividade", "—")}${fld("Contato de RH", emp.supervisor)}
${fld("Tel / E-mail do RH", `${emp.telefoneSupervisor} · ${emp.emailSupervisor}`)}${fld("Período do Estágio", `${est.dataInicio} a ${est.dataFim}`)}
${fld("Local de Realização", est.localEstagio)}${fld("Modalidade", est.modalidade || "Presencial")}
</div></div>

<!-- SEÇÃO 2 -->
<div class="sec">${secHead(2, "Objetivo do Estágio")}
<div class="obj-box">
  Proporcionar ao(à) ESTAGIÁRIO(A) a aplicação prática dos conhecimentos teóricos adquiridos no curso de <strong>${e.curso}</strong>, por meio da atuação direta junto à <strong>${emp.razaoSocial}</strong>, contribuindo para o desenvolvimento de competências técnicas e comportamentais essenciais à formação profissional, em conformidade com a Lei n° 11.788/2008.
</div></div>

<!-- SEÇÃO 3 -->
<div class="sec">${secHead(3, "Descrição das Atividades")}
${actHtml}
</div>

<!-- SEÇÃO 4 -->
<div class="sec">${secHead(4, "Horários do Estágio")}
${schTable(est.horarios, est.chDiaria)}
${schSummary(est.chSemanal, est.chDiaria, est.intervalo, est.localEstagio)}
</div>

<!-- SEÇÃO 5 -->
<div class="sec">${secHead(5, "Supervisores do Estágio")}
<div class="sup-grid">
  <div class="sup-box">
    <div class="sup-role">Coordenador(a) — Escola</div>
    <div class="sup-name">${ies.supervisorIES}</div>
    <div class="sup-detail">Cargo: ${ies.cargoSupervisorIES}</div>
    <div class="sup-detail">E-mail: ${ies.emailSupervisorIES}</div>
    <div class="sup-line">Visto: ____________________________</div>
    <div class="sup-line">Data: _____________________________</div>
  </div>
  <div class="sup-box">
    <div class="sup-role">Gestor(a) — Empresa</div>
    <div class="sup-name">${emp.supervisor}</div>
    <div class="sup-detail">Tel: ${emp.telefoneSupervisor}</div>
    <div class="sup-detail">E-mail: ${emp.emailSupervisor}</div>
    <div class="sup-line">Visto: ____________________________</div>
    <div class="sup-line">Data: _____________________________</div>
  </div>
</div>
<div class="seg-box">🛡️ <strong>Seguro Contra Acidentes Pessoais</strong> &nbsp;·&nbsp; Apólice: ${est.apoliceSeguro} &nbsp;·&nbsp; Seguradora: ${est.seguradora}</div>
</div>

<!-- ASSINATURAS DO PLANO -->
<p style="font-size:10px;text-align:justify;margin:14px 0">
As partes declaram que leram, compreenderam e concordam com o presente Plano de Estágio, parte integrante e indissociável do TCE N° ${c.numero}.
</p>

<div class="sign-grid">
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${ies.razaoSocial}</div>
    <div class="sign-role">INSTITUIÇÃO DE ENSINO</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${emp.razaoSocial}</div>
    <div class="sign-role">UNIDADE CONCEDENTE</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${e.nome}</div>
    <div class="sign-role">ESTAGIÁRIO(A)</div>
    <div class="sign-detail">CPF: ${e.cpf}</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"><img src="data:image/png;base64,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" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/></div>
    <div class="sign-name">${sm.razaoSocial}</div>
    <div class="sign-role">AGENTE DE INTEGRAÇÃO</div>
    <div class="sign-detail">CNPJ: ${sm.cnpj}</div>
  </div>
${e.responsavel?.nome ? `  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${e.responsavel.nome}</div>
    <div class="sign-role">RESPONSÁVEL LEGAL</div>
    <div class="sign-detail">Responsável pelo menor ${e.nome}</div>
  </div>` : ""}
</div>

${pageFooter(c.numero, did, sm)}
</div>
</div></body></html>`;
}

// ── HELPERS COMPARTILHADOS ─────────────────────────────────────────────────────
function premiumHeader(titulo: string, subtitulo: string, numero: string, sm: ContratoData["smarter"]): string {
  return `<div class="dh">
    <div class="dh-logo"><img src="https://sistema.smarterestagios.com.br/logo-sistema.png" alt="Sistema Smarter"/></div>
    <div class="dh-center">
      <div class="dh-type">Documento Nº ${numero}</div>
      <div class="dh-title">${titulo}</div>
      <div class="dh-sub">${subtitulo}</div>
    </div>
    <div class="dh-right">
      <div class="dh-badge">DOCUMENTO ATIVO</div>
      <div class="dh-num">Nº ${numero}</div>
      <div class="dh-num2">${sm.cnpj}</div>
    </div>
  </div>`;
}
function docFooter(titulo: string, numero: string, sm: ContratoData["smarter"]): string {
  return `<div class="page-footer">
    <div class="pf-left">
      <div class="pf-doc">${titulo}</div>
      <div class="pf-id">Nº ${numero}</div>
    </div>
    <div class="pf-right">
      <div class="pf-legal">Lei 11.788/2008 · LGPD 13.709/2018</div>
      <div class="pf-legal">${sm.razaoSocial}</div>
    </div>
  </div>`;
}
function sign2(a: [string,string], b: [string,string]): string {
  const stampImg = `<img src="data:image/png;base64,${SMARTER_STAMP_B64}" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/>`;
  const bIsAgente = b[1].toLowerCase().includes("agente");
  return `<div class="sign-grid" style="margin-top:24px">
    <div class="sign-box"><div class="sign-line"></div><div class="sign-name">${a[0]}</div><div class="sign-role">${a[1]}</div></div>
    <div class="sign-box"><div class="sign-line">${bIsAgente ? stampImg : ""}</div><div class="sign-name">${b[0]}</div><div class="sign-role">${b[1]}</div></div>
  </div>`;
}
function sign4(a: [string,string,string?], b: [string,string,string?], c2: [string,string,string?], d: [string,string,string?]): string {
  const stampImg = `<img src="data:image/png;base64,${SMARTER_STAMP_B64}" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/>`;
  const box = ([n,r,d2]: [string,string,string?]) => `<div class="sign-box">
    <div class="sign-line">${r === "AGENTE DE INTEGRAÇÃO" ? stampImg : ""}</div>
    <div class="sign-name">${n}</div>
    <div class="sign-role">${r}</div>
    ${d2 ? `<div class="sign-detail">${d2}</div>` : ""}
  </div>`;
  return `<div class="sign-grid" style="margin-top:24px">${[a,b,c2,d].map(box).join("")}</div>`;
}
function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body><div class="doc">${content}</div></body></html>`;
}

// ── RECIBO DE BOLSA ────────────────────────────────────────────────────────────
export function gerarReciboBolsa(c: ContratoData, mesRef: string): string {
  const { estudante: e, empresa: emp, estagio: est, smarter: sm } = c;
  const valor = Number(est.valorBolsa);
  const hoje = new Date().toLocaleDateString("pt-BR");
  return wrap(`
${premiumHeader("Recibo de Pagamento de Bolsa-Auxílio", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Mês de Referência", v: mesRef},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Valor", v: "R$ " + valor.toLocaleString("pt-BR",{minimumFractionDigits:2})},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Dados do Recibo")}
<div class="fg">
${fld("Estagiário(a)", e.nome, true)}
${fld("CPF", e.cpf)}${fld("Mês de Referência", mesRef)}
${fld("Empresa Concedente", emp.razaoSocial, true)}
${fld("CNPJ", emp.cnpj)}${fld("Valor da Bolsa", "R$ " + valor.toLocaleString("pt-BR",{minimumFractionDigits:2}))}
</div></div>

<div class="obj-box" style="margin:14px 0">
  Eu, <strong>${e.nome}</strong>, portador(a) do CPF <strong>${e.cpf}</strong>, declaro ter recebido da empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, a importância de <strong>R$ ${valor.toLocaleString("pt-BR",{minimumFractionDigits:2})} (${valorExtenso(valor)})</strong>, referente à bolsa-auxílio do estágio desenvolvido no mês de <strong>${mesRef}</strong>.
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
<div class="sign-grid" style="margin-top:0;grid-template-columns:1fr">
  <div class="sign-box" style="max-width:280px;margin:0 auto">
    <div class="sign-line"></div>
    <div class="sign-name">${e.nome}</div>
    <div class="sign-detail">CPF: ${e.cpf}</div>
  </div>
</div>
${docFooter("Recibo de Pagamento de Bolsa-Auxílio", c.numero, sm)}`);
}

// ── RESCISÃO AO TCE ────────────────────────────────────────────────────────────
export function gerarRescisao(c: ContratoData, ultimoDia: string, motivo: string, tipoRescisao?: string, menorDeIdade?: boolean, nomeResponsavel?: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");

  // Responsável legal: prioriza o informado no form; fallback para o cadastrado no aluno
  const respNome = (nomeResponsavel || "").trim() || (e.responsavel?.nome || "").trim();
  const isMinor  = !!(menorDeIdade && respNome);

  const stampImg = `<img src="data:image/png;base64,${SMARTER_STAMP_B64}" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/>`;
  const signBox = (nome: string, role: string, detail?: string, isAgente = false) =>
    `<div class="sign-box"><div class="sign-line">${isAgente ? stampImg : ""}</div><div class="sign-name">${nome}</div><div class="sign-role">${role}</div>${detail ? `<div class="sign-detail">${detail}</div>` : ""}</div>`;

  const assinaturas = isMinor
    ? `<div class="sign-grid" style="margin-top:24px">
        ${signBox(ies.razaoSocial, "INSTITUIÇÃO DE ENSINO")}
        ${signBox(emp.razaoSocial, "EMPRESA CONCEDENTE")}
        ${signBox(e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf)}
        ${signBox(sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj, true)}
        <div class="sign-box" style="grid-column:1 / -1;max-width:280px;margin:12px auto 0">
          <div class="sign-line"></div>
          <div class="sign-name">${respNome}</div>
          <div class="sign-role">RESPONSÁVEL LEGAL</div>
          <div class="sign-detail">Responsável pelo(a) menor ${e.nome}</div>
        </div>
      </div>`
    : sign4(
        [ies.razaoSocial, "INSTITUIÇÃO DE ENSINO"],
        [emp.razaoSocial, "EMPRESA CONCEDENTE"],
        [e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf],
        [sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj],
      );

  const menorObs = isMinor
    ? `<p style="font-size:10px;margin:6px 0;color:#374151">⚠️ Por ser o(a) estagiário(a) menor de idade, o presente Termo é também assinado por seu Responsável Legal <strong>${respNome}</strong>, nos termos do art. 5° do Código Civil e art. 1° da Lei 11.788/2008.</p>`
    : "";

  return wrap(`
${premiumHeader("Rescisão ao Termo de Compromisso de Estágio", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Último Dia de Estágio", v: ultimoDia || "—"},
  {l:"Tipo de Rescisão", v: tipoRescisao || "—"},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Dados da Rescisão")}
<div class="fg">
${fld("Empresa Concedente", emp.razaoSocial)}${fld("CNPJ", emp.cnpj)}
${fld("Representante", emp.representante)}${fld("Cargo", emp.cargoRepresentante)}
${fld("Estagiário(a)", e.nome)}${fld("CPF", e.cpf)}
${isMinor ? fld("Responsável Legal", respNome) : ""}
${fld("Início do Estágio", est.dataInicio)}${fld("Último Dia de Estágio", ultimoDia || "—")}
${fld("Tipo de Rescisão", tipoRescisao || "—", true)}
${motivo ? fld("Motivo / Observações", motivo, true) : ""}
</div></div>

<div class="obj-box" style="margin:14px 0">
  A empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, denominada <strong>UNIDADE CONCEDENTE</strong>, por seu representante <strong>${emp.representante}</strong>, e de outro lado o(a) ESTAGIÁRIO(A) <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, rescindem de comum acordo o Termo de Compromisso de Estágio firmado em <strong>${est.dataInicio}</strong>, sendo o último dia de estágio em <strong>${ultimoDia||"—"}</strong>, em razão de <strong>${tipoRescisao||"rescisão das partes"}</strong>. As partes conferem-se plena, total e irrevogável quitação de todas as obrigações legais assumidas, conforme art. 11 da Lei 11.788/2008.
</div>
${menorObs}
<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
${assinaturas}
${docFooter("Rescisão ao TCE", c.numero, sm)}`);
}

// ── RECIBO DE RESCISÃO ─────────────────────────────────────────────────────────
export type DescontoRescisao = { descricao: string; valor: number };

export function gerarReciboRescisao(
  c: ContratoData,
  diasBolsa: number,
  diasTrabalhados: number,
  descontos: DescontoRescisao[],
  diasRecesso?: number,
  avosRecesso?: number,
  regraEspecialRecesso?: boolean
): string {
  const { estudante: e, empresa: emp, smarter: sm, estagio: est } = c;
  const bolsaDia  = Number(est.valorBolsa) / 30;
  const bolsaProp = bolsaDia * diasBolsa;

  // Recesso proporcional: calcula internamente se não informado
  // Lei 11.788/2008, Art. 13 — 30 dias/ano; proporcional por dias trabalhados
  // Mínimo de 12 dias trabalhados para gerar direito a recesso
  const diasRec = diasRecesso !== undefined
    ? diasRecesso
    : (diasTrabalhados >= 12 ? Math.ceil(diasTrabalhados / 365 * 30 * 2) / 2 : 0);
  const recessoValor = diasRec * bolsaDia;
  const avosLabel = avosRecesso !== undefined
    ? ` — ${avosRecesso} avo(s)${regraEspecialRecesso ? " (14/12, recesso não usufruído em 12 meses)" : ""}`
    : "";

  const totalDescontos = descontos.reduce((s, d) => s + (d.valor || 0), 0);
  const total = bolsaProp + recessoValor - totalDescontos;
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const hoje = new Date().toLocaleDateString("pt-BR");

  const descontosRows = descontos.length > 0
    ? descontos.map(d => fld(`(-) ${d.descricao || "Desconto"}`, "") + fld("Valor", fmt(d.valor || 0))).join("")
    : "";

  const recessoRow = diasRec > 0
    ? `${fld("Recesso Proporcional", `${diasRec} dia(s)${avosLabel}`)}${fld("Valor", fmt(recessoValor))}`
    : `${fld("Recesso Proporcional", "Não devido (nenhum mês completo de estágio)")}${fld("Valor", fmt(0))}`;

  return wrap(`
${premiumHeader("Recibo de Rescisão", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Data", v: hoje},
  {l:"Total a Receber", v: fmt(total)},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Cálculo da Rescisão")}
<div class="fg">
${fld("Estagiário(a)", e.nome)}${fld("CPF", e.cpf)}
${fld("Empresa Concedente", emp.razaoSocial, true)}
${fld("Total de Dias Trabalhados", String(diasTrabalhados || 0) + " dia(s)")}${fld("Bolsa Mensal", fmt(Number(est.valorBolsa)))}
${fld("Bolsa Proporcional (último mês)", String(diasBolsa) + " dia(s)")}${fld("Valor", fmt(bolsaProp))}
${recessoRow}
${descontosRows}
<div class="fld full" style="background:#f0f9ff;border-top:2px solid #0f2a5e;padding:6px 8px">
  <label style="font-size:8px;font-weight:900;text-transform:uppercase;color:#0f2a5e;display:block;margin-bottom:2px">TOTAL A RECEBER</label>
  <span style="font-size:14px;font-weight:900;color:#0f2a5e">${fmt(total)}</span>
</div>
</div></div>

<div class="obj-box" style="margin:14px 0">
  Eu, <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, declaro ter recebido de <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, a importância de <strong>${fmt(total)} (${valorExtenso(Math.round(total))})</strong>, relativa aos acertos rescisórios do estágio encerrado, conforme detalhamento acima. O recesso proporcional foi calculado com base em <strong>${diasTrabalhados || 0} dias trabalhados</strong>, sendo <strong>${diasRec} dia(s)</strong> de recesso${avosLabel} (Lei 11.788/2008, Art. 13).
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
<div class="sign-grid" style="margin-top:0;grid-template-columns:1fr">
  <div class="sign-box" style="max-width:280px;margin:0 auto">
    <div class="sign-line"></div>
    <div class="sign-name">${e.nome}</div>
    <div class="sign-detail">CPF: ${e.cpf}</div>
  </div>
</div>
${docFooter("Recibo de Rescisão", c.numero, sm)}`);
}

// ── TERMO DE RECESSO ──────────────────────────────────────────────────────────
export function gerarTermoRecesso(c: ContratoData, diasRecesso: number, dataIni: string, dataFim: string, periodo: string): string {
  const { estudante: e, empresa: emp, smarter: sm } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return wrap(`
${premiumHeader("Termo de Recesso Remunerado", "Art. 13 da Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Período de Recesso", v: dataIni ? `${dataIni} a ${dataFim}` : "—"},
  {l:"Dias", v: String(diasRecesso) + " dia(s)"},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Dados do Recesso")}
<div class="fg">
${fld("Estagiário(a)", e.nome, true)}
${fld("CPF", e.cpf)}${fld("Empresa Concedente", emp.razaoSocial)}
${fld("Período Aquisitivo", periodo || "—", true)}
${fld("Quantidade de Dias", String(diasRecesso) + " dia(s)")}${fld("Data de Solicitação", hoje)}
${fld("Início do Recesso", dataIni || "—")}${fld("Fim do Recesso", dataFim || "—")}
</div></div>

<div class="obj-box" style="margin:14px 0">
  As partes acordam a concessão do recesso remunerado de <strong>${diasRecesso} dia(s)</strong> ao(à) estagiário(a) <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, da empresa <strong>${emp.razaoSocial}</strong>, a ser gozado de <strong>${dataIni||"—"}</strong> a <strong>${dataFim||"—"}</strong>, referente ao período aquisitivo <strong>${periodo||"—"}</strong> efetivamente cumprido. O recesso remunerado é garantido pelo art. 13 da Lei 11.788/2008, sendo devida a bolsa-auxílio integral durante o período.
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
${sign2([e.nome, "ESTAGIÁRIO(A)"], [emp.razaoSocial, "EMPRESA CONCEDENTE"])}
${docFooter("Termo de Recesso Remunerado", c.numero, sm)}`);
}

// ── TERMO DE REALIZAÇÃO ───────────────────────────────────────────────────────
export function gerarTermoRealizacao(c: ContratoData, chTotal: number, desempenho: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const actList = est.atividades.split(/[;]/).map(a => a.trim()).filter(a => a.length > 5);
  return wrap(`
${premiumHeader("Termo de Realização de Estágio", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Curso", v: e.curso},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Desempenho", v: desempenho},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Dados do Estágio Realizado")}
<div class="fg">
${fld("Estudante", e.nome, true)}
${fld("Instituição de Ensino", ies.razaoSocial, true)}
${fld("Curso", e.curso, true)}
${fld("Empresa Concedente", emp.razaoSocial, true)}
${fld("Período Realizado", est.dataInicio + " a " + est.dataFim)}${fld("C.H. Total", chTotal.toLocaleString("pt-BR") + " horas")}
${fld("Supervisor(a)", emp.supervisor)}${fld("Desempenho Global", desempenho)}
</div></div>

<div class="sec">${secHead("A", "Atividades Realizadas")}
  ${actList.length > 1 ? actList.map((a,i) => actItem(i+1, a)).join("") : `<div class="obj-box">${est.atividades}</div>`}
</div>

<div class="obj-box" style="margin:10px 0">
  Declaramos que o(a) estudante <strong>${e.nome}</strong>, matriculado(a) em <strong>${ies.razaoSocial}</strong>, curso de <strong>${e.curso}</strong>, realizou estágio junto à <strong>${emp.razaoSocial}</strong> de <strong>${est.dataInicio}</strong> a <strong>${est.dataFim}</strong>, totalizando <strong>${chTotal.toLocaleString("pt-BR")} horas</strong> sob supervisão de <strong>${emp.supervisor}</strong>, com desempenho considerado <strong>${desempenho}</strong>.
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
<div class="sign-grid" style="margin-top:0;grid-template-columns:1fr">
  <div class="sign-box" style="max-width:280px;margin:0 auto">
    <div class="sign-line"></div>
    <div class="sign-name">${emp.razaoSocial}</div>
    <div class="sign-role">EMPRESA CONCEDENTE</div>
  </div>
</div>
${docFooter("Termo de Realização de Estágio", c.numero, sm)}`);
}

// ── TERMO ADITIVO ─────────────────────────────────────────────────────────────
export function gerarTermoAditivo(c: ContratoData, clausula: string, descricao: string, vigencia: string, menorDeIdade?: boolean, nomeResponsavel?: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");

  // Responsável legal: prioriza o informado no form; fallback para o cadastrado no aluno
  const respNome = (nomeResponsavel || "").trim() || (e.responsavel?.nome || "").trim();
  const isMinor  = !!(menorDeIdade && respNome);

  // Seção de assinaturas — 4 padrão; 5 quando menor de idade
  const stampImg = `<img src="data:image/png;base64,${SMARTER_STAMP_B64}" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);max-width:110px;max-height:46px;object-fit:contain"/>`;
  const signBox = (nome: string, role: string, detail?: string, isAgente = false) =>
    `<div class="sign-box"><div class="sign-line">${isAgente ? stampImg : ""}</div><div class="sign-name">${nome}</div><div class="sign-role">${role}</div>${detail ? `<div class="sign-detail">${detail}</div>` : ""}</div>`;

  const assinaturas = isMinor
    ? `<div class="sign-grid" style="margin-top:24px">
        ${signBox(ies.razaoSocial, "INSTITUIÇÃO DE ENSINO")}
        ${signBox(emp.razaoSocial, "EMPRESA CONCEDENTE")}
        ${signBox(e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf)}
        ${signBox(sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj, true)}
        <div class="sign-box" style="grid-column:1 / -1;max-width:280px;margin:12px auto 0">
          <div class="sign-line"></div>
          <div class="sign-name">${respNome}</div>
          <div class="sign-role">RESPONSÁVEL LEGAL</div>
          <div class="sign-detail">Responsável pelo(a) menor ${e.nome}</div>
        </div>
      </div>`
    : sign4(
        [ies.razaoSocial, "INSTITUIÇÃO DE ENSINO"],
        [emp.razaoSocial, "EMPRESA CONCEDENTE"],
        [e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf],
        [sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj],
      );

  const menorObs = isMinor
    ? `<p style="font-size:10px;margin:6px 0;color:#374151">⚠️ Por ser o(a) estagiário(a) menor de idade, o presente Termo é também assinado por seu Responsável Legal <strong>${respNome}</strong>, nos termos do art. 5° do Código Civil e art. 1° da Lei 11.788/2008.</p>`
    : "";

  return wrap(`
${premiumHeader("Termo Aditivo ao Contrato de Estágio", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Cláusula Alterada", v: clausula || "—"},
  {l:"Data", v: hoje},
])}

<div class="sec" style="margin-top:12px">${secHead("A", "Dados das Partes")}
<div class="fg">
${fld("Empresa Concedente", emp.razaoSocial)}${fld("CNPJ", emp.cnpj)}
${fld("Representante", emp.representante)}${fld("Cargo", emp.cargoRepresentante)}
${fld("Estagiário(a)", e.nome)}${fld("CPF", e.cpf)}
${isMinor ? fld("Responsável Legal", respNome) : ""}
${fld("Curso", e.curso)}${fld("Início do Estágio", est.dataInicio)}
${fld("IES", ies.razaoSocial)}${fld("CNPJ da IES", ies.cnpj)}
${fld("Agente de Integração", sm.razaoSocial)}${fld("CNPJ", sm.cnpj)}
</div></div>

<div class="sec">${secHead("M", "Modificação")}
<div class="fg">
${fld("Cláusula Alterada", clausula || "—", true)}
${fld("Descrição da Alteração", descricao || "—", true)}
${vigencia ? fld("Nova Vigência", vigencia, true) : ""}
</div></div>

<div class="obj-box" style="margin:14px 0">
  Pelo presente instrumento, a empresa <strong>${emp.razaoSocial}</strong>, o(a) estudante <strong>${e.nome}</strong>, com interveniência de <strong>${ies.razaoSocial}</strong>, celebram através do Agente de Integração <strong>${sm.razaoSocial}</strong> o presente TERMO ADITIVO, alterando a cláusula referente a <strong>${clausula||"—"}</strong>. Permanecem inalteradas as demais cláusulas do TCE, do qual este Termo Aditivo faz parte integrante.
</div>
${menorObs}
<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
${assinaturas}
${docFooter("Termo Aditivo ao Contrato de Estágio", c.numero, sm)}`);
}

// ── CONTRATO DE PRESTAÇÃO DE SERVIÇOS ────────────────────────────────────────
export function gerarContratoPrestacao(c: ContratoData, valorMensal: number): string {
  const { empresa: emp, smarter: sm } = c;
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const hoje = new Date().toLocaleDateString("pt-BR");
  return wrap(`
${premiumHeader("Contrato de Prestação de Serviços de Gestão de Estagiário", "", c.numero, sm)}
${infoBar([
  {l:"Contratante", v: emp.nomeFan},
  {l:"CNPJ", v: emp.cnpj},
  {l:"Contratada", v: sm.razaoSocial.substring(0,30)},
  {l:"Valor Mensal", v: fmt(valorMensal)},
])}

<div class="sec" style="margin-top:12px">${secHead("1", "Identificação das Partes")}
<div class="fg">
${fld("CONTRATANTE — Razão Social", emp.razaoSocial, true)}
${fld("CNPJ", emp.cnpj)}${fld("Representante", emp.representante)}
${fld("Cargo", emp.cargoRepresentante)}${fld("Endereço", emp.endereco + ", " + emp.cidade + "/" + emp.estado)}
${fld("CONTRATADA — Razão Social", sm.razaoSocial, true)}
${fld("CNPJ", sm.cnpj)}${fld("Responsável", sm.responsavel)}
${fld("Endereço", sm.endereco + ", " + sm.cidade + "/" + sm.estado, true)}
</div></div>

<div class="sec">${secHead("2", "Cláusulas Contratuais")}
${clause(1, "Do Objeto", "Prestação de serviços de gestão de estagiários, incluindo recrutamento, seleção, elaboração documental (TCE, Plano de Estágio, Termos) e acompanhamento administrativo.", "")}
${clause(2, "Da Remuneração", `A CONTRATANTE pagará <strong>${fmt(valorMensal)} (${valorExtenso(valorMensal)})</strong> mensais por estagiário ativo, incluindo taxa administrativa, seguro de vida e gestão documental.`, "")}
${clause(3, "Do Pagamento", `No dia 05 de cada mês via PIX (CNPJ: ${sm.cnpj}) ou boleto. Atraso: multa 2% + juros 1% ao mês.`, "")}
${clause(4, "Obrigações da CONTRATANTE", "a) Informar requisitos do cargo; b) Comunicar aprovação de candidatos; c) Comunicar vínculo CLT; d) Fornecer materiais; e) Informar aprovação em 5 dias úteis.", "")}
${clause(5, "Obrigações da CONTRATADA", "a) Realizar seleção; b) Disponibilizar sistema de gestão; c) Apresentar candidatos em 15 dias úteis; d) Manter documentação em dia.", "")}
${clause(6, "Da Vigência e Rescisão", "Vigência por prazo indeterminado. Rescisão por descumprimento ou aviso prévio de 60 dias. Estagiários ativos: CONTRATANTE continua pagando até fim dos contratos.", "")}
${clause(7, "Da Confidencialidade", `Sigilo absoluto das informações trocadas entre as partes. Violação: multa de R$ 5.000,00 (cinco mil reais), sem prejuízo de perdas e danos adicionais comprovados.`, "")}
${clause(8, "Da Inadimplência", `O não pagamento das mensalidades no prazo estipulado implicará: (a) multa moratória de 2% (dois por cento) sobre o valor em atraso; (b) juros de mora de 1% (um por cento) ao mês, calculados pro rata die; (c) suspensão dos serviços de recrutamento e gestão após 15 (quinze) dias de inadimplência; e (d) bloqueio total do sistema e dos documentos após 30 (trinta) dias de atraso. A regularização dos débitos restabelece os serviços em até 48 horas úteis.`, "Código Civil, arts. 389 e 395")}
${clause(9, "Da Limitação de Responsabilidade", `A CONTRATADA — <strong>${sm.razaoSocial}</strong> — atua exclusivamente como Agente de Integração, nos termos do art. 5° da Lei 11.788/2008. Não possui vínculo empregatício com o(a) estagiário(a) nem é responsável pelo desempenho técnico, conduta ou resultados do estágio. Eventuais danos decorrentes da relação entre CONTRATANTE e estagiário(a) são de inteira responsabilidade da CONTRATANTE. A responsabilidade da CONTRATADA limita-se à gestão documental e administrativa do processo de estágio.`, "Art. 5°, Lei 11.788/2008")}
${clause(10, "Da Proteção de Dados — LGPD", `Em conformidade com a Lei n° 13.709/2018 (Lei Geral de Proteção de Dados), as partes comprometem-se a: (a) tratar os dados pessoais dos estagiários e colaboradores estritamente para as finalidades previstas neste contrato; (b) adotar medidas técnicas e organizacionais adequadas para proteger os dados contra acessos não autorizados, perdas ou vazamentos; (c) não compartilhar dados pessoais com terceiros não envolvidos na execução do contrato, salvo obrigação legal; (d) comunicar à outra parte qualquer incidente de segurança que afete dados pessoais no prazo máximo de 72 (setenta e duas) horas. A CONTRATADA atua como Operadora de Dados, sob as instruções da CONTRATANTE, que figura como Controladora. O término deste contrato implica a exclusão ou devolução dos dados pessoais tratados, salvo obrigação legal de retenção.`, "Lei 13.709/2018 — LGPD")}
${clause(11, "Disposições Gerais", `Não constitui vínculo trabalhista entre as partes. Alterações somente por escrito mediante aditivo contratual. Foro eleito: Comarca de <strong>${sm.cidade}</strong>, com renúncia expressa a qualquer outro.`, "")}
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${sm.cidade}, ${hoje}</p>
${sign4(
  [sm.razaoSocial, "CONTRATADA", "CNPJ: " + sm.cnpj],
  [emp.razaoSocial, "CONTRATANTE", "CNPJ: " + emp.cnpj],
  ["TESTEMUNHA 1", "CPF: ____________________"],
  ["TESTEMUNHA 2", "CPF: ____________________"],
)}
${docFooter("Contrato de Prestação de Serviços", c.numero, sm)}`);
}

// ── Kept for backward compat ─────────────────────────────────────────────────
export const DOC_CSS = CSS;

// ── Avaliação Semestral ───────────────────────────────────────────────────────
export function gerarAvaliacaoSemestral(c: ContratoData, periodo: string, notas: Record<string,number>): string {
  const { estudante: est, empresa: emp, smarter: sm, estagio, numero } = c;
  const hoje = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  const periodoLabel = periodo || `${new Date().getFullYear()}/1`;

  const criterios = [
    { key:"pontualidade", label:"Pontualidade e Assiduidade" },
    { key:"desempenho", label:"Desempenho Técnico" },
    { key:"relacionamento", label:"Relacionamento Interpessoal" },
    { key:"proatividade", label:"Proatividade e Iniciativa" },
    { key:"aprendizagem", label:"Capacidade de Aprendizagem" },
  ];

  const notasRows = criterios.map(cr => {
    const nota = notas[cr.key] ?? 8;
    const pct = nota * 10;
    const cor = nota >= 8 ? "#10b981" : nota >= 6 ? "#f59e0b" : "#ef4444";
    return `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${cr.label}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center">
        <div style="background:#f1f5f9;border-radius:20px;overflow:hidden;height:12px;width:100px;display:inline-block">
          <div style="height:12px;background:${cor};border-radius:20px;width:${pct}%"></div>
        </div>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;color:${cor}">${nota}/10</td>
    </tr>`;
  }).join("");

  const mediaVal = Object.keys(notas).length > 0
    ? Object.values(notas).reduce((a: number, b: any) => a + Number(b), 0) / Object.keys(notas).length
    : 8;
  const media = mediaVal.toFixed(1);

  return wrap(`
${premiumHeader("Avaliação Semestral de Estágio", "Período: " + periodoLabel, numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: est.nome},
  {l:"Curso", v: est.curso},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Período", v: periodoLabel},
])}
<div class="sec" style="margin-top:12px">
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr style="background:#f8fafc">
      <th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#94a3b8">Critério</th>
      <th style="text-align:center;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#94a3b8">Desempenho</th>
      <th style="text-align:center;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#94a3b8">Nota</th>
    </tr></thead>
    <tbody>\${notasRows}</tbody>
    <tfoot><tr style="background:#f8fafc">
      <td colspan="2" style="padding:8px 10px;font-weight:900;font-size:12px">MÉDIA GERAL</td>
      <td style="padding:8px 10px;text-align:center;font-weight:900;font-size:13px;color:#0f2a5e">\${media}/10</td>
    </tr></tfoot>
  </table>
</div>
\${sign2(
  [emp.supervisor || emp.representante || emp.nomeFan, "Supervisor do Estágio"],
  [est.nome, "Estagiário(a)"],
)}
<p style="text-align:right;font-size:10px;margin:10px 0">\${sm.cidade}, \${hoje}</p>
\${docFooter("Avaliação Semestral de Estágio", numero, sm)}`);
}

// ── Parecer Técnico ───────────────────────────────────────────────────────────
export function gerarParecerTecnico(c: ContratoData, parecer: string, recomendacao: string = "Aprovado"): string {
  const { estudante: est, empresa: emp, smarter: sm, estagio, numero } = c;
  const hoje = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  const corRec = recomendacao === "Aprovado" ? "#10b981" : recomendacao === "Em observação" ? "#f59e0b" : "#ef4444";
  const iconeRec = recomendacao === "Aprovado" ? "✅" : recomendacao === "Em observação" ? "⚠️" : "❌";

  return wrap(`
${premiumHeader("Parecer Técnico do Estágio", "Documento oficial de avaliação técnica", numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: est.nome},
  {l:"Curso", v: est.curso},
  {l:"Empresa Concedente", v: emp.nomeFan},
  {l:"Supervisor", v: emp.supervisor || "—"},
])}
<div class="fg" style="margin:14px 0">
  \${fld("Período", estagio.dataInicio + " a " + estagio.dataFim)}
  \${fld("Atividades Desenvolvidas", estagio.atividades, true)}
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:14px 0">
  <p style="font-size:10px;font-weight:900;text-transform:uppercase;color:#94a3b8;margin-bottom:8px">Parecer Técnico</p>
  <p style="font-size:11px;color:#374151;line-height:1.7">\${parecer || "O estagiário demonstrou bom desempenho, comprometimento e evolução contínua ao longo do período de estágio."}</p>
</div>
<div style="background:\${corRec}22;border:2px solid \${corRec};border-radius:8px;padding:12px 16px;margin:14px 0;display:flex;align-items:center;gap:10px">
  <span style="font-size:20px">\${iconeRec}</span>
  <div>
    <p style="font-size:10px;font-weight:900;text-transform:uppercase;color:\${corRec};margin-bottom:2px">Recomendação Final</p>
    <p style="font-size:14px;font-weight:900;color:\${corRec}">\${recomendacao}</p>
  </div>
</div>
\${sign2(
  [emp.supervisor || emp.representante || emp.nomeFan, "Supervisor — Responsável pelo Parecer"],
  [sm.responsavel, sm.razaoSocial + " — Agente de Integração"],
)}
<p style="text-align:right;font-size:10px;margin:10px 0">\${sm.cidade}, \${hoje}</p>
\${docFooter("Parecer Técnico do Estágio", numero, sm)}`);
}

// ── Avaliação Semestral Respondida (PDF do resultado preenchido) ──────────────
export function gerarAvaliacaoRespondidaPDF(params: {
  numero?: string;
  nomeEstagiario: string;
  cursoEstagiario: string;
  nomeEmpresa: string;
  supervisor: string;
  nomeAgente: string;
  cidade: string;
  periodo: string;
  respondidoAt?: string;
  respostas: Record<string, string | number>;
  observacoes?: string;
}): string {
  const { numero, nomeEstagiario, cursoEstagiario, nomeEmpresa, supervisor, nomeAgente, cidade, periodo, respondidoAt, respostas, observacoes } = params;
  const hoje = respondidoAt
    ? new Date(respondidoAt).toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" })
    : new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });

  const CRITERIOS = [
    { key:"pontualidade",  label:"Pontualidade e Assiduidade",       desc:"Cumpre horarios e compromissos" },
    { key:"produtividade", label:"Produtividade e Qualidade",        desc:"Entrega tarefas com qualidade e no prazo" },
    { key:"iniciativa",    label:"Iniciativa e Proatividade",        desc:"Busca solucoes sem ser solicitado" },
    { key:"comunicacao",   label:"Comunicacao e Relacionamento",     desc:"Comunica-se de forma clara e respeitosa" },
    { key:"aprendizado",   label:"Aprendizado e Desenvolvimento",    desc:"Demonstra evolucao e absorcao de conteudos" },
    { key:"postura",       label:"Postura Profissional",             desc:"Apresentacao, etica e comprometimento" },
  ];

  const CONCEITO = (n: number) => n >= 5 ? "Excelente" : n === 4 ? "Otimo" : n === 3 ? "Bom" : n === 2 ? "Regular" : "Insuficiente";
  const COR = (n: number) => n >= 4 ? "#10b981" : n === 3 ? "#3b82f6" : n === 2 ? "#f59e0b" : "#ef4444";

  // Campos numéricos: cast explícito para garantir type-safety (respostas é Record<string, string|number>)
  const numVal = (key: string) => Number(respostas[key]) || 0;

  const totalNotas = CRITERIOS.reduce((acc, cr) => acc + numVal(cr.key), 0);
  const media = totalNotas / CRITERIOS.length;
  const mediaFormatada = media.toFixed(1);
  const corMedia = media >= 4 ? "#10b981" : media >= 3 ? "#3b82f6" : media >= 2 ? "#f59e0b" : "#ef4444";
  const conceitoMedia = CONCEITO(Math.round(media));

  const rows = CRITERIOS.map(cr => {
    const nota = numVal(cr.key);
    const cor = COR(nota);
    const estrelas = [1,2,3,4,5].map(s =>
      `<span style="font-size:14px;color:${s <= nota ? "#f5c400" : "#d1d5db"}">&#9733;</span>`
    ).join("");
    return `<tr>
      <td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top">
        <p style="font-size:11px;font-weight:700;color:#1e293b">${cr.label}</p>
        <p style="font-size:9px;color:#94a3b8;margin-top:2px">${cr.desc}</p>
      </td>
      <td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle">${estrelas}</td>
      <td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle">
        <span style="font-weight:900;font-size:13px;color:${cor}">${nota}/5</span>
      </td>
      <td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle">
        <span style="background:${cor}22;color:${cor};font-weight:700;font-size:9px;padding:2px 8px;border-radius:20px">${CONCEITO(nota)}</span>
      </td>
    </tr>`;
  }).join("");

  const numDoc = numero ? `Contrato no ${numero}` : "Avaliacao Semestral";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e5e7eb;font-family:Arial,Helvetica,sans-serif}
.doc{font-size:11px;color:#1a1a1a;width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 20mm;background:white;line-height:1.55;position:relative}
@page{size:A4 portrait;margin:0}
@media print{
  html,body{margin:0!important;padding:0!important;background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .doc{width:100%!important;max-width:100%!important;margin:0!important;padding:12mm 14mm 16mm!important;box-shadow:none!important}
}
</style></head><body>
<div class="doc">
<div style="background:linear-gradient(135deg,#0f2a5e,#1a3f8a);padding:16px 20px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="background:#f5c400;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#0f2a5e">S</div>
    <div>
      <p style="color:white;font-weight:900;font-size:16px">${nomeAgente}</p>
      <p style="color:#a5b4fc;font-size:9px">Agente de Integracao - Lei 11.788/2008</p>
    </div>
  </div>
  <div style="text-align:right">
    <p style="color:#f5c400;font-weight:900;font-size:13px">Avaliacao Semestral de Estagio</p>
    <p style="color:#93c5fd;font-size:9px">${numDoc} - ${periodo}</p>
  </div>
</div>
<div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:8px 12px;border-radius:4px;margin-bottom:12px">
  <p style="font-size:9px;color:#1d4ed8;font-weight:700">Base Legal: Lei 11.788/2008 - Art. 12, paragrafo 1</p>
  <p style="font-size:9px;color:#3b82f6;margin-top:2px">As partes deverao apresentar, pelo menos semestralmente, relatorio de atividades com avaliacao do estagiario pela empresa concedente.</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px">
  ${[["Estagiario(a)", nomeEstagiario],["Curso", cursoEstagiario],["Empresa Concedente", nomeEmpresa],["Supervisor", supervisor || "---"]].map(([l,v]) => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px"><p style="font-size:8px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:2px">${l}</p><p style="font-size:10px;font-weight:700;color:#1e293b">${v}</p></div>`).join("")}
</div>
<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:14px">
  <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0">
    <p style="font-size:11px;font-weight:900;color:#0f2a5e">Avaliacao de Desempenho</p>
    <p style="font-size:9px;color:#94a3b8;margin-top:2px">Escala: 1 = Insuficiente | 2 = Regular | 3 = Bom | 4 = Otimo | 5 = Excelente</p>
  </div>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f8fafc">
      <th style="text-align:left;padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;width:45%">Criterio</th>
      <th style="text-align:center;padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;width:20%">Avaliacao</th>
      <th style="text-align:center;padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;width:10%">Nota</th>
      <th style="text-align:center;padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;width:15%">Conceito</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
<div style="background:${corMedia}11;border:2px solid ${corMedia};border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
  <div>
    <p style="font-size:10px;font-weight:900;text-transform:uppercase;color:${corMedia}">Media Geral de Desempenho</p>
    <p style="font-size:9px;color:${corMedia};opacity:0.8;margin-top:2px">Baseado nos ${CRITERIOS.length} criterios avaliados</p>
  </div>
  <div style="text-align:right">
    <p style="font-size:28px;font-weight:900;color:${corMedia}">${mediaFormatada}<span style="font-size:14px">/5</span></p>
    <p style="font-size:11px;font-weight:700;color:${corMedia}">${conceitoMedia}</p>
  </div>
</div>
${respostas.pontosFortes ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:10px"><p style="font-size:10px;font-weight:900;color:#15803d;margin-bottom:4px">✅ Pontos Fortes</p><p style="font-size:10px;color:#374151;line-height:1.6">${respostas.pontosFortes}</p></div>` : ""}
${respostas.pontosMelhoria ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:10px"><p style="font-size:10px;font-weight:900;color:#b45309;margin-bottom:4px">⚠️ Pontos de Melhoria</p><p style="font-size:10px;color:#374151;line-height:1.6">${respostas.pontosMelhoria}</p></div>` : ""}
${respostas.parecerFinal ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:10px"><p style="font-size:10px;font-weight:900;color:#374151;margin-bottom:4px">📋 Parecer Final do Supervisor</p><p style="font-size:10px;color:#475569;line-height:1.7;font-style:italic">"${respostas.parecerFinal}"</p></div>` : ""}
${respostas.recomendacao ? `<div style="background:${respostas.recomendacao==="Encerrar"?"#fef2f2":respostas.recomendacao==="Renovar"?"#eff6ff":"#f0fdf4"};border:2px solid ${respostas.recomendacao==="Encerrar"?"#fca5a5":respostas.recomendacao==="Renovar"?"#bfdbfe":"#86efac"};border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><span style="font-size:18px">${respostas.recomendacao==="Encerrar"?"❌":respostas.recomendacao==="Renovar"?"🔄":"✅"}</span><div><p style="font-size:9px;font-weight:900;text-transform:uppercase;color:#6b7280;margin-bottom:2px">Recomendação do Supervisor</p><p style="font-size:14px;font-weight:900;color:${respostas.recomendacao==="Encerrar"?"#dc2626":respostas.recomendacao==="Renovar"?"#2563eb":"#16a34a"}">${respostas.recomendacao}</p></div></div>` : ""}
${observacoes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:14px"><p style="font-size:10px;font-weight:900;color:#374151;margin-bottom:6px">Observações Adicionais</p><p style="font-size:10px;color:#475569;line-height:1.7;font-style:italic">"${observacoes}"</p></div>` : ""}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
  <div style="text-align:center;border-top:2px solid #1e293b;padding-top:8px">
    <p style="font-size:10px;font-weight:700;color:#1e293b">${supervisor || nomeEmpresa}</p>
    <p style="font-size:9px;color:#94a3b8">Supervisor / Empresa Concedente</p>
  </div>
  <div style="text-align:center;border-top:2px solid #1e293b;padding-top:8px">
    <p style="font-size:10px;font-weight:700;color:#1e293b">${nomeEstagiario}</p>
    <p style="font-size:9px;color:#94a3b8">Estagiario(a)</p>
  </div>
</div>
<div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
  <p style="font-size:8px;color:#94a3b8">${cidade}, ${hoje}</p>
  <p style="font-size:8px;color:#94a3b8">Avaliacao Semestral - Ref: ${periodo} - ${nomeAgente}</p>
</div>
</div></body></html>`;
}
