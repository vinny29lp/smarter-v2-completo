"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { buscarCEP, formatarCEP } from "@/lib/validations";

const discInfo: Record<string,{nome:string;cor:string;corBg:string;emoji:string;desc:string}> = {
  D:{nome:"Dominância",cor:"text-red-600",corBg:"bg-red-500",emoji:"🔴",desc:"Focado em resultados, direto e assertivo"},
  I:{nome:"Influência",cor:"text-amber-600",corBg:"bg-amber-500",emoji:"🟡",desc:"Comunicativo, entusiasmado e persuasivo"},
  S:{nome:"Estabilidade",cor:"text-emerald-600",corBg:"bg-emerald-500",emoji:"🟢",desc:"Colaborativo, paciente e confiável"},
  C:{nome:"Conformidade",cor:"text-blue-600",corBg:"bg-blue-500",emoji:"🔵",desc:"Analítico, meticuloso e preciso"},
};

const EMPTY_EDIT = {
  name:"", cpf:"", rg:"", dataNasc:"", sexo:"F",
  email:"", celular:"", telefone:"",
  endereco:"", bairro:"", cidade:"", uf:"", cep:"",
  curso:"", periodo:"1", previsaoConclusao:"", institutionId:"",
  observacoes:"",
  menorDeIdade: false, nomeResponsavel:"",
};

