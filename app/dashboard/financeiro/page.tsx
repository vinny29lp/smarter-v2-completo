"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const isFranqueadora = session?.user?.role === "FRANQUEADORA";
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [config, setConfig]           = useState<any>(null);
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm]   = useState({ chavePix:"", linkPagamento:"", instrucaoPagamento:"" });
  const [novoModal, setNovoModal]     = useState(false);
  const [editModal, setEditModal]     = useState<any>(null);
  const [cobrModal, setCobrModal]     = useState<any>(null);
  const [histModal, setHistModal]     = useState<any>(null);
  const [histLogs, setHistLogs]       = useState<any[]>([]);
  const [filtro, setFiltro]           = useState("TODOS");
  const [loading, setLoading]         = useState(false);
  // Cobrança de franquias
  const [franquiasPreview, setFranquiasPreview] = useState<any[]>([]);
  const [franquiasTotal, setFranquiasTotal]     = useState(0);
  const [fechandoMes, setFechandoMes]           = useState(false);
  const [fechamentoResult, setFechamentoResult] = useState<any>(null);
  const [fechamentoModal, setFechamentoModal]   = useState(false);
  const [form, setForm] = useState({
    descricao:"", tipo:"entrada", valor:"", categoria:"Empresa",
    status:"PENDENTE", recorrente:false, diaVencimento:"", vencimentoAt:"",
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const load = () =>
    fetch("/api/app/financeiro").then(r => r.json()).then(d => setLancamentos(d.lancamentos || []));

  const loadConfig = () =>
    fetch("/api/app/config-pagamento").then(r => r.json()).then(d => {
      setConfig(d.config);
      if (d.config) setConfigForm({ chavePix: d.config.chavePix || "", linkPagamento: d.config.linkPagamento || "", instrucaoPagamento: d.config.instrucaoPagamento || "" });
    });

  const loadFranquiasPreview = () => {
    if (!isFranqueadora) return;
    fetch("/api/app/financeiro/fechar-mes")
      .then(r => r.json())
      .then(d => { setFranquiasPreview(d.preview || []); setFranquiasTotal(d.totalGeral || 0); })
      .catch(() => {});
  };

  useEffect(() => { load(); loadConfig(); }, []);
  useEffect(() => { if (isFranqueadora) loadFranquiasPreview(); }, [isFranqueadora]);
  // Atualiza preview quando a aba ganha foco (reflete mudanças no cadastro de franqueados)
  useEffect(() => {
    if (!isFranqueadora) return;
    const onFocus = () => loadFranquiasPreview();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isFranqueadora]);

  const filtrados = filtro === "TODOS" ? lancamentos : lancamentos.filter(l => l.status === filtro);
  const entradas  = lancamentos.filter(l => l.tipo==="entrada" && l.status==="PAGO").reduce((a,b)=>a+b.valor,0);
  const saidas    = lancamentos.filter(l => l.tipo==="saida"   && l.status==="PAGO").reduce((a,b)=>a+b.valor,0);
  const pendentes = lancamentos.filter(l => l.status==="PENDENTE").reduce((a,b)=>a+b.valor,0);

  const salvarConfig = async () => {
    try {
      const res = await fetch("/api/app/config-pagamento", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao salvar configuração de pagamento");
        return;
      }
      setConfig(data.config);
      setConfigModal(false);
    } catch (err) {
      alert("Erro de conexão ao salvar configuração");
    }
  };

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

  const enviarCobranca = async () => {
    if (!cobrModal) return;
    setLoading(true);
    // Usa config global se não tiver dados específicos no lançamento
    const payload = {
      email: cobrModal.emailDestino || cobrModal.company?.emailFinanceiro || cobrModal.company?.email || "",
      mensagem: cobrModal.mensagemPersonalizada || "",
      chavePix: cobrModal.chavePix || config?.chavePix || "",
      linkPagamento: cobrModal.linkPagamento || config?.linkPagamento || "",
      instrucaoPagamento: cobrModal.instrucaoPagamento || config?.instrucaoPagamento || "",
    };
    await fetch(`/api/app/financeiro/${cobrModal.id}/enviar-cobranca`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
    });
    setCobrModal(null); setLoading(false); load();
  };

  const fecharMes = async (force = false) => {
    setFechandoMes(true);
    const url = "/api/app/financeiro/fechar-mes" + (force ? "?force=true" : "");
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    setFechamentoResult(data);
    setFechamentoModal(true);
    setFechandoMes(false);
    if (data.ok) { load(); loadFranquiasPreview(); }
  };

  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const podeFecha = diaAtual >= 23;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-slate-800">Financeiro</h1>
        <div className="flex gap-2">
          {/* Config de pagamento global — canto superior */}
          <button
            onClick={() => setConfigModal(true)}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl border-2 font-semibold transition-all ${
              config?.chavePix || config?.linkPagamento
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-amber-400 bg-amber-50 text-amber-700"
            }`}
          >
            {config?.chavePix || config?.linkPagamento ? "✓ PIX/Boleto configurado" : "⚠️ Configurar PIX/Boleto"}
            {config?.chavePix && <span className="font-mono text-[10px] opacity-60 max-w-[120px] truncate">{config.chavePix}</span>}
          </button>
          <Button onClick={() => setNovoModal(true)}>+ Novo Lançamento</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Card className="p-5 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-500">↑ Entradas Recebidas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(entradas)}</p>
        </Card>
        <Card className="p-5 border-l-4 border-red-400">
          <p className="text-xs text-slate-500">↓ Saídas Pagas</p>
          <p className="text-2xl font-black text-red-600 mt-1">{fmt(saidas)}</p>
        </Card>
        <Card className="p-5 border-l-4 border-amber-400">
          <p className="text-xs text-slate-500">⏳ A Receber (pendentes)</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{fmt(pendentes)}</p>
        </Card>
      </div>

      {/* Cobrança de Franquias — só visível para FRANQUEADORA */}
      {isFranqueadora && (
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-800">🏢 Cobrança de Franquias</h2>
              <p className="text-xs text-slate-400 mt-0.5">Mensalidade + taxa administrativa por estagiário ativo</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Total previsto</p>
                <p className="text-lg font-black text-[#0f2a5e]">{fmt(franquiasTotal)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => fecharMes(false)}
                  disabled={fechandoMes || !podeFecha}
                  variant={podeFecha ? "primary" : "secondary"}
                  size="sm">
                  {fechandoMes ? "Fechando..." : podeFecha ? "📅 Fechar Mês" : `Disponível dia 23 (hoje: ${diaAtual})`}
                </Button>
                {!podeFecha && (
                  <button onClick={() => fecharMes(true)} disabled={fechandoMes}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline text-center">
                    Forçar agora (admin)
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Fórmula de cálculo */}
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3 text-xs text-blue-700 font-medium">
            <span>📐 Fórmula:</span>
            <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">Mensalidade + (Estag. Ativos × R$ 13,00) = Total a Cobrar</span>
            <span className="text-blue-400 text-[10px]">Atualiza automaticamente conforme os dados do cadastro</span>
          </div>
          {franquiasPreview.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Nenhum franqueado ativo encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Franqueado","Estag. Ativos","Mensalidade","Taxa (×R$13)","Fórmula","Total","Cobrar"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {franquiasPreview.map((f: any) => (
                    <tr key={f.franchiseId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-sm font-semibold">{f.nome}</td>
                      <td className="px-4 py-2.5 text-sm text-center font-bold text-slate-700">{f.ativosCount}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{fmt(f.mensalidade)}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{fmt(f.taxaAdmin)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                        {fmt(f.mensalidade)} + {f.ativosCount}×R$13
                      </td>
                      <td className="px-4 py-2.5 text-sm font-black text-[#0f2a5e]">{fmt(f.total)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${f.cobrarMensalidade ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {f.cobrarMensalidade ? "Sim" : "Não"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-slate-500">TOTAL GERAL A RECEBER</td>
                    <td className="px-4 py-2.5 text-base font-black text-[#0f2a5e]">{fmt(franquiasTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit">
        {[["TODOS","Todos"],["PENDENTE","Pendentes"],["PAGO","Pagos"],["VENCIDO","Vencidos"],["CANCELADO","Cancelados"]].map(([k,l]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtro === k ? "bg-[#0f2a5e] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}>
            {l}
            {k !== "TODOS" && <span className="ml-1 opacity-60">({lancamentos.filter(l => l.status === k).length})</span>}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto -mx-1"><table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Descrição","Tipo","Valor","Vencimento","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">Nenhum lançamento.</td></tr>
              : filtrados.map(l => {
                const vencido = l.status === "PENDENTE" && l.vencimentoAt && new Date(l.vencimentoAt) < new Date();
                return (
                  <tr key={l.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${l.cancelado?"opacity-40":""}`}>
                    <td className="px-4 py-2.5 text-sm font-medium">{l.descricao}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={l.tipo==="entrada"?"green":"red"}>{l.tipo==="entrada"?"↑ Entrada":"↓ Saída"}</Badge>
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
                      <div className="flex gap-1">
                        {l.status==="PENDENTE" && !l.cancelado && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => darBaixa(l.id)}>✓ Baixa</Button>
                            {l.tipo==="entrada" && (
                              <Button size="sm" variant="secondary" onClick={() => setCobrModal({
                                ...l,
                                emailDestino: l.franchise?.email || l.company?.emailFinanceiro || l.company?.email || "",
                                mensagemPersonalizada:"",
                              })}>📧 Cobrar</Button>
                            )}
                          </>
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
        </table></div>
      </Card>

      {/* ── Modal Configuração Global PIX/Boleto ── */}
      <Modal open={configModal} onClose={() => setConfigModal(false)} title="⚙️ Configuração de Pagamento">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Configure uma vez e os dados serão usados em todas as cobranças automaticamente.
          </p>
          <Input label="Chave PIX" value={configForm.chavePix}
            onChange={e => setConfigForm(p => ({...p, chavePix: e.target.value}))}
            placeholder="CNPJ, CPF, e-mail ou chave aleatória"/>
          <Input label="Link do Boleto (opcional)" value={configForm.linkPagamento}
            onChange={e => setConfigForm(p => ({...p, linkPagamento: e.target.value}))}
            placeholder="https://banco.com/boleto/..."/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Instruções de Pagamento</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
              value={configForm.instrucaoPagamento}
              onChange={e => setConfigForm(p => ({...p, instrucaoPagamento: e.target.value}))}
              placeholder="Ex: Transferência Banco Itaú, Ag 0001, CC 12345-6"/>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfigModal(false)}>Cancelar</Button>
            <Button onClick={salvarConfig}>Salvar Configuração</Button>
          </div>
        </div>
      </Modal>

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

      {/* Modal Resultado Fechamento */}
      <Modal open={fechamentoModal} onClose={() => setFechamentoModal(false)} title="📅 Resultado do Fechamento">
        {fechamentoResult && (
          <div className="space-y-3">
            {fechamentoResult.ok ? (
              <>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                  ✅ {fechamentoResult.message}
                </div>
                <p className="text-xs text-slate-500">Vencimento: <strong>{fechamentoResult.vencimento}</strong> — Referência: <strong>{fechamentoResult.mesRef}</strong></p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(fechamentoResult.results || []).map((r: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-2.5 rounded-lg text-sm ${r.skipped ? "bg-slate-50 text-slate-400" : "bg-emerald-50 text-emerald-800"}`}>
                      <span className="font-medium">{r.franchise}</span>
                      <span className="font-bold">{r.skipped ? r.reason : fmt(r.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                ⚠️ {fechamentoResult.error}
              </div>
            )}
            <Button onClick={() => setFechamentoModal(false)} variant="secondary" className="w-full">Fechar</Button>
          </div>
        )}
      </Modal>

      {/* Modal Cobrar */}
      <Modal open={cobrModal !== null} onClose={() => setCobrModal(null)} title="📧 Enviar Cobrança">
        {cobrModal && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Enviando cobrança: <strong>{cobrModal.descricao}</strong> — {fmt(cobrModal.valor)}</p>
            <Input label="E-mail de destino"
              value={cobrModal.emailDestino || ""}
              onChange={e => setCobrModal((p:any) => ({...p, emailDestino: e.target.value}))}
              placeholder="financeiro@empresa.com"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Mensagem personalizada (opcional)</label>
              <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-16 resize-none outline-none focus:border-[#0f2a5e]"
                value={cobrModal.mensagemPersonalizada || ""}
                onChange={e => setCobrModal((p:any) => ({...p, mensagemPersonalizada: e.target.value}))}
                placeholder="Mensagem adicional para o e-mail..."/>
            </div>
            {(config?.chavePix || config?.linkPagamento) && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 space-y-1">
                <p className="font-bold">✓ Dados de pagamento configurados:</p>
                {config.chavePix && <p>PIX: {config.chavePix}</p>}
                {config.linkPagamento && <p>Boleto: {config.linkPagamento}</p>}
              </div>
            )}
            {!config?.chavePix && !config?.linkPagamento && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                ⚠️ Nenhum dado de pagamento configurado. <button onClick={() => { setCobrModal(null); setConfigModal(true); }} className="underline font-semibold">Configurar agora</button>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setCobrModal(null)}>Cancelar</Button>
              <Button onClick={enviarCobranca} disabled={loading || !cobrModal.emailDestino}>{loading ? "Enviando..." : "📧 Enviar"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
