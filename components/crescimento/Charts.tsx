"use client";

// ─── Gráficos SVG puros (sem dependências) — mesmo padrão do dashboard Financeiro ──

export function SeriesBarChart({
  data, formatValue, color = "#0f2a5e",
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const fmt = formatValue || ((v: number) => String(Math.round(v)));
  const showEveryLabel = data.length <= 14;
  return (
    <div className="flex items-end gap-[3px] w-full" style={{ height: 160 }}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1);
        const showLabel = showEveryLabel || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 8) === 0;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group relative">
            <span className="text-[9px] text-slate-500 font-semibold leading-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 whitespace-nowrap bg-white px-1 rounded shadow-sm border border-slate-100 z-10">
              {fmt(d.value)}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{ height: `${pct}%`, background: color, opacity: d.value > 0 ? 1 : 0.15 }}
            />
            <span className="text-[8px] text-slate-400 font-medium whitespace-nowrap truncate max-w-full">
              {showLabel ? d.label : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ data, color = "#0f2a5e" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const w = 100, h = 28;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VariacaoBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">novo</span>;
  }
  const positivo = pct > 0;
  const neutro = pct === 0;
  return (
    <span
      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
        neutro ? "text-slate-400 bg-slate-50" : positivo ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
      }`}
    >
      {neutro ? "—" : positivo ? `↑ +${pct}%` : `↓ ${pct}%`}
    </span>
  );
}

export function HorizontalBarList({
  data, color = "#0f2a5e", emptyLabel = "Sem dados no período",
}: {
  data: { label: string; count: number }[];
  color?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) return <p className="text-xs text-slate-400 italic py-4 text-center">{emptyLabel}</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600 font-medium w-32 shrink-0 truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <span className="text-[11px] font-bold text-slate-700 w-8 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
