"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { MODULOS } from "@/lib/treinamentos/conteudo";

type Pergunta = { id: string; enunciado: string; opcoes: string[] };

export function TreinamentoInicial({ podeResponder }: { podeResponder: boolean }) {
  const router = useRouter();
  const [fase, setFase] = useState<"estudo" | "quiz" | "resultado">("estudo");
  const [lidos, setLidos] = useState<Record<string, boolean>>({});
  const [aberto, setAberto] = useState<string | null>(MODULOS[0].id);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [escolhas, setEscolhas] = useState<Record<string, number>>({});
  const [min, setMin] = useState(8);
  const [res, setRes] = useState<{ acertos: number; total: number; aprovado: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const todosLidos = MODULOS.every(m => lidos[m.id]);

  async function iniciarQuiz() {
    setErro("");
    const r = await fetch("/api/app/quiz");
    if (!r.ok) { setErro("Não foi possível carregar o quiz."); return; }
    const d = await r.json();
    setPerguntas(d.perguntas || []); setMin(d.minAcertos || 8); setEscolhas({}); setRes(null); setFase("quiz");
    window.scrollTo({ top: 0 });
  }

  async function enviar() {
    setEnviando(true); setErro("");
    try {
      const r = await fetch("/api/app/quiz", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: perguntas.map(p => ({ id: p.id, escolha: escolhas[p.id] })) }) });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || "Erro ao enviar."); return; }
      setRes(d); setFase("resultado");
      if (d.aprovado) setTimeout(() => router.push("/onboarding"), 2500);
    } finally { setEnviando(false); }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-2xl bg-[#0f2a5e] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5c400]">Universidade Smarter</p>
          <h1 className="mt-1 text-2xl font-black">Treinamento inicial da sua unidade</h1>
          <p className="mt-2 text-sm text-white/80">Leia os módulos e responda ao quiz de 10 perguntas. Com {min} ou mais acertos o seu sistema é liberado.</p>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 text-xs underline text-white/70">Sair</button>
        </div>

        {!podeResponder && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Somente o franqueado responsável pode concluir o treinamento. Você pode ler o conteúdo, mas o sistema será liberado depois da aprovação dele.</div>}

        {fase === "estudo" && (<>
          {MODULOS.map(m => (
            <section key={m.id} className="rounded-xl bg-white shadow-sm border border-slate-100">
              <button onClick={() => setAberto(aberto === m.id ? null : m.id)} className="w-full text-left p-4 flex items-center justify-between gap-3">
                <span><span className="block text-sm font-bold text-[#0f2a5e]">{lidos[m.id] ? "✅ " : ""}{m.titulo}</span><span className="block text-xs text-slate-500 mt-0.5">{m.resumo}</span></span>
                <span className="text-slate-400 text-lg">{aberto === m.id ? "−" : "+"}</span>
              </button>
              {aberto === m.id && (
                <div className="px-4 pb-4 space-y-3">
                  {m.aulas.map(a => (
                    <div key={a.id} className="rounded-lg border border-slate-100 p-4">
                      <p className="text-sm font-bold text-slate-800">{a.titulo}</p>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a.texto}</p>
                      {a.passos && <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm text-slate-700">{a.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>}
                      {a.dica && <p className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800"><b>Dica:</b> {a.dica}</p>}
                    </div>
                  ))}
                  <button onClick={() => setLidos({ ...lidos, [m.id]: true })} className="rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white">Li este módulo</button>
                </div>
              )}
            </section>
          ))}
          {podeResponder && (
            <button disabled={!todosLidos} onClick={iniciarQuiz} className="w-full rounded-xl bg-[#f5c400] py-3 font-black text-[#0f2a5e] disabled:opacity-40">
              {todosLidos ? "Fazer o quiz" : `Marque todos os módulos como lidos (${MODULOS.filter(m => lidos[m.id]).length}/${MODULOS.length})`}
            </button>
          )}
        </>)}

        {fase === "quiz" && (<>
          {perguntas.map((p, i) => (
            <div key={p.id} className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
              <p className="text-sm font-bold text-slate-800">{i + 1}. {p.enunciado}</p>
              <div className="mt-3 space-y-2">
                {p.opcoes.map((o, k) => (
                  <label key={k} className={`flex gap-2 rounded-lg border p-2.5 text-sm cursor-pointer ${escolhas[p.id] === k ? "border-[#0f2a5e] bg-blue-50" : "border-slate-200"}`}>
                    <input type="radio" name={p.id} checked={escolhas[p.id] === k} onChange={() => setEscolhas({ ...escolhas, [p.id]: k })} /> {o}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button disabled={enviando || perguntas.some(p => escolhas[p.id] === undefined)} onClick={enviar} className="w-full rounded-xl bg-[#0f2a5e] py-3 font-black text-white disabled:opacity-40">
            {enviando ? "Corrigindo..." : "Enviar respostas"}
          </button>
        </>)}

        {fase === "resultado" && res && (
          <div className={`rounded-2xl p-6 text-center border ${res.aprovado ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-4xl">{res.aprovado ? "🎓" : "📚"}</p>
            <p className="mt-2 text-xl font-black text-slate-800">{res.acertos} de {res.total} acertos</p>
            {res.aprovado
              ? <p className="mt-1 text-sm text-green-800">Aprovado! Estamos levando você ao assistente de primeiro acesso...</p>
              : <><p className="mt-1 text-sm text-red-800">É preciso acertar pelo menos {min}. Revise os módulos e tente de novo com novas perguntas.</p>
                <button onClick={() => { setFase("estudo"); window.scrollTo({ top: 0 }); }} className="mt-4 rounded-lg bg-[#0f2a5e] px-4 py-2 text-sm font-bold text-white">Revisar o conteúdo</button></>}
          </div>
        )}
        {erro && fase === "estudo" && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
