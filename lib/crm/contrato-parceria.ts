/**
 * CRM Módulo 8 — Geração do Contrato de Parceria Empresa ↔ Smarter
 *
 * Gerado automaticamente ao marcar um lead como "Vendido".
 * Retorna HTML pronto para impressão/PDF via window.print().
 */

export interface ContratoParceriaParams {
  empresa:        string;
  cnpjEmpresa?:   string | null;
  enderecoEmpresa?: string | null;
  contato?:       string | null;
  cargoContato?:  string | null;
  smarter:        { razaoSocial: string; cnpj: string; endereco?: string };
  unidade?:       string;
  valorMensal?:   number | null;
  dataAssinatura?: string;  // "DD/MM/YYYY" — padrão: data atual
}

export function gerarContratoParceria(p: ContratoParceriaParams): string {
  const hoje = p.dataAssinatura || new Date().toLocaleDateString("pt-BR");
  const valor = p.valorMensal
    ? `R$ ${Number(p.valorMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${valorPorExtenso(p.valorMensal)}) mensais`
    : "a ser definido entre as partes";

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Contrato de Parceria — ${p.empresa}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Times New Roman",serif;background:#fff;color:#111;font-size:12pt;line-height:1.8}
  .doc{width:210mm;min-height:297mm;margin:0 auto;padding:25mm 20mm 30mm}
  .header{text-align:center;margin-bottom:24pt;border-bottom:2px solid #0f2a5e;padding-bottom:16pt}
  .logo-txt{font-size:22pt;font-weight:900;color:#0f2a5e;letter-spacing:-0.5px}
  .logo-sub{font-size:10pt;color:#64748b;margin-top:2pt}
  h1{font-size:14pt;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:1px;color:#0f2a5e;margin:20pt 0 8pt}
  h2{font-size:11pt;font-weight:700;text-transform:uppercase;margin:16pt 0 6pt;color:#0f2a5e;border-bottom:1px solid #e2e8f0;padding-bottom:2pt}
  p{margin-bottom:8pt;text-align:justify}
  .clausula{margin-bottom:12pt}
  .paragrafo{margin-left:20pt;margin-bottom:6pt}
  .sign-area{display:flex;justify-content:space-between;margin-top:40pt;gap:30pt}
  .sign-box{flex:1;text-align:center}
  .sign-line{border-top:1px solid #333;margin-bottom:6pt}
  .sign-name{font-size:11pt;font-weight:700}
  .sign-role{font-size:9pt;color:#64748b}
  .footer-page{position:fixed;bottom:15mm;right:20mm;font-size:9pt;color:#94a3b8}
  @media print{
    body{background:#fff}
    .doc{width:100%;padding:15mm 18mm 20mm}
    .footer-page{position:fixed;bottom:8mm;right:14mm}
  }
  @page{size:A4 portrait;margin:0}
</style></head><body>
<div class="doc">

<div class="header">
  <div class="logo-txt">SMARTER ESTÁGIOS</div>
  <div class="logo-sub">Agente de Integração — Lei 11.788/2008</div>
</div>

<h1>Contrato de Prestação de Serviços de Agente de Integração</h1>
<p style="text-align:center;font-size:10pt;color:#64748b">Data: ${hoje}</p>

<h2>Das Partes</h2>

<div class="clausula">
  <p><strong>CONTRATANTE:</strong> ${p.empresa}${p.cnpjEmpresa ? `, CNPJ nº ${p.cnpjEmpresa}` : ""}${p.enderecoEmpresa ? `, com sede em ${p.enderecoEmpresa}` : ""}, neste ato representada por ${p.contato || "seu representante legal"}${p.cargoContato ? `, ${p.cargoContato}` : ""}, doravante denominada simplesmente <strong>CONTRATANTE</strong>.</p>

  <p><strong>CONTRATADA:</strong> ${p.smarter.razaoSocial}, CNPJ nº ${p.smarter.cnpj}${p.smarter.endereco ? `, com sede em ${p.smarter.endereco}` : ""}${p.unidade ? `, unidade ${p.unidade}` : ""}, devidamente credenciada como Agente de Integração de Estágio nos termos da Lei nº 11.788/2008, doravante denominada simplesmente <strong>SMARTER</strong>.</p>
</div>

<h2>Cláusula 1ª — Do Objeto</h2>
<div class="clausula">
  <p>O presente contrato tem por objeto a prestação de serviços de agente de integração de estágio pela SMARTER à CONTRATANTE, compreendendo:</p>
  <p class="paragrafo">a) Recrutamento, triagem e seleção de candidatos a estagiário, com aplicação de perfil comportamental DISC;</p>
  <p class="paragrafo">b) Elaboração, controle e arquivamento do Termo de Compromisso de Estágio (TCE) em conformidade com a Lei 11.788/2008;</p>
  <p class="paragrafo">c) Intermediação entre a CONTRATANTE, as Instituições de Ensino e os estagiários durante toda a vigência do estágio;</p>
  <p class="paragrafo">d) Gestão de renovações, rescisões, recibos de bolsa e avaliações semestrais obrigatórias;</p>
  <p class="paragrafo">e) Fornecimento de plataforma digital para acompanhamento do programa de estágio;</p>
  <p class="paragrafo">f) Suporte jurídico e administrativo referente à legislação de estágio.</p>
</div>

<h2>Cláusula 2ª — Da Remuneração</h2>
<div class="clausula">
  <p>Pelos serviços prestados, a CONTRATANTE pagará à SMARTER o valor de <strong>${valor}</strong>, por estagiário ativo, nos termos da proposta comercial aceita pelas partes.</p>
  <p class="paragrafo">Parágrafo Único: O vencimento das faturas ocorrerá conforme acordado entre as partes na proposta comercial, mediante emissão de Nota Fiscal de Serviços pela SMARTER.</p>
</div>

<h2>Cláusula 3ª — Das Obrigações da Smarter</h2>
<div class="clausula">
  <p class="paragrafo">a) Zelar pelo cumprimento da Lei 11.788/2008 e demais normas aplicáveis ao estágio;</p>
  <p class="paragrafo">b) Manter atualizados os registros dos estagiários junto às Instituições de Ensino;</p>
  <p class="paragrafo">c) Providenciar seguro de vida em favor do estagiário, conforme exigência legal;</p>
  <p class="paragrafo">d) Cumprir os prazos estabelecidos na seleção e documentação;</p>
  <p class="paragrafo">e) Manter sigilo sobre informações confidenciais da CONTRATANTE.</p>
