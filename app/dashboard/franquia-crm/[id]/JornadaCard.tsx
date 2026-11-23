"use client";
import { useState } from "react";

export interface JornadaLead {
  id: string; tokenPublico: string | null; visualizacoes: number; apresentacaoAbertaEm: string | null; cofBaixadaEm: string | null;
  cadastroEm: string | null; contratoDocId: string | null; contratoEnviadoEm: string | null; contratoAssinadoEm: string | null;
  franchiseId: string | null; manualEnviadoEm: string | null;
  linkExpiraEm?: string | null; cadastro?: any; contratoRegiao?: string | null; contratoFormaPagamento?: string | null; valorInvestimento?: number | null;
}

const fmt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

export function JornadaCard({ lead, onChange }: { lead: JornadaLead; onChange: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  const c = lead.cadastro || {};
  const [f, setF] = useState<Record<string, string>>({
    nome: c.nome || "", cpf: c.cpf || "", email: c.email || "", telefone: c.telefone || "", nomeUnidade: c.nomeUnidade || "",
    cidade: c.cidade || "", uf: c.uf || "", regioes: c.regioes || "", enderecoCompleto: c.enderecoCompleto || "",
    regiao: lead.contratoRegiao || "", valor: lead.valorInvestimento != null ? String(lead.valorInvestimento) : "", formaPagamento: lead.contratoFormaPagamento || "",
  });
  const setCampo = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function salvarDados() {
    setBusy(true); setMsg("");
    try {
      const { regiao, valor, formaPagamento, enderecoCompleto, ...cad } = f;
      const r = await fetch(`/api/app/franquia-crm/${lead.id}/jornada`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "dados", cadastro: { ...c, ...cad }, regiao, valor, formaPagamento, enderecoCompleto }) });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? "Dados do contrato salvos." : (d.error || "Erro ao salvar."));
      if (r.ok) onChange();
    } finally { setBusy(false); }
  }

  async function chamar(acao: "link" | "contrato", extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/app/franquia-crm/${lead.id}/jornada`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Erro"); return; }
      if (acao === "link") { setLink(d.url); try { await navigator.clipboard.writeText(d.url); setMsg(`Link copiado! Vale até ${new Date(d.expiraEm).toLocaleDateString("pt-BR")}.`); } catch { setMsg("Link gerado."); } }
      else { setMsg("Contrato enviado ao Autentique."); }
      onChange();
    } finally { setBusy(false); }
  }

  const passos: [string, string | null][] = [
    ["Apresentação aberta", lead.apresentacaoAbertaEm ? `${fmt(lead.apresentacaoAbertaEm)} (${lead.visualizacoes}x)` : null],
    ["COF baixada", fmt(lead.cofBaixadaEm)],
    ["Cadastro recebido", fmt(lead.cadastroEm)],
    ["Contrato enviado", fmt(lead.contratoEnviadoEm)],
    ["Contrato assinado", fmt(lead.contratoAssinadoEm)],
    ["Manual enviado", fmt(lead.manualEnviadoEm)],
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-500 uppercase mb-3">Jornada de fechamento</p>
      <ul className="space-y-1 text-sm">
        {passos.map(([t, v]) => <li key={t} className="flex justify-between"><span className={v ? "text-slate-800" : "text-slate-400"}>{v ? "✅" : "⬜"} {t}</span><span className="text-xs text-slate-500">{v || "—"}</span></li>)}
      </ul>
      <div className="mt-3 space-y-2">
        <button disabled={busy} onClick={() => chamar("link")} className="w-full rounded-lg bg-[#0f2a5e] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
          🔗 {lead.tokenPublico ? "Copiar link Apresentação + COF" : "Gerar link Apresentação + COF"}
        </button>
        {lead.tokenPublico && lead.linkExpiraEm && (
          <p className="text-[11px] text-slate-500">Link válido até <b>{new Date(lead.linkExpiraEm).toLocaleDateString("pt-BR")}</b> (30 dias após o envio){new Date(lead.linkExpiraEm) < new Date() ? " — EXPIRADO" : ""}.{" "}
            <button disabled={busy} onClick={() => chamar("link", { renovar: true })} className="font-bold text-blue-700 underline">Renovar +30 dias</button></p>
        )}
        {link && <input readOnly value={link} onFocus={e => e.target.select()} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />}
        {lead.cadastroEm && !lead.contratoDocId && (
          <details className="rounded-lg border border-slate-200 p-2 text-xs">
            <summary className="cursor-pointer font-bold text-slate-700">📝 Dados do contrato (editáveis)</summary>
            <div className="mt-2 space-y-1.5">
              {([["nome", "Nome completo"], ["cpf", "CPF (só números)"], ["email", "E-mail"], ["telefone", "Telefone"], ["nomeUnidade", "Nome da unidade"], ["cidade", "Cidade"], ["uf", "UF"]] as const).map(([k, r]) => (
                <label key={k} className="block"><span className="text-slate-500">{r}</span><input value={f[k]} onChange={setCampo(k)} className="w-full rounded border border-slate-300 px-2 py-1" /></label>))}
              <label className="block"><span className="text-slate-500">Endereço completo (rua, nº, bairro, cidade, CEP)</span><input value={f.enderecoCompleto} onChange={setCampo("enderecoCompleto")} className="w-full rounded border border-slate-300 px-2 py-1" /></label>
              <label className="block"><span className="text-slate-500">Região da franquia (cláusula 3.1.3) — ex.: Santa Isabel - SP</span><input value={f.regiao} onChange={setCampo("regiao")} className="w-full rounded border border-slate-300 px-2 py-1" /></label>
              <label className="block"><span className="text-slate-500">Região de atuação (Victor prospecta)</span><textarea rows={2} value={f.regioes} onChange={setCampo("regioes")} className="w-full rounded border border-slate-300 px-2 py-1" /></label>
              <label className="block"><span className="text-slate-500">Valor negociado da região (R$) *</span><input type="number" step="0.01" value={f.valor} onChange={setCampo("valor")} className="w-full rounded border border-slate-300 px-2 py-1" /></label>
              <label className="block"><span className="text-slate-500">Forma de pagamento *</span><textarea rows={2} value={f.formaPagamento} onChange={setCampo("formaPagamento")} placeholder="Ex.: entrada de R$ 1.500,00 e 3 parcelas de R$ 1.000,00 no PIX" className="w-full rounded border border-slate-300 px-2 py-1" /></label>
              <button disabled={busy} onClick={salvarDados} className="w-full rounded bg-slate-800 px-3 py-1.5 font-bold text-white disabled:opacity-50">Salvar dados do contrato</button>
            </div>
          </details>
        )}
        {lead.cadastroEm && !lead.contratoDocId && (
          <a href={`/api/app/franquia-crm/${lead.id}/contrato-pdf`} className="block text-center text-xs font-bold text-blue-700 underline">📄 Baixar PDF do contrato para conferir</a>
        )}
        {lead.cadastroEm && !lead.contratoDocId && (
          <button disabled={busy} onClick={() => chamar("contrato")} className="w-full rounded-lg bg-[#f5c400] px-3 py-2 text-sm font-black text-[#0f2a5e] disabled:opacity-50">✍️ Enviar contrato para assinatura</button>
        )}
        {lead.contratoDocId && lead.tokenPublico && <a href={`/api/public/franquia/contrato/${lead.tokenPublico}`} className="block text-center text-xs font-bold text-blue-700 underline">📄 Baixar contrato em PDF{lead.contratoAssinadoEm ? " (assinado)" : ""}</a>}
        {lead.franchiseId && <a href="/dashboard/franqueados" className="block text-center text-xs font-bold text-blue-700 underline">Ver unidade criada</a>}
        {msg && <p className="text-xs font-semibold text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
