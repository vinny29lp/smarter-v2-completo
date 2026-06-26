"use client";
import { useState } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";

export default function CopyLinkButton({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = `${APP_URL}/ies/${token}`;

  const copiar = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <button
      onClick={copiar}
      className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
        copiado
          ? "bg-emerald-100 text-emerald-700"
          : "bg-[#0f2a5e] text-white hover:bg-[#1e4a8f]"
      }`}
    >
      {copiado ? "✅ Copiado!" : "📋 Copiar link"}
    </button>
  );
}
