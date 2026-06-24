"use client";
/**
 * AlertasPanel — painel de lembretes/alertas do dashboard
 * Busca /api/app/alertas e exibe cards por categoria com badges coloridos.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

interface ContratItem   { id: string; numero: string; student?: { name: string } | null; company?: { name: string } | null; franchise?: { name: string } | null; dataFim?: string; createdAt?: string; dataInicio?: string; diasRestantes?: number; diasPendente?: number; mesesAtivo?: number; }
interface LeadCrmItem   { id: string; empresa: string; contato: string; retornoAt: string; etapa: string; }
interface UnidadeItem   { franchiseId: string; franchiseName: string; total: number; }
interface TarefaItem    { id: string; leadId: string; nomeCompleto: string; descricao: string; dueAt: string; }
interface LeadParadoItem{ id: string; nomeCompleto: string; etapa: string; ultimoContato: string | null; dias: number; }

interface Alertas {
  contratosVencendo: ContratItem[];
  contratosVencidosSemFinalizar: ContratItem[];
  contratosPendentes1Mes: ContratItem[];
  contratosPendentes2Mes: ContratItem[];
  avaliacoesDevidas: ContratItem[];
  leadsCrmVencidos: LeadCrmItem[];
  unidadesComPendentes2Mes: UnidadeItem[];
  franquiaTarefasVencidas: TarefaItem[];
  franquiaLeadsParados: LeadParadoItem[];
  contratosVencidosRede: number;
  avaliacoesVencidasRede: number;
}

interface Totais { critico: number; atencao: number; info: number; total: number; }

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function Badge({ tipo }: { tipo: "critico" | "atencao" | "info" }) {
  const cls = {
    critico: "bg-red-100 text-red-700 border-red-300",
    atencao: "bg-yellow-100 text-yellow-700 border-yellow-300",
    info:    "bg-blue-100 text-blue-700 border-blue-300",
  }[tipo];
  const label = { critico: "Crítico", atencao: "Atenção", info: "Info" }[tipo];
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function AlertRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 border-b border-gray-100 last:border-0">
      {children}
    </Link>
  );
}

function Section({ title, tipo, count, children }: { title: string; tipo: "critico" | "atencao" | "info"; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm flex items-center gap-2">
          <Badge tipo={tipo} />
          {title}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          {count} {count === 1 ? "item" : "itens"}
          <span className="ml-1">{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && <div className="mt-1 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">{children}</div>}
    </div>
  );
}

export default function AlertasPanel({ isMaster }: { isMaster: boolean }) {
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [totais,  setTotais]  = useState<Totais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch("/api/app/alertas")
      .then(r => r.json())
      .then(d => { setAlertas(d.alertas); setTotais(d.totais); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
      </div>
    </div>
  );

  if (error || !alertas) return null;

  const total = totais?.total ?? 0;

  if (total === 0) return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
      <span className="text-green-600 text-xl">✅</span>
      <p className="text-green-800 text-sm font-medium">Tudo em dia! Nenhum alerta pendente.</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          🔔 Lembretes e Alertas
        </h2>
        <div className="flex gap-2 text-xs">
          {(totais?.critico ?? 0) > 0 && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">{totais!.critico} crítico</span>}
          {(totais?.atencao ?? 0) > 0 && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold">{totais!.atencao} atenção</span>}
          {(totais?.info    ?? 0) > 0 && <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">{totais!.info} info</span>}
        </div>
      </div>

      {/* ─── CRÍTICOS ──────────────────────────────────────────────── */}

      <Section title="Contratos pendentes há +60 dias (serão excluídos)" tipo="critico" count={alertas.contratosPendentes2Mes.length}>
        {alertas.contratosPendentes2Mes.map(c => (
          <AlertRow key={c.id} href={`/dashboard/contratos?id=${c.id}`}>
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium">{c.student?.name ?? "—"} · {c.company?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">Contrato {c.numero} · Pendente há {c.diasPendente} dias{c.franchise?.name ? ` · ${c.franchise.name}` : ""}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      <Section title="Contratos vencidos não finalizados" tipo="critico" count={alertas.contratosVencidosSemFinalizar.length}>
        {alertas.contratosVencidosSemFinalizar.map(c => (
          <AlertRow key={c.id} href={`/dashboard/contratos?id=${c.id}`}>
            <span className="text-red-500 mt-0.5">🔴</span>
            <div>
              <p className="font-medium">{c.student?.name ?? "—"} · {c.company?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">Contrato {c.numero} · Venceu em {fmt(c.dataFim)}{c.franchise?.name ? ` · ${c.franchise.name}` : ""}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      {isMaster && alertas.unidadesComPendentes2Mes.length > 0 && (
        <Section title="Unidades com contratos pendentes +60 dias" tipo="critico" count={alertas.unidadesComPendentes2Mes.length}>
          {alertas.unidadesComPendentes2Mes.map(u => (
            <AlertRow key={u.franchiseId} href={`/dashboard/contratos?franchiseId=${u.franchiseId}`}>
              <span className="text-red-500 mt-0.5">🏢</span>
              <div>
                <p className="font-medium">{u.franchiseName}</p>
                <p className="text-xs text-gray-500">{u.total} contrato{u.total !== 1 ? "s" : ""} pendente há +60 dias — requer exclusão manual</p>
              </div>
            </AlertRow>
          ))}
        </Section>
      )}

      {isMaster && alertas.franquiaTarefasVencidas.length > 0 && (
        <Section title="Tarefas vencidas no CRM Franquias" tipo="critico" count={alertas.franquiaTarefasVencidas.length}>
          {alertas.franquiaTarefasVencidas.map(t => (
            <AlertRow key={t.id} href={`/dashboard/franquia-crm/${t.leadId}`}>
              <span className="text-red-500 mt-0.5">📋</span>
              <div>
                <p className="font-medium">{t.nomeCompleto}</p>
                <p className="text-xs text-gray-500">{t.descricao} · Prazo: {fmt(t.dueAt)}</p>
              </div>
            </AlertRow>
          ))}
        </Section>
      )}

      {/* ─── ATENÇÃO ───────────────────────────────────────────────── */}

      <Section title={`Contratos vencendo em até 30 dias`} tipo="atencao" count={alertas.contratosVencendo.length}>
        {alertas.contratosVencendo.map(c => (
          <AlertRow key={c.id} href={`/dashboard/contratos?id=${c.id}`}>
            <span className="text-yellow-500 mt-0.5">⏰</span>
            <div>
              <p className="font-medium">{c.student?.name ?? "—"} · {c.company?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">Contrato {c.numero} · Vence em {fmt(c.dataFim)} ({c.diasRestantes} dias){c.franchise?.name ? ` · ${c.franchise.name}` : ""}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      <Section title="Contratos pendentes há 30–60 dias (cobrar ativação)" tipo="atencao" count={alertas.contratosPendentes1Mes.length}>
        {alertas.contratosPendentes1Mes.map(c => (
          <AlertRow key={c.id} href={`/dashboard/contratos?id=${c.id}`}>
            <span className="text-yellow-500 mt-0.5">🕐</span>
            <div>
              <p className="font-medium">{c.student?.name ?? "—"} · {c.company?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">Contrato {c.numero} · Pendente há {c.diasPendente} dias{c.franchise?.name ? ` · ${c.franchise.name}` : ""}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      <Section title="Avaliação semestral devida (+6 meses de estágio)" tipo="atencao" count={alertas.avaliacoesDevidas.length}>
        {alertas.avaliacoesDevidas.map(c => (
          <AlertRow key={c.id} href={`/dashboard/contratos?id=${c.id}`}>
            <span className="text-yellow-500 mt-0.5">📝</span>
            <div>
              <p className="font-medium">{c.student?.name ?? "—"} · {c.company?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">Contrato {c.numero} · {c.mesesAtivo} meses de estágio · Início: {fmt(c.dataInicio)}{c.franchise?.name ? ` · ${c.franchise.name}` : ""}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      <Section title="CRM — Leads com retorno vencido" tipo="atencao" count={alertas.leadsCrmVencidos.length}>
        {alertas.leadsCrmVencidos.map(l => (
          <AlertRow key={l.id} href={`/dashboard/crm/${l.id}`}>
            <span className="text-yellow-500 mt-0.5">💼</span>
            <div>
              <p className="font-medium">{l.empresa}</p>
              <p className="text-xs text-gray-500">{l.contato} · Retorno previsto: {fmt(l.retornoAt)} · Etapa: {l.etapa}</p>
            </div>
          </AlertRow>
        ))}
      </Section>

      {/* ─── INFO (só FRANQUEADORA) ────────────────────────────────── */}

      {isMaster && alertas.franquiaLeadsParados.length > 0 && (
        <Section title="CRM Franquias — Leads sem contato há +7 dias" tipo="info" count={alertas.franquiaLeadsParados.length}>
          {alertas.franquiaLeadsParados.map(l => (
            <AlertRow key={l.id} href={`/dashboard/franquia-crm/${l.id}`}>
              <span className="text-blue-500 mt-0.5">🤝</span>
              <div>
                <p className="font-medium">{l.nomeCompleto}</p>
                <p className="text-xs text-gray-500">Etapa: {l.etapa} · {l.dias >= 999 ? "Nunca contactado" : `Sem contato há ${l.dias} dias`}</p>
              </div>
            </AlertRow>
          ))}
        </Section>
      )}
    </div>
  );
}
