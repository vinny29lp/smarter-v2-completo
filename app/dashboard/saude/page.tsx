"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Database,
  Globe,
  Mail,
  Cpu,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  Building2,
  TrendingUp,
  Zap,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Semaforo = "verde" | "amarelo" | "vermelho";

interface SaudeData {
  sucesso: boolean;
  timestamp: string;
  tempoRespostaMs: number;
  scoreGeral: number;
  banco: {
    latenciaMs: number;
    semaforo: Semaforo;
    totalUsuarios: number;
    totalEstudantes: number;
    estudantesAtivos: number;
    totalEmpresas: number;
    totalContratos: number;
    contratosAtivos: number;
    totalFranquias: number;
    totalFinanceiros: number;
    totalVagas: number;
    totalDocumentos: number;
    totalActivityLogs: number;
    totalImportLogs: number;
    totalAiLogs: number;
  };
  vercel: {
    semaforo: Semaforo;
    estado: string;
    buildStatus: string;
    ultimoDeploy: string | null;
    url: string | null;
    disponivel: boolean;
  };
  email: {
    semaforo: Semaforo;
    enviadosHoje: number;
    falhasHoje: number;
    fila: number;
    disponivel: boolean;
  };
  openai: {
    semaforo: Semaforo;
    chamadasHoje: number;
    custoEstimadoUSDHoje: number;
    atividadeHoje: number;
  };
  alertas: {
    nivel: Semaforo;
    categoria: string;
    mensagem: string;
  }[];
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SemaforoIcon({ nivel, size = 16 }: { nivel: Semaforo; size?: number }) {
  if (nivel === "verde")
    return <CheckCircle size={size} className="text-emerald-500" />;
  if (nivel === "amarelo")
    return <AlertTriangle size={size} className="text-amber-500" />;
  return <XCircle size={size} className="text-red-500" />;
}

function SemaforoBadge({ nivel }: { nivel: Semaforo }) {
  const map: Record<Semaforo, { bg: string; text: string; label: string }> = {
    verde:    { bg: "bg-emerald-100", text: "text-emerald-700", label: "Normal" },
    amarelo:  { bg: "bg-amber-100",   text: "text-amber-700",   label: "Atenção" },
    vermelho: { bg: "bg-red-100",     text: "text-red-700",     label: "Crítico" },
  };
  const s = map[nivel];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <SemaforoIcon nivel={nivel} size={10} />
      {s.label}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  const r = 54;
  const cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const dash = circ * pct;
  const gap  = circ - dash;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 128 128" className="w-28 h-28">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Score */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">
          / 100
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function MetricCard({
  icon,
  titulo,
  semaforo,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  semaforo: Semaforo;
  children: React.ReactNode;
}) {
  const borderMap: Record<Semaforo, string> = {
    verde:    "border-l-emerald-400",
    amarelo:  "border-l-amber-400",
    vermelho: "border-l-red-400",
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${borderMap[semaforo]} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-50 rounded-xl text-[#0f2a5e]">{icon}</div>
          <span className="font-semibold text-slate-700 text-sm">{titulo}</span>
        </div>
        <SemaforoBadge nivel={semaforo} />
      </div>
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-[#0f2a5e]" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

function AlertaItem({
  nivel,
  categoria,
  mensagem,
}: {
  nivel: Semaforo;
  categoria: string;
  mensagem: string;
}) {
  const styles: Record<Semaforo, { wrapper: string; icon: string }> = {
    verde:    { wrapper: "bg-emerald-50 border-emerald-200", icon: "text-emerald-500" },
    amarelo:  { wrapper: "bg-amber-50 border-amber-200",    icon: "text-amber-500"   },
    vermelho: { wrapper: "bg-red-50 border-red-200",        icon: "text-red-500"     },
  };
  const s = styles[nivel];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${s.wrapper}`}>
      <SemaforoIcon nivel={nivel} size={16} />
      <div>
        <p className="text-xs font-semibold text-slate-700">{categoria}</p>
        <p className="text-xs text-slate-600 mt-0.5">{mensagem}</p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function fmtLatencia(ms: number): string {
  return `${ms}ms`;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SaudeDoSistema() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [dados, setDados] = useState<SaudeData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Redirecionar se não for FRANQUEADORA
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "FRANQUEADORA") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/app/saude");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
      const data: SaudeData = await res.json();
      setDados(data);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar métricas");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "FRANQUEADORA") {
      carregar();
    }
  }, [status, session, carregar]);

  // Auto-refresh a cada 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(carregar, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, carregar]);

  if (status === "loading" || (status === "authenticated" && session?.user?.role !== "FRANQUEADORA")) {
    return null;
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (carregando && !dados) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw size={32} className="text-[#0f2a5e] animate-spin" />
        <p className="text-slate-500 text-sm">Carregando métricas do sistema…</p>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (erro && !dados) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle size={32} className="text-red-500" />
        <p className="text-red-600 text-sm font-medium">{erro}</p>
        <button
          onClick={carregar}
          className="px-4 py-2 bg-[#0f2a5e] text-white rounded-xl text-sm hover:bg-[#1a3a7e] transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const d = dados!;
  const scoreGeral = d.scoreGeral ?? 100;
  const semGeral: Semaforo =
    scoreGeral >= 80 ? "verde" : scoreGeral >= 50 ? "amarelo" : "vermelho";

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0f2a5e] rounded-xl">
                <Activity size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#0f2a5e]">Saúde do Sistema</h1>
            </div>
            <p className="text-slate-500 text-xs mt-1 ml-12">
              Monitoramento em tempo real · FRANQUEADORA
            </p>
          </div>

          <div className="flex items-center gap-3">
            {ultimaAtualizacao && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {fmtData(ultimaAtualizacao.toISOString())}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                autoRefresh
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {autoRefresh ? "Auto 60s ✓" : "Auto-refresh"}
            </button>
            <button
              onClick={carregar}
              disabled={carregando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2a5e] text-white rounded-xl text-xs font-medium hover:bg-[#1a3a7e] disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={12} className={carregando ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Score + Alertas ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Score geral */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-slate-600 text-center">Score de Saúde</p>
            <ScoreGauge score={scoreGeral} />
            <div className="flex items-center gap-2 mt-1">
              <SemaforoBadge nivel={semGeral} />
              <span className="text-xs text-slate-400">{fmtLatencia(d.tempoRespostaMs)} resposta</span>
            </div>
          </div>

          {/* Alertas */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-slate-700 text-sm">
                Alertas Ativos {d.alertas.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    {d.alertas.length}
                  </span>
                )}
              </h2>
            </div>
            {d.alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                <CheckCircle size={24} className="text-emerald-500" />
                <p className="text-sm text-emerald-700 font-medium">Nenhum alerta ativo</p>
                <p className="text-xs text-slate-400">Todos os sistemas operando normalmente</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {d.alertas.map((a, i) => (
                  <AlertaItem key={i} nivel={a.nivel} categoria={a.categoria} mensagem={a.mensagem} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Cards de métricas ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">

          {/* Supabase / Banco */}
          <MetricCard
            icon={<Database size={18} />}
            titulo="Banco de Dados (Supabase)"
            semaforo={d.banco.semaforo}
          >
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Latência" value={fmtLatencia(d.banco.latenciaMs)} highlight />
              <StatRow label="Usuários" value={d.banco.totalUsuarios.toLocaleString("pt-BR")} />
              <StatRow label="Estudantes" value={d.banco.totalEstudantes.toLocaleString("pt-BR")} highlight />
              <StatRow label="Ativos" value={d.banco.estudantesAtivos.toLocaleString("pt-BR")} />
              <StatRow label="Empresas" value={d.banco.totalEmpresas.toLocaleString("pt-BR")} />
              <StatRow label="Franquias" value={d.banco.totalFranquias.toLocaleString("pt-BR")} />
              <StatRow label="Contratos" value={d.banco.totalContratos.toLocaleString("pt-BR")} highlight />
              <StatRow label="Ativos" value={d.banco.contratosAtivos.toLocaleString("pt-BR")} />
              <StatRow label="Documentos" value={d.banco.totalDocumentos.toLocaleString("pt-BR")} />
              <StatRow label="Financeiros" value={d.banco.totalFinanceiros.toLocaleString("pt-BR")} />
            </div>
          </MetricCard>

          {/* Vercel */}
          <MetricCard
            icon={<Globe size={18} />}
            titulo="Deploy (Vercel)"
            semaforo={d.vercel.semaforo}
          >
            {!d.vercel.disponivel ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">
                  Configure <code className="bg-slate-100 px-1 rounded">VERCEL_TOKEN</code> nas variáveis de ambiente para habilitar.
                </p>
              </div>
            ) : (
              <div>
                <StatRow label="Build Status" value={d.vercel.buildStatus} highlight />
                <StatRow label="Estado" value={d.vercel.estado} />
                <StatRow label="Último deploy" value={fmtData(d.vercel.ultimoDeploy)} />
                {d.vercel.url && (
                  <div className="mt-3">
                    <a
                      href={d.vercel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0f2a5e] hover:underline truncate block"
                    >
                      {d.vercel.url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </MetricCard>

          {/* Email */}
          <MetricCard
            icon={<Mail size={18} />}
            titulo="Email (Resend)"
            semaforo={d.email.semaforo}
          >
            {!d.email.disponivel ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">
                  Configure <code className="bg-slate-100 px-1 rounded">RESEND_API_KEY</code> para habilitar.
                </p>
              </div>
            ) : (
              <div>
                <StatRow label="Enviados hoje" value={d.email.enviadosHoje} highlight />
                <StatRow label="Falhas hoje" value={d.email.falhasHoje} />
                <StatRow label="Na fila" value={d.email.fila} />
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{d.email.enviadosHoje}</p>
                    <p className="text-xs text-emerald-600">Enviados</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-red-700">{d.email.falhasHoje}</p>
                    <p className="text-xs text-red-600">Falhas</p>
                  </div>
                </div>
              </div>
            )}
          </MetricCard>

          {/* OpenAI */}
          <MetricCard
            icon={<Cpu size={18} />}
            titulo="Inteligência Artificial (OpenAI)"
            semaforo={d.openai.semaforo}
          >
            <StatRow label="Chamadas hoje" value={d.openai.chamadasHoje} highlight />
            <StatRow
              label="Custo estimado hoje"
              value={`USD ${d.openai.custoEstimadoUSDHoje.toFixed(4)}`}
            />
            <StatRow label="Atividades hoje" value={d.openai.atividadeHoje} />
            <div className="mt-3 bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <Zap size={18} className="text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  {d.openai.chamadasHoje === 0
                    ? "Nenhuma chamada hoje"
                    : `${d.openai.chamadasHoje} chamadas realizadas`}
                </p>
                <p className="text-xs text-blue-500">
                  Custo médio:{" "}
                  {d.openai.chamadasHoje > 0
                    ? `USD ${(d.openai.custoEstimadoUSDHoje / d.openai.chamadasHoje).toFixed(4)}/chamada`
                    : "—"}
                </p>
              </div>
            </div>
          </MetricCard>
        </div>

        {/* ── Resumo Operacional ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#0f2a5e]" />
            <h2 className="font-semibold text-slate-700 text-sm">Resumo Operacional</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Users size={20} />, label: "Usuários",  value: d.banco.totalUsuarios,   cor: "blue"    },
              { icon: <Users size={20} />, label: "Estudantes", value: d.banco.totalEstudantes, cor: "violet"  },
              { icon: <Building2 size={20} />, label: "Empresas", value: d.banco.totalEmpresas, cor: "cyan"    },
              { icon: <FileText size={20} />, label: "Contratos", value: d.banco.totalContratos, cor: "indigo"  },
            ].map((item, i) => {
              const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
                blue:   { bg: "bg-blue-50",   text: "text-blue-700",   icon: "text-blue-500"   },
                violet: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-500" },
                cyan:   { bg: "bg-cyan-50",   text: "text-cyan-700",   icon: "text-cyan-500"   },
                indigo: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
              };
              const c = colorMap[item.cor];
              return (
                <div key={i} className={`${c.bg} rounded-xl p-4 flex flex-col items-center gap-2`}>
                  <div className={c.icon}>{item.icon}</div>
                  <p className={`text-2xl font-bold ${c.text}`}>
                    {item.value.toLocaleString("pt-BR")}
                  </p>
                  <p className={`text-xs font-medium ${c.text} opacity-75`}>{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rodapé ───────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Dados coletados em {fmtData(d.timestamp)} · Latência total {fmtLatencia(d.tempoRespostaMs)} ·
          Sistema Smarter — FRANQUEADORA
        </p>

      </div>
    </div>
  );
}
