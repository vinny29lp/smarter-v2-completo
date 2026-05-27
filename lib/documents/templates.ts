import type { ContratoData } from "./types";
import { valorExtenso, dataExtenso } from "./utils";

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
function schTable(horarios: Array<{dia:string;inicio:string;fim:string;ativo?:boolean}>, chDiaria: number): string {
  const rows = horarios.map(h => {
    const ativo = h.inicio !== "—" && h.inicio;
    return `<tr class="${ativo ? "ativo" : ""}">
      <td>${h.dia}</td>
      <td>${h.inicio || "—"}</td>
      <td>${h.fim || "—"}</td>
      <td>${ativo ? `${chDiaria}h` : "—"}</td>
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
  const jornadaDesc = `${diasDesc}, das ${est.horarios.find((h:any) => h.inicio !== "—")?.inicio || "—"} às ${est.horarios.find((h:any) => h.fim !== "—")?.fim || "—"}`;

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
${fld("E-mail Institucional", ies.email)}${fld("E-mail do Orientador", ies.email)}
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
  `As atividades de estágio serão realizadas <strong>${jornadaDesc}</strong>, perfazendo <strong>${est.chSemanal} (${valorExtenso ? valorExtenso(est.chSemanal) : est.chSemanal}) horas semanais</strong> e <strong>${est.chDiaria} (${valorExtenso ? valorExtenso(est.chDiaria) : est.chDiaria}) horas diárias</strong>, compatíveis com o horário escolar do(a) ESTAGIÁRIO(A). Durante férias ou recessos escolares, outra jornada poderá ser estabelecida entre as partes, respeitando os limites legais.`,
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
    <div class="sign-line"></div>
    <div class="sign-name">${sm.razaoSocial}</div>
    <div class="sign-role">AGENTE DE INTEGRAÇÃO</div>
    <div class="sign-detail">CNPJ: ${sm.cnpj}</div>
  </div>
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
${fld("Local de Realização", est.localEstagio)}${fld("Modelo", "Presencial")}
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
    <div class="sup-name">${ies.orientador}</div>
    <div class="sup-detail">Tel: ${ies.telefone}</div>
    <div class="sup-detail">E-mail: ${ies.email}</div>
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
    <div class="sign-line"></div>
    <div class="sign-name">${sm.razaoSocial}</div>
    <div class="sign-role">AGENTE DE INTEGRAÇÃO</div>
    <div class="sign-detail">CNPJ: ${sm.cnpj}</div>
  </div>
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
  return `<div class="sign-grid" style="margin-top:24px">
    <div class="sign-box"><div class="sign-line"></div><div class="sign-name">${a[0]}</div><div class="sign-role">${a[1]}</div></div>
    <div class="sign-box"><div class="sign-line"></div><div class="sign-name">${b[0]}</div><div class="sign-role">${b[1]}</div></div>
  </div>`;
}
function sign4(a: [string,string,string?], b: [string,string,string?], c2: [string,string,string?], d: [string,string,string?]): string {
  const box = ([n,r,d2]: [string,string,string?]) => `<div class="sign-box">
    <div class="sign-line"></div>
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
export function gerarRescisao(c: ContratoData, ultimoDia: string, motivo: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return wrap(`
${premiumHeader("Rescisão ao Termo de Compromisso de Estágio", "Lei Nº 11.788/2008", c.numero, sm)}
${infoBar([
  {l:"Estagiário(a)", v: e.nome},
  {l:"Empresa", v: emp.nomeFan},
  {l:"Último Dia de Estágio", v: ultimoDia || "—"},
  {l:"Data", v: hoje},
])}

<div class="sec" style="margin-top:12px">${secHead("R", "Dados da Rescisão")}
<div class="fg">
${fld("Empresa Concedente", emp.razaoSocial)}${fld("CNPJ", emp.cnpj)}
${fld("Representante", emp.representante)}${fld("Cargo", emp.cargoRepresentante)}
${fld("Estagiário(a)", e.nome)}${fld("CPF", e.cpf)}
${fld("Início do Estágio", est.dataInicio)}${fld("Último Dia de Estágio", ultimoDia || "—")}
${motivo ? fld("Motivo da Rescisão", motivo, true) : ""}
</div></div>

<div class="obj-box" style="margin:14px 0">
  A empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, denominada <strong>UNIDADE CONCEDENTE</strong>, por seu representante <strong>${emp.representante}</strong>, e de outro lado o(a) ESTAGIÁRIO(A) <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, rescindem o Termo de Compromisso de Estágio firmado em <strong>${est.dataInicio}</strong>, sendo o último dia de estágio em <strong>${ultimoDia||"—"}</strong>. As partes conferem-se plena, total e irrevogável quitação de todas as obrigações legais assumidas.
</div>

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
${sign4(
  [ies.razaoSocial, "INSTITUIÇÃO DE ENSINO"],
  [emp.razaoSocial, "EMPRESA CONCEDENTE"],
  [e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf],
  [sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj],
)}
${docFooter("Rescisão ao TCE", c.numero, sm)}`);
}

// ── RECIBO DE RESCISÃO ─────────────────────────────────────────────────────────
export function gerarReciboRescisao(c: ContratoData, diasBolsa: number, mesesRecesso: number, descontos: number): string {
  const { estudante: e, empresa: emp, smarter: sm, estagio: est } = c;
  const bolsaDia = Number(est.valorBolsa)/30;
  const bolsaProp = bolsaDia * diasBolsa;
  const recessoProp = (Number(est.valorBolsa)/12) * mesesRecesso;
  const total = bolsaProp + recessoProp - descontos;
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const hoje = new Date().toLocaleDateString("pt-BR");
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
${fld("Dias de Bolsa Proporcional", String(diasBolsa) + " dia(s)")}${fld("Valor", fmt(bolsaProp))}
${fld("Recesso Proporcional", `${mesesRecesso}/12`)}${fld("Valor", fmt(recessoProp))}
${fld("Descontos", fmt(descontos))}${fld("TOTAL A RECEBER", fmt(total))}
</div></div>

<div class="obj-box" style="margin:14px 0">
  Eu, <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, declaro ter recebido de <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, a importância de <strong>${fmt(total)} (${valorExtenso(Math.round(total))})</strong>, relativa aos acertos rescisórios do estágio encerrado, conforme detalhamento acima.
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
  Eu, <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, estagiário(a) da empresa <strong>${emp.razaoSocial}</strong>, solicito autorização para recesso remunerado de <strong>${diasRecesso} dia(s)</strong>, de <strong>${dataIni||"—"}</strong> a <strong>${dataFim||"—"}</strong>, referente ao período <strong>${periodo||"—"}</strong> efetivamente cumprido, conforme art. 13 da Lei 11.788/2008.
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
export function gerarTermoAditivo(c: ContratoData, clausula: string, descricao: string, vigencia: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
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

<p style="text-align:right;font-size:10px;margin:14px 0">${c.cidadeAssinatura}, ${hoje}</p>
${sign4(
  [ies.razaoSocial, "INSTITUIÇÃO DE ENSINO"],
  [emp.razaoSocial, "EMPRESA CONCEDENTE"],
  [e.nome, "ESTAGIÁRIO(A)", "CPF: " + e.cpf],
  [sm.razaoSocial, "AGENTE DE INTEGRAÇÃO", "CNPJ: " + sm.cnpj],
)}
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
${clause(7, "Da Confidencialidade", `Sigilo absoluto das informações. Violação: multa de R$ 5.000,00.`, "")}
${clause(8, "Disposições Gerais", `Não constitui vínculo trabalhista. Alterações somente por escrito. Foro: Comarca de ${sm.cidade}.`, "")}
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
