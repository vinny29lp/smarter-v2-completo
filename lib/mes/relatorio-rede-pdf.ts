const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface LinhaRede {
  nome: string;
  cidade: string;
  uf: string;
  abriu: boolean;
  fechou: boolean;
  score: number | null;
  empresasCadastradas: number | null;
  leadsNoMes: number | null;
  contratosFirmados: number | null;
  horasNoSistema: number | null;
}

export function gerarRelatorioRedePDF(mes: number, ano: number, linhas: LinhaRede[]): string {
  const nomeMes = NOMES_MES[mes - 1];

  const rows = linhas.map(l => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.nome}<br/><span style="color:#94a3b8;font-size:10px;">${l.cidade}/${l.uf}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.abriu ? "✓" : "✗"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.fechou ? "✓" : "✗"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${l.score ?? "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.empresasCadastradas ?? "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.leadsNoMes ?? "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.contratosFirmados ?? "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.horasNoSistema != null ? l.horasNoSistema.toFixed(1) : "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Engajamento da Rede — ${nomeMes}/${ano}</title></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#1e293b;">
  <div class="doc" style="max-width:1000px;margin:0 auto;background:#fff;padding:24px;">
    <div style="border-bottom:3px solid #0f2a5e;padding-bottom:16px;margin-bottom:20px;">
      <h1 style="font-size:20px;color:#0f2a5e;margin:0 0 4px;">Engajamento da Rede — Abertura e Fechamento de Mês</h1>
      <p style="font-size:13px;color:#64748b;margin:0;">${nomeMes} de ${ano}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#0f2a5e;color:#fff;">
          <th style="padding:8px;text-align:left;">Unidade</th>
          <th style="padding:8px;">Abertura</th>
          <th style="padding:8px;">Fechamento</th>
          <th style="padding:8px;">Score</th>
          <th style="padding:8px;">Empresas</th>
          <th style="padding:8px;">Leads</th>
          <th style="padding:8px;">Contratos</th>
          <th style="padding:8px;">Horas</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}
