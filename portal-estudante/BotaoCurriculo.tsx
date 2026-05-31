"use client";
import { useState } from "react";

interface Props { studentId: string; }

export function BotaoCurriculo({ studentId }: Props) {
  const [loading, setLoading] = useState(false);

  const baixar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/estudante/curriculo-pdf?id=${studentId}`);
      const data = await res.json();
      if (data.html) {
        const blob = new Blob([data.html], { type: "text/html" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "curriculo-smarter.html";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch(e) {
      alert("Erro ao gerar currículo.");
    }
    setLoading(false);
  };

  return (
    <button onClick={baixar} disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-[#0f2a5e] rounded-xl text-xs font-semibold text-slate-600 transition-colors disabled:opacity-50">
      {loading ? "Gerando..." : "📄 Baixar Currículo"}
    </button>
  );
}
