"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SeriesBarChart, VariacaoBadge, HorizontalBarList } from "@/components/crescimento/Charts";

const fmtMoeda = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

type Periodo = { from: Date; to: Date };

function inicioDoDia(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function fimDoDia(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function presetPeriodo(preset: string): Periodo {
  const hoje = new Date();
  const to = fimDoDia(hoje);
  if (preset === "7d") return { from: inicioDoDia(new Date(hoje.getTime() - 6 * 86400000)), to };
  if (preset === "semana") {
    const dia = hoje.getDay();
    const diffSegunda = dia === 0 ? -6 : 1 - dia;
    return { from: inicioDoDia(new Date(hoje.getTime() + diffSegunda * 86400000)), to };
  }
  if (preset === "mes") return { from: new Date(hoje.getFullYear(), hoje.getMonth(), 1), to };
  if (preset === "ano") return { from: new Date(hoje.getFullYear(), 0, 1), to };
  if (preset === "90d") return { from: inicioDoDia(new Date(hoje.getTime() - 89 * 86400000)), to };
  return { from: inicioDoDia(new Date(hoje.getTime() - 29 * 86400000)), to }; // 30d default
}

const PRESETS = [
  { key: "7d", label: "7 dias" },
  { key: "semana", label: "Esta semana" },
  { key: "30d", label: "30 dias" },
  { key: "mes", label: "Este mês" },
  { key: "90d", label: "90 dias" },
  { key: "ano", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

const METRICAS = [
  { key: "estudantes", label: "Estudantes", color: "#0f2a5e" },
  { key: "empresas", label: "Empresas", color: "#2563eb" },
  { key: "ies", label: "IES", color: "#7c3aed" },
  { key: "contratosAtivos", label: "Contratos Ativos", color: "#059669" },
  { key: "franquias", label: "Franquias", color: "#f59e0b" },
  { key: "financeiro", label: "Financeiro", color: "#dc2626" },
] as const;

type MetricaKey = typeof METRICAS[number]["key"];

function dateToInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CrescimentoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthorized = session?.user?.role === "FRANQUEADORA";

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAuthorized) router.replace("/dashboard");
  }, [session, status, router, isAuthorized]);

  const [preset, setPreset] = useState("30d");
  const [periodo, setPeriodo] = useState<Periodo>(() => presetPeriodo("30d"));
  const [customFrom, setCustomFrom] = useState(dateToInputValue(periodo.from));
  const [customTo, setCustomTo] = useState(dateToInputValue(periodo.to));
  const [metricaAtiva, setMetricaAtiva] = useState<MetricaKey>("estudantes");
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const aplicarPreset = (key: string) => {
    setPreset(key);
    if (key === "custom") return;
    const p = presetPeriodo(key);
    setPeriodo(p);
    setCustomFrom(dateToInputValue(p.from));
    setCustomTo(dateToInputValue(p.to));
  };

  const aplicarCustom = () => {
    const from = inicioDoDia(new Date(customFrom + "T00:00:00"));
    const to = fimDoDia(new Date(customTo + "T00:00:00"));
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return;
    setPreset("custom");
    setPeriodo({ from, to });
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ from: periodo.from.toISOString(), to: periodo.to.toISOString() });
      const res = await fetch(`/api/app/crescimento?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
      setDados(await res.json());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatório de crescimento");
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (status === "authenticated" && isAuthorized) carregar();
  }, [status, isAuthorized, carregar]);

  const bucketLabel = useCallback((iso: string) => {
    const d = new Date(iso);
    const g = dados?.periodo?.granularidade;
    if (g === "month") return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
    if (g === "week") return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  }, [dados]);

  const chartData = useMemo(() => {
    if (!dados) return [];
    if (metricaAtiva === "financeiro") {
      return (dados.series.financeiro as { bucket: string; total: number }[]).map((d) => ({ label: bucketLabel(d.bucket), value: d.total }));
    }
    const serie = dados.series[metricaAtiva] as { bucket: string; count: number }[];
    return serie.map((d) => ({ label: bucketLabel(d.bucket), value: d.count }));
  }, [dados, metricaAtiva, bucketLabel]);

  const metricaInfo = METRICAS.find(m => m.key === metricaAtiva)!;

  if (!isAuthorized) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">📈 Crescimento da Rede</h1>
          <p className="text-xs text-slate-400 mt-0.5">Cadastros, unidades e financeiro ao longo do tempo — visão FRANQUEADORA</p>
        </div>
        <Button variant="secondary" size="sm" onClick={carregar} disabled={carregando}>
          {carregando ? "⏳ Atualizando..." : "🔄 Atualizar"}
        </Button>
      </div>

      {/* Seletor de período */}
      <Card className="p-3 mb-5 flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => aplicarPreset(p.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              preset === p.key ? "bg-[#0f2a5e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
            <span className="text-xs text-slate-400">até</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
            <Button size="sm" onClick={aplicarCustom}>Aplicar</Button>
          </div>
        )}
        {dados?.periodo && (
          <span className="text-[11px] text-slate-400 ml-auto">
            {new Date(dados.periodo.from).toLocaleDateString("pt-BR", { timeZone: "UTC" })} — {new Date(dados.periodo.to).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            {" · "}granularidade: {dados.periodo.granularidade === "day" ? "dia" : dados.periodo.granularidade === "week" ? "semana" : "mês"}
          </span>
        )}
      </Card>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-sm text-red-700 font-semibold">
          🔴 {erro}
        </div>
      )}

      {carregando && !dados ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      ) : dados ? (
        <>
          {/* ── KPIs ────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-5">
            <Card className="p-4 border-l-4 border-[#0f2a5e]">
              <p className="text-[11px] font-semibold text-slate-500">🎓 Estudantes</p>
              <p className="text-xl font-black text-slate-800 mt-1">{fmtNum(dados.resumo.estudantes.atual)}</p>
              <div className="mt-1"><VariacaoBadge pct={dados.resumo.estudantes.variacaoPct} /></div>
            </Card>
            <Card className="p-4 border-l-4 border-blue-500">
              <p className="text-[11px] font-semibold text-slate-500">🏢 Empresas</p>
              <p className="text-xl font-black text-slate-800 mt-1">{fmtNum(dados.resumo.empresas.atual)}</p>
              <div className="mt-1"><VariacaoBadge pct={dados.resumo.empresas.variacaoPct} /></div>
            </Card>
            <Card className="p-4 border-l-4 border-violet-500">
              <p className="text-[11px] font-semibold text-slate-500">🏫 IES</p>
              <p className="text-xl font-black text-slate-800 mt-1">{fmtNum(dados.resumo.ies.atual)}</p>
              <div className="mt-1"><VariacaoBadge pct={dados.resumo.ies.variacaoPct} /></div>
            </Card>
            <Card className="p-4 border-l-4 border-emerald-500">
              <p className="text-[11px] font-semibold text-slate-500">📄 Contratos Ativos</p>
              <p className="text-xl font-black text-slate-800 mt-1">{fmtNum(dados.resumo.contratosAtivos.atual)}</p>
              <div className="mt-1"><VariacaoBadge pct={dados.resumo.contratosAtivos.variacaoPct} /></div>
            </Card>
            <Card className="p-4 border-l-4 border-amber-500">
              <p className="text-[11px] font-semibold text-slate-500">🏳️ Franquias novas</p>
              <p className="text-xl font-black text-slate-800 mt-1">{fmtNum(dados.resumo.franquias.novasNoPeriodo)}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <VariacaoBadge pct={dados.resumo.franquias.variacaoPct} />
                <span className="text-[10px] text-slate-400">{dados.resumo.franquias.ativasHoje} ativas hoje</span>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-red-500">
              <p className="text-[11px] font-semibold text-slate-500">💰 Receita da Rede</p>
              <p className="text-lg font-black text-slate-800 mt-1">{fmtMoeda(dados.resumo.financeiro.atual)}</p>
              <div className="mt-1"><VariacaoBadge pct={dados.resumo.financeiro.variacaoPct} /></div>
            </Card>
          </div>

          {/* ── Gráfico de série temporal ──────────────────────────────────── */}
          <Card className="p-5 mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-black text-slate-800">Evolução no período</h2>
              <div className="flex gap-1.5 flex-wrap">
                {METRICAS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMetricaAtiva(m.key)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      metricaAtiva === m.key ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                    style={metricaAtiva === m.key ? { background: m.color } : undefined}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <SeriesBarChart data={chartData} color={metricaInfo.color} formatValue={metricaAtiva === "financeiro" ? fmtMoeda : fmtNum} />
          </Card>

          {/* ── Quebra por unidade + origem ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <Card className="p-5">
              <h2 className="text-sm font-black text-slate-800 mb-3">Por unidade — {metricaInfo.label}</h2>
              {metricaAtiva === "franquias" || metricaAtiva === "financeiro" ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Quebra por unidade não se aplica a esta métrica.</p>
              ) : (
                <HorizontalBarList
                  color={metricaInfo.color}
                  data={(dados.porUnidade[metricaAtiva] as { nome: string; count: number }[]).map(u => ({ label: u.nome, count: u.count }))}
                />
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-black text-slate-800 mb-3">Origem do cadastro — {metricaInfo.label}</h2>
              {dados.porOrigem[metricaAtiva] ? (
                <>
                  <HorizontalBarList
                    color={metricaInfo.color}
                    data={(dados.porOrigem[metricaAtiva] as { origem: string; count: number }[]).map(o => ({
                      label: o.origem === "MIGRADO" ? "Migrado (sistema antigo)" : "Cadastro normal",
                      count: o.count,
                    }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                    ⚠️ Isto indica se o registro veio da migração do sistema antigo ou foi cadastrado direto na plataforma — não é canal de marketing (site, Instagram etc.), que o sistema ainda não registra para este módulo.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">Estudantes não possuem campo de origem — apenas a unidade é registrada.</p>
              )}
            </Card>
          </div>

          {/* ── Franquias: canal real de aquisição (leads) ───────────────────── */}
          <Card className="p-5 mb-5">
            <h2 className="text-sm font-black text-slate-800 mb-1">Crescimento de Franquias — canal de aquisição de leads</h2>
            <p className="text-[11px] text-slate-400 mb-3">
              Único módulo do sistema com canal de marketing real hoje (CRM de venda de franquias). Leads captados no período, por canal.
            </p>
            {dados.franquiaLeadsCanal.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum lead de franquia captado neste período.</p>
            ) : (
              <HorizontalBarList
                color="#f59e0b"
                data={(dados.franquiaLeadsCanal as { canal: string; count: number }[]).map(c => ({ label: c.canal, count: c.count }))}
              />
            )}
          </Card>

          {/* ── Aviso de lacuna de dados ───────────────────────────────────── */}
          <Card className="p-5 border-2 border-amber-200 bg-amber-50/40">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none">ℹ️</span>
              <div>
                <p className="text-xs font-black text-amber-800 mb-1">Sobre o canal de marketing (site, Instagram, indicação...)</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">{dados.lacunas.canalMarketing}</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
