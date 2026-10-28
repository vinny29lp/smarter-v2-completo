import type { RemoteSupportCase } from "./ai-workforce";

export function supportStatusMessage(value: Pick<RemoteSupportCase, "status" | "protocol" | "resolution">): string {
  const protocol = value.protocol ? ` Protocolo: ${value.protocol}.` : "";
  switch (value.status) {
    case "open":
    case "investigating": return `O TI está analisando seu caso.${protocol}`;
    case "awaiting_authorization": return `Existe uma proposta de correção aguardando autorização de uma pessoa responsável no painel da Alizo. Nenhum reparo será executado automaticamente.${protocol}`;
    case "authorized":
    case "repairing": return `O reparo foi autorizado por uma pessoa responsável e está em andamento.${protocol}`;
    case "resolved": return `${value.resolution || "O TI marcou o caso como resolvido."}${protocol}`;
    case "closed": return `O atendimento foi encerrado.${protocol}`;
  }
}
