"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { montarTarefas, type TarefaLia } from "@/lib/lia/tarefas";

const ROTULO_RITMO: Record<string, { txt: string; cor: string }> = {
  batida: { txt: "Meta batida 🎉", cor: "text-green-700 bg-green-50" },
  no_ritmo: { txt: "No ritmo", cor: "text-blue-700 bg-blue-50" },
  atrasada: { txt: "Atrasada", cor: "text-red-700 bg-red-50" },
};

function Meta({ d, podeEditar, onSalvar }: { d: any; podeEditar: boolean; onSalvar: (n: number) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState<number>(d.meta ?? d.sugerida);
  const p = d.progresso;
  const r = ROTULO_RITMO[p.ritmo];
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-700">Meta do mês — contratos ativados</p>
        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${r.cor}`}>{r.txt}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-[#0f2a5e]">{p.realizado}<span className="text-lg text-slate-400"> / {p.meta}</span></p>
      <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#0f2a5e]" style={{ width: `${p.pct}%` }} /></div>
      <p className="mt-2 text-xs text-slate-500">
        {p.falta === 0 ? "Você já bateu a meta deste mês." : `Faltam ${p.falta} em ${p.diasRestantes} dias (~${p.porSemana} por semana).`}
        {d.meta === null && " Meta sugerida pela média dos últimos meses."}
      </p>
      {podeEditar && (editando ? (
        <div className="mt-3 flex items-center gap-2">
          <input type="number" min={1} max={500} value={valor} onChange={e => setValor(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
          <button className="rounded-lg bg-[#0f2a5e] px-3 py-1 text-xs font-bold text-white"
            onClick={async () => { await onSalvar(valor); setEditando(false); }}>Salvar</button>
          <button className="text-xs text-slate-500" onClick={() => setEditando(false)}>Cancelar</button>
        </div>
      ) : (
        <button className="mt-3 text-xs font-bold text-[#0f2a5e] underline" onClick={() => setEditando(true)}>
          {d.meta === null ? "Definir minha meta" : "Alterar meta"}
        </button>
      ))}
    </div>
  );
}

export default function HojePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [d, setD] = useState<any>(null);
  const [tarefas, setTarefas] = useState<TarefaLia[]>([]);
  const [erro, setErro] = useState("");

  const carregar = () =>
    fetch("/api/app/cockpit", { cache: "no-store" })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Erro"); return j; })
      .then(setD).catch(e => setErro(e.message));

  useEffect(() => {
    carregar();
    fetch("/api/app/alertas", { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(a => setTarefas(montarTarefas(a, { financeiro: role !== "FUNCIONARIO" }))).catch(() => {});
  }, [role]);

  async function salvarMeta(n: number) {
    const r = await fetch("/api/app/cockpit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contratos: n }) });
    if (!r.ok) { setErro((await r.json()).error || "Erro ao salvar"); return; }
    setErro(""); await carregar();
  }

  if (erro && !d) return <p className="text-sm text-red-600">{erro}</p>;
  if (!d) return <p className="text-sm text-slate-500">Carregando…</p>;

  if (d.escopo === "rede") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#0f2a5e]">Hoje na rede</h2>
          <p className="text-sm text-slate-500">Contratos ativados no mês por unidade e se cada uma está no ritmo da meta.</p>
        </div>
        {(d.semMeta > 0 || d.atrasadas > 0) && (
          <p className="text-sm rounded-lg bg-amber-50 text-amber-800 px-3 py-2">
            {d.atrasadas > 0 && `${d.atrasadas} unidade(s) atrasada(s) na meta. `}
            {d.semMeta > 0 && `${d.semMeta} unidade(s) ainda sem meta definida.`}
          </p>
        )}
        <div className="rounded-xl bg-white shadow-sm border border-slate-100 divide-y">
          {d.unidades.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">{u.nome}</span>
              <span className="flex items-center gap-3">
                <span className="font-black text-[#0f2a5e]">{u.realizado}{u.meta !== null && <span className="text-slate-400"> / {u.meta}</span>}</span>
                {u.ritmo ? <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${ROTULO_RITMO[u.ritmo].cor}`}>{ROTULO_RITMO[u.ritmo].txt}</span>
                  : <span className="text-xs text-slate-400">sem meta</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const crm = d.crm;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0f2a5e]">O que fazer hoje ☀️</h2>
        <p className="text-sm text-slate-500">Suas prioridades do dia, a meta do mês e o que a Lia já resolveu por você.</p>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <Meta d={d} podeEditar={role === "FRANQUEADO"} onSalvar={salvarMeta} />
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-sm font-bold text-slate-700">CRM de hoje</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li><b className="text-[#0f2a5e]">{crm.retornoHoje}</b> retorno(s) marcado(s) para hoje</li>
            <li><b className={crm.atrasados ? "text-red-600" : "text-[#0f2a5e]"}>{crm.atrasados}</b> retorno(s) atrasado(s)</li>
            <li><b className="text-[#0f2a5e]">{crm.novos}</b> lead(s) novo(s) sem contato</li>
          </ul>
          <Link href="/dashboard/crm" className="mt-3 inline-block text-xs font-bold text-[#0f2a5e] underline">Abrir CRM →</Link>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-slate-700 mb-3">Prioridades</p>
        {tarefas.length === 0 ? (
          <p className="text-sm text-green-700">Nada pendente. Operação em dia ✅</p>
        ) : (
          <ul className="space-y-2">
            {tarefas.map(t => (
              <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    <span className={t.prioridade === "critico" ? "text-red-600" : "text-amber-600"}>●</span> {t.titulo} <span className="text-slate-400">({t.qtd})</span>
                  </p>
                  <p className="text-xs text-slate-500">{t.detalhe}</p>
                </div>
                <Link href={t.href} className="shrink-0 rounded-lg bg-[#0f2a5e] px-3 py-1.5 text-xs font-bold text-white">{t.acao}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-slate-700 mb-2">🤖 O que a Lia fez por você</p>
        {d.lia.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda sem registros recentes.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.lia.map((n: any) => (
              <li key={n.id} className="text-xs text-slate-600">
                <span className="text-slate-400">{new Date(n.createdAt).toLocaleDateString("pt-BR")}</span> — {n.mensagem}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
