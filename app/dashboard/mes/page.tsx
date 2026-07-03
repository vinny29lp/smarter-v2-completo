import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMesStatus } from "@/lib/mes/status";
import { calcularMetricasMes } from "@/lib/mes/metrics";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function MesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const franchiseId = session.user.franchiseId;
  if (!franchiseId || role === "FRANQUEADORA" || role === "EQUIPE") redirect("/dashboard");

  const status = await getMesStatus(franchiseId);
  const nomeMes = NOMES_MES[status.mesAtual.mes - 1];

  const progresso = status.abertura && !status.fechamento
    ? await calcularMetricasMes(franchiseId, status.mesAtual.mes, status.mesAtual.ano)
    : null;

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-1">Mês Atual</h1>
      <p className="text-slate-500 text-sm mb-6">{nomeMes} de {status.mesAtual.ano}</p>

      {/* Não abriu */}
      {!status.abertura && (
        <Card className="p-6 border-l-4 border-red-400 bg-red-50/40">
          <p className="font-bold text-slate-800 mb-1">📅 Você ainda não abriu o mês de {nomeMes}/{status.mesAtual.ano}</p>
          <p className="text-sm text-slate-600 mb-4">
            {status.bloqueado
              ? "O sistema está bloqueado até que a abertura seja feita."
              : `Você tem ${status.diasParaBloquear} dia(s) para abrir o mês antes do bloqueio (dia 5).`}
          </p>
          <Link href="/dashboard/mes/abrir" className="inline-flex bg-[#0f2a5e] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-[#1a3d8f] transition-colors">
            Abrir Mês Agora →
          </Link>
        </Card>
      )}

      {/* Abriu mas não fechou */}
      {status.abertura && !status.fechamento && progresso && (
        <>
          <Card className="p-6 border-l-4 border-emerald-400 bg-emerald-50/40 mb-6">
            <p className="font-bold text-slate-800 mb-1">✓ Mês aberto em {new Date(status.abertura.criadoEm).toLocaleDateString("pt-BR")}</p>
            {status.abertura.observacoes && <p className="text-sm text-slate-600 mt-1">{status.abertura.observacoes}</p>}
          </Card>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Progresso vs. Metas (tempo real)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              ["Empresas", progresso.empresasCadastradas, status.abertura.metaEmpresas],
              ["Leads", progresso.leadsNoMes, status.abertura.metaLeads],
              ["Contratos", progresso.contratosFirmados, status.abertura.metaContratos],
              ["Estudantes", progresso.estudantesCadastrados, status.abertura.metaEstudantes],
            ].map(([label, valor, meta]) => (
              <Card key={String(label)} className="p-4 text-center">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-2xl font-black text-[#0f2a5e] mt-1">{valor as number}</p>
                <p className="text-xs text-slate-300">meta: {(meta as number) ?? "—"}</p>
              </Card>
            ))}
          </div>

          {status.deveFecha && (
            <Card className="p-4 border-l-4 border-amber-400 bg-amber-50/40 mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Último dia do mês — hora de fechar!</p>
              <Link href="/dashboard/mes/fechar" className="bg-[#0f2a5e] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1a3d8f]">
                Fechar Mês →
              </Link>
            </Card>
          )}
          {!status.deveFecha && (
            <Link href="/dashboard/mes/fechar" className="inline-flex text-sm border border-slate-200 hover:border-blue-400 px-4 py-2 rounded-xl font-semibold transition-colors">
              Iniciar Fechamento do Mês →
            </Link>
          )}
        </>
      )}

      {/* Fechou */}
      {status.fechamento && (
        <Card className="p-6 border-l-4 border-blue-400">
          <div className="flex items-center gap-3 mb-4">
            <p className="font-bold text-slate-800">✓ Mês fechado</p>
            <Badge variant={status.fechamento.score >= 70 ? "green" : status.fechamento.score >= 40 ? "yellow" : "red"}>
              Score: {status.fechamento.score}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {[
              ["Empresas", status.fechamento.empresasCadastradas],
              ["Leads", status.fechamento.leadsNoMes],
              ["Contratos", status.fechamento.contratosFirmados],
              ["Horas", status.fechamento.horasNoSistema.toFixed(1)],
              ["Score", status.fechamento.score],
            ].map(([label, valor]) => (
              <div key={String(label)} className="text-center">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xl font-black text-[#0f2a5e] mt-1">{valor as any}</p>
              </div>
            ))}
          </div>
          <Link href="/dashboard/mes/fechar" className="text-sm font-semibold text-blue-600 hover:underline">
            Ver relatório completo →
          </Link>
        </Card>
      )}
    </div>
  );
}
