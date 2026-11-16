"use client";
import { useCallback, useEffect, useState } from "react";

interface Item { id: string; empresa: string; contato?: string; setor?: string; cidade?: string; telefone?: string; email?: string; dias: number; whatsappUrl: string | null; temWhatsapp: boolean; mensagem: string }

/**
 * Painel grande "Contato humano": empresas que o Sales trouxe e a Lia já apresentou por e-mail.
 * A Lia pede ao franqueado para chamar no WhatsApp (link pronto da apresentação) ou ligar.
 */
export function ContatoHumanoPanel({ titulo = true }: { titulo?: boolean }) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch("/api/app/crm/contato-humano", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => { if (j) { setItens(j.leads); setLink(j.link); } }).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function copiar(txt: string, chave: string) {
    try { await navigator.clipboard.writeText(txt); setCopiado(chave); setTimeout(() => setCopiado(null), 2000); } catch {}
  }
  async function registrar(leadId: string, resultado: string) {
    setBusy(leadId);
    await fetch("/api/app/crm/contato-humano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, resultado }) });
    setBusy(null); carregar();
  }

  if (!itens || itens.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border-2 border-[#f5c400] bg-amber-50 p-5 shadow-sm">
      {titulo && (
        <div className="mb-3">
          <p className="text-xs font-bold tracking-wide text-[#0f2a5e]">LIA · PRIORIDADE DO DIA</p>
          <h2 className="text-xl font-black text-slate-800">📞 {itens.length} empresa{itens.length > 1 ? "s" : ""} esperando o seu contato</h2>
          <p className="text-sm text-slate-600 mt-1">O Victor (Sales) encontrou essas empresas na sua região e eu já enviei a apresentação por e-mail. Agora é a sua vez: chame no WhatsApp com o link da apresentação ou ligue. Este é o passo que mais gera contratos.</p>
          {link && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white border border-amber-200 px-2 py-1 text-[11px] break-all">{link}</code>
              <button onClick={() => copiar(link, "link")} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">{copiado === "link" ? "✅ Copiado" : "📋 Copiar link da apresentação"}</button>
            </div>
          )}
        </div>
      )}
      <ul className="space-y-3">
        {itens.map(i => (
          <li key={i.id} className="rounded-xl bg-white border border-amber-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800">{i.empresa}</p>
                <p className="text-xs text-slate-500">{[i.contato, i.setor, i.cidade].filter(Boolean).join(" · ") || "Contato não informado"}{i.telefone ? ` · ${i.telefone}` : ""}</p>
              </div>
              {i.dias >= 2 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">há {i.dias} dias</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {i.temWhatsapp && i.whatsappUrl && <a href={i.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white">💬 Chamar no WhatsApp</a>}
              {i.telefone && <a href={`tel:${i.telefone.replace(/[^\d+]/g, "")}`} className="rounded-xl bg-[#0f2a5e] px-4 py-2 text-sm font-bold text-white">📞 Ligar</a>}
              <button onClick={() => copiar(i.mensagem, i.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">{copiado === i.id ? "✅ Copiada" : "Copiar mensagem"}</button>
              <a href={`/dashboard/crm/${i.id}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Abrir no CRM</a>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500 self-center">Depois do contato:</span>
              <button disabled={busy === i.id} onClick={() => registrar(i.id, "contatado")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Já fiz o contato</button>
              <button disabled={busy === i.id} onClick={() => registrar(i.id, "agendou")} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 disabled:opacity-50">Marcou apresentação/reunião</button>
              <button disabled={busy === i.id} onClick={() => registrar(i.id, "sem_interesse")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">Sem interesse</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
