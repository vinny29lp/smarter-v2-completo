"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card }   from "@/components/ui/Card";
import { Badge }  from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Modal }  from "@/components/ui/Modal";

// ─── Utils ───────────────────────────────────────────────────────────────────
const STATUS_V: Record<string,"green"|"yellow"|"red"> = {
  PAGO:"green", PENDENTE:"yellow", VENCIDO:"red", CANCELADO:"red",
};
const fmt = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const FRASES = [
  "Cada estagiário ativo é uma semente plantada — continue cultivando e a colheita será extraordinária! 🌱",
  "O sucesso não acontece por acidente. Cada contrato fechado é prova do seu comprometimento. Continue! 🚀",
  "Sua unidade está construindo o futuro de jovens talentos. Isso tem um valor que vai além dos números. 💙",
  "Quem planta com consistência colhe com abundância. Você está no caminho certo! 🌟",
  "Cada meta batida é a confirmação de que você está fazendo a diferença. Não pare agora! 💪",
  "O crescimento de hoje se tornará a base do seu sucesso de amanhã. Avante! 🏆",
  "Grandes empresas começaram pequenas — o que as fez crescer foi a consistência. Você está no caminho! 🔥",
];

// ─── Bar Chart (SVG puro, sem dependências) ───────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; current?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[6px] w-full" style={{ height: 120 }}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
            <span className="text-[9px] text-slate-500 font-semibold leading-none">
              {d.value > 0 ? "R$" + Math.round(d.value).toLocaleString("pt-BR") : "—"}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${pct}%`,
                background: d.current ? "#0f2a5e" : "#bfdbfe",
              }}
            />
            <span className="text-[9px] text-slate-400 font-medium">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Health Gauge (SVG) ───────────────────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const angle = -90 + (score / 100) * 180;
  const r = 50;
  const cx = 60, cy = 60;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x = cx + r * Math.cos(toRad(angle));
  const y = cy + r * Math.sin(toRad(angle));
  return (
    <svg viewBox="0 0 120 70" className="w-32">
      {/* Background arc */}
      <path d={`M10,60 A50,50 0 0,1 110,60`} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round"/>
      {/* Score arc */}
      <path
        d={`M10,60 A50,50 0 0,1 ${x},${y}`}
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
      />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="4" fill={color}/>
      {/* Score text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>{score}</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7" fill="#94a3b8">/ 100</text>
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const { data: session } = useSession();
  const isFranqueadora = session?.user?.role === "FRANQUEADORA";

  // State
  const [lancamentos, setLancamentos]         = useState<any[]>([]);
  const [config, setConfig]                   = useState<any>(null);
  const [configModal, setConfigModal]         = useState(false);
  const [configForm, setConfigForm]           = useState({ chavePix:"", linkPagamento:"", instrucaoPagamento:"", qrCodePixUrl:"", mensagemCobrancaFranqueado:"" });
  const [novoModal, setNovoModal]             = useState(false);
  const [editModal, setEditModal]             = useState<any>(null);
  const [cobrModal, setCobrModal]             = useState<any>(null);
  const [relatorioModal, setRelatorioModal]   = useState(false);
  const [filtro, setFiltro]                   = useState("TODOS");
  const [loading, setLoading]                 = useState(false);
  // Franquias
  const [franquiasPreview, setFranquiasPreview] = useState<any[]>([]);
  const [franquiasTotal, setFranquiasTotal]     = useState(0);
  const [fechandoMes, setFechandoMes]           = useState(false);
  const [fechamentoResult, setFechamentoResult] = useState<any>(null);
  const [fechamentoModal, setFechamentoModal]   = useState(false);
  // Form novo lançamento
  const [form, setForm] = useState({
    descricao:"", tipo:"entrada", valor:"", categoria:"Empresa",
    status:"PENDENTE", recorrente:false, diaVencimento:"", vencimentoAt:"",
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // ─── Loaders ─────────────────────────────────────────────────────────────
  const load = () =>
    fetch("/api/app/financeiro").then(r => r.json()).then(d => setLancamentos(d.lancamentos || []));

  const loadConfig = () =>
    fetch("/api/app/config-pagamento").then(r => r.json()).then(d => {
      setConfig(d.config);
      if (d.config) setConfigForm({
        chavePix: d.config.chavePix || "",
        linkPagamento: d.config.linkPagamento || "",
        instrucaoPagamento: d.config.instrucaoPagamento || "",
        qrCodePixUrl: d.config.qrCodePixUrl || "",
        mensagemCobrancaFranqueado: d.config.mensagemCobrancaFranqueado || "",
      });
    });

  const loadFranquiasPreview = () => {
    if (!isFranqueadora) return;
    fetch("/api/app/financeiro/fechar-mes")
      .then(r => r.json())
      .then(d => { setFranquiasPreview(d.preview || []); setFranquiasTotal(d.totalGeral || 0); })
      .catch(() => {});
  };

  useEffect(() => { load(); loadConfig(); }, []);
  useEffect(() => { if (isFranqueadora) loadFranquiasPreview(); }, [isFranqueadora]);
  useEffect(() => {
    if (!isFranqueadora) return;
    const fn = () => loadFranquiasPreview();
    window.addEventListener("focus", fn);
    return () => window.removeEventListener("focus", fn);
  }, [isFranqueadora]);

  // ─── KPI Calculations (Ponto 3) ──────────────────────────────────────────
  const hoje     = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const podeFecha = diaAtual >= 23;

  const isPaidMes = (l: any) => {
    if (!l.paidAt) return false;
    const d = new Date(l.paidAt);
    return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
  };

  // ENTRADAS: dado baixa como entrada ESTE MÊS
  const entradasMes = lancamentos
    .filter(l => l.tipo === "entrada" && l.status === "PAGO" && isPaidMes(l))
    .reduce((a, b) => a + b.valor, 0);

  // SAÍDAS PAGAS: dado baixa como saída ESTE MÊS
  const saidasMes = lancamentos
    .filter(l => l.tipo === "saida" && l.status === "PAGO" && isPaidMes(l))
    .reduce((a, b) => a + b.valor, 0);

  // A RECEBER: pendentes (entradas sem baixa — exclui Franquia para FRANQUEADO, pois são despesas)
  const aReceber = lancamentos
    .filter(l => l.tipo === "entrada" && l.status === "PENDENTE" && (isFranqueadora || l.categoria !== "Franquia"))
    .reduce((a, b) => a + b.valor, 0);

  // CONTAS A PAGAR: todas as saídas pendentes (sem baixa)
  const contasAPagar = lancamentos
    .filter(l => l.tipo === "saida" && l.status === "PENDENTE")
    .reduce((a, b) => a + b.valor, 0);

  // CAIXA: acumulado total (todas entradas pagas − todas saídas pagas)
  const totalEntradasPago = lancamentos
    .filter(l => l.tipo === "entrada" && l.status === "PAGO").reduce((a, b) => a + b.valor, 0);
  const totalSaidasPago = lancamentos
    .filter(l => l.tipo === "saida" && l.status === "PAGO").reduce((a, b) => a + b.valor, 0);
  const caixa = totalEntradasPago - totalSaidasPago;

  // Split para exibição
  const lancamentosFranquia = lancamentos.filter(l => l.categoria === "Franquia");
  const lancamentosGerais   = lancamentos.filter(l => l.categoria !== "Franquia");
  const filtrados = filtro === "TODOS"
    ? lancamentosGerais
    : lancamentosGerais.filter(l => l.status === filtro);

  // ─── Relatório — Dados (Ponto 4) ─────────────────────────────────────────
  // Gráfico: receitas dos últimos 6 meses
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anoAtual, mesAtual - (5 - i), 1);
    return { label: d.toLocaleDateString("pt-BR", { month: "short" }), year: d.getFullYear(), month: d.getMonth(), value: 0, current: i === 5 };
  });
  lancamentos
    .filter(l => l.tipo === "entrada" && l.status === "PAGO" && l.paidAt)
    .forEach(l => {
      const d = new Date(l.paidAt);
      const slot = last6.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (slot) slot.value += l.valor;
    });

  // Estagiários ativos (estimativa)
  const estagiosAtivos = isFranqueadora
    ? franquiasPreview.reduce((a, f) => a + f.ativosCount, 0)
    : lancamentos.filter(l => l.categoria === "Taxa Admin" && l.status === "PENDENTE" && l.recorrente).length;

  // Ticket médio por estagiário
  const taxaAdminEntries = lancamentos.filter(l => l.categoria === "Taxa Admin");
  const ticketMedio = taxaAdminEntries.length > 0
    ? taxaAdminEntries.reduce((a, b) => a + b.valor, 0) / taxaAdminEntries.length
    : 200;

  // Receita mensal base (média últimos 3 meses com valor > 0)
  const mesesComValor = last6.filter(m => m.value > 0);
  const receitaBase = mesesComValor.length > 0
    ? mesesComValor.slice(-3).reduce((a, b) => a + b.value, 0) / Math.min(mesesComValor.slice(-3).length, 3)
    : 0;

  const ticketEstag = estagiosAtivos > 0 && receitaBase > 0
    ? receitaBase / estagiosAtivos
    : ticketMedio;

  // Health score: % do que já foi recebido vs tudo que deveria receber
  const totalRecebivel = totalEntradasPago + aReceber;
  const healthScore = totalRecebivel > 0 ? Math.min(Math.round((totalEntradasPago / totalRecebivel) * 100), 100) : (totalEntradasPago > 0 ? 100 : 0);
  const healthLabel  = healthScore >= 80 ? "Excelente" : healthScore >= 50 ? "Atenção" : "Crítico";
  const healthColor  = healthScore >= 80 ? "text-emerald-600" : healthScore >= 50 ? "text-amber-600" : "text-red-600";
  const healthBg     = healthScore >= 80 ? "bg-emerald-50 border-emerald-200" : healthScore >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  // Projeções
  const projecoes = [0, 5, 10, 15].map(novos => ({
    novos,
    label: novos === 0 ? "Cenário atual" : `+${novos} estagiários`,
    totalEstag: estagiosAtivos + novos,
    mensalRecorrente: receitaBase + novos * ticketEstag,
    em6Meses: (receitaBase + novos * ticketEstag) * 6,
    em12Meses: (receitaBase + novos * ticketEstag) * 12,
  }));

  // Recomendações dinâmicas
  const recomendacoes: string[] = [];
  if (aReceber > 0)
    recomendacoes.push(`📧 Envie cobranças — você tem ${fmt(aReceber)} a receber que ainda não foram cobrados.`);
  if (estagiosAtivos < 5)
    recomendacoes.push("🎯 Prospecte mais empresas — unidades com 10+ estagiários têm receita 3× maior.");
  if (entradasMes < receitaBase * 0.7 && receitaBase > 0)
    recomendacoes.push("⚡ Este mês está abaixo da média — feche as cobranças em aberto ainda hoje.");
  if (estagiosAtivos > 0)
    recomendacoes.push(`📈 Ticket médio por estagiário: ${fmt(ticketEstag)} — busque empresas que valorizam qualidade.`);
  if (healthScore >= 80)
    recomendacoes.push("🌟 Sua taxa de recebimento está ótima! Continue com a disciplina nas cobranças.");
  if (recomendacoes.length === 0)
    recomendacoes.push("🚀 Comece registrando suas receitas e despesas para ver insights personalizados aqui.");

  // Frase motivacional
  const nomeMes   = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const fraseIdx  = (anoAtual * 12 + mesAtual + estagiosAtivos) % FRASES.length;
  const frase     = FRASES[fraseIdx];

  // ─── Actions ─────────────────────────────────────────────────────────────
  const salvarConfig = async () => {
    try {
      const res = await fetch("/api/app/config-pagamento", {
        method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro ao salvar"); return; }
      setConfig(data.config); setConfigModal(false);
    } catch { alert("Erro de conexão"); }
  };

  const criar = async () => {
    if (!form.descricao || !form.valor) return;
    setLoading(true);
    const res = await fetch("/api/app/financeiro", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    });
    const data = await res.json();
    if (data.lancamento) {
      setLancamentos(p => [data.lancamento, ...p]);
      setNovoModal(false);
      setForm({ descricao:"",tipo:"entrada",valor:"",categoria:"Empresa",status:"PENDENTE",recorrente:false,diaVencimento:"",vencimentoAt:"" });
    }
    setLoading(false);
  };

  const darBaixa = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"PAGO", paidAt:new Date() }) })
      .then(() => load());

  const reverter = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"reverter" }) })
      .then(() => load());

  const excluir = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"DELETE" })
      .then(() => setLancamentos(p => p.filter(l => l.id !== id)));

  const salvarEdicao = async () => {
    if (!editModal) return;
    await fetch(`/api/app/financeiro/${editModal.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ descricao:editModal.descricao, valor:editModal.valor }),
    });
    setEditModal(null); load();
  };

  const enviarCobranca = async () => {
    if (!cobrModal) return;
    setLoading(true);
    const payload = {
      emailDestino: cobrModal.emailDestino || cobrModal.company?.emailFinanceiro || cobrModal.company?.email || "",
      mensagemPersonalizada: cobrModal.mensagemPersonalizada || "",
      chavePix: cobrModal.chavePix || config?.chavePix || "",
      linkPagamento: cobrModal.linkPagamento || config?.linkPagamento || "",
      instrucaoPagamento: cobrModal.instrucaoPagamento || config?.instrucaoPagamento || "",
    };
    const res = await fetch(`/api/app/financeiro/${cobrModal.id}/enviar-cobranca`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
    });
    const data = await res.json();
    setCobrModal(null); setLoading(false);
    if (!res.ok) alert("Erro ao enviar: " + (data.error || "Verifique as configurações."));
    else alert("✅ E-mail enviado para " + payload.emailDestino);
    load();
  };

  const fecharMes = async (force = false) => {
    setFechandoMes(true);
    const url = "/api/app/financeiro/fechar-mes" + (force ? "?force=true" : "");
    const res = await fetch(url, { method:"POST" });
    const data = await res.json();
    setFechamentoResult(data);
    setFechamentoModal(true);
    setFechandoMes(false);
    if (data.ok) { load(); loadFranquiasPreview(); }
  };

  // Ações inline reutilizáveis
  const RowActions = ({ l }: { l: any }) => (
    <div className="flex gap-1 flex-wrap">
      {l.status === "PENDENTE" && !l.cancelado && (
        <>
          <Button size="sm" variant="secondary" onClick={() => darBaixa(l.id)}>✓ Baixa</Button>
          {l.tipo === "entrada" && (
            <Button size="sm" variant="secondary" onClick={() => setCobrModal({
              ...l,
              emailDestino: l.franchise?.email || l.company?.emailFinanceiro || l.company?.email || "",
              mensagemPersonalizada: l.categoria === "Franquia" ? (config?.mensagemCobrancaFranqueado || "") : "",
            })}>📧 Cobrar</Button>
          )}
        </>
      )}
      {l.status === "PAGO" && (
        <Button size="sm" variant="ghost" onClick={() => reverter(l.id)}>↩</Button>
      )}
      {!l.cancelado && (
        <Button size="sm" variant="ghost" onClick={() => setEditModal({...l})}>✏️</Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => { if(confirm("Excluir?")) excluir(l.id); }}>🗑</Button>
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-slate-800">Financeiro</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setRelatorioModal(true)}>
            📊 Relatório do Mês
          </Button>
          <button
            onClick={() => setConfigModal(true)}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl border-2 font-semibold transition-all ${
              config?.chavePix || config?.linkPagamento
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-amber-400 bg-amber-50 text-amber-700"
            }`}
          >
            {config?.chavePix || config?.linkPagamento ? "✓ PIX/Boleto configurado" : "⚠️ Configurar PIX/Boleto"}
            {config?.chavePix && <span className="font-mono text-[10px] opacity-60 max-w-[120px] truncate">{config.chavePix}</span>}
          </button>
          <Button onClick={() => setNovoModal(true)}>+ Novo Lançamento</Button>
        </div>
      </div>

      {/* ── KPIs — 5 cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        {/* ENTRADAS */}
        <Card className="p-5 border-l-4 border-emerald-400">
          <p className="text-xs font-semibold text-slate-500">↑ Entradas</p>
          <p className="text-[10px] text-slate-400 mb-1">recebidas no mês</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(entradasMes)}</p>
        </Card>
        {/* SAÍDAS PAGAS */}
        <Card className="p-5 border-l-4 border-red-400">
          <p className="text-xs font-semibold text-slate-500">↓ Saídas Pagas</p>
          <p className="text-[10px] text-slate-400 mb-1">pagas no mês</p>
          <p className="text-2xl font-black text-red-600">{fmt(saidasMes)}</p>
        </Card>
        {/* CONTAS A PAGAR */}
        <Card className={`p-5 border-l-4 ${contasAPagar > 0 ? "border-orange-400" : "border-slate-200"}`}>
          <p className="text-xs font-semibold text-slate-500">📋 Contas a Pagar</p>
          <p className="text-[10px] text-slate-400 mb-1">saídas pendentes</p>
          <p className={`text-2xl font-black ${contasAPagar > 0 ? "text-orange-600" : "text-slate-400"}`}>{fmt(contasAPagar)}</p>
        </Card>
        {/* A RECEBER */}
        <Card className="p-5 border-l-4 border-amber-400">
          <p className="text-xs font-semibold text-slate-500">⏳ A Receber</p>
          <p className="text-[10px] text-slate-400 mb-1">entradas pendentes</p>
          <p className="text-2xl font-black text-amber-600">{fmt(aReceber)}</p>
        </Card>
        {/* CAIXA */}
        <Card className={`p-5 border-l-4 ${caixa >= 0 ? "border-blue-500" : "border-red-500"}`}>
          <p className="text-xs font-semibold text-slate-500">💵 Caixa</p>
          <p className="text-[10px] text-slate-400 mb-1">entradas − saídas (total)</p>
          <p className={`text-2xl font-black ${caixa >= 0 ? "text-[#0f2a5e]" : "text-red-600"}`}>{fmt(caixa)}</p>
        </Card>
      </div>

      {/* ── Taxa de Desenvolvimento (só FRANQUEADO) ─────────────────────────── */}
      {!isFranqueadora && lancamentosFranquia.length > 0 && (
        <Card className="mb-5 overflow-hidden border-l-4 border-[#0f2a5e]">
          <div className="px-5 py-4 bg-gradient-to-r from-[#0f2a5e]/5 to-transparent border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-[#0f2a5e] flex items-center gap-2">
                  🏛️ Taxa de Desenvolvimento de Rede
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">
                  Manter sua Taxa de Desenvolvimento em dia é o que garante o suporte técnico, marketing e crescimento da rede Smarter Estágios. Unidades adimplentes crescem mais rápido e têm acesso prioritário a recursos e novos recursos do sistema.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total em aberto</p>
                <p className="text-xl font-black text-[#0f2a5e]">
                  {fmt(lancamentosFranquia.filter(l => l.status === "PENDENTE").reduce((a,b) => a+b.valor,0))}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Referência","Valor","Vencimento","Status","Ações"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancamentosFranquia.map(l => {
                  const vencido = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
                  return (
                    <tr key={l.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${l.cancelado ? "opacity-40" : ""}`}>
                      <td className="px-4 py-2.5 text-sm font-medium max-w-xs">{l.descricao}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-red-600 whitespace-nowrap">− {fmt(l.valor)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                        {l.vencimentoAt ? new Date(l.vencimentoAt).toLocaleDateString("pt-BR") : "—"}
                        {vencido && <span className="ml-1 text-red-500 font-bold">⚠️</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_V[l.status] || "gray"}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {l.status === "PENDENTE" && (
                          <Button size="sm" variant="secondary" onClick={() => darBaixa(l.id)}>✓ Registrar Pagamento</Button>
                        )}
                        {l.status === "PAGO" && (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Pago</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-700 font-medium">
              💡 <strong>Como é calculado:</strong> R$ 200,00 (sistema) + R$ 13,00 × estagiários ativos. Pagamento em dia = rede forte!
            </p>
          </div>
        </Card>
      )}

      {/* ── Cobrança de Franquias (só FRANQUEADORA) ─────────────────────────── */}
      {isFranqueadora && (
        <Card className="mb-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-800">🏢 Cobrança de Franquias</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mensalidade do sistema + R$13 por estagiário ativo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">A receber de franquias</p>
                <p className="text-lg font-black text-[#0f2a5e]">
                  {fmt(lancamentosFranquia.filter(l => l.status === "PENDENTE").reduce((a,b) => a+b.valor, 0))}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => fecharMes(false)}
                  disabled={fechandoMes || !podeFecha}
                  variant={podeFecha ? "primary" : "secondary"}
                  size="sm">
                  {fechandoMes ? "Fechando..." : podeFecha ? "📅 Fechar Mês" : `Disponível dia 23 (hoje: ${diaAtual})`}
                </Button>
                {!podeFecha && (
                  <button onClick={() => fecharMes(true)} disabled={fechandoMes}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline text-center">
                    Forçar agora (admin)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cobranças lançadas com ações */}
          {lancamentosFranquia.length > 0 && (
            <>
              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cobranças Lançadas</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Descrição","Valor","Vencimento","Status","Ações"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFranquia.map(l => {
                      const vencido = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
                      return (
                        <tr key={l.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${l.cancelado ? "opacity-40" : ""}`}>
                          <td className="px-4 py-2.5 text-sm font-medium max-w-xs">{l.descricao}</td>
                          <td className="px-4 py-2.5 text-sm font-bold text-emerald-600 whitespace-nowrap">+ {fmt(l.valor)}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                            {l.vencimentoAt ? new Date(l.vencimentoAt).toLocaleDateString("pt-BR") : "—"}
                            {vencido && <span className="ml-1 text-red-500 font-bold">⚠️</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={STATUS_V[l.status] || "gray"}>{l.status}</Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <RowActions l={l} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Preview próxima cobrança */}
          <div className="px-5 py-2 bg-blue-50 border-t border-b border-blue-100 flex flex-wrap items-center gap-3 text-xs text-blue-700 font-medium">
            <span>📐 Próxima cobrança:</span>
            <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">
              Mensalidade do Sistema + (Estag. Ativos × R$ 13,00) = Total por Franqueado
            </span>
          </div>
          {franquiasPreview.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Nenhum franqueado ativo encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Franqueado","Estag. Ativos","Sistema","Taxa Estag.","Total Previsto"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {franquiasPreview.map((f: any) => (
                    <tr key={f.franchiseId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-sm font-semibold">{f.nome}</td>
                      <td className="px-4 py-2.5 text-sm text-center font-bold text-slate-700">{f.ativosCount}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{fmt(f.mensalidade)}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{fmt(f.taxaAdmin)}</td>
                      <td className="px-4 py-2.5 text-sm font-black text-[#0f2a5e]">{fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-slate-500">TOTAL PREVISTO</td>
                    <td className="px-4 py-2.5 text-base font-black text-[#0f2a5e]">{fmt(franquiasTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit flex-wrap">
        {[["TODOS","Todos"],["PENDENTE","Pendentes"],["PAGO","Pagos"],["VENCIDO","Vencidos"],["CANCELADO","Cancelados"]].map(([k,lbl]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtro === k ? "bg-[#0f2a5e] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}>
            {lbl}
            {k !== "TODOS" && <span className="ml-1 opacity-60">({lancamentosGerais.filter(l => l.status === k).length})</span>}
          </button>
        ))}
      </div>

      {/* ── Tabela principal ─────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Descrição","Tipo","Valor","Vencimento","Status","Ações"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">Nenhum lançamento.</td></tr>
                : filtrados.map(l => {
                  const vencido = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
                  return (
                    <tr key={l.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${l.cancelado?"opacity-40":""}`}>
                      <td className="px-4 py-2.5 text-sm font-medium max-w-xs">{l.descricao}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={l.tipo==="entrada"?"green":"red"}>{l.tipo==="entrada"?"↑ Entrada":"↓ Saída"}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-bold whitespace-nowrap">
                        <span className={l.tipo==="entrada"?"text-emerald-600":"text-red-600"}>
                          {l.tipo==="entrada"?"+":"-"} {fmt(l.valor)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                        {l.vencimentoAt ? new Date(l.vencimentoAt).toLocaleDateString("pt-BR") : l.diaVencimento ? `Dia ${l.diaVencimento}` : "—"}
                        {vencido && <span className="ml-1 text-red-500 font-bold">⚠️</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_V[l.status]||"gray"}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <RowActions l={l} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL — RELATÓRIO DO MÊS (Ponto 4)
      ════════════════════════════════════════════════════════════════════════ */}
      {relatorioModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            {/* Header do relatório */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#0f2a5e] to-[#1e40af] rounded-t-2xl">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Relatório de Saúde</p>
                <h2 className="text-white text-xl font-black capitalize">{nomeMes}</h2>
              </div>
              <button
                onClick={() => setRelatorioModal(false)}
                className="text-white/70 hover:text-white text-2xl leading-none font-light"
              >×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* KPIs do relatório */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Faturado no Mês", value: entradasMes, color: "text-emerald-600", sub: "entradas com baixa" },
                  { label: "A Receber", value: aReceber, color: "text-amber-600", sub: "pendentes" },
                  { label: "Caixa Total", value: caixa, color: caixa >= 0 ? "text-[#0f2a5e]" : "text-red-600", sub: "acumulado" },
                  { label: "Estagiários Ativos", value: estagiosAtivos, color: "text-blue-600", sub: "contratos ativos", isCount: true },
                ].map((kpi,i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{kpi.label}</p>
                    <p className={`text-xl font-black ${kpi.color} mt-1`}>
                      {(kpi as any).isCount ? kpi.value : fmt(kpi.value as number)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico de barras */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  📊 Receitas — Últimos 6 Meses
                </p>
                <div className="bg-slate-50 rounded-xl p-4">
                  <BarChart data={last6} />
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Barra azul escura = mês atual
                  </p>
                </div>
              </div>

              {/* Saúde do Negócio */}
              <div className={`rounded-xl border p-4 ${healthBg}`}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🩺 Saúde do Negócio</p>
                <div className="flex items-center gap-6">
                  <HealthGauge score={healthScore} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${healthColor}`}>{healthLabel}</span>
                      <span className="text-sm text-slate-500">({healthScore}% de recebimento)</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Total recebido</span>
                        <span className="font-semibold text-emerald-600">{fmt(totalEntradasPago)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ainda a receber</span>
                        <span className="font-semibold text-amber-600">{fmt(aReceber)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1">
                        <span className="font-bold">Total esperado</span>
                        <span className="font-bold">{fmt(totalRecebivel)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projeções */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  🔭 Projeções de Crescimento
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Cenário","Estag.","Rec. Mensal","Em 6 meses","Em 12 meses"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projecoes.map((p, i) => (
                        <tr key={i} className={`border-b border-slate-50 last:border-0 ${i === 0 ? "bg-blue-50/50 font-semibold" : "hover:bg-slate-50/50"}`}>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? "bg-[#0f2a5e] text-white" : "bg-emerald-100 text-emerald-700"}`}>
                              {p.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-700">{p.totalEstag}</td>
                          <td className="px-4 py-2.5 font-semibold text-emerald-600">{fmt(p.mensalRecorrente)}</td>
                          <td className="px-4 py-2.5 text-slate-700">{fmt(p.em6Meses)}</td>
                          <td className="px-4 py-2.5 font-bold text-[#0f2a5e]">{fmt(p.em12Meses)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {receitaBase > 0 && (
                  <p className="text-[10px] text-slate-400 mt-2 px-1">
                    * Projeções baseadas na receita média dos últimos meses com dados. Ticket estimado por estagiário: {fmt(ticketEstag)}.
                  </p>
                )}
                {receitaBase === 0 && (
                  <p className="text-[10px] text-amber-500 mt-2 px-1">
                    * Registre cobranças recebidas para gerar projeções baseadas nos seus números reais.
                  </p>
                )}
              </div>

              {/* Recomendações */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  💡 O Sistema Indica
                </p>
                <div className="space-y-2">
                  {recomendacoes.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="text-sm leading-relaxed text-slate-700">{r}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frase motivacional */}
              <div className="bg-gradient-to-r from-[#0f2a5e] to-[#1e40af] rounded-xl p-5 text-center">
                <p className="text-white/70 text-[10px] uppercase tracking-widest font-semibold mb-2">💬 Frase do Mês</p>
                <p className="text-white text-sm font-medium leading-relaxed italic">"{frase}"</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button variant="secondary" onClick={() => setRelatorioModal(false)} className="w-full">
                Fechar Relatório
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Configuração Global PIX/Boleto ── */}
      <Modal open={configModal} onClose={() => setConfigModal(false)} title="⚙️ Configuração de Pagamento">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Configure uma vez e os dados serão usados em todas as cobranças.</p>
          <Input label="Chave PIX" value={configForm.chavePix}
            onChange={e => setConfigForm(p => ({...p, chavePix: e.target.value}))}
            placeholder="CNPJ, CPF, e-mail ou chave aleatória"/>
          <Input label="Link do Boleto (opcional)" value={configForm.linkPagamento}
            onChange={e => setConfigForm(p => ({...p, linkPagamento: e.target.value}))}
            placeholder="https://banco.com/boleto/..."/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Instruções de Pagamento</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
              value={configForm.instrucaoPagamento}
              onChange={e => setConfigForm(p => ({...p, instrucaoPagamento: e.target.value}))}
              placeholder="Ex: Transferência Banco Itaú, Ag 0001, CC 12345-6"/>
          </div>

          {/* Campos exclusivos da FRANQUEADORA */}
          {isFranqueadora && (
            <>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wide mb-2">🏢 Cobranças para Franqueados</p>
                <p className="text-xs text-slate-400 mb-3">Estes dados são usados no e-mail de cobrança enviado às unidades franqueadas.</p>
              </div>
              <div>
                <Input label="URL do QR Code PIX (para e-mail)" value={configForm.qrCodePixUrl}
                  onChange={e => setConfigForm(p => ({...p, qrCodePixUrl: e.target.value}))}
                  placeholder="https://...imagem-qrcode.png"/>
                {configForm.qrCodePixUrl && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-[10px] text-green-600 font-semibold mb-2">Prévia do QR Code:</p>
                    <img
                      src={configForm.qrCodePixUrl}
                      alt="QR Code PIX"
                      className="max-w-[140px] max-h-[140px] mx-auto rounded-lg border-2 border-green-200 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mensagem padrão para franqueados (opcional)</label>
                <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
                  value={configForm.mensagemCobrancaFranqueado}
                  onChange={e => setConfigForm(p => ({...p, mensagemCobrancaFranqueado: e.target.value}))}
                  placeholder="Ex: Em caso de dúvidas, entre em contato pelo WhatsApp (11) 99999-9999."/>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfigModal(false)}>Cancelar</Button>
            <Button onClick={salvarConfig}>Salvar Configuração</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Novo Lançamento ── */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Novo Lançamento">
        <div className="space-y-3">
          <Input label="Descrição *" value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Mensalidade TechCorp - Maio/2025"/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                <option value="entrada">↑ Entrada</option>
                <option value="saida">↓ Saída</option>
              </select>
            </div>
            <Input label="Valor (R$) *" type="number" value={form.valor} onChange={e => set("valor", e.target.value)} placeholder="480"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Categoria</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                {["Empresa","Franqueado","Taxa","Operacional","Seguro","Outro"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>
          </div>
          <Input label="Data de Vencimento" type="date" value={form.vencimentoAt} onChange={e => set("vencimentoAt", e.target.value)}/>
          <label className="flex items-center gap-2 p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-400">
            <input type="checkbox" checked={form.recorrente} onChange={e => set("recorrente", e.target.checked)} className="w-4 h-4"/>
            <div>
              <p className="text-sm font-semibold">Cobrança Recorrente</p>
              <p className="text-xs text-slate-400">Repete mensalmente</p>
            </div>
          </label>
          {form.recorrente && (
            <Input label="Dia do Vencimento" type="number" value={form.diaVencimento} onChange={e => set("diaVencimento", e.target.value)} placeholder="5"/>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setNovoModal(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={loading || !form.descricao || !form.valor}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar ── */}
      <Modal open={editModal !== null} onClose={() => setEditModal(null)} title="Editar Lançamento">
        {editModal && (
          <div className="space-y-3">
            <Input label="Descrição" value={editModal.descricao || ""} onChange={e => setEditModal((p:any) => ({...p, descricao: e.target.value}))}/>
            <Input label="Valor (R$)" type="number" value={editModal.valor || ""} onChange={e => setEditModal((p:any) => ({...p, valor: e.target.value}))}/>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Resultado Fechamento ── */}
      <Modal open={fechamentoModal} onClose={() => setFechamentoModal(false)} title="📅 Resultado do Fechamento">
        {fechamentoResult && (
          <div className="space-y-3">
            {fechamentoResult.ok ? (
              <>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                  ✅ {fechamentoResult.message}
                </div>
                <p className="text-xs text-slate-500">
                  Vencimento: <strong>{fechamentoResult.vencimento}</strong> — Referência: <strong>{fechamentoResult.mesRef}</strong>
                </p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(fechamentoResult.results || []).map((r: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-2.5 rounded-lg text-sm ${r.skipped ? "bg-slate-50 text-slate-400" : "bg-emerald-50 text-emerald-800"}`}>
                      <span className="font-medium">{r.franchise}</span>
                      <span className="font-bold">{r.skipped ? r.reason : fmt(r.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                ⚠️ {fechamentoResult.error}
              </div>
            )}
            <Button onClick={() => setFechamentoModal(false)} variant="secondary" className="w-full">Fechar</Button>
          </div>
        )}
      </Modal>

      {/* ── Modal Cobrar ── */}
      <Modal open={cobrModal !== null} onClose={() => setCobrModal(null)} title="📧 Enviar Cobrança">
        {cobrModal && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Enviando cobrança: <strong>{cobrModal.descricao}</strong> — {fmt(cobrModal.valor)}
            </p>
            <Input label="E-mail de destino"
              value={cobrModal.emailDestino || ""}
              onChange={e => setCobrModal((p:any) => ({...p, emailDestino: e.target.value}))}
              placeholder="financeiro@empresa.com"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Mensagem personalizada (opcional)</label>
              <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
                value={cobrModal.mensagemPersonalizada || ""}
                onChange={e => setCobrModal((p:any) => ({...p, mensagemPersonalizada: e.target.value}))}
                placeholder="Mensagem adicional para o e-mail..."/>
            </div>
            {(config?.chavePix || config?.linkPagamento) && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 space-y-1">
                <p className="font-bold">✓ Dados de pagamento configurados:</p>
                {config.chavePix && <p>PIX: {config.chavePix}</p>}
                {config.linkPagamento && <p>Boleto: {config.linkPagamento}</p>}
              </div>
            )}
            {!config?.chavePix && !config?.linkPagamento && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                ⚠️ Nenhum dado de pagamento configurado.{" "}
                <button onClick={() => { setCobrModal(null); setConfigModal(true); }} className="underline font-semibold">Configurar agora</button>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setCobrModal(null)}>Cancelar</Button>
              <Button onClick={enviarCobranca} disabled={loading || !cobrModal.emailDestino}>
                {loading ? "Enviando..." : "📧 Enviar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
