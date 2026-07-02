"use client";
import { useEffect, useState } from "react";
import { Lightbulb, ArrowRight, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const PRIORIDADE_COR: Record<string, string> = {
  ALTA:  "border-red-200 bg-red-50",
  MEDIA: "border-yellow-200 bg-yellow-50",
  BAIXA: "border-blue-200 bg-blue-50",
};

const PRIORIDADE_BADGE: Record<string, string> = {
  ALTA:  "bg-red-100 text-red-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAIXA: "bg-blue-100 text-blue-700",
};

const TIPO_EMOJI: Record<string, string> = {
  DATA_COMEMORATIVA: "📅",
  DIVULGACAO_VAGA:   "🎯",
  POS_CONTRATO:      "🤝",
  REENGAJAMENTO:     "💼",
  CALENDARIO:        "📸",
  ENGAJAMENTO:       "🚀",
};

export default function SugestoesPage() {
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const res = await fetch("/api/app/marketing/sugestoes");
    const data = await res.json();
    setSugestoes(data.sugestoes || []);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Lightbulb className="text-[#F4B400]" size={20} /> Sugestões Inteligentes
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Recomendações geradas com base nos seus dados em tempo real
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* Como funciona */}
      <div className="bg-gradient-to-r from-[#0D2B5C]/5 to-[#F4B400]/10 rounded-2xl p-4 border border-[#0D2B5C]/10">
        <div className="flex items-start gap-3">
          <Zap size={18} className="text-[#F4B400] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-800 text-sm">Como funciona o motor de sugestões?</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              O sistema analisa automaticamente seus dados: <strong>vagas sem candidatos</strong>, <strong>novos contratos</strong>,
              <strong>leads parados no CRM</strong> e <strong>datas comemorativas próximas</strong> — e recomenda o melhor conteúdo
              para postar no momento certo.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
          <p>Analisando seus dados...</p>
        </div>
      ) : sugestoes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma sugestão no momento</p>
          <p className="text-sm mt-1">Continue usando o sistema e as sugestões aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sugestoes.map((s, i) => (
            <div key={s.id} className={clsx("border rounded-2xl p-4 transition-all hover:shadow-sm", PRIORIDADE_COR[s.prioridade] || "border-slate-200 bg-slate-50")}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: (s.cor || "#0D2B5C") + "20" }}>
                  {TIPO_EMOJI[s.tipo] || "💡"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{s.titulo}</h3>
                    <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full uppercase", PRIORIDADE_BADGE[s.prioridade] || "bg-slate-100 text-slate-600")}>
                      {s.prioridade}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{s.descricao}</p>

                  {s.link && (
                    <Link href={s.link}
                      className="inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-[#0D2B5C] hover:underline">
                      {s.acao} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer com dica */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
        <p className="text-xs text-slate-500">
          💡 As sugestões são atualizadas automaticamente com base nos dados da sua unidade.
          Quanto mais você usa o sistema, mais precisas ficam as recomendações.
        </p>
      </div>
    </div>
  );
}
