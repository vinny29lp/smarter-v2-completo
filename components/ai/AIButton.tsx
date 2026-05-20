"use client";
/**
 * AIButton — Componente reutilizável para todos os módulos de IA.
 * Mostra loading elegante, resultado editável, copy e regenerar.
 */
import { useState } from "react";

interface AIButtonProps {
  label?: string;
  endpoint: string;
  payload: Record<string, any>;
  onResult: (text: string) => void;
  resultLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function AIButton({
  label = "✨ Gerar com IA",
  endpoint,
  payload,
  onResult,
  resultLabel = "Resultado da IA",
  disabled = false,
  className = "",
}: AIButtonProps) {
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState("");
  const [error,     setError]     = useState("");
  const [copied,    setCopied]    = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const generate = async () => {
    setLoading(true); setError(""); setResult("");
    try {
      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao gerar."); setLoading(false); return; }

      // Pegar o primeiro campo de conteúdo disponível
      const text = data.descricao || data.atividades || data.parecer
                || data.testes   || data.analise    || data.resultado || "";
      setResult(text);
      setShowPanel(true);
    } catch {
      setError("Erro de conexão com a IA. Tente novamente.");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apply = () => {
    onResult(result);
    setShowPanel(false);
  };

  return (
    <div className={`${className}`}>
      {/* Botão principal */}
      <button
        type="button"
        onClick={generate}
        disabled={loading || disabled}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border
          ${loading
            ? "border-purple-200 bg-purple-50 text-purple-400 cursor-not-allowed"
            : "border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 hover:from-purple-100 hover:to-blue-100 hover:border-purple-400 shadow-sm"
          }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Gerando com IA...
          </>
        ) : (
          <>✨ {label}</>
        )}
      </button>

      {/* Erro */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Painel de resultado */}
      {showPanel && result && (
        <div className="mt-3 border border-purple-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">{resultLabel}</span>
              <span className="text-xs text-purple-400">(editável)</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={generate}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors">
                🔄 Regenerar
              </button>
              <button type="button" onClick={copyToClipboard}
                className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                {copied ? "✓ Copiado!" : "📋 Copiar"}
              </button>
              <button type="button" onClick={() => setShowPanel(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                ✕
              </button>
            </div>
          </div>

          {/* Textarea editável */}
          <textarea
            className="w-full px-4 py-3 text-sm text-slate-700 bg-white resize-none outline-none min-h-[200px] font-mono leading-relaxed"
            value={result}
            onChange={e => setResult(e.target.value)}
            rows={10}
          />

          {/* Footer com ação */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400">💡 Edite o texto acima antes de aplicar</p>
            <button
              type="button"
              onClick={apply}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              ✓ Aplicar texto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
