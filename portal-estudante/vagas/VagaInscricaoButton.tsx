"use client";

import { useState } from "react";

export function VagaInscricaoButton({ vagaId }: { vagaId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      const res = await fetch(`/api/app/vagas/${vagaId}/inscrever`, {
        method: "POST",
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
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {loading ? "Inscrevendo..." : "Me inscrever"}
    </button>
  );
}
