import { MensagemCoaching } from "@/lib/mes/coaching";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COR_NIVEL: Record<string, string> = { critico: "#ef4444", atencao: "#f59e0b", bom: "#10b981" };
const LABEL_NIVEL: Record<string, string> = { critico: "Crítico", atencao: "Atenção", bom: "Bom" };

export function gerarRelatorioFechamentoPDF(params: {
  franquia: string;
  mes: number;
  ano: number;
  fechamento: {
    empresasCadastradas: number;
    estudantesCadastrados: number;
    iesCadastradas: number;
    leadsNoMes: number;
    contratosFirmados: number;
    estagiariosAtivos: number;
    horasNoSistema: number;
    score: number;
  };
  metas: {
    metaEmpresas?: number | null;
    metaLeads?: number | null;
    metaContratos?: number | null;
  };
  mensagens: MensagemCoaching[];
}): string {
  const { franquia, mes, ano, fechamento, metas, mensagens } = params;
  const nomeMes = NOMES_MES[mes - 1];

  const numerosRow = (label: string, real: number, meta?: number | null) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${label}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${real}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#94a3b8;">${meta ?? "—"}</td>
    </tr>`;

  const mensagensHtml = mensagens.map(m => `
    <div style="border-left:4px solid ${COR_NIVEL[m.nivel]};background:#f8fafc;padding:14px 16px;margin-bottom:12px;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:13px;color:#0f2a5e;">${m.indicador}</strong>
        <span style="font-size:11px;font-weight:700;color:${COR_NIVEL[m.nivel]};text-transform:uppercase;">${LABEL_NIVEL[m.nivel]}</span>
      </div>
      <p style="font-size:12px;color:#334155;line-height:1.6;margin:0 0 6px;">${m.mensagem}</p>
      <p style="font-size:12px;color:#0f2a5e;font-weight:600;margin:0;">→ ${m.acao}</p>
    </div>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Relatório de Fechamento — ${nomeMes}/${ano}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#1e293b;">
  <div class="doc" style="max-width:800px;margin:0 auto;background:#fff;padding:24px;">
    <div style="border-bottom:3px solid #0f2a5e;padding-bottom:16px;margin-bottom:20px;">
      <h1 style="font-size:20px;color:#0f2a5e;margin:0 0 4px;">Relatório de Fechamento de Mês</h1>
      <p style="font-size:13px;color:#64748b;margin:0;">${franquia} — ${nomeMes} de ${ano}</p>
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="font-size:13px;color:#64748b;">Score do mês:</span>
      <span style="font-size:22px;font-weight:900;color:#0f2a5e;">${fechamento.score}/100</span>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#0f2a5e;color:#fff;">
          <th style="padding:8px 10px;text-align:left;font-size:12px;">Indicador</th>
          <th style="padding:8px 10px;font-size:12px;">Real</th>
          <th style="padding:8px 10px;font-size:12px;">Meta</th>
        </tr>
      </thead>
      <tbody>
        ${numerosRow("Empresas cadastradas", fechamento.empresasCadastradas, metas.metaEmpresas)}
        ${numerosRow("Leads no CRM", fechamento.leadsNoMes, metas.metaLeads)}
        ${numerosRow("Contratos firmados", fechamento.contratosFirmados, metas.metaContratos)}
        ${numerosRow("Estudantes cadastrados", fechamento.estudantesCadastrados)}
        ${numerosRow("IES cadastradas", fechamento.iesCadastradas)}
        ${numerosRow("Estagiários ativos", fechamento.estagiariosAtivos)}
        ${numerosRow("Horas no sistema", Number(fechamento.horasNoSistema.toFixed(1)))}
      </tbody>
    </table>

    <h2 style="font-size:15px;color:#0f2a5e;margin-bottom:12px;">Mensagens de Coaching</h2>
    ${mensagensHtml}
  </div>
</body>
</html>`;
}
