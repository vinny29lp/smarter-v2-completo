"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Download, CheckCircle2, Clock } from "lucide-react";
import { filtrarLancamentosParaReconciliacao } from "@/lib/mes/reconciliacao";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const NIVEL_STYLE: Record<string, { border: string; bg: string; badge: "red" | "yellow" | "green" }> = {
  critico: { border: "border-red-400", bg: "bg-red-50/40", badge: "red" },
  atencao: { border: "border-amber-400", bg: "bg-amber-50/40", badge: "yellow" },
  bom: { border: "border-emerald-400", bg: "bg-emerald-50/40", badge: "green" },
};

type Lancamento = { id: string; descricao: string; valor: number; tipo: string; status: string; vencimentoAt: string | null };

export default function FecharMesPage() {
  const router = useRouter();
  // ?mes=&ano= direcionam o fechamento para um mês PASSADO pendente (ex.: a unidade
  // abriu julho e nunca fechou; agosto já começou). Sem query string, fecha o mês corrente
  // — mesmo comportamento de sempre.
  const searchParams = useSearchParams();
  const mesParam = searchParams.get("mes");
  const anoParam = searchParams.get("ano");
  const alvoQs = mesParam && anoParam ? `?mes=${mesParam}&ano=${anoParam}` : "";
  const fechandoMesPassado = !!alvoQs;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mesAtual, setMesAtual] = useState<{ mes: number; ano: number } | null>(null);

  // Passo 1
  const [metricas, setMetricas] = useState<any>(null);
  const [score, setScore] = useState<number>(0);

  // Passo 2
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [decisoes, setDecisoes] = useState<Record<string, "pago" | "atrasado">>({});
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false);

  // Passo 3
  const [relatorio, setRelatorio] = useState<any>(null);
  const [podeConfirmar, setPodeConfirmar] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [jaConfirmado, setJaConfirmado] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        if (fechandoMesPassado) {
          // Alvo explícito (mês pendente) — não depende do status do mês corrente,
          // que já mudou. Se não houver abertura para esse mês, não há o que fechar.
          setMesAtual({ mes: parseInt(mesParam!), ano: parseInt(anoParam!) });
          const res = await fetch(`/api/app/mes/fechar${alvoQs}`);
          const data = await res.json();
          if (!res.ok) { setErro(data.error || "Erro ao carregar o mês informado."); return; }
          if (data.fechamento) {
            setJaConfirmado(!!data.fechamento.leituraConfirmada);
            await carregarRelatorio();
            setStep(3);
          } else {
            setMetricas(data.metricas);
            setScore(data.score);
          }
          return;
        }

        const statusRes = await fetch("/api/app/mes/status");
        const statusData = await statusRes.json();
        if (!statusRes.ok) { setErro(statusData.error || "Erro ao carregar status do mês."); return; }
        setMesAtual(statusData.mesAtual);

        if (!statusData.abertura) {
          router.replace("/dashboard/mes/abrir");
          return;
        }

        if (statusData.fechamento) {
          // Já passou da etapa financeira — vai direto pro relatório (passo 3)
          setJaConfirmado(!!statusData.fechamento.leituraConfirmada);
          await carregarRelatorio();
          setStep(3);
        } else {
          await carregarPreview();
        }
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoQs]);

  const carregarPreview = async () => {
    const res = await fetch(`/api/app/mes/fechar${alvoQs}`);
    const data = await res.json();
    if (res.ok) { setMetricas(data.metricas); setScore(data.score); }
    else setErro(data.error || "Erro ao calcular prévia do mês.");
  };

  const carregarRelatorio = async () => {
    const res = await fetch(`/api/app/mes/relatorio${alvoQs}`);
    const data = await res.json();
    if (res.ok) setRelatorio(data);
    else setErro(data.error || "Erro ao carregar relatório.");
  };

  const irParaFinanceiro = async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/app/financeiro?limit=200");
      const data = await res.json();
      // Só entram lançamentos com vencimento no mês sendo fechado ou antes dele
      // (atrasados ainda não resolvidos). Lançamentos de meses seguintes — ex.:
      // a cobrança do mês novo, já gerada — não têm relação com este fechamento.
      const itens: Lancamento[] = mesAtual
        ? filtrarLancamentosParaReconciliacao(data.lancamentos || [], mesAtual.mes, mesAtual.ano)
        : [];
      setLancamentos(itens);
      setDecisoes(Object.fromEntries(itens.map(l => [l.id, "atrasado" as const])));
      setStep(2);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarFinanceiro = async () => {
    setSalvandoFinanceiro(true);
    setErro("");
    try {
      const pagos = Object.entries(decisoes).filter(([, v]) => v === "pago").map(([id]) => id);
      const atrasados = Object.entries(decisoes).filter(([, v]) => v === "atrasado").map(([id]) => id);
      const res = await fetch("/api/app/mes/fechar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: "financeiro", pagos, atrasados, mes: mesAtual?.mes, ano: mesAtual?.ano }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao confirmar reconciliação financeira."); return; }
      await carregarRelatorio();
      setStep(3);
    } finally {
      setSalvandoFinanceiro(false);
    }
  };

  useEffect(() => {
    if (step !== 3 || jaConfirmado) return;
    const el = fimRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPodeConfirmar(true);
    }, { threshold: 0.9 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, jaConfirmado, relatorio]);

  const confirmarLeitura = async () => {
    setConfirmando(true);
    try {
      const res = await fetch("/api/app/mes/fechar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: "confirmar-leitura", mes: mesAtual?.mes, ano: mesAtual?.ano }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao confirmar leitura."); return; }
      setJaConfirmado(true);
    } finally {
      setConfirmando(false);
    }
  };

  const baixarPdf = () => {
    if (!mesAtual) return;
    window.open(`/api/app/mes/relatorio/pdf?mes=${mesAtual.mes}&ano=${mesAtual.ano}`, "_blank");
  };

  if (carregando) return <p className="text-slate-400 text-sm">Carregando...</p>;
  if (erro && !relatorio && !metricas) return <p className="text-red-500 text-sm">{erro}</p>;

  const nomeMes = mesAtual ? NOMES_MES[mesAtual.mes - 1] : "";

  return (
    <div className="max-w-3xl">
      {fechandoMesPassado && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
          Este mês ficou pendente e está bloqueando a abertura do mês atual. Feche-o para liberar o sistema.
        </div>
      )}
      <h1 className="text-2xl font-black text-slate-800 mb-1">Fechamento do Mês — {nomeMes} {mesAtual?.ano}</h1>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <span className={step === 1 ? "text-[#0f2a5e]" : ""}>1. Resumo</span>
        <span>→</span>
        <span className={step === 2 ? "text-[#0f2a5e]" : ""}>2. Financeiro</span>
        <span>→</span>
        <span className={step === 3 ? "text-[#0f2a5e]" : ""}>3. Relatório</span>
      </div>

      {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}

      {/* Passo 1 — Resumo Rápido */}
      {step === 1 && metricas && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              ["Empresas", metricas.empresasCadastradas],
              ["Leads", metricas.leadsNoMes],
              ["Contratos", metricas.contratosFirmados],
              ["Horas", metricas.horasNoSistema.toFixed(1)],
              ["Score", score],
            ].map(([label, valor]) => (
              <Card key={String(label)} className="p-5 text-center">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-2xl font-black text-[#0f2a5e] mt-1">{valor as any}</p>
              </Card>
            ))}
          </div>
          <Button onClick={irParaFinanceiro}>Avançar para Reconciliação Financeira →</Button>
        </div>
      )}

      {/* Passo 2 — Reconciliação Financeira */}
      {step === 2 && (
        <div>
          {lancamentos.length === 0 && (
            <Card className="p-6 mb-4 text-sm text-slate-500">Nenhum lançamento pendente ou em atraso este mês. 🎉</Card>
          )}
          <div className="space-y-3 mb-6">
            {lancamentos.map(l => (
              <Card key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{l.descricao}</p>
                  <p className="text-xs text-slate-400">
                    R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {l.vencimentoAt && ` · venc. ${new Date(l.vencimentoAt).toLocaleDateString("pt-BR")}`}
                    {" · "}<Badge variant={l.status === "VENCIDO" ? "red" : "yellow"}>{l.status}</Badge>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setDecisoes(d => ({ ...d, [l.id]: "pago" }))}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${decisoes[l.id] === "pago" ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-400"}`}
                  >
                    ✓ Recebido/Pago
                  </button>
                  <button
                    onClick={() => setDecisoes(d => ({ ...d, [l.id]: "atrasado" }))}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${decisoes[l.id] === "atrasado" ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-400"}`}
                  >
                    → Manter em Atraso
                  </button>
                </div>
              </Card>
            ))}
          </div>
          <Button onClick={confirmarFinanceiro} disabled={salvandoFinanceiro}>
            {salvandoFinanceiro ? "Salvando..." : "Confirmar e Ver Relatório →"}
          </Button>
        </div>
      )}

      {/* Passo 3 — Relatório Completo */}
      {step === 3 && relatorio && (
        <div>
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <p className="font-bold text-slate-800">Números do mês</p>
              <Badge variant={relatorio.fechamento.score >= 70 ? "green" : relatorio.fechamento.score >= 40 ? "yellow" : "red"}>
                Score: {relatorio.fechamento.score}%
              </Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Indicador</th>
                  <th className="pb-2 font-semibold text-center">Real</th>
                  <th className="pb-2 font-semibold text-center">Meta</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Empresas cadastradas", relatorio.fechamento.empresasCadastradas, relatorio.abertura.metaEmpresas],
                  ["Leads no CRM", relatorio.fechamento.leadsNoMes, relatorio.abertura.metaLeads],
                  ["Contratos firmados", relatorio.fechamento.contratosFirmados, relatorio.abertura.metaContratos],
                  ["Estudantes cadastrados", relatorio.fechamento.estudantesCadastrados, relatorio.abertura.metaEstudantes],
                  ["IES cadastradas", relatorio.fechamento.iesCadastradas, null],
                  ["Estagiários ativos", relatorio.fechamento.estagiariosAtivos, null],
                  ["Horas no sistema", relatorio.fechamento.horasNoSistema.toFixed(1), null],
                ].map(([label, real, meta]) => (
                  <tr key={String(label)} className="border-b border-slate-50">
                    <td className="py-2">{label as any}</td>
                    <td className="py-2 text-center font-bold text-[#0f2a5e]">{real as any}</td>
                    <td className="py-2 text-center text-slate-300">{(meta as any) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mensagens de Coaching</p>
          <div className="space-y-3 mb-6">
            {relatorio.mensagens.map((m: any, i: number) => {
              const s = NIVEL_STYLE[m.nivel];
              return (
                <Card key={i} className={`p-4 border-l-4 ${s.border} ${s.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800 text-sm">{m.indicador}</p>
                    <Badge variant={s.badge}>{m.nivel === "critico" ? "Crítico" : m.nivel === "atencao" ? "Atenção" : "Bom"}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{m.mensagem}</p>
                  <p className="text-sm text-[#0f2a5e] font-semibold">→ {m.acao}</p>
                </Card>
              );
            })}
          </div>

          <div ref={fimRef} />

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={baixarPdf} className="inline-flex items-center gap-2 text-sm border border-slate-200 hover:border-blue-400 px-4 py-2.5 rounded-xl font-semibold transition-colors">
              <Download size={16} /> Baixar Relatório em PDF
            </button>

            {jaConfirmado ? (
              <>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 size={16} /> Leitura confirmada — mês fechado
                </span>
                {fechandoMesPassado && (
                  <Link
                    href="/dashboard/mes/abrir"
                    className="inline-flex items-center gap-2 bg-[#0f2a5e] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#1a3d8f]"
                  >
                    Abrir o mês atual agora →
                  </Link>
                )}
              </>
            ) : podeConfirmar ? (
              <Button onClick={confirmarLeitura} disabled={confirmando} variant="yellow">
                {confirmando ? "Confirmando..." : "Confirmar Leitura e Fechar Mês"}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} /> Role até o fim do relatório para liberar a confirmação
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
