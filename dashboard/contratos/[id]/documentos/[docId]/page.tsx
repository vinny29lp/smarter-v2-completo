"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

// Extra fields per document type
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

export default function DocumentoPage({
  params,
}: {
  params: { id: string; docId: string };
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<any>(null);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [extraModal, setExtraModal] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);
  const [extraFields, setExtraFields] = useState<Record<string,string>>({});
  const [alertas, setAlertas] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`)
      .then(r => r.json())
      .then(d => { setDoc(d.document); if (d.document?.htmlContent) setHtml(d.document.htmlContent); })
      .catch(() => {});
  }, [params.id, params.docId]);

  const extraDefs = doc ? (EXTRA_FIELDS[doc.tipo] || []) : [];
  const needsExtra = extraDefs.length > 0;

  const gerarDoc = async (extraData?: Record<string,any>) => {
    setLoading(true);
    const res = await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extraData || extraFields),
    });
    const data = await res.json();
    if (data.error) { setAlertas([data.error]); setLoading(false); return; }
    setDoc(data.document);
    setHtml(data.html);
    setExtraModal(false);
    setLoading(false);
  };

  const handleGerar = () => {
    if (needsExtra) { setExtraModal(true); }
    else { gerarDoc(); }
  };

  const downloadHTML = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc?.titulo?.replace(/\s+/g,"-") || "documento"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDoc = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  const enviarAssinatura = async () => {
    await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AGUARDANDO_ASSINATURA" }),
    });
    setDoc((p:any) => ({ ...p, status: "AGUARDANDO_ASSINATURA" }));
    setAssinaturaModal(false);
  };

  const marcarAssinado = async () => {
    await fetch(`/api/app/contratos/${params.id}/documentos/${params.docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ASSINADO" }),
    });
    setDoc((p:any) => ({ ...p, status: "ASSINADO" }));
  };

  const gerado = doc && doc.status !== "NAO_GERADO" && doc.status !== "RASCUNHO";

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/contratos/${params.id}`} className="text-slate-400 hover:text-slate-600 text-sm">
            ← Contrato
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-black text-slate-800">{doc?.titulo || "Carregando..."}</h1>
          {doc && <Badge variant={(STATUS_BADGE[doc.status] || "gray") as any}>{STATUS_LABEL[doc.status] || doc.status}</Badge>}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGerar} disabled={loading}>
            {loading ? "Gerando..." : gerado ? "🔄 Regerar" : "📄 Gerar"}
          </Button>
          {gerado && (
            <>
              <Button variant="secondary" onClick={downloadHTML}><span>⬇</span> Baixar HTML</Button>
              <Button variant="secondary" onClick={printDoc}>🖨 Imprimir/PDF</Button>
            </>
          )}
          {gerado && doc.status === "GERADO" && (
            <Button variant="secondary" onClick={() => setAssinaturaModal(true)}>✉️ Enviar Assinatura</Button>
          )}
          {doc?.status === "AGUARDANDO_ASSINATURA" && (
            <Button variant="yellow" onClick={marcarAssinado}>✓ Marcar Assinado</Button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-4 space-y-2 flex-shrink-0">
          {alertas.map((a, i) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              ⚠️ {a}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {html ? (
        <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full min-h-[700px]"
            title="Preview do documento"
          />
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
                <select
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={extraFields[field.key] || ""}
                  onChange={e => setExtraFields(p => ({ ...p, [field.key]: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {field.options?.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                  value={extraFields[field.key] || ""}
                  onChange={e => setExtraFields(p => ({ ...p, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExtraModal(false)}>Cancelar</Button>
            <Button onClick={() => gerarDoc(extraFields)} disabled={loading}>
              {loading ? "Gerando..." : "Gerar Documento"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal envio assinatura */}
      <Modal open={assinaturaModal} onClose={() => setAssinaturaModal(false)} title="Enviar para Assinatura Digital">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Confirma o envio de <strong>{doc?.titulo}</strong> para assinatura digital?</p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            🔐 O envio real será feito via <strong>Authentique</strong>. Configure a API em Configurações → Assinaturas para ativar.
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAssinaturaModal(false)}>Cancelar</Button>
            <Button onClick={enviarAssinatura}>Confirmar Envio ✉️</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
