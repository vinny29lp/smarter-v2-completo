"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  linkAutoCadastro: string;
}

export function EmpresasFilters({ linkAutoCadastro }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [linkModal, setLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.push("?" + p.toString());
  };

  const copy = () => {
    navigator.clipboard.writeText(linkAutoCadastro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      "Olá! Cadastre sua empresa no sistema Smarter Estágios: " + linkAutoCadastro
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="flex-1 min-w-48 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
          placeholder="Buscar por nome, CNPJ ou responsável..."
          defaultValue={params.get("q") || ""}
          onChange={e => update("q", e.target.value)}
        />
        <select
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
          defaultValue={params.get("status") || ""}
          onChange={e => update("status", e.target.value)}
        >
          <option value="">Todos os status</option>
          {["ATIVA","INATIVA","ATENCAO","PENDENTE"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white w-40"
          placeholder="Cidade..."
          defaultValue={params.get("cidade") || ""}
          onChange={e => update("cidade", e.target.value)}
        />
        {/* Botão interativo fica aqui no Client Component */}
        <button
          onClick={() => setLinkModal(true)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:border-blue-400 transition-colors text-slate-600"
        >
          🔗 Link Auto Cadastro
        </button>
      </div>

      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Link de Auto Cadastro — Empresa">
        <p className="text-sm text-slate-500 mb-3">
          Envie este link para empresas que queiram se cadastrar. Elas entrarão como{" "}
          <strong>leads pendentes</strong> para aprovação.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono break-all mb-4 select-all">
          {linkAutoCadastro}
        </div>
        <div className="flex gap-2">
          <Button onClick={copy} className="flex-1 justify-center">
            {copied ? "✓ Copiado!" : "📋 Copiar Link"}
          </Button>
          <Button variant="secondary" onClick={shareWhatsApp}>
            📱 WhatsApp
          </Button>
        </div>
      </Modal>
    </>
  );
}
