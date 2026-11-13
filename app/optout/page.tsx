"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function Conteudo() {
  const sp = useSearchParams();
  const e = sp.get("e") || "";
  const t = sp.get("t") || "";
  const [estado, setEstado] = useState<"idle" | "ok" | "erro" | "enviando">("idle");

  async function confirmar() {
    setEstado("enviando");
    try {
      const r = await fetch("/api/public/optout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e, t }),
      });
      setEstado(r.ok ? "ok" : "erro");
    } catch { setEstado("erro"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-xl font-bold text-[#0f2a5e]">Parar de receber avisos automáticos</h1>
        {estado === "ok" ? (
          <p className="mt-4 text-sm text-slate-700">Pronto. O e-mail <b>{e}</b> não receberá mais avisos automáticos da Smarter Estágios (lembretes, renovações e avaliações).</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-700">
              Confirme para o e-mail <b>{e || "—"}</b> deixar de receber lembretes automáticos de assinatura, renovação e avaliação de estágio.
            </p>
            {estado === "erro" && <p className="mt-3 text-sm text-red-600">Link inválido ou erro ao registrar. Tente novamente pelo e-mail recebido.</p>}
            <button onClick={confirmar} disabled={!e || !t || estado === "enviando"}
              className="mt-6 w-full rounded-lg bg-[#0f2a5e] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {estado === "enviando" ? "Registrando..." : "Confirmar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OptOutPage() {
  return <Suspense fallback={null}><Conteudo /></Suspense>;
}
