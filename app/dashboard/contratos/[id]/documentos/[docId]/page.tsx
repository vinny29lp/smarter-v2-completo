"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

const STATUS_BADGE: Record<string,string> = {
  NAO_GERADO:"gray",RASCUNHO:"yellow",GERADO:"purple",
  ENVIADO_ASSINATURA:"blue",AGUARDANDO_ASSINATURA:"blue",
  ASSINADO:"green",CANCELADO:"red",
};
const STATUS_LABEL: Record<string,string> = {
  NAO_GERADO:"Não Gerado",RASCUNHO:"Rascunho",GERADO:"Gerado",
  ENVIADO_ASSINATURA:"Enviado",AGUARDANDO_ASSINATURA:"Aguardando",
  ASSINADO:"Assinado ✓",CANCELADO:"Cancelado",
};

const EXTRA_FIELDS: Record<string, {label:string;key:string;type?:string;options?:string[]}[]> = {
  rpb: [{ label:"Mês de Referência", key:"mesRef", type:"text" }],
  tr: [
    { label:"Último Dia de Estágio", key:"ultimoDia", type:"date" },
    { label:"Motivo da Rescisão", key:"motivo", type:"text" },
  ],
  rr: [
    { label:"Dias de Bolsa", key:"diasBolsa", type:"number" },
    { label:"Meses de Recesso (/12)", key:"mesesRecesso", type:"number" },
    { label:"Descontos (R$)", key:"descontos", type:"number" },
  ],
  rec: [
    { label:"Dias de Recesso", key:"diasRecesso", type:"number" },
    { label:"Data Início Recesso", key:"dataIni", type:"date" },
    { label:"Data Fim Recesso", key:"dataFim", type:"date" },
    { label:"Período Aquisitivo (ex: 15/01/2025 a 15/01/2026)", key:"periodo", type:"text" },
  ],
  re: [
    { label:"Carga Horária Total (horas)", key:"chTotal", type:"number" },
    { label:"Avaliação de Desempenho", key:"desempenho", type:"select", options:["Fraco","Regular","Bom","Muito Bom","Excelente"] },
  ],
  ta: [
    { label:"Cláusula Alterada", key:"clausula", type:"select", options:["Prazo/Vigência","Valor da Bolsa","Carga Horária","Atividades","Supervisor","Local","Benefícios"] },
    { label:"Descrição da Alteração", key:"descricao", type:"text" },
    { label:"Nova Vigência (opcional)", key:"vigencia", type:"text" },
  ],
  cps: [{ label:"Valor Mensal por Estagiário (R$)", key:"valorMensal", type:"number" }],
};

const SIGNATARIOS = ["empresa","instituicao","estudante"] as const;
const SIGNATARIO_LABELS: Record<string,string> = {
  empresa:"🏢 Empresa", instituicao:"🏫 Instituição", estudante:"🎓 Estudante"
};
const SIGNATARIO_INFO: Record<string,string> = {
  empresa: "Representante legal da empresa concedente.",
  instituicao: "Coordenador responsável pela instituição de ensino.",
  estudante: "O estagiário confirma ciência das condições do estágio.",
};