</div>

<h2>Cláusula 4ª — Das Obrigações da Contratante</h2>
<div class="clausula">
  <p class="paragrafo">a) Oferecer instalações adequadas ao desenvolvimento das atividades de estágio;</p>
  <p class="paragrafo">b) Designar supervisor para acompanhar e orientar o estagiário;</p>
  <p class="paragrafo">c) Pagar a bolsa-auxílio e o auxílio-transporte do estagiário nos prazos acordados;</p>
  <p class="paragrafo">d) Comunicar à SMARTER com antecedência mínima de 30 dias sobre rescisão de estágio;</p>
  <p class="paragrafo">e) Efetuar os pagamentos à SMARTER conforme Cláusula 2ª.</p>
</div>

<h2>Cláusula 5ª — Da Vigência</h2>
<div class="clausula">
  <p>O presente contrato entra em vigor na data de sua assinatura por período indeterminado, podendo ser rescindido por qualquer das partes mediante notificação por escrito com antecedência mínima de <strong>30 (trinta) dias</strong>.</p>
</div>

<h2>Cláusula 6ª — Do Foro</h2>
<div class="clausula">
  <p>As partes elegem o Foro da Comarca de ${p.smarter.endereco?.split(",")[0]?.trim() || "São Paulo"}/SP para dirimir quaisquer conflitos oriundos deste contrato, com expressa renúncia a qualquer outro, por mais privilegiado que seja.</p>
</div>

<p style="margin-top:16pt">E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma.</p>
<p style="text-align:center;margin-top:6pt">${p.smarter.endereco?.split(",").slice(-1)[0]?.trim() || "São Paulo"}, ${hoje}.</p>

<div class="sign-area">
  <div class="sign-box">
    <div class="sign-line" style="margin-top:40pt"></div>
    <div class="sign-name">${p.empresa}</div>
    <div class="sign-role">CONTRATANTE</div>
    ${p.contato ? `<div class="sign-role">${p.contato}${p.cargoContato ? ` — ${p.cargoContato}` : ""}</div>` : ""}
  </div>
  <div class="sign-box">
    <div class="sign-line" style="margin-top:40pt"></div>
    <div class="sign-name">${p.smarter.razaoSocial}</div>
    <div class="sign-role">SMARTER ESTÁGIOS — CONTRATADA</div>
    ${p.unidade ? `<div class="sign-role">Unidade ${p.unidade}</div>` : ""}
  </div>
</div>

</div>
<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),400));</script>
</body></html>`;
}

function valorPorExtenso(valor: number): string {
  // Simplificado — apenas valores inteiros até 100.000
  const inteiros: Record<number, string> = {
    100:"cem",200:"duzentos",300:"trezentos",400:"quatrocentos",500:"quinhentos",
    600:"seiscentos",700:"setecentos",800:"oitocentos",900:"novecentos",
    1000:"mil",2000:"dois mil",3000:"três mil",4000:"quatro mil",5000:"cinco mil",
  };
  const v = Math.round(valor);
  return inteiros[v] || `${v} reais`;
}
