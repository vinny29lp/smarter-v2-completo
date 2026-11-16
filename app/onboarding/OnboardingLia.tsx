"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface Passo { id: string; titulo: string; lia: string; obrigatorio: boolean; tipo: "automatico" | "manual"; feito: boolean; detalhe?: string; acao?: { rotulo: string; href: string } }
interface Estado {
  unidade: { nome: string; responsavel: string; endereco?: string; cep?: string; cidade?: string; uf?: string; whatsapp?: string; telefone?: string };
  regioes: { cidade: string; uf?: string; bairro?: string }[]; obrigatorio: boolean; concluidoEm: string | null;
  mesAberto: boolean; passos: Passo[]; concluido: boolean; feitos: number; total: number; podeEditar: boolean;
}

export function OnboardingLia({ podeEditar }: { podeEditar: boolean }) {
  const [e, setE] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [dados, setDados] = useState({ endereco: "", cep: "", cidade: "", uf: "", whatsapp: "", telefone: "" });

  const carregar = useCallback(async () => {
    const r = await fetch("/api/app/onboarding", { cache: "no-store" });
    if (!r.ok) { setErro("Não foi possível carregar o assistente. Atualize a página."); return; }
    const j: Estado = await r.json();
    setE(j);
    setDados(d => ({ endereco: d.endereco || j.unidade.endereco || "", cep: d.cep || j.unidade.cep || "", cidade: d.cidade || j.unidade.cidade || "", uf: d.uf || j.unidade.uf || "", whatsapp: d.whatsapp || j.unidade.whatsapp || "", telefone: d.telefone || j.unidade.telefone || "" }));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function enviar(corpo: object) {
    setBusy(true); setErro("");
    const r = await fetch("/api/app/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErro(j.error || "Não foi possível salvar.");
    await carregar();
    setBusy(false);
    return r.ok;
  }

  async function liberar() {
    if (await enviar({ concluir: true })) window.location.href = e?.mesAberto ? "/dashboard/hoje" : "/dashboard/mes/abrir";
  }

  if (!e) return <div className="min-h-screen grid place-items-center bg-[#f0f4f8] text-sm text-slate-500">{erro || "A Lia está preparando o seu assistente…"}</div>;

  const pct = Math.round((e.feitos / e.total) * 100);
  const atual = e.passos.find(p => !p.feito && p.obrigatorio) || null;
  const input = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]";

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="bg-[#0f2a5e] text-white">
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#f5c400] tracking-wide">LIA · SUA ASSISTENTE</p>
              <h1 className="text-2xl font-bold mt-1">Bem-vindo, {e.unidade.responsavel.split(" ")[0]}! Vamos deixar a {e.unidade.nome} pronta.</h1>
              <p className="text-sm text-blue-100 mt-2">Eu vou te guiar passo a passo. Quando tudo estiver verde, o sistema inteiro é liberado e os funcionários digitais — eu (Lia, administrativo e RH) e o Victor (Sales, comercial) — começam a trabalhar com você.</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-blue-200 hover:text-white whitespace-nowrap">Sair</button>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-[#f5c400] transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-blue-100 mt-1.5">{e.feitos} de {e.total} passos · {pct}%</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">
        {!podeEditar && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Somente o franqueado responsável conclui este assistente. Peça para ele acessar o sistema.</div>}
        {erro && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{erro}</div>}

        {e.passos.map((p, i) => {
          const emFoco = atual?.id === p.id;
          return (
            <div key={p.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${p.feito ? "border-green-200" : emFoco ? "border-[#0f2a5e] ring-2 ring-[#0f2a5e]/10" : "border-slate-200 opacity-80"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${p.feito ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"}`}>{p.feito ? "✓" : i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{p.titulo} {!p.obrigatorio && <span className="ml-1 text-[10px] font-semibold text-slate-400">(opcional)</span>}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed"><span className="font-semibold text-[#0f2a5e]">Lia:</span> {p.lia}</p>
                  {!p.feito && p.detalhe && <p className="text-xs text-amber-700 mt-1.5">{p.detalhe}</p>}

                  {!p.feito && podeEditar && p.id === "dados_unidade" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <input className={`${input} col-span-2`} placeholder="Endereço (rua, número, bairro)" value={dados.endereco} onChange={ev => setDados({ ...dados, endereco: ev.target.value })} />
                      <input className={input} placeholder="CEP" value={dados.cep} onChange={ev => setDados({ ...dados, cep: ev.target.value })} />
                      <input className={input} placeholder="WhatsApp da unidade" value={dados.whatsapp} onChange={ev => setDados({ ...dados, whatsapp: ev.target.value })} />
                      <input className={input} placeholder="Cidade" value={dados.cidade} onChange={ev => setDados({ ...dados, cidade: ev.target.value })} />
                      <input className={input} placeholder="UF" maxLength={2} value={dados.uf} onChange={ev => setDados({ ...dados, uf: ev.target.value })} />
                      <button disabled={busy} onClick={() => enviar({ dados })} className="col-span-2 rounded-xl bg-[#0f2a5e] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Salvar dados da unidade</button>
                    </div>
                  )}

                  {p.id === "regiao" && e.regioes.length > 0 && (
                    <p className="mt-2 text-sm text-slate-700"><b>Sua região:</b> {e.regioes.map(r => (r.bairro ? r.bairro + ", " : "") + r.cidade).join(" · ")}</p>
                  )}

                  {!p.feito && podeEditar && p.tipo === "manual" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.acao && e.concluidoEm && <a href={p.acao.href} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#0f2a5e]">{p.acao.rotulo} ↗</a>}
                      <button disabled={busy} onClick={() => enviar({ passo: p.id })} className="rounded-xl bg-[#0f2a5e] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Entendi, próximo passo</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className={`rounded-2xl p-6 text-center ${e.concluido ? "bg-green-50 border border-green-200" : "bg-white border border-slate-200"}`}>
          {e.concluido ? (
            <>
              <p className="text-lg font-bold text-green-700">Tudo pronto! 🎉</p>
              <p className="text-sm text-slate-600 mt-1">Ao liberar, eu te levo para abrir o mês (2 minutos) e depois o Victor começa a buscar empresas na sua região assim que a Smarter confirmar a conexão da sua unidade.</p>
              {podeEditar && <button disabled={busy} onClick={liberar} className="mt-4 rounded-xl bg-[#f5c400] px-6 py-3 text-sm font-black text-[#0f2a5e] disabled:opacity-50">Liberar meu sistema</button>}
            </>
          ) : (
            <p className="text-sm text-slate-500">Conclua os passos obrigatórios acima para liberar o sistema.</p>
          )}
        </div>
      </div>
    </div>
  );
}
