"use client";

import { useEffect, useState } from "react";

interface SupportCaseFormProps {
  onClose: () => void;
}

const newRequestId = () => crypto.randomUUID();

export function SupportCaseForm({ onClose }: SupportCaseFormProps) {
  const [clientRequestId, setClientRequestId] = useState("");
  const [title, setTitle] = useState("");
  const [screen, setScreen] = useState("");
  const [attemptedAction, setAttemptedAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [protocol, setProtocol] = useState("");

  useEffect(() => {
    setClientRequestId(newRequestId());
    setScreen(document.title || "Tela sem título");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientRequestId || sending) return;
    setSending(true);
    setError("");
    setRetryable(false);

    try {
      const response = await fetch("/api/app/support/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId,
          title,
          screen,
          path: window.location.pathname + window.location.search,
          attemptedAction,
          errorMessage,
          problemDescription,
          occurredAt: new Date().toISOString(),
          imageUrl,
          technicalData: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            locale: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível abrir o chamado.");
        setRetryable(Boolean(data.retryable));
        return;
      }
      setProtocol(data.protocol || data.externalReference);
    } catch {
      setError("Falha de conexão. Tente novamente com segurança.");
      setRetryable(true);
    } finally {
      setSending(false);
    }
  };

  if (protocol) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <span className="text-4xl">✅</span>
        <h3 className="text-base font-black text-[#0f2a5e]">Chamado registrado</h3>
        <p className="text-sm text-slate-600">O time de TI recebeu seu relato. Nenhum reparo será feito sem diagnóstico e autorização.</p>
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-emerald-700">Protocolo</p>
          <p className="break-all font-mono text-sm font-bold text-emerald-900">{protocol}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-[#0f2a5e] px-4 py-2 text-sm font-bold text-white">Fechar</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-3">
      <p className="text-xs text-slate-600">Conte o que aconteceu. Seus dados de usuário, empresa/unidade, tela e informações técnicas seguras serão incluídos automaticamente.</p>
      <Field label="Resumo curto" value={title} onChange={setTitle} placeholder="Ex.: erro ao salvar contrato" maxLength={140} />
      <Field label="Tela" value={screen} onChange={setScreen} placeholder="Ex.: Editar contrato" maxLength={160} />
      <Field label="O que você tentou fazer?" value={attemptedAction} onChange={setAttemptedAction} multiline placeholder="Descreva os passos até o erro" maxLength={2000} />
      <Field label="Mensagem exata do erro" value={errorMessage} onChange={setErrorMessage} multiline placeholder="Copie exatamente o texto exibido" maxLength={2000} />
      <Field label="Descrição do problema" value={problemDescription} onChange={setProblemDescription} multiline placeholder="O que aconteceu e o que você esperava que acontecesse?" maxLength={5000} />
      <Field label="Link de imagem (opcional)" value={imageUrl} onChange={setImageUrl} placeholder="https://..." maxLength={2000} required={false} type="url" />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}{retryable ? " Você pode reenviar: o mesmo identificador será usado e não criará duplicidade." : ""}
        </div>
      )}

      <div className="flex gap-2 pb-1">
        <button type="button" onClick={onClose} disabled={sending} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600">Cancelar</button>
        <button type="submit" disabled={sending || !clientRequestId} className="flex-1 rounded-xl bg-[#0f2a5e] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
          {sending ? "Enviando..." : retryable ? "Tentar novamente" : "Abrir chamado"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, placeholder, maxLength, multiline = false, required = true, type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
  required?: boolean;
  type?: string;
}) {
  const className = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]";
  return (
    <label className="block text-xs font-bold text-slate-700">
      {label}
      {multiline ? (
        <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3} className={`${className} mt-1 resize-y`} />
      ) : (
        <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} className={`${className} mt-1`} />
      )}
    </label>
  );
}
