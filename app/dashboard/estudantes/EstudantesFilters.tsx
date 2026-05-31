"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function EstudantesFilters({ franchiseRef }: { franchiseRef?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [linkModal, setLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build URL client-side using window.location.origin so it works in production
  const getLinkAutoCadastro = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/cadastro/estudante${franchiseRef ? `?ref=${franchiseRef}` : ""}`;
  };

  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.push("?" + p.toString());
  };

  const copy = () => {
    const link = getLinkAutoCadastro();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="flex-1 min-w-48 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
          placeholder="Buscar por nome, e-mail..." defaultValue={params.get("q")||""}
          onChange={e=>update("q",e.target.value)}/>
        <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] w-32"
          placeholder="Curso..." defaultValue={params.get("curso")||""} onChange={e=>update("curso",e.target.value)}/>
        <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] w-32"
          placeholder="Cidade..." defaultValue={params.get("cidade")||""} onChange={e=>update("cidade",e.target.value)}/>
        <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
          defaultValue={params.get("status")||""} onChange={e=>update("status",e.target.value)}>
          <option value="">Status</option>
          {["DISPONIVEL","EM_ESTAGIO","INATIVO","FORMADO"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
          defaultValue={params.get("disc")||""} onChange={e=>update("disc",e.target.value)}>
          <option value="">DISC</option>
          {["D","I","S","C"].map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={()=>setLinkModal(true)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:border-blue-400 transition-colors text-slate-600">
          🔗 Link Cadastro
        </button>
      </div>
      <Modal open={linkModal} onClose={()=>setLinkModal(false)} title="Link de Auto Cadastro — Estudante">
        <p className="text-sm text-slate-500 mb-3">Envie este link para estudantes que queiram se cadastrar na plataforma.</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-4 select-all">
          {getLinkAutoCadastro()}
        </div>
        <div className="flex gap-2">
          <Button onClick={copy} className="flex-1 justify-center">{copied?"✓ Copiado!":"📋 Copiar Link"}</Button>
          <Button variant="secondary" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent("Cadastre-se no portal de estágios: "+getLinkAutoCadastro())}`)}>📱 WhatsApp</Button>
        </div>
      </Modal>
    </>
  );
}