export default function EstudanteDetailPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isFranqueadora = (session?.user as any)?.role === "FRANQUEADORA";
  const [student, setStudent] = useState<any>(null);
  const [vagas, setVagas] = useState<any[]>([]);
  const [processoModal, setProcessoModal] = useState(search.get("acao")==="processo");
  const [vagaSelecionada, setVagaSelecionada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  // Envio de acesso ao painel (para estudantes importados sem email de credenciais)
  const [enviandoAcessoEmail, setEnviandoAcessoEmail] = useState(false);

  const enviarAcessoPainel = async () => {
    if (!confirm(`Enviar e-mail com login e nova senha temporária para ${student?.email}?`)) return;
    setEnviandoAcessoEmail(true);
    try {
      const res = await fetch(`/api/app/estudantes/${student.id}/enviar-acesso`, { method: "POST" });
      const data = await res.json();
      if (data.error) { setMsg("❌ " + data.error); }
      else { setMsg(`✅ E-mail de acesso enviado para ${data.email}!`); loadStudent(); }
    } catch {
      setMsg("❌ Erro ao enviar e-mail de acesso.");
    } finally {
      setEnviandoAcessoEmail(false);
    }
  };

  // Modais de acesso
  const [senhaModal, setSenhaModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [savingAcesso, setSavingAcesso] = useState(false);

  // Modal de edição de dados
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<typeof EMPTY_EDIT>(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [cepLoading, setCepLoading] = useState(false);

  const setEdit = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));
  const setEditChecked = (k: string, v: boolean) => setEditForm(p => ({ ...p, [k]: v }));

  const loadStudent = () => {
    fetch(`/api/app/estudantes/${params.id}`)
      .then(r=>r.json()).then(d=>setStudent(d.estudante));
  };

  useEffect(() => {
    loadStudent();
    fetch("/api/app/vagas")
      .then(r=>r.json()).then(d=>setVagas((d.vagas||[]).filter((v:any)=>v.status==="ABERTA")));
  },[params.id]);

  const openEditModal = async () => {
    // Pré-preenche o formulário com os dados atuais do estudante
    setEditForm({
      name: student.name || "",
      cpf: student.cpf || "",
      rg: student.rg || "",
      dataNasc: student.dataNasc ? new Date(student.dataNasc).toISOString().split("T")[0] : "",
      sexo: student.sexo || "F",
      email: student.email || "",
      celular: student.celular || "",
      telefone: student.telefone || "",
      endereco: student.endereco || "",
      bairro: student.bairro || "",
      cidade: student.cidade || "",
      uf: student.uf || "",
      cep: student.cep || "",
      curso: student.curso || "",
      periodo: student.periodo ? String(student.periodo) : "1",
      previsaoConclusao: student.previsaoConclusao || "",
      institutionId: student.institution?.id || "",
      observacoes: student.observacoes || "",
      menorDeIdade: (student as any).menorDeIdade || false,
      nomeResponsavel: (student as any).nomeResponsavel || "",
    });
    // Carrega instituições se ainda não carregadas
    if (institutions.length === 0) {
      fetch("/api/app/instituicoes")
        .then(r => r.json())
        .then(d => setInstitutions(d.instituicoes || []));
    }
    setEditModal(true);
  };

  const handleCEPBlur = async () => {
    const cep = editForm.cep;
    if (!cep) return;
    const fmt = formatarCEP(cep);
    setEdit("cep", fmt);
    if (fmt.length === 9) {
      setCepLoading(true);
      const addr = await buscarCEP(fmt);
      setCepLoading(false);
      if (addr) {
        setEditForm(p => ({
          ...p,
          endereco: addr.logradouro || p.endereco,
          bairro:   addr.bairro    || p.bairro,
          cidade:   addr.localidade || p.cidade,
          uf:       addr.uf        || p.uf,
        }));
      }
    }
  };

  const saveEdit = async () => {
    if (!editForm.name) { setMsg("❌ Nome é obrigatório"); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/app/estudantes/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          menorDeIdade: editForm.menorDeIdade,
          nomeResponsavel: editForm.menorDeIdade ? (editForm.nomeResponsavel || null) : null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg("❌ " + data.error);
      } else {
        setMsg("✅ Dados atualizados com sucesso!");
        setEditModal(false);
        loadStudent();
      }
    } catch {
      setMsg("❌ Erro ao salvar. Tente novamente.");
    } finally {
      setEditSaving(false);
    }
  };

  const enviarProcesso = async () => {
    if (!vagaSelecionada) return;
    setEnviando(true);
    const res = await fetch("/api/app/processos/candidatar", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ studentId: student.id, vacancyId: vagaSelecionada }),
    });
    const data = await res.json();
    if (data.error) { setMsg("Erro: "+data.error); }
    else { setMsg("✓ Estudante adicionado ao processo seletivo!"); setProcessoModal(false); }
    setEnviando(false);
  };

  const alterarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) { setMsg("❌ Senha deve ter ao menos 6 caracteres"); return; }
    setSavingAcesso(true);
    const res = await fetch(`/api/app/estudantes/${student.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", userId: student.user?.id, password: novaSenha }),
    });
    const data = await res.json();
    setSavingAcesso(false);
    if (data.error) { setMsg("❌ " + data.error); }
    else { setMsg("✅ Senha alterada com sucesso!"); setSenhaModal(false); setNovaSenha(""); }
  };

  const alterarEmail = async () => {
    if (!novoEmail) { setMsg("❌ Informe o novo e-mail"); return; }
    setSavingAcesso(true);
    const res = await fetch(`/api/app/estudantes/${student.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_email", userId: student.user?.id, email: novoEmail }),
    });
    const data = await res.json();
    setSavingAcesso(false);
    if (data.error) { setMsg("❌ " + data.error); }
    else { setMsg("✅ E-mail de login alterado!"); setEmailModal(false); setNovoEmail(""); loadStudent(); }
  };

  const excluirEstudante = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/app/estudantes/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) { setMsg("❌ " + data.error); setDeleteModal(false); return; }
      router.push("/dashboard/estudantes");
      router.refresh();
    } catch {
      setMsg("❌ Erro ao excluir estudante. Tente novamente.");
      setDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!student) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  const disc = student.discResult ? discInfo[student.discResult] : null;
  const discData = student.discData as any;
  const grafico = discData?.grafico as Record<string,number> | undefined;
  const habilidades = student.habilidades || [];
  const idiomas = student.idiomas || [];
  const experiencias = student.experiencias || [];
  const formacoes = student.formacoes || [];

  return (
    <div>
      {msg && <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50 shadow-lg">{msg}</div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/estudantes" className="text-slate-400 hover:text-slate-600 text-sm">← Estudantes</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-black text-slate-800">{student.name}</h1>
          <Badge variant={student.status==="EM_ESTAGIO"?"green":student.status==="DISPONIVEL"?"yellow":"gray"}>{student.status}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Editar dados — disponível para todas as unidades */}
          <Button variant="secondary" size="sm" onClick={openEditModal}>✏️ Editar Dados</Button>
          {student.user && (
            <>
              <Button variant="secondary" size="sm" onClick={()=>{ setNovoEmail(student.user?.email||""); setEmailModal(true); }}>📧 Alterar E-mail Login</Button>
              <Button variant="secondary" size="sm" onClick={()=>setSenhaModal(true)}>🔑 Alterar Senha</Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={enviarAcessoPainel} disabled={enviandoAcessoEmail}>
            {enviandoAcessoEmail ? "Enviando..." : "📩 Enviar Acesso ao Painel"}
          </Button>
          <Button variant="secondary" onClick={()=>window.open(`/api/app/estudantes/${student.id}/curriculo`, "_blank")}>📄 Baixar Currículo + DISC (PDF)</Button>
          <Button onClick={()=>setProcessoModal(true)}>+ Enviar para Vaga</Button>
          {isFranqueadora && student.status === "INATIVO" && (
            <Button variant="secondary" size="sm" onClick={async () => {
              const res = await fetch(`/api/app/estudantes/${student.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "DISPONIVEL" }),
              });
              const data = await res.json();
              if (data.error) { setMsg("❌ " + data.error); }
              else { setMsg("✅ Estudante reativado!"); loadStudent(); }
            }}>♻️ Reativar</Button>
          )}
          {isFranqueadora && (
            <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>🗑️ Excluir</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* Dados Pessoais */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Dados Pessoais</h3>
          <div className="space-y-2 text-sm">
            {[
              ["CPF", student.cpf],
              ["RG", student.rg],
              ["Nascimento", student.dataNasc ? new Date(student.dataNasc).toLocaleDateString("pt-BR") : null],
              ["Sexo", student.sexo === "F" ? "Feminino" : student.sexo === "M" ? "Masculino" : student.sexo],
              ["Celular", student.celular],
              ["Telefone", student.telefone],
              ["E-mail", student.email],
              ["Endereço", student.endereco],
              ["Cidade", student.cidade && student.uf ? `${student.cidade}/${student.uf}` : null],
              ["CEP", student.cep],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="font-medium text-sm">{v}</p></div>
            ))}
            {(student as any).menorDeIdade && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-bold text-amber-700">⚠️ Menor de Idade</p>
                {(student as any).nomeResponsavel && (
                  <p className="text-xs text-amber-600 mt-0.5">Responsável: {(student as any).nomeResponsavel}</p>
                )}
              </div>
            )}
            {student.linkedin && <a href={student.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline block">🔗 LinkedIn</a>}
            {student.portfolio && <a href={student.portfolio} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline block">💼 Portfólio</a>}
          </div>
        </Card>

        {/* Formação */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Formação Acadêmica</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Curso", student.curso],
              ["Período", student.periodo ? `${student.periodo}º período` : null],
              ["Semestre", student.semestre],
              ["Instituição", student.institution?.name],
              ["Previsão de Conclusão", student.previsaoConclusao],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="font-medium">{v}</p></div>
            ))}
          </div>
          {formacoes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">Formações complementares</p>
              {formacoes.map((f:any,i:number) => (
                <p key={i} className="text-xs text-slate-600">{f.descricao || JSON.stringify(f)}</p>
              ))}
            </div>
          )}
        </Card>

        {/* DISC + Skills */}
        <div className="space-y-4">
          {disc && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{disc.emoji}</span>
                <div>
                  <p className={"font-black text-base "+disc.cor}>{student.discResult} — {disc.nome}</p>
                  <p className="text-xs text-slate-400">Perfil DISC</p>
                </div>
              </div>
              {grafico ? (
                <div className="space-y-2">
                  {["D","I","S","C"].map(t => (
                    <div key={t}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={"font-semibold "+discInfo[t].cor}>{t} — {discInfo[t].nome}</span>
                        <span className={"font-black "+discInfo[t].cor}>{grafico[t]||0}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={"h-2 "+discInfo[t].corBg+" rounded-full transition-all"} style={{width:`${grafico[t]||0}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">{disc.desc}</p>
              )}
            </Card>
          )}
          {habilidades.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Habilidades</p>
              <div className="flex flex-wrap gap-1">
                {habilidades.map((h:string) => <span key={h} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{h}</span>)}
              </div>
            </Card>
          )}
          {idiomas.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Idiomas</p>
              <div className="flex flex-wrap gap-1">
                {idiomas.map((i:any,idx:number) => <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{i.idioma||i}</span>)}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Objetivos */}
      {student.objetivos && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Objetivo Profissional</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{student.objetivos}</p>
        </Card>
      )}

      {/* Experiências */}
      {experiencias.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Experiências</h3>
          <div className="space-y-3">
            {experiencias.map((exp:any, i:number) => (
              <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                {exp.cargo && <p className="text-sm font-bold">{exp.cargo} {exp.empresa && <span className="text-slate-400 font-normal">— {exp.empresa}</span>}</p>}
                {exp.descricao && <p className="text-xs text-slate-600 mt-1">{exp.descricao}</p>}
                {typeof exp === "string" && <p className="text-sm text-slate-600">{exp}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Contratos */}
      {student.contracts?.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Estágios</h3>
          {student.contracts.map((c:any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold">{c.company?.name}</p>
                <p className="text-xs text-slate-400">R$ {c.bolsa?.toLocaleString("pt-BR")}/mês • {new Date(c.dataInicio).toLocaleDateString("pt-BR")} → {new Date(c.dataFim).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={c.status==="ATIVO"?"green":c.status==="PENDENTE"?"yellow":"gray"}>{c.status}</Badge>
                <Link href={`/dashboard/contratos/${c.id}`} className="text-xs text-blue-500 hover:underline">Ver →</Link>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Modal: Editar Dados do Estudante                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Cadastro do Estudante">
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">

          {/* Dados Pessoais */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Dados Pessoais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Nome Completo *" value={editForm.name} onChange={e => setEdit("name", e.target.value)} placeholder="Ana Lima" />
              </div>
              <Input label="CPF" value={editForm.cpf} onChange={e => setEdit("cpf", e.target.value)} placeholder="000.000.000-00" />
              <Input label="RG" value={editForm.rg} onChange={e => setEdit("rg", e.target.value)} placeholder="00.000.000-0" />
              <Input label="Data de Nascimento" type="date" value={editForm.dataNasc} onChange={e => setEdit("dataNasc", e.target.value)} />
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sexo</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={editForm.sexo} onChange={e => setEdit("sexo", e.target.value)}>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="O">Outro</option>
                </select>
              </div>
              <Input label="E-mail" type="email" value={editForm.email} onChange={e => setEdit("email", e.target.value)} placeholder="ana@email.com" />
              <Input label="Celular" value={editForm.celular} onChange={e => setEdit("celular", e.target.value)} placeholder="(11) 98888-1111" />
              <Input label="Telefone" value={editForm.telefone} onChange={e => setEdit("telefone", e.target.value)} placeholder="(11) 3333-4444" />
            </div>
          </div>

          {/* Menor de Idade / Responsável Legal */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Responsável Legal</p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="edit_menorDeIdade"
                checked={editForm.menorDeIdade}
                onChange={e => setEditChecked("menorDeIdade", e.target.checked)}
                className="w-4 h-4 rounded accent-[#0f2a5e] cursor-pointer"
              />
              <label htmlFor="edit_menorDeIdade" className="text-sm font-bold text-slate-700 cursor-pointer">
                Estagiário menor de idade
              </label>
            </div>
            {editForm.menorDeIdade && (
              <div className="pl-6 space-y-2">
                <Input
                  label="Nome do Responsável Legal *"
                  value={editForm.nomeResponsavel}
                  onChange={e => setEdit("nomeResponsavel", e.target.value)}
                  placeholder="Nome completo do responsável"
                />
                <p className="text-xs text-slate-400">O responsável aparecerá nas caixas de assinatura dos documentos TCE.</p>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Endereço {cepLoading && <span className="text-[#0f2a5e] font-normal ml-1 normal-case">Buscando CEP...</span>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">CEP</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                  value={editForm.cep}
                  onChange={e => setEdit("cep", e.target.value)}
                  onBlur={handleCEPBlur}
                  placeholder="01310-000"
                  maxLength={9}
                />
              </div>
              <div />
              <div className="col-span-2">
                <Input label="Endereço" value={editForm.endereco} onChange={e => setEdit("endereco", e.target.value)} placeholder="Rua das Flores, 100" />
              </div>
              <Input label="Bairro" value={editForm.bairro} onChange={e => setEdit("bairro", e.target.value)} placeholder="Jardim Paulista" />
              <Input label="Cidade" value={editForm.cidade} onChange={e => setEdit("cidade", e.target.value)} placeholder="São Paulo" />
              <Input label="UF" value={editForm.uf} onChange={e => setEdit("uf", e.target.value)} placeholder="SP" maxLength={2} />
            </div>
          </div>

          {/* Formação Acadêmica */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Formação Acadêmica</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Curso *" value={editForm.curso} onChange={e => setEdit("curso", e.target.value)} placeholder="Administração de Empresas" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Período</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={editForm.periodo} onChange={e => setEdit("periodo", e.target.value)}>
                  {["1","2","3","4","5","6","7","8","9","10"].map(p => (
                    <option key={p} value={p}>{p}º Período</option>
                  ))}
                </select>
              </div>
              <Input label="Previsão de Conclusão" value={editForm.previsaoConclusao} onChange={e => setEdit("previsaoConclusao", e.target.value)} placeholder="Julho/2026" />
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Instituição de Ensino</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
                  value={editForm.institutionId} onChange={e => setEdit("institutionId", e.target.value)}>
                  <option value="">Selecione (opcional)...</option>
                  {institutions.map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Observações</label>
                <textarea
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none"
                  value={editForm.observacoes}
                  onChange={e => setEdit("observacoes", e.target.value)}
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving || !editForm.name} className="flex-1 justify-center">
              {editSaving ? "Salvando..." : "Salvar Alterações ✓"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Alterar Senha do Estudante */}
      <Modal open={senhaModal} onClose={()=>setSenhaModal(false)} title="Alterar Senha do Estudante">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="font-bold">{student.name}</p>
            <p className="text-slate-500">E-mail de login: {student.user?.email || "—"}</p>
          </div>
          <Input label="Nova Senha" type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={()=>{ setSenhaModal(false); setNovaSenha(""); }}>Cancelar</Button>
            <Button onClick={alterarSenha} disabled={savingAcesso||!novaSenha}>{savingAcesso?"Salvando...":"Alterar Senha"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Alterar E-mail de Login do Estudante */}
      <Modal open={emailModal} onClose={()=>setEmailModal(false)} title="Alterar E-mail de Login">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="font-bold">{student.name}</p>
            <p className="text-slate-500">E-mail atual: {student.user?.email || "—"}</p>
          </div>
          <Input label="Novo E-mail" type="email" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} placeholder="novo@email.com"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={()=>{ setEmailModal(false); setNovoEmail(""); }}>Cancelar</Button>
            <Button onClick={alterarEmail} disabled={savingAcesso||!novoEmail}>{savingAcesso?"Salvando...":"Alterar E-mail"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Exclusão do Estudante */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Excluir Estudante">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-800">⚠️ Atenção: Ação Irreversível</p>
            <p className="text-sm text-red-700 mt-1">
              Isso irá excluir permanentemente <strong>{student.name}</strong> e todos os dados relacionados: contratos, documentos, candidaturas e acesso ao portal do estudante.
            </p>
          </div>
          <p className="text-sm text-slate-600">Tem certeza que deseja excluir este estudante?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button variant="danger" onClick={excluirEstudante} disabled={deleting} className="flex-1 justify-center">
              {deleting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Enviar para Processo Seletivo */}
      <Modal open={processoModal} onClose={()=>setProcessoModal(false)} title="Enviar para Processo Seletivo">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="font-bold">{student.name}</p>
            <p className="text-slate-500">{student.curso} {student.discResult && `• DISC: ${student.discResult}`}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">Selecione a vaga:</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={vagaSelecionada} onChange={e=>setVagaSelecionada(e.target.value)}>
              <option value="">Selecione uma vaga aberta...</option>
              {vagas.map(v=>(
                <option key={v.id} value={v.id}>{v.titulo} — {v.company?.name} (R$ {v.bolsa?.toLocaleString("pt-BR")})</option>
              ))}
            </select>
          </div>
          {vagas.length === 0 && <p className="text-sm text-slate-400 text-center py-2">Nenhuma vaga aberta no momento.</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={()=>setProcessoModal(false)}>Cancelar</Button>
            <Button onClick={enviarProcesso} disabled={!vagaSelecionada||enviando}>{enviando?"Enviando...":"Confirmar Inscrição"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
