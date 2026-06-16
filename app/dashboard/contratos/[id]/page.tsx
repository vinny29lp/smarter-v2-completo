"use client";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

const statusBadge: Record<string,string> = {ATIVO:"green",PENDENTE:"yellow",AGUARDANDO_ASSINATURA:"blue",VENCIDO:"red",FINALIZADO:"gray",SUSPENSO:"red",INATIVO:"gray"};
const docStatusBadge: Record<string,string> = {NAO_GERADO:"gray",RASCUNHO:"yellow",GERADO:"purple",ENVIADO_ASSINATURA:"blue",AGUARDANDO_ASSINATURA:"blue",ASSINADO:"green",CANCELADO:"red"};
const docStatusLabel: Record<string,string> = {NAO_GERADO:"Não Gerado",RASCUNHO:"Rascunho",GERADO:"Gerado",ENVIADO_ASSINATURA:"Enviado",AGUARDANDO_ASSINATURA:"Aguardando",ASSINADO:"Assinado ✓",CANCELADO:"Cancelado"};

const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ContratoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [rescisaoModal, setRescisaoModal] = useState(false);
  const [rescisao, setRescisao] = useState<{
    ultimoDia: string;
    motivo: string;
    descontos: Array<{descricao: string; valor: number}>;
  }>({ ultimoDia: "", motivo: "", descontos: [] });
  const [calc, setCalc] = useState<any>(null);
  const [gerandoRecibo, setGerandoRecibo] = useState(false);
  const [reciboGerado, setReciboGerado] = useState(false);
  const [reciboError, setReciboError] = useState<string | null>(null);
  const [enviandoAval, setEnviandoAval] = useState(false);
  const [avalMsg, setAvalMsg] = useState<string|null>(null);

  // ── Editar / Excluir ─────────────────────────────────────────────
  const [editModal, setEditModal]   = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [actionMsg, setActionMsg]   = useState<string|null>(null);
  const [editForm, setEditForm]     = useState<Record<string,any>>({});
  const setF = (k: string, v: any) => setEditForm(p => ({ ...p, [k]: v }));

  // ── Migração / Documentos Físicos ─────────────────────────────────
  const [migMsg, setMigMsg] = useState<string | null>(null);
  const [migLoading, setMigLoading] = useState(false);
  const [ativandoMig, setAtivandoMig] = useState(false);
  const [docNome, setDocNome] = useState("");
  const tceFileRef = useRef<HTMLInputElement>(null);

  const uploadTCEMigrada = async (file: File) => {
    setMigMsg(null);
    setMigLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let bin = "";
      bytes.forEach(b => (bin += String.fromCharCode(b)));
      const base64 = `data:application/pdf;base64,${btoa(bin)}`;
      const nomeEnviar = docNome.trim() || file.name;
      const res = await fetch(`/api/app/contratos/${params.id}/migrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcePdfBase64: base64, nomeArquivo: nomeEnviar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao anexar documento.");
      setMigMsg("✅ Documento anexado com sucesso!");
      setDocNome("");
      if (tceFileRef.current) tceFileRef.current.value = "";
      const updated = await fetch(`/api/app/contratos/${params.id}`).then(r => r.json());
      setContract(updated.contract || updated);
    } catch (e: any) {
      setMigMsg("❌ " + (e.message || "Erro ao anexar documento."));
    } finally {
      setMigLoading(false);
    }
  };

  const ativarEstagioMigrado = async () => {
    if (!confirm("Confirma a ativação do estágio migrado? O status será alterado para ATIVO sem gerar documentos.")) return;
    setAtivandoMig(true);
    setMigMsg(null);
    try {
      const res = await fetch(`/api/app/contratos/${params.id}/ativar-migracao`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao ativar.");
      setMigMsg("✅ Estágio ativado com sucesso!");
      const updated = await fetch(`/api/app/contratos/${params.id}`).then(r => r.json());
      setContract(updated.contract || updated);
    } catch (e: any) {
      setMigMsg("❌ " + (e.message || "Erro ao ativar estágio."));
    } finally {
      setAtivandoMig(false);
    }
  };

  const abrirEdit = () => {
    if (!contract) return;
    setEditForm({
      status:          contract.status || "PENDENTE",
      bolsa:           String(contract.bolsa || ""),
      valorEmpresa:    String(contract.valorEmpresa || ""),
      auxTransporte:   String(contract.auxTransporte || ""),
      dataInicio:      contract.dataInicio ? new Date(contract.dataInicio).toISOString().slice(0,10) : "",
      dataFim:         contract.dataFim    ? new Date(contract.dataFim).toISOString().slice(0,10)    : "",
      horarioInicio:   contract.horarioInicio || "08:00",
      horarioFim:      contract.horarioFim    || "14:00",
      chDiaria:        String(contract.chDiaria || "6"),
      chSemanal:       String(contract.chSemanal || "30"),
      diasSemana:      contract.diasSemana || "Segunda a Sexta",
      supervisorNome:  contract.supervisorNome  || "",
      supervisorCargo: contract.supervisorCargo || "",
      supervisorEmail: contract.supervisorEmail || "",
      supervisorTel:   contract.supervisorTel   || "",
      apoliceSeguro:   contract.apoliceSeguro   || "",
      seguradora:      contract.seguradora      || "",
      localEstagio:    contract.localEstagio    || "",
      atividades:      contract.atividades      || "",
    });
    setActionMsg(null);
    setEditModal(true);
  };

  const salvarEdicao = async () => {
    setSaving(true); setActionMsg(null);
    const res = await fetch(`/api/app/contratos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setActionMsg("❌ " + data.error); return; }
    setActionMsg("✅ Contrato atualizado com sucesso!");
    // Recarrega dados do contrato
    const updated = await fetch(`/api/app/contratos/${params.id}`).then(r => r.json());
    setContract(updated.contract || updated);
    setTimeout(() => { setEditModal(false); setActionMsg(null); }, 1500);
  };

  const excluirContrato = async () => {
    setDeleting(true);
    const res = await fetch(`/api/app/contratos/${params.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (data.error) { alert("Erro: " + data.error); return; }
    setDeleteModal(false);
    router.push("/dashboard/contratos");
    router.refresh();
  };

  useEffect(() => {
    fetch(`/api/app/contratos/${params.id}`)
      .then(r => {
        if (!r.ok) throw new Error(`Erro ${r.status} ao carregar contrato.`);
        return r.json();
      })
      .then(d => {
        if (d.error) throw new Error(d.error);
        setContract(d.contract || d);
      })
      .catch(e => setLoadError(e.message || "Erro ao carregar contrato."));
  }, [params.id]);

  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-red-500 font-semibold">⚠️ {loadError}</p>
      <Link href="/dashboard/contratos" className="text-sm text-[#0f2a5e] hover:underline">← Voltar para contratos</Link>
    </div>
  );

  if (!contract) return (
    <div className="flex items-center justify-center h-48 text-slate-400">Carregando contrato...</div>
  );

  const docsFisicos = contract.documents?.filter((d: any) => d.tipo === "FISICO") || [];
  const docsDigitais = contract.documents?.filter((d: any) => d.tipo !== "FISICO") || [];
  const assinados = docsDigitais.filter((d: any) => d.status === "ASSINADO").length;

  // ── Calculadora de Rescisão ──────────────────────────────────────────
  const calcularRescisao = async () => {
    if (!rescisao.ultimoDia || gerandoRecibo) return;
    const inicio = new Date(contract.dataInicio);
    const ultimo = new Date(rescisao.ultimoDia);

    const mesesTrabalhados = (ultimo.getFullYear() - inicio.getFullYear()) * 12 +
      (ultimo.getMonth() - inicio.getMonth());
    const diasTrabalhados = Math.round((ultimo.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasNoMes = new Date(ultimo.getFullYear(), ultimo.getMonth() + 1, 0).getDate();
    const diasProporcional = ultimo.getDate();

    const bolsaMensal = contract.bolsa || 0;
    const bolsaProporcional = (bolsaMensal / diasNoMes) * diasProporcional;

    // 1/12 avos: 1/12 da bolsa por cada mês trabalhado (total de meses, sem módulo)
    const dozeavos = (bolsaMensal / 12) * mesesTrabalhados;

    const totalBruto = bolsaProporcional + dozeavos;
    const totalDescontos = rescisao.descontos.reduce((s, d) => s + (d.valor || 0), 0);

    const newCalc = {
      diasTrabalhados,
      mesesTrabalhados,
      diasProporcional,
      bolsaProporcional,
      dozeavos,
      totalBruto,
      totalDescontos,
      totalLiquido: totalBruto - totalDescontos,
    };
    setCalc(newCalc);

    // Gerar e salvar o Recibo de Rescisão (tipo "rr")
    setGerandoRecibo(true);
    setReciboError(null);
    setReciboGerado(false);
    try {
      const rrDoc = contract.documents?.find((d: any) => d.tipo === "rr");
      if (!rrDoc) throw new Error("Documento de recibo não encontrado no contrato");

      const res = await fetch(`/api/app/contratos/${contract.id}/documentos/${rrDoc.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diasBolsa: newCalc.diasProporcional,
          mesesTrabalhados: newCalc.mesesTrabalhados,
          descontos: rescisao.descontos,
          dozeavos: newCalc.dozeavos,
          ultimoDia: rescisao.ultimoDia,
          motivo: rescisao.motivo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar recibo");

      // Abre o recibo em nova aba
      const w = window.open("", "_blank");
      if (w) { w.document.write(data.html); w.document.close(); }

      // Recarrega contrato para atualizar status do documento
      const updated = await fetch(`/api/app/contratos/${params.id}`).then(r => r.json());
      setContract(updated.contract || updated);
      setReciboGerado(true);
    } catch (e: any) {
      setReciboError(e.message || "Erro ao gerar recibo de rescisão");
    } finally {
      setGerandoRecibo(false);
    }
  };

  const downloadDoc = (docId: string, titulo: string) => {
    const doc = contract.documents?.find((d: any) => d.id === docId);
    if (!doc?.htmlContent) {
      alert("Documento ainda não gerado. Gere o documento primeiro.");
      return;
    }
    const blob = new Blob([doc.htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDoc = (docId: string) => {
    const doc = contract.documents?.find((d: any) => d.id === docId);
    if (!doc?.htmlContent) { alert("Documento ainda não gerado."); return; }
    const w = window.open("", "_blank");
    if (w) { w.document.write(doc.htmlContent); w.document.close(); w.print(); }
  };

  const enviarAvaliacao = async () => {
    setEnviandoAval(true); setAvalMsg(null);
    const res = await fetch(`/api/app/contratos/${params.id}/enviar-avaliacao`, { method: "POST" });
    const data = await res.json();
    setEnviandoAval(false);
    if (data.error) {
      setAvalMsg("❌ " + data.error);
    } else {
      setAvalMsg(`✅ E-mail enviado para ${data.emailEnviado}`);
    }
    setTimeout(() => setAvalMsg(null), 5000);
  };

  // Docs chave
  const tceDoc  = contract.documents?.find((d: any) => d.tipo === "tce");
  const peDoc   = contract.documents?.find((d: any) => d.tipo === "pe");
  const trDoc   = contract.documents?.find((d: any) => d.tipo === "tr");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/contratos" className="text-slate-400 hover:text-slate-600 text-sm">← Contratos</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-black text-slate-800">{contract.student?.name}</h1>
          <Badge variant={(statusBadge[contract.status || "PENDENTE"]||"gray") as any}>{contract.status}</Badge>
          {contract.origem === "MIGRADO" && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">MIGRADO</span>
          )}
          {contract.numero && <span className="text-xs font-mono text-slate-400">#{contract.numero}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={abrirEdit}>✏️ Editar Estágio</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>🗑️ Excluir</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Bolsa", fmt(contract.bolsa)],
          ["Início", new Date(contract.dataInicio).toLocaleDateString("pt-BR")],
          ["Término", new Date(contract.dataFim).toLocaleDateString("pt-BR")],
          ["Docs", `${assinados}/${docsDigitais.length} assinados`],
        ].map(([l,v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-slate-400">{l}</p><p className="font-black text-sm mt-1">{v}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Estagiário</h3>
          <p className="font-semibold text-sm">{contract.student?.name}</p>
          <p className="text-xs text-slate-400">{contract.student?.email}</p>
          <p className="text-xs text-slate-400 mt-1">{contract.student?.curso} • {contract.student?.periodo}º período</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Empresa</h3>
          <p className="font-semibold text-sm">{contract.company?.name}</p>
          <p className="text-xs text-slate-400">{contract.company?.email}</p>
          {contract.supervisorNome && <p className="text-xs text-slate-400 mt-1">Supervisor: {contract.supervisorNome}</p>}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Jornada</h3>
          <p className="text-xs text-slate-600">{contract.diasSemana}</p>
          <p className="text-xs text-slate-600">{contract.horarioInicio} — {contract.horarioFim}</p>
          <p className="text-xs text-slate-600">{contract.chSemanal}h/sem • {contract.chDiaria}h/dia</p>
          {contract.apoliceSeguro && <p className="text-xs text-slate-400 mt-1">Seguro: {contract.apoliceSeguro}</p>}
        </Card>
      </div>

      {/* Downloads rápidos */}
      <Card className="p-5 mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">⬇ Downloads Rápidos</h3>
        <div className="flex flex-wrap gap-2">
          {tceDoc && (
            <>
              <Button variant="secondary" size="sm" onClick={() => downloadDoc(tceDoc.id, "TCE-Termo-de-Compromisso")}>
                ⬇ TCE {tceDoc.status === "ASSINADO" ? "✓" : ""}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => printDoc(tceDoc.id)}>🖨 Imprimir TCE</Button>
            </>
          )}
          {peDoc && (
            <Button variant="secondary" size="sm" onClick={() => downloadDoc(peDoc.id, "Plano-de-Estagio")}>
              ⬇ Plano de Estágio {peDoc.status === "ASSINADO" ? "✓" : ""}
            </Button>
          )}
          {trDoc && trDoc.status !== "NAO_GERADO" && (
            <Button variant="secondary" size="sm" onClick={() => downloadDoc(trDoc.id, "Rescisao-TCE")}>
              ⬇ Rescisão
            </Button>
          )}
          {contract.status === "ATIVO" && (
            <Button variant="ghost" size="sm" onClick={() => setRescisaoModal(true)}>
              🧮 Calcular Rescisão
            </Button>
          )}
        </div>
      </Card>

      {/* Lista documentos */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">📄 Documentos do Estágio</h3>
          <p className="text-xs text-slate-400">{assinados} de {docsDigitais.length} assinados</p>
        </div>
        <div className="space-y-2">
          {docsDigitais.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div>
                <p className="text-sm font-semibold">{doc.titulo}</p>
                <p className="text-xs text-slate-400">
                  {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString("pt-BR") : "-"}
                  {doc.status === "ASSINADO" && doc.signedAt && (
                    <span className="ml-2 text-emerald-600 font-semibold">
                      • Assinado em {new Date(doc.signedAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={(docStatusBadge[doc.status || "NAO_GERADO"]||"gray") as any}>
                  {docStatusLabel[doc.status || "NAO_GERADO"]}
                </Badge>
                {doc.htmlContent && (
                  <button
                    onClick={() => downloadDoc(doc.id, doc.titulo)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                    title="Baixar HTML"
                  >⬇</button>
                )}
                <Link href={`/dashboard/contratos/${contract.id}/documentos/${doc.id}`}
                  className="text-xs bg-[#0f2a5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a3d8f] transition-colors font-semibold">
                  {doc.status === "NAO_GERADO" ? "Gerar" : "Ver"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Avaliação Semestral Online */}
      <Card className="p-5 mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-1">📋 Avaliação Semestral</h3>
        <p className="text-xs text-slate-400 mb-4">Conforme Lei 11.788/2008, art. 7º. O formulário é enviado por e-mail para a empresa preencher no portal deles.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={enviarAvaliacao}
            disabled={enviandoAval}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors disabled:opacity-50"
          >
            {enviandoAval ? "Enviando..." : "📧 Enviar Avaliação por E-mail"}
          </button>
          <a
            href={`/portal-empresa/avaliacoes?contrato=${params.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            🔗 Abrir Formulário Diretamente
          </a>
        </div>
        {avalMsg && (
          <p className={`mt-3 text-xs p-2 rounded-lg ${avalMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {avalMsg}
          </p>
        )}
        {contract.evaluations?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-2">{contract.evaluations.length} avaliação(ões) respondida(s)</p>
            {contract.evaluations.slice(0, 5).map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-2">
                <p className="text-xs text-slate-500 flex-1">
                  {ev.respondidoAt ? new Date(ev.respondidoAt).toLocaleDateString("pt-BR") : new Date(ev.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <Badge variant={ev.status === "respondido" ? "green" : "yellow"}>
                  {ev.status === "respondido" ? "Respondida" : "Pendente"}
                </Badge>
                {ev.status === "respondido" && (
                  <a
                    href={`/api/app/contratos/${params.id}/avaliacoes/${ev.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    📄 PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {contract.atividades && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Atividades do Estágio</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{contract.atividades}</p>
        </Card>
      )}

      {/* ── MÓDULO DOCUMENTOS FÍSICOS / ATIVAR ESTÁGIO — visível para todas as unidades ── */}
      <Card className="p-5 mb-5 border-2 border-amber-200 bg-amber-50/30">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📎</span>
          <h3 className="text-sm font-bold text-slate-700">Documentos Físicos / Ativar Estágio</h3>
          {contract.origem === "MIGRADO" && (
            <span className="ml-auto px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
              MIGRADO
            </span>
          )}
        </div>

        {/* Documentos físicos já anexados */}
        {(docsFisicos.length > 0 || contract.tceMigradaUrl) && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold text-slate-600">Documentos Físicos Anexados:</p>
            {/* Legado: tceMigradaUrl do sistema antigo */}
            {contract.tceMigradaUrl && (
              <div className="flex items-center justify-between p-2.5 bg-white border border-amber-100 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-slate-700">TCE Assinada (sistema antigo)</p>
                  {contract.migradoEm && (
                    <p className="text-xs text-slate-400">{new Date(contract.migradoEm).toLocaleDateString("pt-BR")}</p>
                  )}
                </div>
                <a href={contract.tceMigradaUrl} download="TCE-migrada.pdf"
                  className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold">
                  ⬇ Baixar PDF
                </a>
              </div>
            )}
            {/* Novos documentos físicos */}
            {docsFisicos.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-amber-100 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{doc.titulo}</p>
                  <p className="text-xs text-slate-400">
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString("pt-BR") : "-"}
                  </p>
                </div>
                {doc.pdfUrl && (
                  <a href={doc.pdfUrl} download={`${doc.titulo}.pdf`}
                    className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold">
                    ⬇ Baixar PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload de novo documento físico */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-600 mb-2">Anexar Documento Assinado Fisicamente (PDF):</p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Nome do documento (ex: TCE Assinada, Termo Aditivo, Termo de Rescisão...)"
              value={docNome}
              onChange={e => setDocNome(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400 bg-white"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => tceFileRef.current?.click()}
                disabled={migLoading}
                className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-amber-400 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {migLoading ? "Enviando..." : "📎 Anexar Documento"}
              </button>
              <input
                ref={tceFileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadTCEMigrada(f); }}
              />
              <span className="text-xs text-slate-400">Apenas PDF • pode anexar vários</span>
            </div>
          </div>
        </div>

        {/* Botão Ativar Estágio */}
        <div className="flex items-center gap-3 pt-3 border-t border-amber-100">
          <button
            onClick={ativarEstagioMigrado}
            disabled={ativandoMig || contract.status === "ATIVO"}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            {ativandoMig ? "Ativando..." : contract.status === "ATIVO" ? "✓ Estágio Ativo" : "⚡ Ativar Estágio"}
          </button>
          <p className="text-xs text-slate-400">
            {contract.status === "ATIVO"
              ? "Estágio já está ativo."
              : "Ativa o estágio sem necessidade de assinatura digital."}
          </p>
        </div>

        {migMsg && (
          <p className={`mt-3 text-xs p-2 rounded-lg ${migMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {migMsg}
          </p>
        )}
      </Card>

      {/* Modal: Editar Estágio */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="✏️ Editar Estágio" size="xl">
        <div className="space-y-5">

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
            <select value={editForm.status} onChange={e => setF("status", e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]">
              {["PENDENTE","ATIVO","AGUARDANDO_ASSINATURA","FINALIZADO","VENCIDO","INATIVO","SUSPENSO"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Valores financeiros */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Bolsa (R$)</label>
              <input type="number" step="0.01" value={editForm.bolsa} onChange={e => setF("bolsa", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]" placeholder="0.00"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Valor Empresa (R$)</label>
              <input type="number" step="0.01" value={editForm.valorEmpresa} onChange={e => setF("valorEmpresa", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]" placeholder="0.00"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Aux. Transporte (R$)</label>
              <input type="number" step="0.01" value={editForm.auxTransporte} onChange={e => setF("auxTransporte", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]" placeholder="0.00"/>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Início</label>
              <input type="date" value={editForm.dataInicio} onChange={e => setF("dataInicio", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Término</label>
              <input type="date" value={editForm.dataFim} onChange={e => setF("dataFim", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>

          {/* Horário e CH */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Horário Início</label>
              <input type="time" value={editForm.horarioInicio} onChange={e => setF("horarioInicio", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Horário Fim</label>
              <input type="time" value={editForm.horarioFim} onChange={e => setF("horarioFim", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">CH Diária (h)</label>
              <input type="number" value={editForm.chDiaria} onChange={e => setF("chDiaria", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">CH Semanal (h)</label>
              <input type="number" value={editForm.chSemanal} onChange={e => setF("chSemanal", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>

          {/* Dias da semana */}
          {(() => {
            const DIAS_PRESETS_EDIT = [
              "Segunda a Sexta","Segunda a Sábado","Terça a Sábado","Terça a Domingo",
              "Quarta a Sábado","Quarta a Domingo","Quinta a Segunda","Sexta a Terça",
              "Sábado a Quarta","Domingo a Quinta",
            ];
            const isPreset = DIAS_PRESETS_EDIT.includes(editForm.diasSemana);
            const selectVal = isPreset ? editForm.diasSemana : "Personalizado";
            return (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Dias da Semana</label>
                <select
                  value={selectVal}
                  onChange={e => {
                    const v = e.target.value;
                    if (v !== "Personalizado") setF("diasSemana", v);
                    else setF("diasSemana", "");
                  }}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                >
                  {[...DIAS_PRESETS_EDIT, "Personalizado"].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {selectVal === "Personalizado" && (
                  <input type="text" value={editForm.diasSemana} onChange={e => setF("diasSemana", e.target.value)}
                    placeholder="Ex: Quarta a Sexta, Seg/Qua/Sex..."
                    className="w-full border-2 border-blue-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
                )}
              </div>
            );
          })()}

          {/* Supervisor */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Supervisor da Empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome</label>
                <input type="text" value={editForm.supervisorNome} onChange={e => setF("supervisorNome", e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Cargo</label>
                <input type="text" value={editForm.supervisorCargo} onChange={e => setF("supervisorCargo", e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">E-mail</label>
                <input type="email" value={editForm.supervisorEmail} onChange={e => setF("supervisorEmail", e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Telefone</label>
                <input type="text" value={editForm.supervisorTel} onChange={e => setF("supervisorTel", e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
              </div>
            </div>
          </div>

          {/* Seguro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Apólice de Seguro</label>
              <input type="text" value={editForm.apoliceSeguro} onChange={e => setF("apoliceSeguro", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Seguradora</label>
              <input type="text" value={editForm.seguradora} onChange={e => setF("seguradora", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
            </div>
          </div>

          {/* Local e atividades */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Local do Estágio</label>
            <input type="text" value={editForm.localEstagio} onChange={e => setF("localEstagio", e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Atividades do Estágio</label>
            <textarea value={editForm.atividades} onChange={e => setF("atividades", e.target.value)}
              rows={3} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] resize-none"/>
          </div>

          {actionMsg && (
            <div className={`text-xs p-2 rounded-lg ${actionMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {actionMsg}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={saving} className="flex-1 justify-center">
              {saving ? "Salvando..." : "✅ Salvar Alterações"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Exclusão */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="🗑️ Excluir Estágio">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-800">⚠️ Atenção: Ação Irreversível</p>
            <p className="text-sm text-red-700 mt-1">
              Isso irá excluir permanentemente o contrato de <strong>{contract.student?.name}</strong> na empresa <strong>{contract.company?.name}</strong>, incluindo todos os documentos, avaliações e registros financeiros vinculados.
            </p>
          </div>
          <p className="text-sm text-slate-600">Tem certeza que deseja excluir este estágio?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button variant="danger" onClick={excluirContrato} disabled={deleting} className="flex-1 justify-center">
              {deleting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Calculadora de Rescisão */}
      <Modal
        open={rescisaoModal}
        onClose={() => {
          setRescisaoModal(false);
          setCalc(null);
          setReciboGerado(false);
          setReciboError(null);
          setRescisao({ ultimoDia: "", motivo: "", descontos: [] });
        }}
        title="🧮 Calculadora de Rescisão"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Calcule os valores proporcionais para rescisão do estágio de <strong>{contract.student?.name}</strong>.
          </p>

          {/* Recibo anterior salvo */}
          {(() => {
            const rrDoc = contract.documents?.find((d: any) => d.tipo === "rr");
            if (rrDoc?.htmlContent) {
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Recibo anterior salvo</span>
                    {rrDoc.updatedAt && ` — ${new Date(rrDoc.updatedAt).toLocaleDateString("pt-BR")}`}
                  </p>
                  <button
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (w) { w.document.write(rrDoc.htmlContent); w.document.close(); }
                    }}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    📄 Abrir Recibo Salvo
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Campos principais */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Último dia de estágio *</label>
              <input
                type="date"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                value={rescisao.ultimoDia}
                onChange={e => setRescisao(p => ({ ...p, ultimoDia: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Motivo</label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                value={rescisao.motivo}
                placeholder="Iniciativa do estudante"
                onChange={e => setRescisao(p => ({ ...p, motivo: e.target.value }))}
              />
            </div>
          </div>

          {/* Seção de Descontos */}
          <div className="border-2 border-slate-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">Descontos</label>
              <button
                type="button"
                onClick={() => setRescisao(p => ({ ...p, descontos: [...p.descontos, { descricao: "", valor: 0 }] }))}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-semibold transition-colors"
              >
                + Adicionar Desconto
              </button>
            </div>
            {rescisao.descontos.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nenhum desconto. Clique em "+ Adicionar Desconto" para incluir.</p>
            )}
            {rescisao.descontos.map((d, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Descrição (ex: Vale Transporte)"
                  className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
                  value={d.descricao}
                  onChange={e => {
                    const descs = [...rescisao.descontos];
                    descs[i] = { ...descs[i], descricao: e.target.value };
                    setRescisao(p => ({ ...p, descontos: descs }));
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-28 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"
                  value={d.valor || ""}
                  onChange={e => {
                    const descs = [...rescisao.descontos];
                    descs[i] = { ...descs[i], valor: parseFloat(e.target.value) || 0 };
                    setRescisao(p => ({ ...p, descontos: descs }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRescisao(p => ({ ...p, descontos: p.descontos.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-600 font-bold px-2 text-base"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <Button onClick={calcularRescisao} disabled={!rescisao.ultimoDia || gerandoRecibo}>
            {gerandoRecibo ? "⏳ Gerando recibo..." : "🧮 Calcular e Gerar Recibo"}
          </Button>

          {calc && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resultado do Cálculo</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Período:</span>
                  <span className="font-semibold">{calc.mesesTrabalhados} meses ({calc.diasTrabalhados} dias)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bolsa proporcional ({calc.diasProporcional} dias):</span>
                  <span className="font-semibold text-emerald-600">{fmt(calc.bolsaProporcional)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">1/12 avos ({calc.mesesTrabalhados} meses):</span>
                  <span className="font-semibold text-emerald-600">{fmt(calc.dozeavos)}</span>
                </div>
                {calc.totalDescontos > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">(-) Descontos:</span>
                    <span className="font-semibold text-red-500">- {fmt(calc.totalDescontos)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-700">Total a Receber:</span>
                <span className="text-xl font-black text-[#0f2a5e]">{fmt(calc.totalLiquido)}</span>
              </div>
              <p className="text-xs text-slate-400">
                * Bolsa mensal: {fmt(contract.bolsa)} • Revise com o contador.
              </p>

              {/* Status da geração do recibo */}
              {reciboGerado && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-emerald-700 font-semibold">✅ Recibo gerado e salvo com sucesso!</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const rrDoc = contract.documents?.find((d: any) => d.tipo === "rr");
                        if (rrDoc?.htmlContent) {
                          const w = window.open("", "_blank");
                          if (w) { w.document.write(rrDoc.htmlContent); w.document.close(); }
                        }
                      }}
                      className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                    >
                      📄 Abrir Recibo
                    </button>
                    <button
                      onClick={() => {
                        const trDocLocal = contract.documents?.find((d: any) => d.tipo === "tr");
                        if (trDocLocal) {
                          window.location.href = `/dashboard/contratos/${contract.id}/documentos/${trDocLocal.id}`;
                        }
                      }}
                      className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                    >
                      📋 Ir para Termo de Rescisão
                    </button>
                  </div>
                </div>
              )}
              {reciboError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">❌ {reciboError}</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
