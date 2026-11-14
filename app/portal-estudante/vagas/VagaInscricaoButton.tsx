"use client";

import { useState } from "react";

export function VagaInscricaoButton({ vagaId }: { vagaId: string }) {
  const [loading, setLoading] = useState(false);
  const [autorizo, setAutorizo] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      const res = await fetch(`/api/app/vagas/${vagaId}/inscrever`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentimentoContato: autorizo }),
      });

      if (!res.ok) {
        alert("Não foi possível fazer a inscrição agora.");
        return;
      }

      alert("Inscrição realizada com sucesso!");
    } catch {
      alert("Erro ao tentar se inscrever.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" className="mt-0.5" checked={autorizo} onChange={e => setAutorizo(e.target.checked)} />
        <span>Autorizo que o assistente digital da Smarter entre em contato comigo (e-mail/WhatsApp) sobre esta e outras vagas. Posso revogar quando quiser.</span>
      </label>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Inscrevendo..." : "Me inscrever"}
      </button>
    </div>
  );
}
