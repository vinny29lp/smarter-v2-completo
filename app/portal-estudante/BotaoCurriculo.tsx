"use client";
import { useState } from "react";

export function BotaoCurriculo() {
  const [loading, setLoading] = useState(false);

  const baixarPDF = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/estudante/curriculo-pdf");
      const data = await res.json();
      if (!data.html) { alert("Erro ao gerar currículo. Tente novamente."); return; }

      // Injeta script de auto-impressão no HTML retornado pela API
      const htmlComPrint = data.html.replace(
        "</body>",
        `<script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script></body>`
      );

      const win = window.open("", "_blank", "width=900,height=700");
      if (win) {
        win.document.open();
        win.document.write(htmlComPrint);
        win.document.close();
      } else {
        alert("Bloqueador de pop-ups ativo. Permita pop-ups para este site e tente novamente.");
      }
    } catch {
      alert("Erro ao gerar currículo. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={baixarPDF}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2a5e] hover:bg-[#1a3d8f] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <><span className="animate-spin">⏳</span> Gerando PDF...</>
      ) : (
        <>📄 Baixar Currículo em PDF</>
      )}
    </button>
  );
}
