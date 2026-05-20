"use client";
import { useState, useEffect } from "react";
import { Card }    from "@/components/ui/Card";
import { Badge }   from "@/components/ui/Badge";
import { Button }  from "@/components/ui/Button";
import { Input }   from "@/components/ui/Input";
import { Modal }   from "@/components/ui/Modal";

const STATUS_V: Record<string,"green"|"yellow"|"red"> = {
  PAGO:"green", PENDENTE:"yellow", VENCIDO:"red", CANCELADO:"red"
};
const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits:2 });

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [novoModal, setNovoModal]     = useState(false);
  const [editModal, setEditModal]     = useState<any>(null);
  const [pagModal, setPagModal]       = useState<any>(null);   // modal PIX/boleto
  const [loading, setLoading]         = useState(false);
  const [form, setForm] = useState({
    descricao:"", tipo:"entrada", valor:"", categoria:"Empresa",
    status:"PENDENTE", recorrente:false, diaVencimento:"", vencimentoAt:"",
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const load = () =>
    fetch("/api/app/financeiro").then(r => r.json()).then(d => setLancamentos(d.lancamentos || []));
  useEffect(() => { load(); }, []);

  const entradas = lancamentos.filter(l => l.tipo==="entrada" && l.status==="PAGO").reduce((a,b) => a+b.valor, 0);
  const saidas   = lancamentos.filter(l => l.tipo==="saida"   && l.status==="PAGO").reduce((a,b) => a+b.valor, 0);
  const pendentes= lancamentos.filter(l => l.status==="PENDENTE").reduce((a,b) => a+b.valor, 0);

  const criar = async () => {
    if (!form.descricao || !form.valor) return;
    setLoading(true);
    const res = await fetch("/api/app/financeiro", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    });
    const data = await res.json();
    if (data.lancamento) {
      setLancamentos(p => [data.lancamento, ...p]);
      setNovoModal(false);
      setForm({ descricao:"",tipo:"entrada",valor:"",categoria:"Empresa",status:"PENDENTE",recorrente:false,diaVencimento:"",vencimentoAt:"" });
    }
    setLoading(false);
  };

  const darBaixa = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"PAGO", paidAt:new Date() }) })
      .then(() => load());

  const reverter = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"reverter" }) })
      .then(() => load());

  const excluir = (id: string) =>
    fetch(`/api/app/financeiro/${id}`, { method:"DELETE" })
      .then(() => setLancamentos(p => p.filter(l => l.id !== id)));

  const salvarEdicao = async () => {
    if (!editModal) return;
    await fetch(`/api/app/financeiro/${editModal.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ descricao: editModal.descricao, valor: editModal.valor }),
    });
    setEditModal(null); load();
  };

  const salvarPagamento = async () => {
    if (!pagModal) return;
    await fetch(`/api/app/financeiro/${pagModal.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        chavePix:           pagModal.chavePix || null,
        linkPagamento:      pagModal.linkPagamento || null,
        instrucaoPagamento: pagModal.instrucaoPagamento || null,
      }),
    });
    setPagModal(null); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-800">Financeiro</h1>
        <Button onClick={() => setNovoModal(true)}>+ Novo Lançamento</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-500">↑ Entradas Recebidas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(entradas)}</p>
        </Card>
        <Card className="p-5 border-l-4 border-red-400">
          <p className="text-xs text-slate-500">↓ Saídas Pagas</p>
          <p className="text-2xl font-black text-red-600 mt-1">{fmt(saidas)}</p>
        </Card>
        <Card className="p-5 border-l-4 border-amber-400">
          <p className="text-xs text-slate-500">⏳ A Receber</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{fmt(pendentes)}</p>
        </Card>
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Descrição","Tipo","Valor","Vencimento","Status","Pagamento","Ações"].map(h => (
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lancamentos.length === 0
              ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Nenhum lançamento.</td></tr>
              : lancamentos.map(l => {
                const vencido = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
                const temPag  = l.chavePix || l.linkPagamento;
                return (
                  <tr key={l.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${l.cancelado?"opacity-40":""}`}>
                    <td className="px-4 py-2.5 text-sm font-medium">{l.descricao}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={l.tipo==="entrada"?"green":"red"}>
                        {l.tipo==="entrada"?"↑ Entrada":"↓ Saída"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold">
                      <span className={l.tipo==="entrada"?"text-emerald-600":"text-red-600"}>
                        {l.tipo==="entrada"?"+":"-"} {fmt(l.valor)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {l.vencimentoAt ? new Date(l.vencimentoAt).toLocaleDateString("pt-BR") : l.diaVencimento ? `Dia ${l.diaVencimento}` : "—"}
                      {vencido && <span className="ml-1 text-red-500 font-bold">⚠️</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={STATUS_V[l.status] || "gray"}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {temPag
                        ? <span className="text-xs text-emerald-600 font-semibold">✓ Dados OK</span>
                        : <button onClick={() => setPagModal({...l})} className="text-xs text-blue-500 hover:underline">+ Dados PIX/Boleto</button>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {l.status==="PENDENTE" && !l.cancelado && (
                          <Button size="sm" variant="secondary" onClick={() => darBaixa(l.id)}>✓ Baixa</Button>
                        )}
                        {l.status==="PAGO" && (
                          <Button size="sm" variant="ghost" onClick={() => reverter(l.id)}>↩</Button>
                        )}
                        {!l.cancelado && (
                          <Button size="sm" variant="ghost" onClick={() => setEditModal({...l})}>✏️</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { if(confirm("Excluir?")) excluir(l.id); }}>🗑</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>

      {/* Modal Novo Lançamento */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Novo Lançamento">
        <div className="space-y-3">
          <Input label="Descrição *" value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Mensalidade TechCorp - Maio/2025"/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                <option value="entrada">↑ Entrada</option>
                <option value="saida">↓ Saída</option>
              </select>
            </div>
            <Input label="Valor (R$) *" type="number" value={form.valor} onChange={e => set("valor", e.target.value)} placeholder="480"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Categoria</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                {["Empresa","Franqueado","Taxa","Operacional","Seguro","Outro"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>
          </div>
          <Input label="Data de Vencimento" type="date" value={form.vencimentoAt} onChange={e => set("vencimentoAt", e.target.value)}/>
          <label className="flex items-center gap-2 p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-400">
            <input type="checkbox" checked={form.recorrente} onChange={e => set("recorrente", e.target.checked)} className="w-4 h-4"/>
            <div>
              <p className="text-sm font-semibold">Cobrança Recorrente</p>
              <p className="text-xs text-slate-400">Repete mensalmente</p>
            </div>
          </label>
          {form.recorrente && (
            <Input label="Dia do Vencimento" type="number" value={form.diaVencimento} onChange={e => set("diaVencimento", e.target.value)} placeholder="5"/>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setNovoModal(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={loading || !form.descricao || !form.valor}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={editModal !== null} onClose={() => setEditModal(null)} title="Editar Lançamento">
        {editModal && (
          <div className="space-y-3">
            <Input label="Descrição" value={editModal.descricao || ""} onChange={e => setEditModal((p:any) => ({...p, descricao: e.target.value}))}/>
            <Input label="Valor (R$)" type="number" value={editModal.valor || ""} onChange={e => setEditModal((p:any) => ({...p, valor: e.target.value}))}/>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal PIX/Boleto — franqueado adiciona dados de pagamento */}
      <Modal open={pagModal !== null} onClose={() => setPagModal(null)} title="Dados de Pagamento">
        {pagModal && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Adicione os dados de pagamento para esta cobrança — a empresa verá no portal dela.</p>
            <Input
              label="Chave PIX"
              value={pagModal.chavePix || ""}
              onChange={e => setPagModal((p:any) => ({...p, chavePix: e.target.value}))}
              placeholder="CNPJ, CPF, e-mail ou chave aleatória"
            />
            <Input
              label="Link do Boleto"
              value={pagModal.linkPagamento || ""}
              onChange={e => setPagModal((p:any) => ({...p, linkPagamento: e.target.value}))}
              placeholder="https://banco.com/boleto/..."
            />
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Instruções de pagamento</label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
                value={pagModal.instrucaoPagamento || ""}
                onChange={e => setPagModal((p:any) => ({...p, instrucaoPagamento: e.target.value}))}
                placeholder="Ex: Transferência bancária — Banco Itaú, Ag 0001, CC 12345-6"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPagModal(null)}>Cancelar</Button>
              <Button onClick={salvarPagamento}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
