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

const discInfo: Record<string,{nome:string;cor:string;corBg:string;emoji:string;desc:string}> = {
  D:{nome:"Dominância",cor:"text-red-600",corBg:"bg-red-500",emoji:"🔴",desc:"Focado em resultados, direto e assertivo"},
  I:{nome:"Influência",cor:"text-amber-600",corBg:"bg-amber-500",emoji:"🟡",desc:"Comunicativo, entusiasmado e persuasivo"},
  S:{nome:"Estabilidade",cor:"text-emerald-600",corBg:"bg-emerald-500",emoji:"🟢",desc:"Colaborativo, paciente e confiável"},
  C:{nome:"Conformidade",cor:"text-blue-600",corBg:"bg-blue-500",emoji:"🔵",desc:"Analítico, meticuloso e preciso"},
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
  // Modais de acesso
  const [senhaModal, setSenhaModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [savingAcesso, setSavingAcesso] = useState(false);

  const loadStudent = () => {
    fetch(`/api/app/estudantes/${params.id}`)
      .then(r=>r.json()).then(d=>setStudent(d.estudante));
  };

  useEffect(() => {
    loadStudent();
    fetch("/api/app/vagas")
      .then(r=>r.json()).then(d=>setVagas((d.vagas||[]).filter((v:any)=>v.status==="ABERTA")));
  },[params.id]);

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
    const res = await fetch(`/api/app/estudantes/${params.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (data.error) { setMsg("❌ " + data.error); setDeleteModal(false); return; }
    router.push("/dashboard/estudantes");
    router.refresh();
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
          {student.user && (
            <>
              <Button variant="secondary" size="sm" onClick={()=>{ setNovoEmail(student.user?.email||""); setEmailModal(true); }}>📧 Alterar E-mail Login</Button>
              <Button variant="secondary" size="sm" onClick={()=>setSenhaModal(true)}>🔑 Alterar Senha</Button>
            </>
          )}
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
