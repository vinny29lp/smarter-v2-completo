"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const CRITERIOS = [
  { key:"pontualidade",  label:"Pontualidade e Assiduidade" },
  { key:"produtividade", label:"Produtividade e Qualidade" },
  { key:"iniciativa",    label:"Iniciativa e Proatividade" },
  { key:"comunicacao",   label:"Comunicação e Relacionamento" },
  { key:"aprendizado",   label:"Aprendizado e Desenvolvimento" },
  { key:"postura",       label:"Postura Profissional" },
];

function AvaliacoesContent() {
  const params = useSearchParams();
  const contratoFoco = params.get("contrato");

  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [avalModal, setAvalModal]   = useState<string|null>(null);
  const [form, setForm]             = useState<Record<string,number>>({});
  const [obs, setObs]               = useState("");
  const [pontosFortes, setPontosFortes]   = useState("");
  const [pontosMelhoria, setPontosMelhoria] = useState("");
  const [parecerFinal, setParecerFinal]   = useState("");
  const [recomendacao, setRecomendacao]   = useState("Manter");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/portal/empresa/avaliacoes")
      .then(r => r.json())
      .then(d => { setContratos(d.contratos || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (contratoFoco && contratos.length > 0) {
      const c = contratos.find((c: any) => c.id === contratoFoco);
      if (c) openModal(c.id);
    }
  }, [contratoFoco, contratos]);

  const openModal = (contratoId: string) => {
    setAvalModal(contratoId);
    setForm(Object.fromEntries(CRITERIOS.map(c => [c.key, 3])));
    setObs("");
    setPontosFortes("");
    setPontosMelhoria("");
    setParecerFinal("");
    setRecomendacao("Manter");
  };

  const salvar = async () => {
    if (!avalModal) return;
    setSaving(true);
    const respostasCompletas = {
      ...form,
      pontosFortes,
      pontosMelhoria,
      parecerFinal,
      recomendacao,
    };
    const res = await fetch("/api/portal/empresa/avaliacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contratoId: avalModal, respostas: respostasCompletas, observacoes: obs }),
    });
    if (res.ok) {
      setMsg("Avaliação enviada! ✓");
      setAvalModal(null);
      load();
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  };

  if (loading) return <p className="text-center py-12 text-slate-400">Carregando...</p>;

  return (
    <div>
      {msg && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">
          {msg}
        </div>
      )}

      <h1 className="text-2xl font-black text-slate-800 mb-6">Avaliações de Estagiários</h1>

      {contratos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-400 text-sm">Nenhum estagiário para avaliar no momento.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {contratos.map((c: any) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-slate-800">{c.student?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(c.dataInicio).toLocaleDateString("pt-BR")} →{" "}
                    {new Date(c.dataFim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.evaluations?.length > 0
                    ? <Badge variant="green">Avaliado</Badge>
                    : <Badge variant="yellow">Pendente</Badge>
                  }
                  <Button onClick={() => openModal(c.id)} size="sm">
                    {c.evaluations?.length > 0 ? "Nova Avaliação" : "Avaliar"}
                  </Button>
                </div>
              </div>

              {/* Avaliações respondidas */}
              {c.evaluations?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-2">{c.evaluations.length} avaliação(ões) respondida(s)</p>

                  {/* Última avaliação — notas */}
                  {c.evaluations[0]?.respostas && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                      {CRITERIOS.map(crit => {
                        const nota = (c.evaluations[0].respostas as any)[crit.key] || 0;
                        return (
                          <div key={crit.key} className="bg-slate-50 rounded-xl p-2">
                            <p className="text-[10px] text-slate-400">{crit.label}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className={`w-4 h-4 rounded-full ${n <= nota ? "bg-[#0f2a5e]" : "bg-slate-200"}`}/>
                              ))}
                              <span className="text-xs font-bold ml-1">{nota}/5</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {c.evaluations[0]?.observacoes && (
                    <p className="text-xs text-slate-500 mb-3 italic">"{c.evaluations[0].observacoes}"</p>
                  )}

                  {/* Links PDF para cada avaliação */}
                  <div className="flex flex-wrap gap-2">
                    {c.evaluations.map((ev: any, idx: number) => (
                      <a
                        key={ev.id}
                        href={`/api/app/contratos/${c.id}/avaliacoes/${ev.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        📄 Baixar PDF {c.evaluations.length > 1 ? `(${idx + 1})` : ""}
                        {ev.respondidoAt && (
                          <span className="text-blue-400 font-normal">{new Date(ev.respondidoAt).toLocaleDateString("pt-BR")}</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={avalModal !== null} onClose={() => setAvalModal(null)} title="Avaliação do Estagiário" size="lg">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Avalie o desempenho (1 = Ruim · 5 = Excelente)</p>
          {CRITERIOS.map(crit => (
            <div key={crit.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-700">{crit.label}</label>
                <span className="text-sm font-bold text-[#0f2a5e]">{form[crit.key] || 3}/5</span>
              </div>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(p => ({ ...p, [crit.key]: n }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                      (form[crit.key] || 3) >= n
                        ? "bg-[#0f2a5e] border-[#0f2a5e] text-white"
                        : "border-slate-200 text-slate-400 hover:border-slate-300"
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Pontos Fortes *</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
              value={pontosFortes} onChange={e => setPontosFortes(e.target.value)}
              placeholder="Descreva os principais pontos fortes do estagiário..."/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Pontos de Melhoria *</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
              value={pontosMelhoria} onChange={e => setPontosMelhoria(e.target.value)}
              placeholder="Áreas onde o estagiário deve desenvolver e melhorar..."/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Parecer Final do Supervisor *</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
              value={parecerFinal} onChange={e => setParecerFinal(e.target.value)}
              placeholder="Avaliação geral do desempenho, comprometimento e evolução profissional..."/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Recomendação *</label>
            <div className="flex gap-3">
              {["Manter","Renovar","Encerrar"].map(op => (
                <button key={op} onClick={() => setRecomendacao(op)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    recomendacao === op
                      ? op === "Encerrar" ? "bg-red-600 border-red-600 text-white" : "bg-[#0f2a5e] border-[#0f2a5e] text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {op === "Manter" ? "✅ Manter" : op === "Renovar" ? "🔄 Renovar" : "❌ Encerrar"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Observações Adicionais</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
              value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Observações complementares (opcional)..."/>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAvalModal(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !pontosFortes || !pontosMelhoria || !parecerFinal}>
              {saving ? "Enviando..." : "Enviar Avaliação ✓"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AvaliacoesPage() {
  return (
    <Suspense fallback={<p className="text-center py-12 text-slate-400">Carregando...</p>}>
      <AvaliacoesContent />
    </Suspense>
  );
}
