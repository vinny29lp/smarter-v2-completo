"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { WhatsappCard } from "@/components/alizo/WhatsappCard";
import { ProspeccaoCard } from "@/components/alizo/ProspeccaoCard";
import { MetricasCard } from "@/components/alizo/MetricasCard";
import { AdminAlizo } from "@/components/alizo/AdminAlizo";

function Ponto({ ok, txt }: { ok: boolean; txt: string }) {
  return <li className="text-sm"><span className={ok ? "text-green-600" : "text-amber-600"}>●</span> {txt}</li>;
}

function TesteEmail({ emailInicial }: { emailInicial: string }) {
  const [para, setPara] = useState(emailInicial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (!para && emailInicial) setPara(emailInicial); }, [emailInicial]);

  async function enviar() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/app/admin/lia-teste-email?to=${encodeURIComponent(para)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Não foi possível enviar.");
      else if (j.enviados?.transacional && j.enviados?.comercial) setMsg(`Enviados 2 e-mails de teste (transacional e comercial) para ${j.para}. Confira em qual aba do Gmail cada um chegou.`);
      else setMsg("O envio falhou em pelo menos um dos e-mails. Verifique a configuração da Resend.");
    } catch { setMsg("Erro de conexão ao enviar o teste."); }
    setBusy(false);
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <p className="text-sm font-bold text-slate-700">E-mail de teste da Lia</p>
      <p className="text-xs text-slate-500 mt-0.5">Envia um e-mail transacional (entrevista) e um comercial (reativação), no estilo texto padrão, para ver em qual aba do Gmail cada um cai.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="email" value={para} onChange={e => setPara(e.target.value)} placeholder="seu@email.com"
          className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <button onClick={enviar} disabled={busy || !para}
          className="rounded-lg bg-[#0f2a5e] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {busy ? "Enviando…" : "Enviar e-mail de teste"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-700">{msg}</p>}
    </div>
  );
}

export default function AlizoPage() {
  const { data: session } = useSession();
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

      {(session?.user as any)?.role === "FRANQUEADORA" && <AdminAlizo />}

      {s && (session?.user as any)?.role === "FRANQUEADORA" && <TesteEmail emailInicial={session?.user?.email || ""} />}

      {d.unidades.length === 0 ? (
        <p className="text-sm text-slate-500">
          {d.sincronizacao === "error" ? "Configuração administrativa necessária: a equipe Smarter já foi sinalizada."
            : "Integração pendente: sua unidade está sendo preparada. Isso é automático e pode levar alguns minutos."}
        </p>
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

              <WhatsappCard franchiseId={u.chave} />
              {u.chave !== "MATRIZ" && <ProspeccaoCard franchiseId={u.chave} />}

              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-black text-[#0f2a5e]">{u.recrutador.vagasNaAlizo}</p><p className="text-[11px] text-slate-500">Vagas com o Recrutador</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-black text-[#0f2a5e]">{u.recrutador.candidatosEnviados}</p><p className="text-[11px] text-slate-500">Candidatos enviados (30d)</p></div>
              </div>

              <MetricasCard franchiseId={u.chave} />

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
