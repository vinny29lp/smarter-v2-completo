"use client";
/**
 * LiaWidget — Chat flutuante da Lia, assistente de suporte da Smarter Estágios.
 * Reutilizável nos 4 contextos logados: FRANQUEADO, EMPRESA, ESTUDANTE, IES.
 */
import { useEffect, useRef, useState } from "react";
import { SupportCaseForm } from "@/components/support/SupportCaseForm";

type LiaContexto = "FRANQUEADO" | "EMPRESA" | "ESTUDANTE" | "IES";

interface LiaMensagem {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface PendingMedia {
  kind: "image" | "audio";
  mimeType: string;
  base64: string;
  caption: string;
  sourceMessageId: string;
  name: string;
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
  const [reportingBug, setReportingBug] = useState(false);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [mediaConsent, setMediaConsent] = useState(false);
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
    if (!open || !historicoCarregado || reportingBug) return;
    const timer = window.setInterval(() => {
      fetch(endpoint)
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (data?.mensagens) setMensagens(data.mensagens); })
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [open, historicoCarregado, reportingBug, endpoint]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, enviando, open]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || enviando) return;
    if (media.length && !mediaConsent) {
      setErro("Confirme a autorização para análise da mídia por IA antes de enviar.");
      return;
    }
    setErro("");
    setInput("");
    setMensagens((prev) => [...prev, { role: "user", content: texto }]);
    setEnviando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: texto,
          path: window.location.pathname + window.location.search,
          mediaConsent: media.length ? mediaConsent : undefined,
          media: media.map(({ name: _name, ...item }) => item),
          technicalData: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            locale: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não consegui responder agora. Tente de novo em instantes.");
        setEnviando(false);
        return;
      }
      setMensagens((prev) => [...prev, { role: "assistant", content: data.resposta }]);
      setMedia([]);
      setMediaConsent(false);
      if (data.bugDetectado) setReportingBug(true);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setEnviando(false);
  };

  const anexar = async (files: FileList | null) => {
    if (!files?.length) return;
    setErro("");
    const selected = Array.from(files).slice(0, 3 - media.length);
    const next: PendingMedia[] = [];
    for (const file of selected) {
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : null;
      if (!kind) { setErro("Envie somente imagens ou áudios."); continue; }
      const limit = kind === "image" ? 8 * 1024 * 1024 : 16 * 1024 * 1024;
      if (file.size > limit) { setErro(`${kind === "image" ? "Imagem" : "Áudio"} ${file.name} excede o limite.`); continue; }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ kind, mimeType: file.type, base64: dataUrl.split(",", 2)[1] || "", caption: file.name, sourceMessageId: crypto.randomUUID(), name: file.name });
    }
    setMedia((current) => [...current, ...next].slice(0, 3));
    setMediaConsent(false);
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
            {contexto !== "IES" && (
              <button
                type="button"
                onClick={() => setReportingBug((value) => !value)}
                className="ml-auto rounded-lg border border-white/30 px-2 py-1 text-[11px] font-bold hover:bg-white/10"
              >
                {reportingBug ? "Voltar à Lia" : "Reportar erro"}
              </button>
            )}
          </div>

          {reportingBug ? (
            <SupportCaseForm onClose={() => setReportingBug(false)} />
          ) : (
            <>

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
          <div className="border-t border-slate-100 p-2.5 bg-white shrink-0 space-y-2">
            {media.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 space-y-2">
                <p><strong>Autorização necessária:</strong> estas mídias serão enviadas ao suporte e analisadas por inteligência artificial exclusivamente para atendimento técnico.</p>
                <div className="flex flex-wrap gap-1">{media.map((item) => <span key={item.sourceMessageId} className="rounded bg-white px-2 py-1">{item.kind === "image" ? "🖼️" : "🎧"} {item.name}</span>)}</div>
                <label className="flex items-start gap-2 font-semibold"><input type="checkbox" checked={mediaConsent} onChange={(e) => setMediaConsent(e.target.checked)} /> Autorizo o envio e a análise destas mídias por IA para o atendimento técnico.</label>
                <button type="button" className="text-red-700 underline" onClick={() => { setMedia([]); setMediaConsent(false); }}>Remover mídias</button>
              </div>
            )}
            <div className="flex items-end gap-2">
            {contexto !== "IES" && <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm" title="Anexar imagem ou áudio">
              📎
              <input type="file" accept="image/*,audio/*" multiple className="hidden" onChange={(e) => { void anexar(e.target.files); e.target.value = ""; }} disabled={media.length >= 3 || enviando} />
            </label>}
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
              disabled={enviando || !input.trim() || (media.length > 0 && !mediaConsent)}
              className="rounded-xl bg-[#0f2a5e] text-white px-3 py-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#15367a] transition-colors"
            >
              ➤
            </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
