"use client";

import { useState } from "react";

type Ini = { nome: string; email: string; telefone: string; cidade: string; uf: string };

export function CadastroForm({ token, inicial }: { token: string; inicial: Ini }) {
  const [v, setV] = useState<Record<string, string>>({ ...inicial, cpf: "", dataNasc: "", nomeUnidade: "", razaoSocial: "", cnpj: "", endereco: "", cep: "", regioes: inicial.cidade });
  const [erro, setErro] = useState(""); const [ok, setOk] = useState(false); const [env, setEnv] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setEnv(true); setErro("");
    try {
      const r = await fetch(`/api/public/franquia/cadastro/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErro(d.error || "Não foi possível enviar."); else setOk(true);
    } finally { setEnv(false); }
  }

  if (ok) return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center border border-slate-200">
        <p className="text-4xl">✅</p><h1 className="mt-2 text-xl font-black text-[#0f2a5e]">Cadastro recebido!</h1>
        <p className="mt-2 text-sm text-slate-600">A Smarter vai conferir seus dados e enviar o contrato de franquia para assinatura eletrônica no seu e-mail.</p>
      </div>
    </main>
  );

  const campo = (k: string, rotulo: string, extra: { req?: boolean; ph?: string; tipo?: string } = {}) => (
    <label className="block"><span className="text-xs font-bold text-slate-600">{rotulo}{extra.req && " *"}</span>
      <input type={extra.tipo || "text"} value={v[k]} onChange={set(k)} placeholder={extra.ph} required={extra.req} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
  );

  return (
    <main className="min-h-screen bg-[#f0f4f8] p-4 md:p-8">
      <form onSubmit={enviar} className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl bg-[#0f2a5e] p-6 text-white"><h1 className="text-2xl font-black">Cadastro de fechamento</h1><p className="mt-1 text-sm text-white/80">Estes dados serão usados no contrato de franquia e na criação da sua unidade.</p></div>
        <section className="rounded-2xl bg-white p-5 border border-slate-200 space-y-3">
          <h2 className="font-black text-[#0f2a5e]">Seus dados</h2>
          {campo("nome", "Nome completo", { req: true })}
          <div className="grid gap-3 md:grid-cols-2">{campo("cpf", "CPF", { req: true })}{campo("dataNasc", "Data de nascimento", { tipo: "date" })}</div>
          <div className="grid gap-3 md:grid-cols-2">{campo("email", "E-mail (será o seu login)", { req: true, tipo: "email" })}{campo("telefone", "Telefone/WhatsApp com DDD", { req: true })}</div>
        </section>
        <section className="rounded-2xl bg-white p-5 border border-slate-200 space-y-3">
          <h2 className="font-black text-[#0f2a5e]">Sua unidade</h2>
          {campo("nomeUnidade", "Nome da unidade", { req: true, ph: "Ex.: Smarter Niterói" })}
          <div className="grid gap-3 md:grid-cols-2">{campo("razaoSocial", "Razão social (se já tiver empresa)")}{campo("cnpj", "CNPJ (se já tiver)")}</div>
          {campo("endereco", "Endereço")}
          <div className="grid gap-3 md:grid-cols-3">{campo("cep", "CEP")}{campo("cidade", "Cidade", { req: true })}{campo("uf", "UF", { req: true, ph: "RJ" })}</div>
          <label className="block"><span className="text-xs font-bold text-slate-600">Região de atuação *</span>
            <textarea value={v.regioes} onChange={set("regioes")} required rows={2} placeholder="Ex.: Icaraí, Niterói; São Francisco, Niterói; São Gonçalo" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="text-[11px] text-slate-400">Separe com “;”. Use “Bairro, Cidade” ou só a cidade. A Matriz confirma a região com você.</span></label>
        </section>
        {erro && <p className="text-sm font-semibold text-red-600">{erro}</p>}
        <button disabled={env} className="w-full rounded-xl bg-[#f5c400] py-3 font-black text-[#0f2a5e] disabled:opacity-50">{env ? "Enviando..." : "Enviar cadastro"}</button>
      </form>
    </main>
  );
}
