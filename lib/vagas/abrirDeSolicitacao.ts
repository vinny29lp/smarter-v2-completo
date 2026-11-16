/**
 * Converte um levantamento de perfil (VagaSolicitacao) em vaga ABERTA, com link público,
 * e já aciona a Lia para convidar candidatos. Usado pela abertura automática (empresa envia o formulário)
 * e pelo botão manual da unidade — um só caminho, sem duplicar regra.
 */
import { prisma } from "@/lib/prisma";

export function slugDaVaga(titulo: string): string {
  const base = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "vaga";
  return base + "-" + Date.now().toString(36);
}

export type ResultadoAbertura =
  | { ok: true; vagaId: string; franchiseId: string; empresa: string; titulo: string }
  | { ok: false; motivo: "nao_encontrada" | "ja_convertida" | "sem_unidade" };

export async function abrirVagaDeSolicitacao(solId: string, franchiseIdFallback?: string | null): Promise<ResultadoAbertura> {
  const sol: any = await (prisma as any).vagaSolicitacao.findUnique({
    where: { id: solId },
    include: { company: { select: { id: true, name: true, franchiseId: true, cidade: true, uf: true, endereco: true } } },
  });
  if (!sol) return { ok: false, motivo: "nao_encontrada" };
  if (sol.status === "CONVERTIDA") return { ok: false, motivo: "ja_convertida" };
  const franchiseId = sol.franchiseId || sol.company.franchiseId || franchiseIdFallback || null;
  if (!franchiseId) return { ok: false, motivo: "sem_unidade" };

  const descricao = [
    sol.atividades,
    sol.supervisorNome ? `\nSupervisor: ${sol.supervisorNome}${sol.supervisorCargo ? " — " + sol.supervisorCargo : ""}` : "",
    sol.supervisorEmail ? `E-mail supervisor: ${sol.supervisorEmail}` : "",
    sol.supervisorTel ? `Tel supervisor: ${sol.supervisorTel}` : "",
  ].filter(Boolean).join("\n");

  const vaga = await prisma.vacancy.create({
    data: {
      titulo: sol.funcao, funcao: sol.funcao, descricao, beneficios: sol.beneficios || null,
      modalidade: sol.modalidade || "Presencial", bolsa: sol.bolsa, auxTransporte: sol.auxTransporte || 0,
      cargaHoraria: sol.cargaHoraria || 30, horario: sol.horario,
      cidade: sol.company.cidade || null, uf: sol.company.uf || null, endereco: sol.company.endereco || null,
      cursoRequerido: sol.cursoDesejado || null, nivel: sol.nivel || null,
      companyId: sol.company.id, franchiseId, status: "ABERTA", publicSlug: slugDaVaga(sol.funcao),
    } as any,
  });
  await (prisma as any).vagaSolicitacao.update({ where: { id: sol.id }, data: { status: "CONVERTIDA", vagaId: vaga.id } });
  return { ok: true, vagaId: vaga.id, franchiseId, empresa: sol.company.name, titulo: sol.funcao };
}
