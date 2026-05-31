"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

const fmt = (v:number) => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});

export default function FranqueadoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [aba, setAba] = useState("visao-geral");
  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [senhaModal, setSenhaModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    fetch(`/api/app/franqueados/${params.id}`)
      .then(r=>r.json()).then(d=>{ setData(d.franchise); setEditForm(d.franchise); });
  };
  useEffect(load,[params.id]);

  // Carrega CRM da unidade ao abrir a aba
  useEffect(() => {
    if (aba !== "crm" || !params.id) return;
    setCrmLoading(true);
    fetch(`/api/app/franqueados/${params.id}/crm`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setCrmLeads(d.leads || []); setCrmLoading(false); })
      .catch(() => setCrmLoading(false));
  }, [aba, params.id]);

  const action = async (body:any) => {
    setSaving(true); setMsg("");
    const r = await fetch(`/api/app/franqueados/${params.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d = await r.json();
    setSaving(false); setMsg("Salvo! ✓");
    load();
    return d;
  };

  const excluirFranqueado = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/app/franqueados/${params.id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.error) { setMsg("❌ " + d.error); setDeleteModal(false); return; }
      router.push("/dashboard/franqueados");
      router.refresh();
    } catch {
      setMsg("❌ Erro ao excluir. Tente novamente.");
      setDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!data) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  const user = data.users?.[0];
  const bloqueado = user && !user.active;
  const contrAtivos = data.contracts?.filter((c:any)=>c.status==="ATIVO").length||0;
  const contrPendentes = data.contracts?.filter((c:any)=>c.status==="PENDENTE"||c.status==="AGUARDANDO_ASSINATURA").length||0;
  const contrInativos = data.contracts?.filter((c:any)=>["FINALIZADO","INATIVO","SUSPENSO"].includes(c.status)).length||0;
  const receitaTotal = data.financials?.filter((f:any)=>f.tipo==="entrada"&&f.status==="PAGO").reduce((a:number,b:any)=>a+b.valor,0)||0;
  const pendentes = data.financials?.filter((f:any)=>f.status==="PENDENTE").reduce((a:number,b:any)=>a+b.valor,0)||0;

  return (
    <div>
      {msg && <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">{msg}</div>}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/franqueados" className="text-slate-400 hover:text-slate-600 text-sm">← Franqueados</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">{data.name}</h1>
        {bloqueado ? <Badge variant="red">Bloqueado</Badge> : <Badge variant={data.status==="ATIVO"?"green":"gray"}>{data.status}</Badge>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          ["Contratos Ativos", contrAtivos, "text-emerald-600"],
          ["Em Aberto", contrPendentes, "text-amber-600"],
          ["Inativos", contrInativos, "text-slate-400"],
          ["Receita Recebida", fmt(receitaTotal), "text-emerald-600"],
          ["A Receber", fmt(pendentes), "text-amber-600"],
        ].map(([l,v,c])=>(
          <Card key={String(l)} className="p-4 text-center">
            <p className="text-[10px] text-slate-400 uppercase">{l}</p>
            <p className={`text-lg font-black mt-1 ${c}`}>{v}</p>
          </Card>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-2 mb-5">
        <Button variant="secondary" size="sm" onClick={()=>setEditModal(true)}>✏️ Editar Dados</Button>
        <Button variant="secondary" size="sm" onClick={()=>setEmailModal(true)}>📧 Alterar E-mail Login</Button>
        <Button variant="secondary" size="sm" onClick={()=>setSenhaModal(true)}>🔑 Alterar Senha</Button>
        <Button
          variant={bloqueado?"primary":"danger"} size="sm"
          onClick={()=>action({action:"toggle_access"}).then(()=>setMsg(bloqueado?"Acesso liberado! ✓":"Acesso bloqueado!"))}>
          {bloqueado?"🔓 Liberar Acesso":"🔒 Bloquear Acesso"}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>🗑️ Excluir Franqueado</Button>
        {user && <div className="ml-auto text-xs text-slate-400 flex items-center">
          Último acesso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}
        </div>}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[["visao-geral","Visão Geral"],["contratos","Contratos"],["financeiro","Financeiro"],["empresas","Empresas"],["crm","CRM"]].map(([k,l])=>(
          <button key={k} onClick={()=>setAba(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${aba===k?"bg-white shadow text-[#0f2a5e]":"text-slate-500 hover:text-slate-700"}`}>{l}</button>
        ))}
      </div>

      {aba==="visao-geral" && (
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-bold mb-3">Dados da Unidade</h3>
            {[["CNPJ",data.cnpj],["Responsável",data.responsavel],["E-mail",data.email],["Telefone",data.telefone],["Endereço",data.endereco],["Cidade",data.cidade+"/"+data.uf],["Plano",data.plano],["Mensalidade",fmt(data.mensalidade)]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
                <span className="text-slate-400">{l}</span><span className="font-medium">{v||"—"}</span>
              </div>
            ))}
            {/* Toggle cobrar mensalidade */}
            <div className="flex items-center justify-between py-2 mt-1">
              <div>
                <p className="text-sm font-medium text-slate-700">Cobrar Mensalidade</p>
                <p className="text-[11px] text-slate-400">R$200/mês no fechamento do dia 23</p>
              </div>
              <button
                onClick={() => action({action:"toggle_mensalidade"}).then(()=>setMsg((data.cobrarMensalidade??true)?"Mensalidade desativada":"Mensalidade ativada!"))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(data.cobrarMensalidade??true)?"bg-[#0f2a5e]":"bg-slate-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(data.cobrarMensalidade??true)?"translate-x-6":"translate-x-1"}`}/>
              </button>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold mb-3">Acesso ao Sistema</h3>
            <div className="space-y-2 text-sm">
              {[["Usuário",user?.name],["E-mail login",user?.email],["Status",bloqueado?"Bloqueado":"Ativo"],["Desde",user?.createdAt?new Date(user.createdAt).toLocaleDateString("pt-BR"):"—"]].map(([l,v])=>(
                <div key={l} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400">{l}</span>
                  <span className={`font-medium ${l==="Status"&&bloqueado?"text-red-500":""}`}>{v||"—"}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400">Pontuação gamificação</p>
              <p className="text-2xl font-black text-[#f5c400]">{data.pontuacao?.toLocaleString("pt-BR")} pts</p>
            </div>
          </Card>
        </div>
      )}

      {aba==="contratos" && (
        <Card>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{["Estagiário","Empresa","Bolsa","Início","Término","Status"].map(h=>(
              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>))}</tr></thead>
            <tbody>
              {!data.contracts?.length ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum contrato.</td></tr>
              ) : data.contracts.map((c:any)=>(
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-2 text-sm font-semibold">{c.student?.name}</td>
                  <td className="px-5 py-2 text-sm text-slate-600">{c.company?.name}</td>
                  <td className="px-5 py-2 text-sm">R$ {c.bolsa?.toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-2 text-xs text-slate-400">{new Date(c.dataInicio).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-2 text-xs text-slate-400">{new Date(c.dataFim).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-2"><Badge variant={c.status==="ATIVO"?"green":c.status==="PENDENTE"?"yellow":"gray"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {aba==="financeiro" && (
        <Card>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{["Descrição","Tipo","Valor","Status","Data"].map(h=>(
              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>))}</tr></thead>
            <tbody>
              {!data.financials?.length ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum lançamento.</td></tr>
              ) : data.financials.map((f:any)=>(
                <tr key={f.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2 text-sm font-medium">{f.descricao}</td>
                  <td className="px-5 py-2"><Badge variant={f.tipo==="entrada"?"green":"red"}>{f.tipo}</Badge></td>
                  <td className="px-5 py-2 text-sm font-bold"><span className={f.tipo==="entrada"?"text-emerald-600":"text-red-600"}>{fmt(f.valor)}</span></td>
                  <td className="px-5 py-2"><Badge variant={f.status==="PAGO"?"green":f.status==="PENDENTE"?"yellow":"red"}>{f.status}</Badge></td>
                  <td className="px-5 py-2 text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {aba==="empresas" && (
        <Card>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{["Empresa","Status","Ação"].map(h=>(
              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>))}</tr></thead>
            <tbody>
              {!data.companies?.length ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">Nenhuma empresa.</td></tr>
              ) : data.companies.map((c:any)=>(
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2 text-sm font-semibold">{c.name}</td>
                  <td className="px-5 py-2"><Badge variant={c.status==="ATIVA"?"green":"gray"}>{c.status}</Badge></td>
                  <td className="px-5 py-2">
                    <Link href={`/dashboard/empresas/${c.id}`} className="text-xs text-blue-500 hover:underline">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {aba==="crm" && (
        <Card>
          {crmLoading ? (
            <div className="text-center py-8 text-slate-400">Carregando CRM...</div>
          ) : !crmLeads.length ? (
            <div className="text-center py-8 text-slate-400">Nenhum lead cadastrado nesta unidade.</div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                {["Empresa","Contato","Próxima Ação","Retorno","Prioridade","Situação"].map(h=>(
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {crmLeads.map((l:any)=>(
                  <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-2 text-sm font-semibold">{l.empresa}</td>
                    <td className="px-5 py-2 text-sm text-slate-600">{l.contato||"—"}</td>
                    <td className="px-5 py-2 text-sm text-slate-500">{l.proximaAcao||"—"}</td>
                    <td className="px-5 py-2 text-xs text-slate-400">
                      {l.retornoAt ? new Date(l.retornoAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant={l.prioridade==="alta"?"red":l.prioridade==="media"?"yellow":"gray"}>
                        {l.prioridade||"normal"}
                      </Badge>
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant={l.situacao==="ativo"?"green":l.situacao==="convertido"?"blue":"gray"}>
                        {l.situacao}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modais */}
      <Modal open={emailModal} onClose={()=>setEmailModal(false)} title="Alterar E-mail de Login">
        <div className="space-y-3">
          <Input label="Novo E-mail" type="email" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} placeholder="novo@email.com"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={()=>setEmailModal(false)}>Cancelar</Button>
            <Button onClick={()=>action({action:"change_email",userId:user?.id,email:novoEmail}).then(()=>setEmailModal(false))} disabled={saving}>Alterar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={senhaModal} onClose={()=>setSenhaModal(false)} title="Alterar Senha">
        <div className="space-y-3">
          <Input label="Nova Senha" type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Mínimo 8 caracteres"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={()=>setSenhaModal(false)}>Cancelar</Button>
            <Button onClick={()=>action({action:"change_password",userId:user?.id,password:novaSenha}).then(()=>setSenhaModal(false))} disabled={saving}>Alterar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editModal} onClose={()=>setEditModal(false)} title="Editar Dados da Franquia" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[["name","Nome"],["razaoSocial","Razão Social"],["cnpj","CNPJ"],["responsavel","Responsável"],["email","E-mail"],["telefone","Telefone"],["cidade","Cidade"],["uf","UF"],["mensalidade","Mensalidade (R$)"]].map(([k,l])=>(
            <Input key={k} label={l} value={editForm[k]||""} onChange={e=>setEditForm((p:any)=>({...p,[k]:e.target.value}))}/>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={()=>setEditModal(false)}>Cancelar</Button>
          <Button onClick={()=>action(editForm).then(()=>setEditModal(false))} disabled={saving}>Salvar</Button>
        </div>
      </Modal>

      {/* Modal: Confirmar Exclusão do Franqueado */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Excluir Franqueado">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-800">⚠️ Ação Irreversível</p>
            <p className="text-sm text-red-700 mt-1">
              Isso irá excluir permanentemente <strong>{data.name}</strong> e todos os dados relacionados: contratos, estudantes, empresas, usuários e financeiros desta unidade.
            </p>
          </div>
          <p className="text-sm text-slate-600">Tem certeza que deseja excluir este franqueado?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button variant="danger" onClick={excluirFranqueado} disabled={deleting} className="flex-1 justify-center">
              {deleting ? "Excluindo..." : "Sim, Excluir Tudo"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
