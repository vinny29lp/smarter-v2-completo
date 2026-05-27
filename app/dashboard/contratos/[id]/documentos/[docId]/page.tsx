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
  ENVIADO_ASSINATURA:"Enviado p/ Assinatura",AGUARDANDO_ASSINATURA:"Aguardando Assinatura",
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

// Slots fixos para TCE (3 assinaturas obrigatórias)
const TCE_SIGNERS = [
  { label: "Empresa Concedente", key: "company", placeholder: "E-mail da empresa" },
  { label: "Instituição de Ensino", key: "institution", placeholder: "E-mail da instituição" },
  { label: "Estudante / Estagiário", key: "student", placeholder: "E-mail do estudante" },
];

export default function DocumentoPage({ params }: { params: { id: string; docId: string } }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc]               = useState<any>(null);
  const [html, setHtml]             = useState<string>("");
  const [loading, setLoading]       = useState(false);
  const [extraModal, setExtraModal] = useState(false);
  const [extraFields, setExtraFields] = useState<Record<string,string>>({});
  const [alertas, setAlertas]       = useState<string[]>([]);

  // Emails do contrato para pré-preenchimento
  const [contractEmails, setContractEmails] = useState<{
    company?: string; companyName?: string;
    student?: string; studentName?: string;
    institution?: string; institutionName?: string;
  }>({});

  // Autentique — emails genéricos (docs não-TCE)
  const [autentiqueModal, setAutentiqueModal]   = useState(false);
  const [autentiqueEmails, setAutentiqueEmails] = useState<string[]>([""]);
  // Autentique — slots TCE (3 fixos)
  const [tceEmails, setTceEmails] = useState<Record<string,string>>({ company:"", institution:"", student:"" });

  const [autentiqueLoading, setAutentiqueLoading] = useState(false);
  const [autentiqueSuccess, setAutentiqueSuccess] = useState<string|null>(null);
  const [checkingStatus, setCheckingStatus]     = useState(false);

  // Dados derivados
  const isTce      = doc?.tipo === "tce" || doc?.tipo === "pe";
  const isTr       = doc?.tipo === "tr";
  const gerado     = doc && doc.status !== "NAO_GERADO" && doc.status !== "RASCUNHO";
  const enviado    = doc?.authDocId;
  const assinado   = doc?.status === "ASSINADO";

  // Signatários do Autentique (salvos em doc.signers como array)
  const autentiqueSigners: any[] = Array.isArray(doc?.signers) ? doc.signers : [];

  const extraDefs  = doc ? (EXTRA_FIELDS[doc.tipo] || []) : [];
  const needsExtra = extraDefs.length > 0;

  useEffect(() => {
    fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`)
      .then(r => r.json())
      .then(d => {
        setDoc(d.document);
        if (d.document?.htmlContent) setHtml(d.document.htmlContent);
        if (d.contractEmails) {
          setContractEmails(d.contractEmails);
          // Pré-preencher slots TCE com emails do contrato
          setTceEmails({
            company: d.contractEmails.company || "",
            institution: d.contractEmails.institution || "",
            student: d.contractEmails.student || "",
          });
        }
      });
  }, [params.id, params.docId]);

  const abrirModalAutentique = () => {
    setAutentiqueSuccess(null);
    setAlertas([]);
    if (!isTce) {
      setAutentiqueEmails([""]);
    }
    // TCE: tceEmails já estão pré-preenchidos do useEffect
    setAutentiqueModal(true);
  };

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

  const openAsPDF = () => {
    // Inject auto-print into the HTML so browser opens Save-as-PDF dialog
    const printHtml = html.includes("</body>")
      ? html.replace("</body>", `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script></body>`)
      : html + `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script>`;
    const blob = new Blob([printHtml], { type:"text/html" });
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const printDoc = () => openAsPDF();

  const enviarParaAutentique = async () => {
    setAutentiqueLoading(true); setAlertas([]); setAutentiqueSuccess(null);

    let emailsValidos: string[];
    let labels: string[];

    if (isTce) {
      // TCE: 3 slots fixos com labels
      const slots = TCE_SIGNERS.map(s => ({ email: tceEmails[s.key]?.trim() || "", label: s.label }));
      const invalidos = slots.filter(s => !s.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));
      if (invalidos.length > 0) {
        setAlertas([`E-mails inválidos: ${invalidos.map(s => s.label).join(", ")}`]);
        setAutentiqueLoading(false); return;
      }
      emailsValidos = slots.map(s => s.email);
      labels = slots.map(s => s.label);
    } else {
      emailsValidos = autentiqueEmails.map(e => e.trim()).filter(e => e.length > 0);
      labels = [];
      if (emailsValidos.length === 0) { setAutentiqueLoading(false); return; }
    }

    try {
      const res = await fetch(
        `/api/app/contratos/${params.id}/documentos/${params.docId}/autentique`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailsValidos, labels }) }
      );
      const data = await res.json();
      if (data.error) {
        setAlertas([data.error]);
      } else {
        setAutentiqueSuccess(data.message || "Enviado com sucesso!");
        setDoc((p: any) => ({
          ...p,
          status: isTr ? "ENVIADO_ASSINATURA" : "ENVIADO_ASSINATURA",
          authDocId: data.autentiqueId,
          signers: data.signers || [],
        }));
        setTimeout(() => { setAutentiqueModal(false); setAutentiqueSuccess(null); }, 2500);
      }
    } catch {
      setAlertas(["Erro ao conectar com a API Autentique."]);
    }
    setAutentiqueLoading(false);
  };

  const verificarStatus = async () => {
    setCheckingStatus(true); setAlertas([]);
    try {
      const res  = await fetch(
        `/api/app/contratos/${params.id}/documentos/${params.docId}/autentique`
      );
      const data = await res.json();
      if (data.error) {
        setAlertas(["⚠️ " + data.error]);
      } else {
        // Mesclar signedUrl diretamente do response (não só do data.document) para garantir atualização imediata
        setDoc((p: any) => ({
          ...p,
          ...data.document,
          signers: data.signers || p?.signers,
          ...(data.signedUrl ? { signedUrl: data.signedUrl } : {}),
        }));
        if (data.allSigned) {
          const msgs = [];
          if (data.contratoAtivado) msgs.push("✅ Todos assinaram! Contrato ativado automaticamente.");
          else if (data.contratoInativado) msgs.push("✅ Todos assinaram! Estágio encerrado (INATIVO).");
          else msgs.push("✅ Todos os signatários assinaram!");
          if (data.signedUrl) msgs.push("📄 Documento assinado disponível para download.");
          setAlertas(msgs);
        } else {
          const assinados = (data.signers || []).filter((s: any) => s.signed).length;
          const total     = (data.signers || []).length;
          const rejeitados = (data.signers || []).filter((s: any) => s.rejected).length;
          const msgs = [`🔄 Status atualizado: ${assinados}/${total} assinatura(s) confirmada(s).`];
          if (rejeitados > 0) msgs.push(`⚠️ ${rejeitados} signatário(s) recusaram a assinatura.`);
          setAlertas(msgs);
        }
      }
    } catch {
      setAlertas(["⚠️ Erro ao verificar status no Autentique."]);
    }
    setCheckingStatus(false);
  };

  // Visualizar o PDF assinado em nova aba (link direto)
  const visualizarAssinado = () => {
    const url = doc?.signedUrl;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Baixar o PDF assinado via proxy (força download com nome correto)
  const downloadAssinado = () => {
    const url = `/api/app/contratos/${params.id}/documentos/${params.docId}/download-assinado`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc?.titulo?.replace(/\s+/g, "-") || "documento"}-assinado.pdf`;
    a.click();
  };

  const marcarAssinado = async () => {
    const res  = await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"ASSINADO" }),
    });
    const data = await res.json();
    setDoc(data.document);
    if (isTr) setAlertas(["⚠️ Rescisão assinada — contrato marcado como INATIVO."]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/contratos/${params.id}`} className="text-slate-400 hover:text-slate-600 text-sm">← Contrato</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-black text-slate-800">{doc?.titulo || "Carregando..."}</h1>
          {doc && <Badge variant={(STATUS_BADGE[doc.status]||"gray") as any}>{STATUS_LABEL[doc.status]||doc.status}</Badge>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => needsExtra ? setExtraModal(true) : gerarDoc()} disabled={loading}>
            {loading ? "Gerando..." : gerado ? "🔄 Regerar" : "📄 Gerar"}
          </Button>
          {gerado && (
            <>
              <Button variant="secondary" onClick={openAsPDF}>⬇ Baixar PDF</Button>
              <Button variant="secondary" onClick={() => iframeRef.current?.contentWindow?.print()}>🖨 Imprimir</Button>
            </>
          )}
          {gerado && !assinado && (
            <Button variant="secondary" onClick={abrirModalAutentique}>
              ✍️ Enviar para Assinatura
            </Button>
          )}
          {enviado && !assinado && (
            <Button variant="secondary" onClick={verificarStatus} disabled={checkingStatus}>
              {checkingStatus ? "Verificando..." : "🔄 Verificar Assinaturas"}
            </Button>
          )}
          {assinado && doc?.signedUrl && (
            <>
              <Button variant="secondary" onClick={visualizarAssinado}>
                👁 Visualizar Assinado
              </Button>
              <Button onClick={downloadAssinado}>
                ⬇ Baixar Assinado (PDF)
              </Button>
            </>
          )}
          {!enviado && doc?.status === "AGUARDANDO_ASSINATURA" && (
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
              : a.startsWith("⚠️") ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
            }`}>{a}</div>
          ))}
        </div>
      )}

      {/* Painel de assinaturas Autentique */}
      {enviado && (
        <div className="mb-4 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Status das Assinaturas
                {isTce && <span className="ml-2 text-[#0f2a5e] normal-case font-normal">(3 obrigatórias para ativar o estágio)</span>}
              </p>
              {assinado && doc?.signedUrl && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={visualizarAssinado}
                    className="text-xs text-slate-500 font-bold hover:underline flex items-center gap-1"
                  >
                    👁 Visualizar
                  </button>
                  <button
                    onClick={downloadAssinado}
                    className="text-xs text-[#0f2a5e] font-bold hover:underline flex items-center gap-1"
                  >
                    ⬇ Baixar PDF
                  </button>
                </div>
              )}
            </div>

            {autentiqueSigners.length === 0 ? (
              <p className="text-sm text-slate-400">Clique em "Verificar Assinaturas" para atualizar o status.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {autentiqueSigners.map((signer: any, i: number) => {
                  const isRejected = !!signer.rejected;
                  const isSigned   = !!signer.signed;
                  const isViewed   = !!signer.viewed;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        isRejected
                          ? "border-red-400 bg-red-50 text-red-700"
                          : isSigned
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : isViewed
                          ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className="text-base">
                        {isRejected ? "❌" : isSigned ? "✅" : isViewed ? "👁" : "⏳"}
                      </span>
                      <div>
                        {signer.label && (
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">{signer.label}</p>
                        )}
                        <p className="text-xs font-bold">{signer.name || signer.email}</p>
                        <p className="text-[10px] font-normal text-slate-400">{signer.email}</p>
                        {isSigned && signer.signedAt && (
                          <p className="text-[10px] font-normal text-emerald-600">
                            Assinado em {new Date(signer.signedAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {isRejected && signer.rejectedAt && (
                          <p className="text-[10px] font-normal text-red-500">
                            Recusado em {new Date(signer.rejectedAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {isViewed && !isSigned && !isRejected && (
                          <p className="text-[10px] font-normal text-yellow-600">Visualizado — aguardando</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!assinado && (
              <p className="text-[10px] text-slate-400 mt-3">
                Os signatários receberam o link por e-mail. Use "Verificar Assinaturas" para atualizar o status.
              </p>
            )}
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
          {isTr && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              ⚠️ O estágio ficará <strong>INATIVO</strong> a partir do envio para assinatura (não ao gerar).
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExtraModal(false)}>Cancelar</Button>
            <Button onClick={() => gerarDoc(extraFields)} disabled={loading}>{loading?"Gerando...":"Gerar Documento"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Autentique — envio para assinatura digital */}
      <Modal open={autentiqueModal} onClose={() => setAutentiqueModal(false)} title="Enviar para Assinatura via Autentique">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {isTce
              ? <>A <strong>TCE</strong> requer <strong>3 assinaturas obrigatórias</strong>. O estágio será ativado automaticamente quando todos assinarem.</>
              : isTr
              ? <>O <strong>Termo de Rescisão</strong> será enviado para assinatura. O estágio ficará <strong>INATIVO</strong> imediatamente após o envio.</>
              : <>Informe os e-mails dos signatários para <strong>{doc?.titulo}</strong>. Cada pessoa receberá um link único por e-mail.</>
            }
          </p>

          {autentiqueSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
              ✅ {autentiqueSuccess}
            </div>
          ) : (
            <>
              {isTce ? (
                /* TCE: 3 slots fixos com labels */
                <div className="space-y-3">
                  {TCE_SIGNERS.map(slot => (
                    <div key={slot.key}>
                      <label className="text-xs font-bold text-slate-600 block mb-1">{slot.label}</label>
                      <input
                        type="email"
                        placeholder={slot.placeholder}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                        value={tceEmails[slot.key] || ""}
                        onChange={e => setTceEmails(p => ({ ...p, [slot.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Outros documentos: lista dinâmica */
                <>
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
                </>
              )}

              <div className={`p-3 border rounded-xl text-xs ${isTr ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                {isTr
                  ? "⚠️ O estágio será marcado como INATIVO imediatamente após o envio para assinatura."
                  : "🔐 O documento será enviado via Autentique para assinatura digital com validade jurídica."}
              </div>

              {alertas.length > 0 && alertas.map((a,i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{a}</div>
              ))}

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
