"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ContaAPagar { descricao: string; valor: string; vencimento: string; }

export default function AbrirMesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [abertura, setAbertura] = useState<any>(null);
  const [mesAtual, setMesAtual] = useState<{ mes: number; ano: number } | null>(null);

  const [metaEmpresas, setMetaEmpresas] = useState("");
  const [metaLeads, setMetaLeads] = useState("");
  const [metaContratos, setMetaContratos] = useState("");
  const [metaVagas, setMetaVagas] = useState("");
  const [metaEstudantes, setMetaEstudantes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [contas, setContas] = useState<ContaAPagar[]>([]);

  useEffect(() => {
    fetch("/api/app/mes/status")
      .then(r => r.json())
      .then(data => {
        setAbertura(data.abertura || null);
        setMesAtual(data.mesAtual || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const addConta = () => setContas(c => [...c, { descricao: "", valor: "", vencimento: "" }]);
  const removeConta = (i: number) => setContas(c => c.filter((_, idx) => idx !== i));
  const updateConta = (i: number, field: keyof ContaAPagar, value: string) =>
    setContas(c => c.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const submeter = async () => {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/app/mes/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaEmpresas: metaEmpresas || null,
          metaLeads: metaLeads || null,
          metaContratos: metaContratos || null,
          metaVagas: metaVagas || null,
          metaEstudantes: metaEstudantes || null,
          contasAPagar: contas.filter(c => c.descricao || c.valor),
          observacoes: observacoes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao abrir o mês."); return; }
      router.push("/dashboard/mes");
      router.refresh();
    } catch {
      setErro("Erro ao abrir o mês. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <p className="text-slate-400 text-sm">Carregando...</p>;

  const nomeMes = mesAtual ? NOMES_MES[mesAtual.mes - 1] : "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-slate-800 mb-1">Abertura do Mês — {nomeMes} {mesAtual?.ano}</h1>
      <p className="text-slate-500 text-sm mb-6">Defina suas metas para o mês e as contas a pagar previstas.</p>

      {abertura ? (
        <Card className="p-6">
          <p className="font-bold text-emerald-600 mb-4">Mês já aberto ✓</p>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-slate-400">Meta de empresas:</span> <strong>{abertura.metaEmpresas ?? "—"}</strong></div>
            <div><span className="text-slate-400">Meta de leads:</span> <strong>{abertura.metaLeads ?? "—"}</strong></div>
            <div><span className="text-slate-400">Meta de contratos:</span> <strong>{abertura.metaContratos ?? "—"}</strong></div>
            <div><span className="text-slate-400">Meta de vagas:</span> <strong>{abertura.metaVagas ?? "—"}</strong></div>
            <div><span className="text-slate-400">Meta de estudantes:</span> <strong>{abertura.metaEstudantes ?? "—"}</strong></div>
          </div>
          {abertura.observacoes && (
            <p className="text-sm text-slate-600 border-t border-slate-100 pt-3">{abertura.observacoes}</p>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input label="Meta de empresas a prospectar" type="number" min={0} value={metaEmpresas} onChange={e => setMetaEmpresas(e.target.value)} />
            <Input label="Meta de leads no CRM" type="number" min={0} value={metaLeads} onChange={e => setMetaLeads(e.target.value)} />
            <Input label="Meta de contratos a fechar" type="number" min={0} value={metaContratos} onChange={e => setMetaContratos(e.target.value)} />
            <Input label="Meta de vagas a abrir" type="number" min={0} value={metaVagas} onChange={e => setMetaVagas(e.target.value)} />
            <Input label="Meta de estudantes a cadastrar" type="number" min={0} value={metaEstudantes} onChange={e => setMetaEstudantes(e.target.value)} />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Contas a pagar do mês</label>
              <button onClick={addConta} type="button" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                <Plus size={14} /> Adicionar conta
              </button>
            </div>
            {contas.length === 0 && <p className="text-xs text-slate-400">Nenhuma conta adicionada.</p>}
            <div className="space-y-2">
              {contas.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_140px_auto] gap-2 items-center">
                  <Input placeholder="Descrição" value={c.descricao} onChange={e => updateConta(i, "descricao", e.target.value)} />
                  <Input placeholder="Valor" type="number" min={0} step="0.01" value={c.valor} onChange={e => updateConta(i, "valor", e.target.value)} />
                  <Input placeholder="Vencimento" type="date" value={c.vencimento} onChange={e => updateConta(i, "vencimento", e.target.value)} />
                  <button onClick={() => removeConta(i)} type="button" className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold text-slate-600 block mb-1">Observações</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
              rows={3}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
            />
          </div>

          {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}

          <Button onClick={submeter} disabled={salvando} className="w-full justify-center">
            {salvando ? "Salvando..." : "Confirmar Abertura do Mês"}
          </Button>
        </Card>
      )}
    </div>
  );
}
