"use client";

import { useMemo, useState } from "react";

// Valores de tabela da COF (versão 07/2026). A simulação é EXEMPLO condicionado às premissas ajustáveis abaixo.
const MODELOS = {
  home: { nome: "Home Office", taxa: 17000, invMin: 27300, invMax: 42500 },
  escritorio: { nome: "Escritório", taxa: 25000, invMin: 60000, invMax: 93000 },
} as const;
const TAXA_SISTEMA = 250;
const POR_ESTAGIARIO = 13;

const PROMO_HOME = 6000; // condição promocional da taxa de franquia Home Office (formalizada por proposta comercial)

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Simulador() {
  const [modelo, setModelo] = useState<keyof typeof MODELOS>("home");
  const [contratos, setContratos] = useState(30);
  const [valor, setValor] = useState(140);
  const [meses, setMeses] = useState(12);
  const [promo, setPromo] = useState(true);

  const r = useMemo(() => {
    const base = MODELOS[modelo];
    const desc = modelo === "home" && promo ? base.taxa - PROMO_HOME : 0;
    const m = { ...base, taxa: base.taxa - desc, invMin: base.invMin - desc, invMax: base.invMax - desc };
    const receita = contratos * valor;
    const custo = TAXA_SISTEMA + POR_ESTAGIARIO * contratos;
    const resultado = receita - custo;
    const ltvBruto = valor * meses;
    const ltvLiquido = (valor - POR_ESTAGIARIO) * meses;
    const payback = (inv: number) => (resultado > 0 ? Math.ceil(inv / resultado) : null);
    return { m, receita, custo, resultado, ltvBruto, ltvLiquido, pbMin: payback(m.invMin), pbMax: payback(m.invMax), ano: resultado * 12 };
  }, [modelo, contratos, valor, meses, promo]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-3xl bg-white/10 p-6 space-y-6 border border-white/10">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#FAA419]">Monte o seu cenário</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(MODELOS) as (keyof typeof MODELOS)[]).map(k => (
              <button key={k} type="button" onClick={() => setModelo(k)} className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${modelo === k ? "bg-[#FAA419] text-[#0A1A40]" : "bg-white/10 text-white hover:bg-white/20"}`}>{MODELOS[k].nome}</button>
            ))}
          </div>
        </div>
        {modelo === "home" && (
          <label className="flex items-center gap-3 rounded-xl bg-[#FAA419]/15 p-3 text-sm font-bold text-white cursor-pointer">
            <input type="checkbox" checked={promo} onChange={e => setPromo(e.target.checked)} className="h-4 w-4 accent-[#FAA419]" />
            Usar a condição promocional de {brl(PROMO_HOME)} na taxa de franquia
          </label>
        )}
        <Slider label="Contratos de estágio ativos" value={contratos} set={setContratos} min={5} max={60} step={1} fmt={n => `${n}`} />
        <Slider label="Valor mensal cobrado por estagiário" value={valor} set={setValor} min={80} max={200} step={5} fmt={brl} />
        <Slider label="Meses que cada estágio permanece" value={meses} set={setMeses} min={6} max={24} step={1} fmt={n => `${n} meses`} />
        <p className="text-xs leading-relaxed text-white/60">Premissas de exemplo, que você ajusta. O valor cobrado de cada empresa é definido pela sua unidade. O estágio dura, por lei, até 2 anos na mesma empresa.</p>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card k="Receita mensal recorrente" v={brl(r.receita)} sub={`${contratos} contratos × ${brl(valor)}`} />
          <Card k="Custo mensal com a Smarter" v={brl(r.custo)} sub={`${brl(TAXA_SISTEMA)} de sistema + ${brl(POR_ESTAGIARIO)} × ${contratos} estagiários`} />
        </div>
        <div className="rounded-3xl bg-[#FAA419] p-6 text-[#0A1A40]">
          <p className="text-xs font-black uppercase tracking-widest">Resultado mensal bruto neste cenário</p>
          <p className="mt-1 text-4xl md:text-5xl font-black leading-none">{brl(r.resultado)}</p>
          <p className="mt-2 text-sm font-semibold">≈ {brl(r.ano)} por ano, antes de impostos, marketing local e demais despesas da sua unidade.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card k="LTV de cada contrato (receita)" v={brl(r.ltvBruto)} sub={`${brl(valor)} × ${meses} meses. Cada empresa fechada tende a gerar receita mês após mês.`} />
          <Card k="LTV líquido do custo por estagiário" v={brl(r.ltvLiquido)} sub={`(${brl(valor)} − ${brl(POR_ESTAGIARIO)}) × ${meses} meses`} />
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#FAA419]">Payback (quando recupera o investimento)</p>
          <p className="mt-2 text-2xl md:text-3xl font-black">
            {r.pbMin && r.pbMax ? (r.pbMin === r.pbMax ? `${r.pbMin} meses` : `de ${r.pbMin} a ${r.pbMax} meses`) : "Aumente os contratos para ver"}
          </p>
          <p className="mt-2 text-sm text-white/75">
            Investimento total estimado no modelo {r.m.nome}: {brl(r.m.invMin)} a {brl(r.m.invMax)} (COF, com taxa de franquia de {brl(r.m.taxa)}{modelo === "home" && promo ? " na condição promocional" : ""}). Contado a partir do momento em que esses {contratos} contratos já estão ativos.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-white/55">Simulação ilustrativa, sem garantia de faturamento, lucro, retorno ou quantidade de contratos. Não considera o tempo para formar a carteira, impostos, inadimplência nem despesas pessoais. A COF e o contrato prevalecem sobre esta página.</p>
      </div>
    </div>
  );
}

function Slider({ label, value, set, min, max, step, fmt }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; fmt: (n: number) => string }) {
return (
  <label className="block">
    <span className="flex justify-between text-sm font-semibold text-white/85"><span>{label}</span><span className="text-[#FAA419] font-black">{fmt(value)}</span></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} className="mt-2 w-full accent-[#FAA419]" />
  </label>
);
}

function Card({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">{k}</p>
      <p className="mt-1 text-2xl md:text-3xl font-black">{v}</p>
      <p className="mt-1 text-xs text-white/60">{sub}</p>
    </div>
  );
}