export default function DocumentoPage({ params }: { params: { id: string; docId: string } }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc]               = useState<any>(null);
  const [html, setHtml]             = useState<string>("");
  const [loading, setLoading]       = useState(false);
  const [extraModal, setExtraModal] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);
  const [assinarModal, setAssinarModal]       = useState<string|null>(null);
  const [extraFields, setExtraFields]         = useState<Record<string,string>>({});
  const [alertas, setAlertas]       = useState<string[]>([]);
  const [assinarLoading, setAssinarLoading] = useState(false);
  const [autentiqueModal, setAutentiqueModal] = useState(false);
  const [autentiqueEmails, setAutentiqueEmails] = useState<string[]>([""]);
  const [autentiqueLoading, setAutentiqueLoading] = useState(false);
  const [autentiqueSuccess, setAutentiqueSuccess] = useState<string|null>(null);

  const isTCEouPE = doc?.tipo === "tce" || doc?.tipo === "pe";
  const signers: Record<string,any> = (doc?.signers as any) || {};

  useEffect(() => {
    fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`)
      .then(r => r.json())
      .then(d => { setDoc(d.document); if (d.document?.htmlContent) setHtml(d.document.htmlContent); });
  }, [params.id, params.docId]);

  const extraDefs   = doc ? (EXTRA_FIELDS[doc.tipo] || []) : [];
  const needsExtra  = extraDefs.length > 0;
  const gerado      = doc && doc.status !== "NAO_GERADO" && doc.status !== "RASCUNHO";
  const proximoSignatario = isTCEouPE
    ? SIGNATARIOS.find(s => !signers[s]?.assinado) || null
    : null;
  const assinandoParcial = isTCEouPE && gerado && doc?.status !== "ASSINADO";

  const gerarDoc = async (extraData?: Record<string,any>) => {
    setLoading(true); setAlertas([]);
    const res  = await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(extraData || extraFields),
    });
    const data = await res.json();
    if (data.error) { setAlertas([data.error]); setLoading(false); return; }
    setDoc(data.document); setHtml(data.html); setExtraModal(false); setLoading(false);
  };

  const downloadHTML = () => {
    const blob = new Blob([html], { type:"text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${doc?.titulo?.replace(/\s+/g,"-")||"documento"}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const printDoc = () => iframeRef.current?.contentWindow?.print();

  const assinarComo = async (signatario: string) => {
    setAssinarLoading(true); setAlertas([]);
    const res  = await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ assinarComo: signatario }),
    });
    const data = await res.json();
    if (data.error) {
      setAlertas([data.error]);
    } else {
      setDoc(data.document);
      if (data.todosAssinaram) setAlertas(["✅ Todos assinaram! Contrato ativado automaticamente."]);
    }
    setAssinarModal(null); setAssinarLoading(false);
  };

  const enviarAssinatura = async () => {
    await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"AGUARDANDO_ASSINATURA" }),
    });
    setDoc((p:any) => ({ ...p, status:"AGUARDANDO_ASSINATURA" }));
    setAssinaturaModal(false);
  };

  const enviarParaAutentique = async () => {
    setAutentiqueLoading(true); setAlertas([]); setAutentiqueSuccess(null);
    const emailsValidos = autentiqueEmails.map(e => e.trim()).filter(e => e.length > 0);
    if (emailsValidos.length === 0) { setAutentiqueLoading(false); return; }
    try {
      const res = await fetch(
        `/api/app/contratos/${params.id}/documentos/${params.docId}/autentique`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailsValidos }) }
      );
      const data = await res.json();
      if (data.error) {
        setAlertas([data.error]);
      } else {
        setAutentiqueSuccess(data.message || "Enviado com sucesso!");
        setDoc((p: any) => ({ ...p, status: "ENVIADO_ASSINATURA" }));
        setTimeout(() => { setAutentiqueModal(false); setAutentiqueSuccess(null); }, 2500);
      }
    } catch {
      setAlertas(["Erro ao conectar com a API Autentique."]);
    }
    setAutentiqueLoading(false);
  };

  const marcarAssinado = async () => {
    const res  = await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"ASSINADO" }),
    });
    const data = await res.json();
    setDoc(data.document);
    if (doc?.tipo === "tr") setAlertas(["⚠️ Rescisão assinada — contrato marcado como INATIVO."]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/contratos/${params.id}`} className="text-slate-400 hover:text-slate-600 text-sm">← Contrato</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-black text-slate-800">{doc?.titulo || "Carregando..."}</h1>
          {doc && <Badge variant={(STATUS_BADGE[doc.status]||"gray") as any}>{STATUS_LABEL[doc.status]||doc.status}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => needsExtra ? setExtraModal(true) : gerarDoc()} disabled={loading}>
            {loading ? "Gerando..." : gerado ? "🔄 Regerar" : "📄 Gerar"}
          </Button>
          {gerado && (
            <>
              <Button variant="secondary" onClick={downloadHTML}>⬇ HTML</Button>
              <Button variant="secondary" onClick={printDoc}>🖨 Imprimir/PDF</Button>
            </>
          )}
          {assinandoParcial && proximoSignatario && (
            <Button variant="secondary" onClick={() => setAssinarModal(proximoSignatario)}>
              ✍️ Assinar: {SIGNATARIO_LABELS[proximoSignatario]}
            </Button>
          )}
          {!isTCEouPE && gerado && doc.status === "GERADO" && (
            <Button variant="secondary" onClick={() => { setAutentiqueModal(true); setAutentiqueEmails([""]); }}>
              ✍️ Enviar para Assinatura
            </Button>
          )}
          {!isTCEouPE && doc?.status === "AGUARDANDO_ASSINATURA" && (
            <Button onClick={marcarAssinado}>✓ Marcar Assinado</Button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-4 space-y-2 flex-shrink-0">
          {alertas.map((a,i) => (
            <div key={i} className={`p-3 border rounded-xl text-sm ${
              a.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>{a}</div>
          ))}
        </div>
      )}

      {/* Progresso assinaturas TCE/PE */}
      {isTCEouPE && gerado && (
        <div className="mb-4 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Ordem de Assinatura</p>
            <div className="flex items-center gap-2 flex-wrap">
              {SIGNATARIOS.map((s,i) => {
                const assinado  = signers[s]?.assinado;
                const isProximo = !assinado && SIGNATARIOS.slice(0,i).every(prev => signers[prev]?.assinado);
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <div className={`h-px w-6 ${assinado?"bg-emerald-400":"bg-slate-200"}`}/>}
                    <div
                      onClick={() => !assinado ? setAssinarModal(s) : undefined}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        assinado
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-blue-400 bg-blue-50 text-blue-700 shadow-sm cursor-pointer"
                      }`}
                    >
                      {assinado ? "✓" : "○"} {SIGNATARIO_LABELS[s]}
                      {assinado && signers[s]?.assinadoAt && (
                        <span className="text-xs font-normal ml-1">
                          {new Date(signers[s].assinadoAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {html ? (
        <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          <iframe ref={iframeRef} srcDoc={html} className="w-full h-full min-h-[700px]" title="Preview"/>
        </div>
      ) : (
        <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-slate-500 font-semibold">Documento não gerado</p>
            <p className="text-slate-400 text-sm mt-1">Clique em "Gerar" para criar o documento</p>
          </div>
        </div>
      )}

      {/* Modal campos extras */}
      <Modal open={extraModal} onClose={() => setExtraModal(false)} title="Dados adicionais para geração">
        <div className="space-y-4">
          {extraDefs.map(field => (
            <div key={field.key}>
              <label className="text-xs font-bold text-slate-600 block mb-1">{field.label}</label>
              {field.type === "select" ? (
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={extraFields[field.key]||""} onChange={e => setExtraFields(p => ({...p,[field.key]:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {field.options?.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={field.type||"text"} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                  value={extraFields[field.key]||""} onChange={e => setExtraFields(p => ({...p,[field.key]:e.target.value}))}/>
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExtraModal(false)}>Cancelar</Button>
            <Button onClick={() => gerarDoc(extraFields)} disabled={loading}>{loading?"Gerando...":"Gerar Documento"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal assinar como signatário */}
      <Modal open={assinarModal !== null} onClose={() => setAssinarModal(null)} title={`Assinar — ${assinarModal ? SIGNATARIO_LABELS[assinarModal] : ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirma a assinatura como <strong>{assinarModal ? SIGNATARIO_LABELS[assinarModal] : ""}</strong>?
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            {assinarModal && SIGNATARIO_INFO[assinarModal]}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAssinarModal(null)}>Cancelar</Button>
            <Button onClick={() => assinarModal && assinarComo(assinarModal)} disabled={assinarLoading}>
              {assinarLoading ? "Registrando..." : "✍️ Confirmar Assinatura"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Autentique — envio para assinatura digital */}
      <Modal open={autentiqueModal} onClose={() => setAutentiqueModal(false)} title="Enviar para Assinatura via Autentique">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Informe os e-mails dos signatários para <strong>{doc?.titulo}</strong>.
          </p>

          {autentiqueSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
              ✅ {autentiqueSuccess}
            </div>
          ) : (
            <>
              {/* Email list */}
              <div className="space-y-2">
                {autentiqueEmails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="email"
                      placeholder={`E-mail do signatário ${idx + 1}`}
                      className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                      value={email}
                      onChange={e => {
                        const updated = [...autentiqueEmails];
                        updated[idx] = e.target.value;
                        setAutentiqueEmails(updated);
                      }}
                    />
                    {autentiqueEmails.length > 1 && (
                      <button
                        className="text-slate-400 hover:text-red-500 px-2 text-lg"
                        onClick={() => setAutentiqueEmails(autentiqueEmails.filter((_, i) => i !== idx))}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="text-sm text-[#0f2a5e] font-semibold hover:underline"
                onClick={() => setAutentiqueEmails([...autentiqueEmails, ""])}
              >
                + Adicionar signatário
              </button>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                🔐 O documento será enviado via <strong>Autentique</strong> para assinatura digital.
                Cada signatário receberá um link no e-mail informado.
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setAutentiqueModal(false)}>Cancelar</Button>
                <Button onClick={enviarParaAutentique} disabled={autentiqueLoading}>
                  {autentiqueLoading ? "Enviando..." : "✍️ Enviar para Assinatura"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
