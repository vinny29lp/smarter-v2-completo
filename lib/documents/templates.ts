import type { ContratoData } from "./types";
import { valorExtenso, dataExtenso } from "./utils";

// ── CSS A4 compartilhado ──────────────────────────────────────
export const DOC_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f1f5f9}
.doc{font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#1a1a1a;
  width:210mm;min-height:297mm;margin:0 auto;padding:18mm 20mm;
  background:white;line-height:1.6;position:relative}
.header{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0f2a5e}
.logo-box{background:#0f2a5e;color:#f5c400;font-weight:900;font-size:16px;
  padding:6px 12px;border-radius:6px;letter-spacing:-0.5px}
.title-area{text-align:right}
.doc-title{font-size:13px;font-weight:900;text-transform:uppercase;color:#0f2a5e}
.doc-sub{font-size:9px;color:#888;margin-top:2px}
.doc-num{font-size:10px;color:#0f2a5e;font-weight:700;margin-top:2px}
.section{margin:12px 0}
.section-title{font-size:10px;font-weight:900;color:white;background:#0f2a5e;
  padding:3px 8px;border-radius:3px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}
.grid2{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ccc;border-radius:3px;overflow:hidden}
.field{padding:3px 7px;border-bottom:1px solid #e5e7eb;font-size:10.5px}
.field.full{grid-column:1/-1}
.field label{font-weight:700;color:#374151;font-size:9px;text-transform:uppercase;display:block;margin-bottom:1px}
.clausulas p{margin:7px 0;text-align:justify;font-size:11px;line-height:1.65}
.clausulas strong{color:#0f2a5e}
.atividades{padding:6px 10px;background:#f8fafc;border-left:2px solid #0f2a5e;margin:4px 0;font-size:10.5px}
.horario-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10.5px}
.horario-table th{background:#0f2a5e;color:white;padding:4px 8px;text-align:center;font-size:9.5px}
.horario-table td{border:1px solid #ddd;padding:4px 8px;text-align:center}
.horario-table tr:nth-child(even) td{background:#f9fafb}
.assinaturas{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px}
.assinatura{text-align:center}
.linha{border-bottom:1px solid #333;height:36px;margin-bottom:4px}
.assinatura p{font-size:9.5px;font-weight:700}
.assinatura .sub{font-weight:400;color:#666;font-size:9px}
.assinaturas-2{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:32px}
.assinaturas-center{display:flex;justify-content:center;margin-top:32px}
.calculo{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:10px 14px;margin:8px 0}
.calculo .total{font-size:14px;font-weight:900;color:#0f2a5e;border-top:1px solid #ddd;padding-top:5px;margin-top:5px}
.cidade-data{text-align:right;margin-top:20px;font-style:italic;font-size:11px}
.destaque{background:#fefce8;border:1px solid #fbbf24;border-radius:4px;padding:8px 12px;margin:8px 0}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);
  font-size:80px;font-weight:900;color:rgba(15,42,94,.035);pointer-events:none;white-space:nowrap}
.pagebreak{page-break-before:always;padding-top:18mm}
.footer-line{position:absolute;bottom:12mm;left:20mm;right:20mm;border-top:1px solid #e5e7eb;
  padding-top:4px;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
@media print{.doc{box-shadow:none;margin:0}}
`;

function f(label: string, value: string, full?: boolean): string {
  return `<div class="field${full?" full":""}"><label>${label}</label>${value||"—"}</div>`;
}
function s(title: string): string {
  return `<div class="section-title">${title}</div>`;
}
function assin4(partes: [string,string][]): string {
  return `<div class="assinaturas">${partes.map(([n,c])=>`<div class="assinatura"><div class="linha"></div><p>${n}</p><p class="sub">${c}</p></div>`).join("")}</div>`;
}
function assin2(partes: [string,string][]): string {
  return `<div class="assinaturas-2">${partes.map(([n,c])=>`<div class="assinatura"><div class="linha"></div><p>${n}</p><p class="sub">${c}</p></div>`).join("")}</div>`;
}
function horarioTable(horarios: Array<{dia:string;inicio:string;fim:string}>): string {
  const dias = ["Domingo","Segunda-feira","Terca-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sabado"];
  return `<table class="horario-table"><thead><tr><th>Dia</th><th>Inicio</th><th>Fim</th></tr></thead><tbody>
    ${dias.map(d=>{const h=horarios.find(x=>x.dia===d||d.includes(x.dia?.split("-")[0]));return `<tr><td style="text-align:left;padding-left:8px">${d}</td><td>${h?h.inicio:"—"}</td><td>${h?h.fim:"—"}</td></tr>`;}).join("")}
  </tbody></table>`;
}
function header(titulo: string, subtitulo: string, numero: string): string {
  return `<div class="header">
    <div><div class="logo-box">S</div><div style="font-size:9px;color:#666;margin-top:3px">Smarter Estagios</div></div>
    <div class="title-area"><div class="doc-title">${titulo}</div><div class="doc-sub">${subtitulo}</div>${numero?`<div class="doc-num">Contrato No ${numero}</div>`:""}</div>
  </div>`;
}

// ── TCE + PLANO (documento unificado) ────────────────────────
export function gerarTCE(c: ContratoData): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const bolsaFmt = "R$ " + Number(est.valorBolsa).toLocaleString("pt-BR",{minimumFractionDigits:2}) + " (" + valorExtenso(Number(est.valorBolsa)) + ") mensais";
  const intv = est.intervalo ? est.intervalo + " minutos" : "Sem intervalo";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc"><div class="watermark">SMARTER</div>
${header("TERMO DE COMPROMISSO DE ESTAGIO E ACORDO DE COOPERACAO","Conforme Lei No 11.788, de 25 de setembro de 2008",c.numero)}

<p style="font-size:11px;text-align:justify;margin-bottom:12px">
Aos ${dataExtenso(c.dataAssinatura)}, na cidade de <strong>${c.cidadeAssinatura}</strong>, a <strong>INSTITUICAO DE ENSINO</strong> abaixo relacionada e a <strong>UNIDADE CONCEDENTE</strong> abaixo relacionada, atraves de seus representantes, celebram entre si o <strong>AGENTE DE INTEGRACAO</strong> juntamente com o(a) <strong>ESTAGIARIO(A)</strong>, formalizando as condicoes basicas para a realizacao de Estagio <strong>${c.tipoEstagio}</strong> do(a) estudante junto a Unidade Concedente, conforme Lei No 11.788/2008.
</p>

<div class="section">${s("1 — Instituicao de Ensino")}<div class="grid2">
${f("Nome Fantasia",ies.nomeFan)}${f("CNPJ",ies.cnpj)}
${f("Razao Social",ies.razaoSocial,true)}
${f("Endereco",ies.endereco,true)}
${f("Cidade/UF/CEP",ies.cidade+"/"+ies.estado+" — CEP: "+ies.cep)}${f("Telefone",ies.telefone)}
${f("Orientador(a)",ies.orientador)}${f("Cargo",ies.cargoOrientador)}
</div></div>

<div class="section">${s("2 — Unidade Concedente")}<div class="grid2">
${f("Nome Fantasia",emp.nomeFan)}${f("CNPJ",emp.cnpj)}
${f("Razao Social",emp.razaoSocial,true)}
${f("Endereco",emp.endereco,true)}
${f("Cidade/UF/CEP",emp.cidade+"/"+emp.estado+" — CEP: "+emp.cep)}${f("Telefone",emp.telefone)}
${f("Supervisor(a)",emp.supervisor)}${f("Cargo",emp.cargoSupervisor)}
${f("E-mail Supervisor",emp.emailSupervisor)}${f("Tel. Supervisor",emp.telefoneSupervisor)}
</div></div>

<div class="section">${s("3 — Estagiario(a)")}<div class="grid2">
${f("Nome Completo",e.nome,true)}
${f("CPF",e.cpf)}${f("RG",e.rg)}
${f("Data de Nascimento",e.dataNascimento)}${f("Celular",e.celular)}
${f("E-mail",e.email,true)}
${f("Endereco",e.endereco,true)}
${f("Cidade/UF/CEP",e.cidade+"/"+e.estado+" — CEP: "+e.cep)}${f("Telefone",e.telefone)}
${f("Curso",e.curso)}${f("Periodo",e.periodo+"o Periodo")}
</div></div>

<div class="section">${s("4 — Agente de Integracao")}<div class="grid2">
${f("Razao Social",sm.razaoSocial)}${f("CNPJ",sm.cnpj)}
${f("Endereco",sm.endereco,true)}
${f("Cidade/UF",sm.cidade+"/"+sm.estado)}${f("Telefone",sm.telefone)}
</div></div>

<div class="section">${s("5 — Clausulas do Termo")}
<div class="clausulas">
<p><strong>CLAUSULA 1a — Inexistencia de Vinculo Empregaticio:</strong> O presente Termo nao caracteriza vinculacao empregaticia entre o(a) ESTAGIARIO(A) e a UNIDADE CONCEDENTE (art. 3o, Lei 11.788/2008).</p>
<p><strong>CLAUSULA 2a — Vigencia:</strong> Este Termo tera vigencia de <strong>${est.dataInicio}</strong> ate <strong>${est.dataFim}</strong>, podendo ser rescindido a qualquer momento ou prorrogado atraves de Termo Aditivo. Prazo maximo de 2 anos na mesma concedente (art. 11).</p>
<p><strong>CLAUSULA 3a — Jornada:</strong> As atividades se farao conforme quadro abaixo, com <strong>${intv}</strong> de intervalo, perfazendo <strong>${est.chSemanal}h semanais</strong> e <strong>${est.chDiaria}h diarias</strong>, compativeis com o horario escolar do(a) ESTAGIARIO(A) (art. 10).</p>
${horarioTable(est.horarios)}
<p><strong>CLAUSULA 4a — Reducao em Provas:</strong> Durante avaliacoes escolares, a jornada diaria podera ser reduzida a metade, sem prejuizo da bolsa-auxilio (art. 10, par. 2o).</p>
<p><strong>CLAUSULA 5a — Recesso Remunerado:</strong> O(A) ESTAGIARIO(A) tem direito a recesso remunerado de 30 dias apos 12 meses de estagio, ou proporcional se menos de um ano (art. 13).</p>
<p><strong>CLAUSULA 6a — Compatibilidade:</strong> As atividades deverao ser compativeis com o contexto basico do curso do(a) ESTAGIARIO(A) (art. 7o).</p>
<p><strong>CLAUSULA 7a — Atividades:</strong> Poderao ser ampliadas, reduzidas ou alteradas mediante Termo Aditivo. Atividades inicialmente previstas:</p>
<div class="atividades">${est.atividades}</div>
<p><strong>CLAUSULA 8a — Bolsa-Auxilio:</strong> A UNIDADE CONCEDENTE remunerara em <strong>${bolsaFmt}</strong> a titulo de bolsa-auxilio. Beneficios: <strong>${est.beneficios}</strong> (art. 12).</p>
<p><strong>CLAUSULA 9a — Normas Internas:</strong> O(A) ESTAGIARIO(A) devera cumprir o programa de estagio e as normas internas da UNIDADE CONCEDENTE.</p>
<p><strong>CLAUSULA 10a — Supervisao:</strong> O(A) ESTAGIARIO(A) devera fornecer informacoes para acompanhamento e supervisao quando solicitado.</p>
<p><strong>CLAUSULA 11a — Encerramento Automatico:</strong> Na conclusao, abandono ou trancamento do curso, o Termo sera interrompido automaticamente (art. 11).</p>
<p><strong>CLAUSULA 12a — Papel do Agente:</strong> <strong>${sm.razaoSocial}</strong> atua como AGENTE DE INTEGRACAO centralizador. Quaisquer alteracoes devem ser comunicadas (art. 5o).</p>
<p><strong>CLAUSULA 13a — Seguro:</strong> O(A) ESTAGIARIO(A) estara coberto(a) pela Apolice No <strong>${est.apoliceSeguro}</strong>, Seguradora: <strong>${est.seguradora}</strong>, sob responsabilidade do AGENTE DE INTEGRACAO (art. 9o, IV).</p>
<p><strong>CLAUSULA 14a — Obrigacoes da Unidade Concedente:</strong> 14.1 Garantir cumprimento das exigencias escolares; 14.2 Proporcionar atividades de aprendizagem compatíveis; 14.3 Proporcionar condicoes de treinamento pratico; 14.4 Fornecer subsidios a IES para avaliacao.</p>
<p><strong>CLAUSULA 15a — Obrigacoes do(a) Estagiario(a):</strong> 15.1 Cumprir a programacao com empenho; 15.2 Observar normas internas da concedente; 15.3 Comunicar fatos relevantes a IES; 15.4 Elaborar relatorio de estagio.</p>
<p><strong>CLAUSULA 16a — Obrigacoes da IES:</strong> 16.1 Avaliar instalacoes; 16.2 Notificar UNIDADE sobre trancamento ou abandono; 16.3 Indicar orientador para acompanhar atividades.</p>
<p><strong>CLAUSULA 17a — Obrigacoes do Agente:</strong> 17.1 Ajustar condicoes e fazer acompanhamento administrativo; 17.2 Encaminhar negociacao do seguro; 17.3 Disponibilizar relatorios periodicos; 17.4 Notificar violacoes.</p>
</div></div>

<p style="font-size:11px;margin-top:10px">E por assim estarem de acordo, assinam este Termo em 4 (quatro) vias de igual teor e forma.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${dataExtenso(c.dataAssinatura)}</p>
${assin4([[ies.nomeFan,"INSTITUICAO DE ENSINO"],[emp.nomeFan,"UNIDADE CONCEDENTE"],[e.nome,"ESTAGIARIO(A)"],[sm.razaoSocial,"AGENTE DE INTEGRACAO"]])}
<div class="footer-line"><span>Termo de Compromisso de Estagio — Lei 11.788/2008</span><span>${sm.razaoSocial} — CNPJ: ${sm.cnpj}</span></div>

<!-- PLANO DE ESTAGIO — pagina 2 -->
<div class="pagebreak">
${header("PLANO DE ESTAGIO","Vinculado ao TCE No "+c.numero+" — Lei 11.788/2008",c.numero)}
<div class="section" style="margin-top:10px"><div class="grid2">
${f("Aluno(a)",e.nome)}${f("E-mail",e.email)}
${f("Curso",e.curso+" — "+e.periodo+"o Periodo",true)}
${f("Instituicao de Ensino",ies.razaoSocial,true)}
${f("CNPJ da Instituicao",ies.cnpj,true)}
${f("Empresa Concedente",emp.razaoSocial,true)}
${f("CNPJ da Empresa",emp.cnpj)}${f("Ramo de Atividade","—")}
${f("Contato de RH",emp.representante)}${f("Telefone",emp.telefone)}
${f("E-mail da Empresa",emp.email,true)}
${f("Periodo do Estagio","De "+est.dataInicio+" a "+est.dataFim,true)}
</div></div>

<div class="section"><div class="section-title">Descricao das Atividades</div>
<p style="font-size:10px;font-weight:700;margin-bottom:4px;text-align:center">Principais atividades que o(a) estagiario(a) desempenhara:</p>
<div class="atividades" style="min-height:60px">${est.atividades}</div></div>

<div class="section"><div class="section-title">Horarios do Estagio</div>
${horarioTable(est.horarios)}
<p style="font-size:10px;margin-top:4px">Intervalo: <strong>${intv}</strong> &nbsp;|&nbsp; C.H. diaria: <strong>${est.chDiaria}h</strong> &nbsp;|&nbsp; C.H. semanal: <strong>${est.chSemanal}h</strong></p>
</div>

<div class="section"><div class="grid2">${f("Cidade onde sera desenvolvido o estagio",est.localEstagio,true)}</div></div>

<div class="section"><div class="section-title">Supervisores do Estagio</div>
<div class="grid2">
${f("Coordenador(a) — Escola",ies.orientador)}${f("Gestor(a) — Empresa",emp.supervisor)}
${f("Telefone",ies.telefone)}${f("Telefone",emp.telefoneSupervisor)}
${f("E-mail",ies.email)}${f("E-mail",emp.emailSupervisor)}
${f("Visto","_______________________________")}${f("Visto","_______________________________")}
${f("Data","_______________________________")}${f("Data","_______________________________")}
</div></div>

<div class="section"><div class="section-title">Seguro de Vida</div>
<div class="grid2">${f("No da Apolice",est.apoliceSeguro)}${f("Seguradora",est.seguradora)}</div></div>

${assin4([[ies.nomeFan,"INSTITUICAO DE ENSINO"],[emp.nomeFan,"UNIDADE CONCEDENTE"],[e.nome,"ESTAGIARIO(A)"],[sm.razaoSocial,"AGENTE DE INTEGRACAO"]])}
<div class="footer-line"><span>Plano de Estagio — FAVOR PREENCHER TODOS OS CAMPOS E ASSINAR</span><span>${sm.razaoSocial}</span></div>
</div>
</div></body></html>`;
}

export function gerarReciboBolsa(c: ContratoData, mesRef: string): string {
  const { estudante: e, empresa: emp, estagio: est, smarter: sm } = c;
  const valor = Number(est.valorBolsa);
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("RECIBO DE PAGAMENTO DE BOLSA-AUXILIO","Lei No 11.788/2008",c.numero)}
<div class="section" style="margin-top:16px"><div class="grid2">
${f("Estagiario(a)",e.nome,true)}
${f("CPF",e.cpf)}${f("Mes de Referencia",mesRef)}
${f("Empresa",emp.razaoSocial,true)}
${f("CNPJ",emp.cnpj)}${f("Valor","R$ "+valor.toLocaleString("pt-BR",{minimumFractionDigits:2}))}
</div></div>
<p style="font-size:11px;text-align:justify;margin:16px 0">Eu, <strong>${e.nome}</strong>, portador(a) do CPF <strong>${e.cpf}</strong>, declaro ter recebido da empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, a importancia de <strong>R$ ${valor.toLocaleString("pt-BR",{minimumFractionDigits:2})} (${valorExtenso(valor)})</strong>, referente a bolsa-auxilio do estagio desenvolvido no mes de <strong>${mesRef}</strong>.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
<div class="assinaturas-center"><div class="assinatura" style="min-width:240px"><div class="linha"></div><p>${e.nome}</p><p class="sub">CPF: ${e.cpf}</p></div></div>
<div class="footer-line"><span>Recibo de Bolsa-Auxilio</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarRescisao(c: ContratoData, ultimoDia: string, motivo: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("RESCISAO AO TERMO DE COMPROMISSO DE ESTAGIO","Lei No 11.788/2008",c.numero)}
<p style="font-size:11px;text-align:justify;margin:16px 0">A empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, denominada <strong>UNIDADE CONCEDENTE</strong>, por seu representante <strong>${emp.representante}</strong>, e de outro lado o(a) ESTAGIARIO(A) <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, rescindem o Termo de Compromisso de Estagio firmado em <strong>${est.dataInicio}</strong>, sendo o ultimo dia de estagio em <strong>${ultimoDia||"—"}</strong>.</p>
${motivo?`<p style="font-size:11px;margin:8px 0"><strong>Motivo:</strong> ${motivo}</p>`:""}
<p style="font-size:11px;text-align:justify;margin:8px 0">As partes conferem-se plena, total e irrevogavel quitacao de todas as obrigacoes legais assumidas. Firmam em 04 (quatro) vias.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
${assin4([[ies.nomeFan,"INSTITUICAO DE ENSINO"],[emp.nomeFan,"EMPRESA"],[e.nome,"ESTAGIARIO(A)"],[sm.razaoSocial,"AGENTE DE INTEGRACAO"]])}
<div class="footer-line"><span>Rescisao ao TCE</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarReciboRescisao(c: ContratoData, diasBolsa: number, mesesRecesso: number, descontos: number): string {
  const { estudante: e, empresa: emp, smarter: sm, estagio: est } = c;
  const bolsaDia = Number(est.valorBolsa)/30;
  const bolsaProp = bolsaDia * diasBolsa;
  const recessoProp = (Number(est.valorBolsa)/12) * mesesRecesso;
  const total = bolsaProp + recessoProp - descontos;
  const fmt = (v:number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("RECIBO DE RESCISAO","Lei No 11.788/2008",c.numero)}
<p style="font-size:11px;text-align:justify;margin:16px 0">Eu <strong>${e.nome}</strong>, CPF <strong>${e.cpf}</strong>, declaro ter recebido de <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, a importancia de <strong>${fmt(total)} (${valorExtenso(Math.round(total))})</strong>, conforme discriminado abaixo:</p>
<div class="calculo">
<p>Bolsa-auxilio referente a <strong>${diasBolsa} dias</strong>: <strong>${fmt(bolsaProp)}</strong></p>
<p>Recesso proporcional referente a <strong>${mesesRecesso}/12</strong>: <strong>${fmt(recessoProp)}</strong></p>
<p>Descontos: <strong>${fmt(descontos)}</strong></p>
<p class="total">TOTAL A RECEBER: ${fmt(total)}</p>
</div>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
<div class="assinaturas-center"><div class="assinatura" style="min-width:240px"><div class="linha"></div><p>${e.nome}</p><p class="sub">CPF: ${e.cpf}</p></div></div>
<div class="footer-line"><span>Recibo de Rescisao</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarTermoRecesso(c: ContratoData, diasRecesso: number, dataIni: string, dataFim: string, periodo: string): string {
  const { estudante: e, empresa: emp, smarter: sm } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("TERMO DE RECESSO REMUNERADO","Art. 13 da Lei No 11.788/2008",c.numero)}
<div class="section" style="margin-top:16px"><div class="grid2">
${f("Estagiario(a)",e.nome,true)}
${f("CPF",e.cpf)}${f("Empresa",emp.razaoSocial)}
${f("Periodo Aquisitivo",periodo||"—",true)}
${f("Quantidade de Dias",String(diasRecesso)+" dia(s)")}${f("Data de Solicitacao",hoje)}
${f("Inicio do Recesso",dataIni||"—")}${f("Fim do Recesso",dataFim||"—")}
</div></div>
<p style="font-size:11px;text-align:justify;margin:14px 0">Eu, <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, estagiario(a) da empresa <strong>${emp.razaoSocial}</strong>, solicito autorizacao para recesso remunerado de <strong>${diasRecesso} dia(s)</strong>, de <strong>${dataIni||"—"}</strong> a <strong>${dataFim||"—"}</strong>, referente ao periodo <strong>${periodo||"—"}</strong> efetivamente cumprido, conforme art. 13 da Lei 11.788/2008.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
${assin2([[e.nome,"ESTAGIARIO(A)"],[emp.razaoSocial,"EMPRESA"]])}
<div class="footer-line"><span>Termo de Recesso Remunerado</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarTermoRealizacao(c: ContratoData, chTotal: number, desempenho: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("TERMO DE REALIZACAO DE ESTAGIO","Lei No 11.788/2008",c.numero)}
<div class="section" style="margin-top:14px"><div class="grid2">
${f("Estudante",e.nome,true)}
${f("Instituicao de Ensino",ies.razaoSocial,true)}
${f("Curso",e.curso,true)}
${f("Empresa Concedente",emp.razaoSocial,true)}
${f("Periodo Realizado",est.dataInicio+" a "+est.dataFim)}${f("C.H. Total",chTotal.toLocaleString("pt-BR")+" horas")}
${f("Supervisor(a)",emp.supervisor)}${f("Desempenho",desempenho)}
</div></div>
<p style="font-size:11px;text-align:justify;margin:12px 0">Declaramos que o(a) estudante <strong>${e.nome}</strong>, matriculado(a) em <strong>${ies.razaoSocial}</strong>, curso de <strong>${e.curso}</strong>, realizou com a concedente <strong>${emp.razaoSocial}</strong> o estagio de <strong>${est.dataInicio}</strong> a <strong>${est.dataFim}</strong>, totalizando <strong>${chTotal.toLocaleString("pt-BR")} horas</strong> sob supervisao de <strong>${emp.supervisor}</strong>.</p>
<p style="font-size:11px;font-weight:700;margin:8px 0">Atividades realizadas:</p>
<div class="atividades">${est.atividades}</div>
<p style="font-size:11px;margin:8px 0">Desempenho considerado: <strong>${desempenho}</strong>.</p>
<p style="font-size:11px;margin:8px 0">Contato: tel. <strong>${emp.telefone}</strong> / e-mail: <strong>${emp.email}</strong>.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
<div class="assinaturas-center"><div class="assinatura" style="min-width:240px"><div class="linha"></div><p>${emp.razaoSocial}</p><p class="sub">EMPRESA CONCEDENTE</p></div></div>
<div class="footer-line"><span>Termo de Realizacao de Estagio</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarTermoAditivo(c: ContratoData, clausula: string, descricao: string, vigencia: string): string {
  const { estudante: e, empresa: emp, instituicao: ies, smarter: sm, estagio: est } = c;
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("TERMO ADITIVO AO CONTRATO DE ESTAGIO","Lei No 11.788/2008",c.numero)}
<p style="font-size:11px;text-align:justify;margin:14px 0">Pelo presente instrumento, a empresa <strong>${emp.razaoSocial}</strong>, CNPJ: <strong>${emp.cnpj}</strong>, representada por <strong>${emp.representante}</strong>, denominada UNIDADE CONCEDENTE, e o(a) estudante <strong>${e.nome}</strong>, CPF: <strong>${e.cpf}</strong>, curso de <strong>${e.curso}</strong>, com interveniencia de <strong>${ies.razaoSocial}</strong>, CNPJ: <strong>${ies.cnpj}</strong>, celebram atraves do Agente de Integracao <strong>${sm.razaoSocial}</strong>, CNPJ: <strong>${sm.cnpj}</strong>, o presente TERMO ADITIVO, conforme Lei No 11.788/2008.</p>
<p style="font-size:11px;margin:8px 0">Este Termo Aditivo altera a clausula referente a <strong>${clausula||"—"}</strong> do TCE firmado em <strong>${est.dataInicio}</strong>:</p>
<div class="destaque"><p style="font-size:11px"><strong>Descricao da Alteracao:</strong></p><p style="font-size:11px;margin-top:6px;min-height:50px">${descricao||"—"}</p></div>
${vigencia?`<p style="font-size:11px;margin:6px 0">Nova vigencia: <strong>${vigencia}</strong>.</p>`:""}
<p style="font-size:11px;text-align:justify;margin:8px 0">Permanecem inalteradas as demais clausulas do Termo de Compromisso de Estagio, do qual este Termo Aditivo faz parte integrante.</p>
<p class="cidade-data">${c.cidadeAssinatura}, ${hoje}</p>
${assin4([[ies.nomeFan,"INSTITUICAO DE ENSINO"],[emp.nomeFan,"EMPRESA"],[e.nome,"ESTAGIARIO(A)"],[sm.razaoSocial,"AGENTE DE INTEGRACAO"]])}
<div class="footer-line"><span>Termo Aditivo ao Contrato de Estagio</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}

export function gerarContratoPrestacao(c: ContratoData, valorMensal: number): string {
  const { empresa: emp, smarter: sm } = c;
  const fmt = (v:number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const hoje = new Date().toLocaleDateString("pt-BR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOC_CSS}</style></head><body>
<div class="doc">${header("CONTRATO DE PRESTACAO DE SERVICOS DE GESTAO DE ESTAGIARIO","",c.numero)}
<div class="section" style="margin-top:10px"><div class="grid2">
${f("CONTRATANTE — Razao Social",emp.razaoSocial,true)}
${f("CNPJ",emp.cnpj)}${f("Representante",emp.representante)}
${f("Cargo",emp.cargoRepresentante)}${f("Endereco",emp.endereco+", "+emp.cidade+"/"+emp.estado)}
${f("CONTRATADA — Razao Social",sm.razaoSocial,true)}
${f("CNPJ",sm.cnpj)}${f("Responsavel",sm.responsavel)}
${f("Endereco",sm.endereco+", "+sm.cidade+"/"+sm.estado,true)}
</div></div>
<div class="clausulas">
<p><strong>Clausula 1a — Do Objeto:</strong> Prestacao de servicos de gestao de estagiarios, incluindo recrutamento, selecao, elaboracao documental (TCE, Plano de Estagio, Termos) e acompanhamento administrativo.</p>
<p><strong>Clausula 2a — Da Remuneracao:</strong> A CONTRATANTE pagara <strong>${fmt(valorMensal)} (${valorExtenso(valorMensal)})</strong> mensais por estagiario ativo, incluindo taxa administrativa, seguro de vida e gestao documental.</p>
<p><strong>Clausula 3a — Do Pagamento:</strong> No dia 05 de cada mes via PIX (CNPJ: ${sm.cnpj}) ou boleto. Atraso: multa 2% + juros 1% ao mes.</p>
<p><strong>Clausula 4a — Obrigacoes da CONTRATANTE:</strong> a) Informar requisitos do cargo; b) Comunicar aprovacao de candidatos; c) Comunicar caso candidato firme CLT; d) Fornecer materiais; e) Informar aprovacao em 5 dias uteis.</p>
<p><strong>Clausula 5a — Obrigacoes da CONTRATADA:</strong> a) Realizar selecao; b) Disponibilizar sistema de gestao; c) Apresentar candidatos em 15 dias uteis; d) Manter documentacao em dia.</p>
<p><strong>Clausula 6a — Da Vigencia:</strong> Vigencia por prazo indeterminado a partir da assinatura.</p>
<p><strong>Clausula 7a — Da Rescisao:</strong> Por descumprimento ou aviso previo de 60 dias. Estagiarios ativos: CONTRATANTE continua pagando ate fim dos contratos.</p>
<p><strong>Clausula 8a — Da Confidencialidade:</strong> Sigilo absoluto das informacoes. Violacao: multa de R$ 5.000,00.</p>
<p><strong>Clausula 9a — Disposicoes Gerais:</strong> Nao constitui vinculo trabalhista. Alteracoes somente por escrito. Foro: Comarca de ${sm.cidade}.</p>
</div>
<p class="cidade-data">${sm.cidade}, ${hoje}</p>
${assin4([[sm.razaoSocial,"CONTRATADA — CNPJ: "+sm.cnpj],[emp.razaoSocial,"CONTRATANTE — CNPJ: "+emp.cnpj],["TESTEMUNHA 1","CPF: ____________________"],["TESTEMUNHA 2","CPF: ____________________"]])}
<div class="footer-line"><span>Contrato de Prestacao de Servicos</span><span>${sm.razaoSocial}</span></div>
</div></body></html>`;
}
