"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

const ETAPAS = ["novo_lead","primeiro_contato","apresentacao","proposta","negociacao","fechado"];
const ETAPA_LABEL: Record<string,string> = {
  novo_lead:"Novo Lead",primeiro_contato:"1º Contato",apresentacao:"Apresentação",
  proposta:"Proposta",negociacao:"Negociação",fechado:"Fechado ✓"
};
const TIPO_NOTA: Record<string,{icon:string;color:string}> = {
  anotacao:    {icon:"📝",color:"bg-slate-100 text-slate-600"},
  ligacao:     {icon:"📞",color:"bg-blue-100 text-blue-700"},
  email:       {icon:"✉️", color:"bg-purple-100 text-purple-700"},
  reuniao:     {icon:"🤝",color:"bg-green-100 text-green-700"},
  whatsapp:    {icon:"📱",color:"bg-emerald-100 text-emerald-700"},
};
const SITUACAO_BADGE: Record<string,"green"|"yellow"|"red"|"gray"|"blue"> = {
  ativo:"green",vendido:"blue",perdido:"red",pausado:"gray"
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Modais
  const [notaModal, setNotaModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [agendaModal, setAgendaModal] = useState(false);
  const [vendidoModal, setVendidoModal] = useState(false);
  const [perdidoModal, setPerdidoModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  // Campos
  const [novaNota, setNovaNota] = useState("");
  const [tipoNota, setTipoNota] = useState("anotacao");
  const [novaTask, setNovaTask] = useState({ descricao:"", dueAt:"", dueHora:"", linkReuniao:"", endereco:"" });
  const [agenda, setAgenda] = useState({ retornoAt:"", retornoHora:"", proximaAcao:"" });
  const [motivo, setMotivo] = useState("");
  const [editForm, setEditForm] = useState<any>({});

  const load = () => {
    fetch(`/api/app/crm/${params.id}`)
      .then(r => r.json())
      .then(d => { setLead(d.lead); setEditForm(d.lead); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [params.id]);

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const patch = async (body: any) => {
    setSaving(true);
    const res = await fetch(`/api/app/crm/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.lead) setLead(data.lead);
    setSaving(false);
    return data;
  };

  const adicionarNota = async () => {
    if (!novaNota.trim()) return;
    await patch({ action: "add_nota", texto: novaNota, tipo: tipoNota });
    load();
    setNotaModal(false); setNovaNota(""); setTipoNota("anotacao");
    toast("Nota adicionada ✓");
  };

  const adicionarTask = async () => {
    if (!novaTask.descricao.trim()) return;
    const dueAt = novaTask.dueAt && novaTask.dueHora
      ? new Date(`${novaTask.dueAt}T${novaTask.dueHora}`).toISOString()
      : novaTask.dueAt ? new Date(novaTask.dueAt).toISOString() : null;
    await fetch(`/api/app/crm/${params.id}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...novaTask, dueAt }),
    });
    load();
    setTaskModal(false);
    setNovaTask({ descricao:"", dueAt:"", dueHora:"", linkReuniao:"", endereco:"" });
    toast("Tarefa criada ✓");
  };

  const salvarAgenda = async () => {
    const retornoAt = agenda.retornoAt && agenda.retornoHora
      ? new Date(`${agenda.retornoAt}T${agenda.retornoHora}`).toISOString()
      : agenda.retornoAt ? new Date(agenda.retornoAt).toISOString() : null;
    await patch({ retornoAt, proximaAcao: agenda.proximaAcao });
    setAgendaModal(false);
    toast("Agenda salva ✓");
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    await fetch(`/api/app/crm/${params.id}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }),
    });
    load();
  };

  const marcarVendido = async () => {
    await patch({ action: "vendido", observacao: motivo });
    setVendidoModal(false); setMotivo("");
    toast("Lead marcado como VENDIDO! 🏆");
  };

  const marcarPerdido = async () => {
    await patch({ action: "perdido", motivo });
    setPerdidoModal(false); setMotivo("");
    toast("Lead marcado como perdido.");
  };

  const pausar = async () => {
    await patch({ action: lead?.situacao === "pausado" ? "reativar" : "pausar" });
    toast(lead?.situacao === "pausado" ? "Lead reativado ✓" : "Lead pausado.");
  };

  const salvarEdicao = async () => {
    await patch(editForm);
    setEditModal(false);
    toast("Dados atualizados ✓");
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Carregando...</div>;
  if (!lead) return <div className="p-8 text-center text-red-400">Lead não encontrado.</div>;

  const notas = lead.notas || [];
  const tasks = lead.tasks || [];
  const pendentes = tasks.filter((t: any) => !t.done);
  const concluidas = tasks.filter((t: any) => t.done);

  return (
    <div>
      {msg && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm" className="text-slate-400 hover:text-slate-600 text-sm">← CRM</Link>
          <span className="text-slate-300">/</span>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{lead.empresa}</h1>
            {lead.contato && <p className="text-slate-500 text-sm">{lead.contato}{lead.cargo ? ` — ${lead.cargo}` : ""}</p>}
          </div>
          <Badge variant={SITUACAO_BADGE[lead.situacao] || "gray"}>
            {lead.situacao === "ativo" ? "Ativo" : lead.situacao === "vendido" ? "Vendido ✓" : lead.situacao === "perdido" ? "Perdido" : "Pausado"}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" size="sm" onClick={() => setEditModal(true)}>✏️ Editar</Button>
          <Button variant="secondary" size="sm" onClick={() => setNotaModal(true)}>📝 Nota</Button>
          <Button variant="secondary" size="sm" onClick={() => setTaskModal(true)}>✅ Tarefa</Button>
          <Button variant="secondary" size="sm" onClick={() => setAgendaModal(true)}>📅 Agenda</Button>
          {lead.situacao === "ativo" && (
            <>
              <Button size="sm" onClick={() => setVendidoModal(true)}>🏆 Vendido</Button>
              <Button variant="danger" size="sm" onClick={() => setPerdidoModal(true)}>✗ Perdido</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={pausar}>
            {lead.situacao === "pausado" ? "▶ Reativar" : "⏸ Pausar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Coluna 1: Dados do lead */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Dados do Lead</h3>
            <div className="space-y-2 text-sm">
              {[
                ["Empresa", lead.empresa],
                ["Contato", lead.contato],
                ["Cargo", lead.cargo],
                ["E-mail", lead.email],
                ["Telefone", lead.telefone],
                ["Cidade", lead.cidade],
                ["Origem", lead.origem],
                ["Prioridade", lead.prioridade],
              ].filter(([,v]) => v).map(([l,v]) => (
                <div key={l}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{l}</p>
                  <p className="font-medium">{v}</p>
                </div>
              ))}
              {lead.valorNegociado && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Valor Negociado</p>
                  <p className="font-bold text-emerald-600">R$ {Number(lead.valorNegociado).toLocaleString("pt-BR")}</p>
                </div>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              {lead.telefone && (
                <a href={`https://wa.me/55${lead.telefone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-green-600 font-semibold hover:underline">
                  📱 Abrir WhatsApp
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-xs text-blue-600 font-semibold hover:underline">
                  ✉️ Enviar E-mail
                </a>
              )}
            </div>
          </Card>

          {/* Etapa */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Etapa do Pipeline</h3>
            <div className="space-y-1">
              {ETAPAS.map((e, i) => (
                <button key={e} onClick={() => patch({ etapa: e }).then(() => toast("Etapa atualizada ✓"))}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    lead.etapa === e
                      ? "bg-[#0f2a5e] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {i > 0 && "→ "}{ETAPA_LABEL[e]}
                </button>
              ))}
            </div>
          </Card>

          {/* Agenda */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Agenda</h3>
            {lead.retornoAt ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-800">📅 Retorno agendado</p>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  {new Date(lead.retornoAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                </p>
                {lead.proximaAcao && <p className="text-xs text-amber-700 mt-1">{lead.proximaAcao}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhum retorno agendado.</p>
            )}
            {lead.ultimoContato && (
              <p className="text-[10px] text-slate-400 mt-2">
                Último contato: {new Date(lead.ultimoContato).toLocaleDateString("pt-BR")}
              </p>
            )}
            <button onClick={() => setAgendaModal(true)}
              className="mt-3 text-xs text-blue-500 hover:underline font-semibold">
              + Agendar retorno
            </button>
          </Card>
        </div>

        {/* Coluna 2: Tarefas */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tarefas ({pendentes.length} pendentes)
              </h3>
              <button onClick={() => setTaskModal(true)} className="text-[10px] text-blue-500 hover:underline font-bold">
                + Nova
              </button>
            </div>

            {pendentes.length === 0 && concluidas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma tarefa criada.</p>
            ) : (
              <div className="space-y-2">
                {pendentes.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <input type="checkbox" checked={false} onChange={() => toggleTask(t.id, true)}
                      className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{t.descricao}</p>
                      {t.dueAt && (
                        <p className={`text-[10px] mt-0.5 ${new Date(t.dueAt) < new Date() ? "text-red-500 font-bold" : "text-slate-400"}`}>
                          {new Date(t.dueAt) < new Date() ? "⚠️ " : ""}
                          {new Date(t.dueAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                        </p>
                      )}
                      {t.linkReuniao && (
                        <a href={t.linkReuniao} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:underline">🔗 Entrar na reunião</a>
                      )}
                      {t.endereco && <p className="text-[10px] text-slate-400">📍 {t.endereco}</p>}
                    </div>
                  </div>
                ))}
                {concluidas.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-1">Concluídas ({concluidas.length})</p>
                    {concluidas.slice(0,3).map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 py-1">
                        <input type="checkbox" checked onChange={() => toggleTask(t.id, false)} className="w-3.5 h-3.5"/>
                        <p className="text-[10px] text-slate-400 line-through">{t.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna 3: Histórico de notas */}
        <div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Histórico ({notas.length})
              </h3>
              <button onClick={() => setNotaModal(true)} className="text-[10px] text-blue-500 hover:underline font-bold">
                + Nota
              </button>
            </div>

            {notas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma interação registrada.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notas.map((n: any) => {
                  const meta = TIPO_NOTA[n.tipo] || TIPO_NOTA.anotacao;
                  return (
                    <div key={n.id} className="relative pl-4 border-l-2 border-slate-200 pb-3 last:pb-0">
                      <div className="absolute -left-2 top-0">
                        <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${meta.color}`}>{meta.icon}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{n.texto}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: Nova Nota */}
      <Modal open={notaModal} onClose={() => setNotaModal(false)} title="Registrar Interação">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TIPO_NOTA).map(([k, v]) => (
                <button key={k} onClick={() => setTipoNota(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    tipoNota === k ? "border-[#0f2a5e] bg-[#0f2a5e] text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {v.icon} {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Anotação *</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-28 resize-none outline-none focus:border-[#0f2a5e]"
              value={novaNota} onChange={e => setNovaNota(e.target.value)}
              placeholder="Descreva o que foi conversado, enviado ou combinado..."
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setNotaModal(false)}>Cancelar</Button>
            <Button onClick={adicionarNota} disabled={!novaNota.trim() || saving}>
              {saving ? "Salvando..." : "Registrar ✓"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Tarefa */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Nova Tarefa">
        <div className="space-y-3">
          <Input label="Descrição *" value={novaTask.descricao} onChange={e => setNovaTask(p => ({...p, descricao: e.target.value}))} placeholder="Enviar proposta, ligar para o cliente..."/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={novaTask.dueAt} onChange={e => setNovaTask(p => ({...p, dueAt: e.target.value}))}/>
            <Input label="Horário" type="time" value={novaTask.dueHora} onChange={e => setNovaTask(p => ({...p, dueHora: e.target.value}))}/>
          </div>
          <Input label="Link de Reunião (opcional)" value={novaTask.linkReuniao} onChange={e => setNovaTask(p => ({...p, linkReuniao: e.target.value}))} placeholder="https://meet.google.com/..."/>
          <Input label="Endereço (opcional)" value={novaTask.endereco} onChange={e => setNovaTask(p => ({...p, endereco: e.target.value}))} placeholder="Rua, número..."/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
            <Button onClick={adicionarTask} disabled={!novaTask.descricao.trim()}>Criar Tarefa ✓</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Agendar Retorno */}
      <Modal open={agendaModal} onClose={() => setAgendaModal(false)} title="Agendar Retorno">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={agenda.retornoAt} onChange={e => setAgenda(p => ({...p, retornoAt: e.target.value}))}/>
            <Input label="Horário" type="time" value={agenda.retornoHora} onChange={e => setAgenda(p => ({...p, retornoHora: e.target.value}))}/>
          </div>
          <Input label="Próxima Ação" value={agenda.proximaAcao} onChange={e => setAgenda(p => ({...p, proximaAcao: e.target.value}))} placeholder="Ligar para apresentar proposta..."/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAgendaModal(false)}>Cancelar</Button>
            <Button onClick={salvarAgenda} disabled={!agenda.retornoAt}>Salvar ✓</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Vendido */}
      <Modal open={vendidoModal} onClose={() => setVendidoModal(false)} title="🏆 Marcar como Vendido">
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            O lead <strong>{lead.empresa}</strong> será marcado como <strong>VENDIDO</strong> e movido para Fechado.
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Observação (opcional)</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:border-[#0f2a5e]"
              value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Detalhes do fechamento, valor acordado..."/>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setVendidoModal(false)}>Cancelar</Button>
            <Button onClick={marcarVendido}>Confirmar — Vendido! 🏆</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Perdido */}
      <Modal open={perdidoModal} onClose={() => setPerdidoModal(false)} title="✗ Marcar como Perdido">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Motivo da perda *</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm h-24 resize-none outline-none focus:border-[#0f2a5e]"
              value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Preço, concorrente, não tem estagiários no momento..."/>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPerdidoModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={marcarPerdido} disabled={!motivo.trim()}>Confirmar — Perdido</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Lead */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Lead" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Empresa" value={editForm.empresa||""} onChange={e=>setEditForm((p:any)=>({...p,empresa:e.target.value}))}/>
          <Input label="Contato" value={editForm.contato||""} onChange={e=>setEditForm((p:any)=>({...p,contato:e.target.value}))}/>
          <Input label="Cargo" value={editForm.cargo||""} onChange={e=>setEditForm((p:any)=>({...p,cargo:e.target.value}))}/>
          <Input label="Telefone / WhatsApp" value={editForm.telefone||""} onChange={e=>setEditForm((p:any)=>({...p,telefone:e.target.value}))}/>
          <Input label="E-mail" type="email" value={editForm.email||""} onChange={e=>setEditForm((p:any)=>({...p,email:e.target.value}))}/>
          <Input label="Cidade" value={editForm.cidade||""} onChange={e=>setEditForm((p:any)=>({...p,cidade:e.target.value}))}/>
          <Input label="Valor Negociado (R$)" type="number" value={editForm.valorNegociado||""} onChange={e=>setEditForm((p:any)=>({...p,valorNegociado:e.target.value}))}/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Prioridade</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={editForm.prioridade||"media"} onChange={e=>setEditForm((p:any)=>({...p,prioridade:e.target.value}))}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
          <Button onClick={salvarEdicao} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
