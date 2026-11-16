"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULOS } from "@/lib/treinamentos/conteudo";

const CHAVE = "smarter_treinamento_v1";

export function TreinamentosClient({ diasRestantes }: { diasRestantes: number | null }) {
  const [feitas, setFeitas] = useState<Record<string, boolean>>({});
  const [aberto, setAberto] = useState<string | null>(MODULOS[0].id);

  useEffect(() => {
    try { setFeitas(JSON.parse(localStorage.getItem(CHAVE) || "{}")); } catch {}
  }, []);

  function marcar(id: string) {
    const novo = { ...feitas, [id]: !feitas[id] };
    setFeitas(novo);
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch {}
  }

  const todas = MODULOS.flatMap(m => m.aulas);
  const feitasN = todas.filter(a => feitas[a.id]).length;
  const pct = Math.round((feitasN / todas.length) * 100);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Treinamentos</h2>
        <p className="text-sm text-slate-500 mt-1">
          Como operar a sua unidade com a Lia e o Victor, do primeiro acesso aos primeiros resultados.
          {diasRestantes !== null && ` Disponível por mais ${diasRestantes} dias.`}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between text-xs font-bold text-slate-600"><span>Seu progresso</span><span>{feitasN} de {todas.length} aulas</span></div>
        <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#0f2a5e]" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-[11px] text-slate-400">O progresso fica salvo neste navegador.</p>
      </div>

      {MODULOS.map(m => (
        <section key={m.id} className="rounded-xl bg-white shadow-sm border border-slate-100">
          <button onClick={() => setAberto(aberto === m.id ? null : m.id)} className="w-full text-left p-4 flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold text-[#0f2a5e]">{m.titulo}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{m.resumo}</span>
            </span>
            <span className="text-slate-400 text-lg">{aberto === m.id ? "−" : "+"}</span>
          </button>
          {aberto === m.id && (
            <div className="px-4 pb-4 space-y-4">
              {m.aulas.map(a => (
                <div key={a.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800">{a.titulo}</p>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={!!feitas[a.id]} onChange={() => marcar(a.id)} /> Concluída
                    </label>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a.texto}</p>
                  {a.passos && <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm text-slate-700">{a.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>}
                  {a.dica && <p className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800"><b>Dica:</b> {a.dica}</p>}
                  {a.link && <Link href={a.link.href} className="mt-3 inline-block rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white">{a.link.rotulo}</Link>}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        🎓 <b>Universidade Smarter</b> — em breve, nesta mesma aba, em caráter permanente.
      </div>
    </div>
  );
}
