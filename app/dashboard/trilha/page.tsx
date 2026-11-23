import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { metricasUnidade, painelRede } from "@/lib/trilha/metricas";
import { FRANQUIA_PIPELINE } from "@/lib/crm/franquia-pipeline";
import { VisitaForm } from "./VisitaForm";

export const dynamic = "force-dynamic";

const COR = { verde: "bg-green-100 text-green-800", amarelo: "bg-amber-100 text-amber-800", vermelho: "bg-red-100 text-red-800" } as const;
const ROT = { verde: "No ritmo", amarelo: "Atenção", vermelho: "Atrasada" } as const;
const RES: Record<string, string> = { apresentou: "Apresentou", proposta: "Proposta", agendou: "Agendou", sem_interesse: "Sem interesse" };

export default async function TrilhaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  const franchiseId = (session.user as any).franchiseId as string | undefined;

  if (role === "FRANQUEADORA") {
    const { unidades, funilFranquia: f } = await painelRede();
    return (
      <div className="max-w-5xl space-y-6">
        <div><h2 className="text-xl font-bold text-slate-800">Trilha dos 30 contratos — rede</h2><p className="text-sm text-slate-500 mt-1">Ritmo semanal (meta: 10 visitas) e marcos de cada unidade.</p></div>
        <div className="rounded-xl bg-white shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm"><thead className="text-xs text-slate-500 text-left"><tr><th className="p-3">Unidade</th><th>Contratos</th><th>Visitas na semana</th><th>Dias</th><th>Último login</th><th>Situação</th></tr></thead>
            <tbody>{unidades.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-semibold text-slate-800">{u.nome}{u.treinamentoPendente && <span className="ml-2 text-[10px] rounded bg-blue-50 text-blue-700 px-1.5 py-0.5">em treinamento</span>}</td>
                <td>{u.contratos} / 30</td><td>{u.visitasSemana} / 10</td><td>{u.dias}</td>
                <td className={u.semLogarDias !== null && u.semLogarDias > 14 ? "text-red-600 font-semibold" : ""}>{u.semLogarDias === null ? "nunca" : `há ${u.semLogarDias} d`}</td>
                <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${COR[u.semaforo]}`}>{ROT[u.semaforo]}</span></td>
              </tr>))}</tbody></table>
        </div>
        <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
          <h3 className="font-bold text-slate-800">Funil de venda de franquias</h3>
          <p className="text-xs text-slate-500">{f.total} leads (sem frios) · {f.diasMedioAteFechar !== null ? `média de ${f.diasMedioAteFechar} dias até assinar` : "nenhum contrato assinado pelo fluxo novo ainda"} · {f.abriuSemAvancar} abriram o material e não preencheram o cadastro</p>
          <div className="flex flex-wrap gap-2">{Object.entries(FRANQUIA_PIPELINE).map(([k, c]) => <span key={k} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><b>{f.porEtapa[k] ?? 0}</b> {c.label}</span>)}</div>
          <div><p className="text-xs font-bold text-slate-500 mb-1">Por origem (total / fechados)</p>
            <div className="flex flex-wrap gap-2">{Object.entries(f.porOrigem).map(([o, x]) => <span key={o} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">{o}: <b>{x.total}</b> / <b>{x.fechados}</b></span>)}</div></div>
        </div>
      </div>
    );
  }

  if ((role !== "FRANQUEADO" && role !== "FUNCIONARIO") || !franchiseId || franchiseId === "FRANQUEADORA") redirect("/dashboard");
  const m = await metricasUnidade(franchiseId);
  const pct = Math.min(100, Math.round((m.contratos / m.metaContratos) * 100));
  const proximo = m.marcos.find(x => x.status !== "atingido");
  const etapasFunil: [string, number][] = [["Empresas captadas pelo Victor", m.funil.captadas], ["Contato humano feito", m.funil.contatadas], ["Visitas e apresentações", m.funil.visitas], ["Propostas e negociações", m.funil.propostas], ["Contratos ativos", m.funil.contratos]];
  const maxF = Math.max(1, ...etapasFunil.map(e => e[1]));

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-800">Trilha dos 30 contratos 🎯</h2><p className="text-sm text-slate-500 mt-1">{m.diasDeOperacao} dias de operação. Meta: 30 contratos ativos e 10 visitas por semana.</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${COR[m.semaforo]}`}>{ROT[m.semaforo]}</span>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between text-sm font-bold text-slate-700"><span>Contratos ativos</span><span>{m.contratos} de {m.metaContratos}</span></div>
        <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#0f2a5e]" style={{ width: `${pct}%` }} /></div>
        {proximo && <p className="mt-2 text-xs text-slate-500">Próximo marco: <b>{proximo.rotulo}</b> {proximo.status === "atrasado" ? "— prazo passou, vamos recuperar." : `— faltam ${proximo.diasRestantes} dias.`}</p>}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between text-sm font-bold text-slate-700"><span>Visitas desta semana</span><span className={`rounded-full px-2 py-0.5 text-xs ${COR[m.semanaSemaforo]}`}>{m.visitasSemana} de {m.metaVisitas}</span></div>
        <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#f5c400]" style={{ width: `${Math.min(100, (m.visitasSemana / m.metaVisitas) * 100)}%` }} /></div>
        <VisitaForm />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">Seu funil</h3>
        <div className="mt-3 space-y-2">{etapasFunil.map(([t, n]) => (
          <div key={t}><div className="flex justify-between text-xs text-slate-600"><span>{t}</span><b>{n}</b></div><div className="h-2 rounded bg-slate-100"><div className="h-full rounded bg-[#0f2a5e]/70" style={{ width: `${(n / maxF) * 100}%` }} /></div></div>))}</div>
        <p className="mt-3 text-[11px] text-slate-400">Se há muita empresa captada e poucas visitas, o gargalo é o contato humano. Se há muitas visitas e poucas propostas, revise a apresentação.</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">Marcos</h3>
        <ul className="mt-2 space-y-1.5 text-sm">{m.marcos.map(x => <li key={x.dias} className="flex justify-between"><span>{x.status === "atingido" ? "✅" : x.status === "atrasado" ? "⚠️" : "⬜"} {x.rotulo}</span><span className="text-xs text-slate-500">{x.status === "atingido" ? "atingido" : x.status === "atrasado" ? "atrasado" : `em ${x.diasRestantes} dias`}</span></li>)}</ul>
      </div>

      {m.recentes.length > 0 && <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100"><h3 className="text-sm font-bold text-slate-700">Últimas visitas</h3>
        <ul className="mt-2 space-y-1 text-sm">{m.recentes.map(r => <li key={r.id} className="flex justify-between"><span>{r.empresa} <span className="text-xs text-slate-400">· {RES[r.resultado] || r.resultado}</span></span><span className="text-xs text-slate-400">{new Date(r.visitadaEm).toLocaleDateString("pt-BR")}</span></li>)}</ul></div>}
    </div>
  );
}
