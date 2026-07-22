"use client";
import { useState } from "react";

interface Props {
  /** franchiseId da unidade logada — undefined para FRANQUEADORA (link sem ref) */
  franchiseRef?: string;
}

/**
 * Seção de prospecção da aba Empresas:
 *  - link único da apresentação comercial (/parceria?ref=<unidade>) para copiar/WhatsApp
 *  - envio da apresentação por e-mail direto do sistema (layout Smarter)
 * Leads capturados na landing entram automaticamente no CRM da unidade.
 */
export function ProspeccaoEmpresas({ franchiseRef }: Props) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const getLink = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/parceria${franchiseRef ? `?ref=${franchiseRef}` : ""}`;
  };

  const copy = () => {
    navigator.clipboard.writeText(getLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      "Olá! Sou da Smarter Estágios. Preparei uma apresentação mostrando como sua empresa pode contratar estagiários selecionados com tecnologia, sem burocracia e com custo reduzido. Dá uma olhada: " + getLink()
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const sendEmail = async () => {
    if (!email) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/app/empresas/prospeccao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nomeContato }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setFeedback({ ok: false, msg: data.error || "Falha ao enviar. Tente novamente." });
      } else {
        setFeedback({ ok: true, msg: `Apresentação enviada para ${email}. Se a empresa preencher o formulário, o lead entra automaticamente no seu CRM.` });
        setEmail("");
        setNomeContato("");
      }
    } catch {
      setFeedback({ ok: false, msg: "Falha ao enviar. Verifique sua conexão e tente novamente." });
    }
    setSending(false);
  };

  return (
    <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#0f2a5e] to-[#1a3d8f] p-5 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Texto + link */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm flex items-center gap-2">
            📣 Apresentação Comercial para Empresas
          </p>
          <p className="text-white/70 text-xs mt-1 leading-relaxed">
            Envie este link para empresas da sua região. Quem preencher o formulário da apresentação
            entra <strong className="text-[#f5c400]">automaticamente no seu CRM</strong> como novo lead.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <code className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[11px] font-mono truncate max-w-full">
              {getLink()}
            </code>
            <button
              onClick={copy}
              className="bg-[#f5c400] text-[#0f2a5e] text-xs font-black px-3 py-1.5 rounded-lg hover:bg-[#ffd327] transition-colors"
            >
              {copied ? "✓ Copiado!" : "📋 Copiar link"}
            </button>
            <button
              onClick={shareWhatsApp}
              className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              📱 WhatsApp
            </button>
          </div>
        </div>

        {/* Envio por e-mail */}
        <div className="lg:w-96 flex-shrink-0 bg-white/10 border border-white/15 rounded-xl p-3">
          <p className="text-xs font-bold mb-2">✉️ Enviar por e-mail direto do sistema</p>
          <div className="space-y-2">
            <input
              type="text"
              value={nomeContato}
              onChange={e => setNomeContato(e.target.value)}
              placeholder="Nome do contato (opcional)"
              className="w-full bg-white/90 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none placeholder:text-slate-400"
            />
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendEmail(); }}
                placeholder="email@empresa.com.br"
                className="flex-1 min-w-0 bg-white/90 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none placeholder:text-slate-400"
              />
              <button
                onClick={sendEmail}
                disabled={sending || !email}
                className="bg-[#f5c400] text-[#0f2a5e] text-xs font-black px-4 py-2 rounded-lg hover:bg-[#ffd327] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
          {feedback && (
            <p className={`text-[11px] mt-2 leading-snug ${feedback.ok ? "text-green-300" : "text-red-300"}`}>
              {feedback.ok ? "✅ " : "⚠️ "}{feedback.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
