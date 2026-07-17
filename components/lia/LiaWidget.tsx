"use client";
/**
 * LiaWidget — Chat flutuante da Lia, assistente de suporte da Smarter Estágios.
 * Reutilizável nos 4 contextos logados: FRANQUEADO, EMPRESA, ESTUDANTE, IES.
 */
import { useEffect, useRef, useState } from "react";

type LiaContexto = "FRANQUEADO" | "EMPRESA" | "ESTUDANTE" | "IES";

interface LiaMensagem {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface LiaWidgetProps {
  contexto: LiaContexto;
  /** Obrigatório apenas quando contexto === "IES" (identifica a instituição via token do portal). */
  iesToken?: string;
}

const SAUDACAO: Record<LiaContexto, string> = {
  FRANQUEADO: "Oi! Sou a Lia 👋 Posso ajudar com dúvidas sobre a Lei do Estágio ou com ideias pra sua unidade crescer. É só perguntar.",
  EMPRESA: "Oi! Sou a Lia 👋 Posso ajudar com dúvidas sobre estágio, a Lei 11.788/2008 e como usar a plataforma. É só perguntar.",
  ESTUDANTE: "Oi! Sou a Lia 👋 Posso tirar suas dúvidas sobre estágio e sobre a Lei 11.788/2008. É só perguntar.",
  IES: "Oi! Sou a Lia 👋 Posso ajudar com dúvidas sobre a Lei do Estágio e sobre o convênio da instituição com a Smarter. É só perguntar.",
};

export function LiaWidget({ contexto, iesToken }: LiaWidgetProps) {
  const [open, setOpen] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [mensagens, setMensagens] = useState<LiaMensagem[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const endpoint = contexto === "IES" ? `/api/ies/${iesToken}/lia` : "/api/app/ai/lia";

  useEffect(() => {
    if (!open || historicoCarregado) return;
    setCarregandoHistorico(true);
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : { mensagens: [] }))
      .then((d) => {
        setMensagens(d.mensagens || []);
        setHistoricoCarregado(true);
      })
      .catch(() => setHistoricoCarregado(true))
      .finally(() => setCarregandoHistorico(false));
  }, [open, historicoCarregado, endpoint]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, enviando, open]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || enviando) return;
    setErro("");
    setInput("");
    setMensagens((prev) => [...prev, { role: "user", content: texto }]);
    setEnviando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não consegui responder agora. Tente de novo em instantes.");
        setEnviando(false);
        return;
      }
      setMensagens((prev) => [...prev, { role: "assistant", content: data.resposta }]);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setEnviando(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat com a Lia"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#0f2a5e] text-white shadow-lg hover:bg-[#15367a] transition-all px-4 py-3 md:px-5"
      >
        {open ? (
          <span className="text-lg leading-none">✕</span>
        ) : (
          <>
            <span className="text-lg leading-none">💬</span>
            <span className="hidden sm:inline text-sm font-bold">Lia</span>
          </>
        )}
      </button>

      {/* Painel de chat */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#0f2a5e] text-white px-4 py-3 flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full bg-[#f5c400] text-[#0f2a5e] flex items-center justify-center font-black text-sm">L</span>
            <div>
              <p className="text-sm font-bold leading-tight">Lia</p>
              <p className="text-[11px] text-blue-200 leading-tight">Assistente de suporte Smarter</p>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm">
                {SAUDACAO[contexto]}
              </div>
            </div>

            {carregandoHistorico && (
              <p className="text-center text-xs text-slate-400">Carregando conversa...</p>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#0f2a5e] text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {enviando && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-3 py-2 text-sm text-slate-400 shadow-sm">
                  Lia está digitando...
                </div>
              </div>
            )}

            {erro && (
              <p className="text-center text-xs text-red-500 px-2">{erro}</p>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-2.5 flex items-end gap-2 bg-white shrink-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pergunte algo pra Lia..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] max-h-24"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || !input.trim()}
              className="rounded-xl bg-[#0f2a5e] text-white px-3 py-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#15367a] transition-colors"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
