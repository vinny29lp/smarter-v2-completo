"use client";

import { useEffect, useState } from "react";

function Ponto({ ok, txt }: { ok: boolean; txt: string }) {
  return <li className="text-sm"><span className={ok ? "text-green-600" : "text-amber-600"}>●</span> {txt}</li>;
}

export default function AlizoPage() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/app/alizo/indicadores", { cache: "no-store" })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Erro"); return j; })
      .then(setD).catch(e => setErro(e.message));
  }, []);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!d) return <p className="text-sm text-slate-500">Carregando…</p>;
  const s = d.status;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0f2a5e]">Funcionários digitais 🤖</h2>
        <p className="text-sm text-slate-500">Prospecção, WhatsApp e recrutamento automáticos — resultados dos últimos {d.periodoDias} dias.</p>
      </div>

      {s && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-sm font-bold text-slate-700 mb-2">Status da integração</p>
          <ul className="space-y-1">
            <Ponto ok={s.chaveConfigurada} txt={s.chaveConfigurada ? "Chave da Alizo configurada" : "Chave da Alizo ausente"} />
            <Ponto ok={s.webhookConfigurado} txt={s.webhookConfigurado ? "Webhook assinado configurado" : "Segredo do webhook ausente"} />
            <Ponto ok={s.gatilhoLeadsAtivo} txt={s.gatilhoLeadsAtivo ? "Envio automático de leads do CRM ligado" : "Envio automático de leads do CRM desligado"} />
            <Ponto ok={s.unidadesMapeadas > 0} txt={`${s.unidadesMapeadas} unidade(s) mapeada(s)`} />
            <Ponto ok={s.eventos7d > 0} txt={`${s.eventos7d} evento(s) recebido(s) nos últimos 7 dias${s.ultimoEvento ? ` · último: ${new Date(s.ultimoEvento.createdAt).toLocaleString("pt-BR")}` : ""}`} />
          </ul>
        </div>
      )}

      {d.unidades.length === 0 ? (
        <p className="text-sm text-slate-500">Esta unidade ainda não está conectada aos funcionários digitais.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {d.unidades.map((u: any) => (
            <div key={u.chave} className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <p className="text-sm font-bold text-slate-700">{u.nome}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                {[["Leads do Maps", u.leadsMaps], ["Leads na Alizo", u.leadsNaAlizo], ["Respostas", u.respostas], ["Negócios ganhos", u.negociosGanhos]].map(([t, v]) => (
                  <div key={t as string} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-2xl font-black text-[#0f2a5e]">{v as number}</p>
                    <p className="text-[11px] text-slate-500">{t as string}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {u.ultimaResposta ? `Última resposta: ${new Date(u.ultimaResposta).toLocaleDateString("pt-BR")}` : "Nenhuma resposta registrada ainda."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
