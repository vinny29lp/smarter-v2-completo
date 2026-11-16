"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const CRITERIOS = [
  { key: "pontualidade", label: "Pontualidade e assiduidade" },
  { key: "produtividade", label: "Produtividade e qualidade" },
  { key: "iniciativa", label: "Iniciativa e proatividade" },
  { key: "comunicacao", label: "Comunicação e relacionamento" },
  { key: "aprendizado", label: "Aprendizado e desenvolvimento" },
  { key: "postura", label: "Postura profissional" },
];

function Conteudo() {
  const sp = useSearchParams();
  const c = sp.get("c") || "";
  const t = sp.get("t") || "";
  const [info, setInfo] = useState<any>(null);
  const [estado, setEstado] = useState<"carregando" | "form" | "invalido" | "enviando" | "ok">("carregando");
  const [erro, setErro] = useState("");
  const [notas, setNotas] = useState<Record<string, number>>(Object.fromEntries(CRITERIOS.map(k => [k.key, 3])));
  const [pontosFortes, setFortes] = useState("");
  const [pontosMelhoria, setMelhoria] = useState("");
  const [parecerFinal, setParecer] = useState("");
  const [recomendacao, setRec] = useState("Manter");
  const [observacoes, setObs] = useState("");

  useEffect(() => {
    fetch(`/api/public/avaliacao?c=${encodeURIComponent(c)}&t=${encodeURIComponent(t)}`)
      .then(async r => { if (!r.ok) { setEstado("invalido"); return; } const d = await r.json(); setInfo(d); setEstado(d.jaRespondida ? "ok" : "form"); })
      .catch(() => setEstado("invalido"));
  }, [c, t]);

  async function enviar() {
    setEstado("enviando"); setErro("");
    try {
      const r = await fetch("/api/public/avaliacao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c, t, notas, pontosFortes, pontosMelhoria, parecerFinal, recomendacao, observacoes }),
      });
      if (r.ok || r.status === 409) { setEstado("ok"); return; }
      const d = await r.json().catch(() => ({}));
      setErro(d.error || "Não foi possível enviar. Tente novamente."); setEstado("form");
    } catch { setErro("Erro de conexão. Verifique a internet e tente novamente."); setEstado("form"); }
  }

  const pronto = pontosFortes.trim() && pontosMelhoria.trim() && parecerFinal.trim();
  const area = "w-full border-2 border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:border-[#0f2a5e]";

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 flex justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow self-start my-4">
        <h1 className="text-xl font-bold text-[#0f2a5e]">Avaliação semestral do estagiário</h1>
        {estado === "carregando" && <p className="mt-4 text-sm text-slate-500">Carregando...</p>}
        {estado === "invalido" && <p className="mt-4 text-sm text-slate-700">Este link não é válido ou o estágio não está mais ativo. Se precisar, responda o e-mail que recebeu e a sua unidade ajuda.</p>}
        {estado === "ok" && <p className="mt-4 text-sm text-slate-700">Avaliação enviada. Obrigado! Ela já fica registrada no sistema da Smarter Estágios.</p>}
        {(estado === "form" || estado === "enviando") && info && (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600"><b>{info.aluno}</b>{info.curso ? ` · ${info.curso}` : ""}<br />{info.empresa} · {new Date(info.inicio).toLocaleDateString("pt-BR", { timeZone: "UTC" })} a {new Date(info.fim).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
            <p className="text-xs text-slate-400">Notas de 1 (ruim) a 5 (excelente). Leva menos de 3 minutos.</p>
            {CRITERIOS.map(k => (
              <div key={k.key}>
                <div className="flex justify-between mb-1"><label className="text-sm font-semibold text-slate-700">{k.label}</label><span className="text-sm font-bold text-[#0f2a5e]">{notas[k.key]}/5</span></div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setNotas(p => ({ ...p, [k.key]: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 ${notas[k.key] >= n ? "bg-[#0f2a5e] border-[#0f2a5e] text-white" : "border-slate-200 text-slate-400"}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
            <div><label className="text-xs font-bold text-slate-600 block mb-1">Pontos fortes *</label><textarea className={`${area} h-16`} value={pontosFortes} onChange={e => setFortes(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-slate-600 block mb-1">Pontos de melhoria *</label><textarea className={`${area} h-16`} value={pontosMelhoria} onChange={e => setMelhoria(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-slate-600 block mb-1">Parecer final do supervisor *</label><textarea className={`${area} h-20`} value={parecerFinal} onChange={e => setParecer(e.target.value)} /></div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Recomendação</label>
              <div className="flex gap-2">
                {["Manter", "Renovar", "Encerrar"].map(op => (
                  <button key={op} type="button" onClick={() => setRec(op)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 ${recomendacao === op ? (op === "Encerrar" ? "bg-red-600 border-red-600 text-white" : "bg-[#0f2a5e] border-[#0f2a5e] text-white") : "border-slate-200 text-slate-500"}`}>{op}</button>
                ))}
              </div>
            </div>
            <div><label className="text-xs font-bold text-slate-600 block mb-1">Observações (opcional)</label><textarea className={`${area} h-16`} value={observacoes} onChange={e => setObs(e.target.value)} /></div>
            {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
            {!pronto && <p className="text-xs text-amber-600">Preencha os três campos com * para enviar.</p>}
            <button type="button" onClick={enviar} disabled={!pronto || estado === "enviando"}
              className="w-full rounded-xl bg-[#0f2a5e] py-3 text-sm font-bold text-white disabled:opacity-50">{estado === "enviando" ? "Enviando..." : "Enviar avaliação"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvaliarPage() {
  return <Suspense fallback={null}><Conteudo /></Suspense>;
}
