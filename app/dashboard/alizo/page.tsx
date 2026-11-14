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
            <Ponto ok={s.recrutadorAtivo} txt={s.recrutadorAtivo ? "Recrutador ligado (vagas e candidatos com consentimento)" : "Recrutador desligado"} />
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

              <div className="mt-4 rounded-lg border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-600">WhatsApp da unidade</p>
                {u.whatsapp.status === "conectado" ? (
                  <p className="mt-1 text-sm text-green-700">● Conectado · {u.whatsapp.numero}</p>
                ) : u.whatsapp.status === "nao_conectado" ? (
                  <>
                    <p className="mt-1 text-sm text-amber-700">● Aguardando conexão</p>
                    <p className="text-xs text-slate-500">A leitura do QR Code por aqui será liberada em breve. Enquanto isso a conexão é feita pela equipe Smarter.</p>
                    <button disabled className="mt-2 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 cursor-not-allowed">Conectar por QR Code (em breve)</button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Não foi possível consultar o status agora.</p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-black text-[#0f2a5e]">{u.recrutador.vagasNaAlizo}</p><p className="text-[11px] text-slate-500">Vagas com o Recrutador</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-black text-[#0f2a5e]">{u.recrutador.candidatosEnviados}</p><p className="text-[11px] text-slate-500">Candidatos enviados (30d)</p></div>
              </div>

              <p className="mt-4 text-xs font-bold text-slate-600">Trabalhos recentes</p>
              {u.atividade.length === 0 ? (
                <p className="text-xs text-slate-400">Ainda sem atividade registrada.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {u.atividade.map((a: any) => (
                    <li key={a.id} className="text-xs text-slate-600">
                      <span className="text-slate-400">{new Date(a.quando).toLocaleDateString("pt-BR")}</span> — {a.lead ? <b>{a.lead}: </b> : null}{a.texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
