"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

const statusBadge: Record<string,string> = {ATIVO:"green",PENDENTE:"yellow",AGUARDANDO_ASSINATURA:"blue",VENCIDO:"red",FINALIZADO:"gray",SUSPENSO:"red",INATIVO:"gray"};
const docStatusBadge: Record<string,string> = {NAO_GERADO:"gray",RASCUNHO:"yellow",GERADO:"purple",ENVIADO_ASSINATURA:"blue",AGUARDANDO_ASSINATURA:"blue",ASSINADO:"green",CANCELADO:"red"};
const docStatusLabel: Record<string,string> = {NAO_GERADO:"Não Gerado",RASCUNHO:"Rascunho",GERADO:"Gerado",ENVIADO_ASSINATURA:"Enviado",AGUARDANDO_ASSINATURA:"Aguardando",ASSINADO:"Assinado ✓",CANCELADO:"Cancelado"};

const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export default function ContratoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [rescisaoModal, setRescisaoModal] = useState(false);
  const [rescisao, setRescisao] = useState({ ultimoDia: "", motivo: "" });
  const [calc, setCalc] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/app/contratos/${params.id}`)
      .then(r => r.json())
      .then(d => setContract(d.contract || d));
  }, [params.id]);

  if (!contract) return (
    <div className="flex items-center justify-center h-48 text-slate-400">Carregando...</div>
  );

  const assinados = contract.documents?.filter((d: any) => d.status === "ASSINADO").length || 0;

  // ── Calculadora de Rescisão ──────────────────────────────────────────
  const calcularRescisao = () => {
    if (!rescisao.ultimoDia) return;
    const inicio = new Date(contract.dataInicio);
    const ultimo = new Date(rescisao.ultimoDia);

    const mesesTrabalhados = (ultimo.getFullYear() - inicio.getFullYear()) * 12 +
      (ultimo.getMonth() - inicio.getMonth());
    const diasTrabalhados = Math.round((ultimo.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasNoMes = new Date(ultimo.getFullYear(), ultimo.getMonth() + 1, 0).getDate();
    const diasProporcional = ultimo.getDate();

    const bolsaMensal = contract.bolsa || 0;
    const bolsaProporcional = (bolsaMensal / diasNoMes) * diasProporcional;

    // Recesso: 30 dias a cada 12 meses trabalhados (proporcional)
    const recessoProporcional = (mesesTrabalhados % 12 === 0)
      ? (30 / 12) * 12  // mês completo
      : (30 / 12) * (mesesTrabalhados % 12);
    const recessoValor = (bolsaMensal / 30) * recessoProporcional;

    // 1/12 avos = 1 mês de bolsa por ano de contrato (proporcional)
    const dozeavos = (bolsaMensal / 12) * (mesesTrabalhados % 12 || 12);

    const totalBruto = bolsaProporcional + recessoValor + dozeavos;

    setCalc({
      diasTrabalhados,
      mesesTrabalhados,
      diasProporcional,
      bolsaProporcional,
      recessoProporcional: Math.round(recessoProporcional),
      recessoValor,
      dozeavos,
      totalBruto,
    });
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

  // Docs chave
  const tceDoc  = contract.documents?.find((d: any) => d.tipo === "tce");
  const peDoc   = contract.documents?.find((d: any) => d.tipo === "pe");
  const trDoc   = contract.documents?.find((d: any) => d.tipo === "tr");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/contratos" className="text-slate-400 hover:text-slate-600 text-sm">← Contratos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{contract.student?.name}</h1>
        <Badge variant={(statusBadge[contract.status || "PENDENTE"]||"gray") as any}>{contract.status}</Badge>
        {contract.numero && <span className="text-xs font-mono text-slate-400">#{contract.numero}</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Bolsa", fmt(contract.bolsa)],
          ["Início", new Date(contract.dataInicio).toLocaleDateString("pt-BR")],
          ["Término", new Date(contract.dataFim).toLocaleDateString("pt-BR")],
          ["Docs", `${assinados}/${contract.documents?.length || 0} assinados`],
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
          <p className="text-xs text-slate-400">{assinados} de {contract.documents?.length} assinados</p>
        </div>
        <div className="space-y-2">
          {contract.documents?.map((doc: any) => (
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

      {contract.atividades && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Atividades do Estágio</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{contract.atividades}</p>
        </Card>
      )}

      {/* Modal Calculadora de Rescisão */}
      <Modal open={rescisaoModal} onClose={() => { setRescisaoModal(false); setCalc(null); }} title="🧮 Calculadora de Rescisão">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Calcule os valores proporcionais para rescisão do estágio de <strong>{contract.student?.name}</strong>.
          </p>
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

          <Button onClick={calcularRescisao} disabled={!rescisao.ultimoDia}>Calcular</Button>

          {calc && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resultado do Cálculo</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Período:</span>
                    <span className="font-semibold">{calc.mesesTrabalhados} meses ({calc.diasTrabalhados} dias)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bolsa proporcional ({calc.diasProporcional} dias):</span>
                    <span className="font-semibold text-emerald-600">{fmt(calc.bolsaProporcional)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recesso ({calc.recessoProporcional} dias):</span>
                    <span className="font-semibold text-emerald-600">{fmt(calc.recessoValor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">1/12 avos:</span>
                    <span className="font-semibold text-emerald-600">{fmt(calc.dozeavos)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-700">Total a Pagar:</span>
                <span className="text-xl font-black text-[#0f2a5e]">{fmt(calc.totalBruto)}</span>
              </div>
              <p className="text-xs text-slate-400">
                * Bolsa mensal: {fmt(contract.bolsa)} • Cálculo automático (sem descontos). Revise com o contador.
              </p>
              <Button variant="secondary" size="sm" onClick={() => {
                // Pré-preencher os campos do documento TR com os valores calculados
                const trDocLocal = contract.documents?.find((d: any) => d.tipo === "tr");
                if (trDocLocal) {
                  window.location.href = `/dashboard/contratos/${contract.id}/documentos/${trDocLocal.id}`;
                }
              }}>
                📄 Ir para Termo de Rescisão
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
