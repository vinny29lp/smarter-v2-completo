"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";

export function EmpresaActions({ empresa }: { empresa: any }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isFranqueadora = (session?.user as any)?.role === "FRANQUEADORA";
  const [editModal, setEditModal] = useState(false);
  const [senhaModal, setSenhaModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAcesso, setSavingAcesso] = useState(false);
  const [acessoMsg, setAcessoMsg] = useState<string|null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [composeModal, setComposeModal] = useState(false);
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailMensagem, setEmailMensagem] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string|null>(null);
  const [copiedVaga, setCopiedVaga] = useState(false);

  // CPS — Contrato de Prestação de Serviços
  const [valorGestao, setValorGestao] = useState<string>(empresa.valorGestao ? String(empresa.valorGestao) : "");
  const [cpsMsg, setCpsMsg] = useState<string|null>(null);
  const [savingCps, setSavingCps] = useState(false);

  const salvarValorGestao = async () => {
    if (!valorGestao || isNaN(Number(valorGestao.replace(",", ".")))) {
      setCpsMsg("❌ Informe um valor válido"); return;
    }
    setSavingCps(true); setCpsMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/cps`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valorGestao: Number(valorGestao.replace(",", ".")) }),
    });
    const data = await res.json();
    setSavingCps(false);
    if (data.error) { setCpsMsg("❌ " + data.error); }
    else { setCpsMsg("✅ Valor salvo!"); router.refresh(); }
  };

  const gerarCps = () => {
    window.open(`/api/app/empresas/${empresa.id}/cps`, "_blank");
  };

  const portalUser = empresa.users?.[0];

  const aprovar = async () => {
    setLoading(true);
    await fetch(`/api/app/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendente: false, status: "ATIVA" }),
    });
    router.refresh();
    setLoading(false);
  };

  const criarAcesso = async () => {
    if (!confirm(`Criar acesso ao portal para ${empresa.name}? Um e-mail com a senha será enviado para ${empresa.email}.`)) return;
    setLoading(true); setAcessoMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/acesso`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      setAcessoMsg("❌ " + data.error);
    } else {
      setAcessoMsg("✅ Acesso criado! E-mail enviado para " + empresa.email);
      router.refresh();
    }
    setLoading(false);
  };

  const excluirEmpresa = async () => {
    setLoading(true);
    const res = await fetch(`/api/app/empresas/${empresa.id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (data.error) { alert("Erro: " + data.error); return; }
    setDeleteModal(false);
    router.push("/dashboard/empresas");
    router.refresh();
  };

  const inativar = async () => {
    if (!confirm("Inativar esta empresa?")) return;
    setLoading(true);
    await fetch(`/api/app/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: empresa.status === "ATIVA" ? "INATIVA" : "ATIVA" }),
    });
    router.refresh();
    setLoading(false);
  };

  const alterarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) { setAcessoMsg("❌ Senha deve ter ao menos 6 caracteres"); return; }
    setSavingAcesso(true); setAcessoMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", userId: portalUser?.id, password: novaSenha }),
    });
    const data = await res.json();
    setSavingAcesso(false);
    if (data.error) { setAcessoMsg("❌ " + data.error); }
    else { setAcessoMsg("✅ Senha alterada com sucesso!"); setSenhaModal(false); setNovaSenha(""); }
  };

  const enviarEmail = async () => {
    if (!emailAssunto.trim() || !emailMensagem.trim()) { setEmailMsg("❌ Preencha o assunto e a mensagem."); return; }
    setEnviandoEmail(true); setEmailMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/email`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assunto: emailAssunto, mensagem: emailMensagem }),
    });
    const data = await res.json();
    setEnviandoEmail(false);
    if (data.error) { setEmailMsg("❌ " + data.error); }
    else { setEmailMsg("✅ E-mail enviado com sucesso!"); setEmailAssunto(""); setEmailMensagem(""); setTimeout(() => { setComposeModal(false); setEmailMsg(null); }, 2000); }
  };

  const alterarEmail = async () => {
    if (!novoEmail) { setAcessoMsg("❌ Informe o novo e-mail"); return; }
    setSavingAcesso(true); setAcessoMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_email", userId: portalUser?.id, email: novoEmail }),
    });
    const data = await res.json();
    setSavingAcesso(false);
    if (data.error) { setAcessoMsg("❌ " + data.error); }
    else { setAcessoMsg("✅ E-mail de login alterado!"); setEmailModal(false); setNovoEmail(""); router.refresh(); }
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-3">Ações</h3>
      <div className="space-y-2">
        {empresa.pendente && (
          <Button className="w-full justify-center" onClick={aprovar} disabled={loading}>
            ✓ Aprovar Empresa
          </Button>
        )}
        {(!empresa.users || empresa.users.length === 0) ? (
          <Button className="w-full justify-center" onClick={criarAcesso} disabled={loading}>
            🔑 Criar Acesso ao Portal
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="w-full justify-center" onClick={() => { setNovoEmail(portalUser?.email || ""); setEmailModal(true); }}>
              📧 Alterar E-mail Login
            </Button>
            <Button variant="secondary" className="w-full justify-center" onClick={() => setSenhaModal(true)}>
              🔑 Alterar Senha Portal
            </Button>
          </>
        )}
        {acessoMsg && (
          <div className={`text-xs p-2 rounded-lg ${acessoMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {acessoMsg}
          </div>
        )}
        {/* Link de Solicitação de Vaga — empresa preenche o perfil da vaga */}
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => {
            const base = typeof window !== "undefined" ? window.location.origin : "https://sistema.smarterestagios.com.br";
            const link = `${base}/solicitar-vaga?empresa=${empresa.id}`;
            navigator.clipboard.writeText(link);
            setCopiedVaga(true);
            setTimeout(() => setCopiedVaga(false), 2500);
          }}
        >
          {copiedVaga ? "✅ Link Copiado!" : "📋 Copiar Link de Solicitação de Vaga"}
        </Button>
        <Button variant="secondary" className="w-full justify-center" onClick={() => setEditModal(true)}>
          ✏️ Editar Dados
        </Button>
        <Button variant={empresa.status === "ATIVA" ? "danger" : "primary"} className="w-full justify-center" onClick={inativar} disabled={loading}>
          {empresa.status === "ATIVA" ? "⛔ Inativar" : "✓ Reativar"}
        </Button>
        {empresa.email && (
          <Button variant="secondary" className="w-full justify-center" onClick={() => { setEmailAssunto(""); setEmailMensagem(""); setEmailMsg(null); setComposeModal(true); }}>
            ✉️ Enviar E-mail
          </Button>
        )}
        {isFranqueadora && (
          <Button variant="danger" className="w-full justify-center mt-2" onClick={() => setDeleteModal(true)} disabled={loading}>
            🗑️ Excluir Empresa
          </Button>
        )}
      </div>

      {/* Modal: Confirmar Exclusão da Empresa */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Excluir Empresa">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-800">⚠️ Atenção: Ação Irreversível</p>
            <p className="text-sm text-red-700 mt-1">
              Isso irá excluir permanentemente <strong>{empresa.name}</strong> e todos os dados relacionados: contratos, documentos, vagas, candidaturas e acesso ao portal.
            </p>
          </div>
          <p className="text-sm text-slate-600">Tem certeza que deseja excluir esta empresa?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button variant="danger" onClick={excluirEmpresa} disabled={loading} className="flex-1 justify-center">
              {loading ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Alterar Senha do Portal da Empresa */}
      <Modal open={senhaModal} onClose={() => { setSenhaModal(false); setNovaSenha(""); }} title="Alterar Senha do Portal">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="font-bold">{empresa.name}</p>
            <p className="text-slate-500">Login: {portalUser?.email || "—"}</p>
          </div>
          <Input label="Nova Senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setSenhaModal(false); setNovaSenha(""); }}>Cancelar</Button>
            <Button onClick={alterarSenha} disabled={savingAcesso || !novaSenha}>{savingAcesso ? "Salvando..." : "Alterar Senha"}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Alterar E-mail de Login da Empresa */}
      <Modal open={emailModal} onClose={() => { setEmailModal(false); setNovoEmail(""); }} title="Alterar E-mail de Login">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="font-bold">{empresa.name}</p>
            <p className="text-slate-500">E-mail atual: {portalUser?.email || "—"}</p>
          </div>
          <Input label="Novo E-mail" type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="novo@email.com"/>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setEmailModal(false); setNovoEmail(""); }}>Cancelar</Button>
            <Button onClick={alterarEmail} disabled={savingAcesso || !novoEmail}>{savingAcesso ? "Salvando..." : "Alterar E-mail"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Empresa" size="xl">
        <EmpresaForm franchiseId={empresa.franchiseId} empresa={empresa} onSuccess={() => { setEditModal(false); router.refresh(); }}/>
      </Modal>

      {/* Modal: Compor e Enviar E-mail para a Empresa */}
      <Modal open={composeModal} onClose={() => { setComposeModal(false); setEmailMsg(null); }} title="Enviar E-mail para Empresa">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm">
            <p className="text-slate-400 text-xs">Para:</p>
            <p className="font-semibold text-slate-700">{empresa.name} — {empresa.email}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Assunto</label>
            <input type="text" value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
              placeholder="Ex: Informações sobre o estágio"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Mensagem</label>
            <textarea value={emailMensagem} onChange={e => setEmailMensagem(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#0f2a5e] transition-colors resize-none h-32"
              placeholder="Digite a mensagem aqui..."/>
          </div>
          {emailMsg && (
            <div className={`text-xs p-2 rounded-lg ${emailMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {emailMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setComposeModal(false); setEmailMsg(null); }} className="flex-1 justify-center">Cancelar</Button>
            <Button onClick={enviarEmail} disabled={enviandoEmail || !emailAssunto.trim() || !emailMensagem.trim()} className="flex-1 justify-center">
              {enviandoEmail ? "Enviando..." : "✉️ Enviar"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

const propostaStatusLabel: Record<string,string> = {
  NAO_ENVIADA: "Não enviada",
  ENVIADA: "Enviada",
  VISUALIZADA: "Visualizada",
  ACEITA: "Aceita ✓",
  RECUSADA: "Recusada",
};
const propostaStatusColor: Record<string,string> = {
  NAO_ENVIADA: "text-slate-400",
  ENVIADA: "text-blue-600",
  VISUALIZADA: "text-purple-600",
  ACEITA: "text-emerald-600 font-bold",
  RECUSADA: "text-red-500",
};

export function EmpresaProposta({ empresa }: { empresa: any }) {
  const router = useRouter();
  const [valorGestao, setValorGestao] = useState<string>(empresa.valorGestao ? String(empresa.valorGestao) : "");
  const [propostaMsg, setPropostaMsg] = useState<string|null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<string>(empresa.proposalStatus || "NAO_ENVIADA");
  const [proposalToken, setProposalToken] = useState<string|null>(empresa.proposalToken || null);

  const getLink = () => proposalToken ? `${APP_URL}/proposta/${proposalToken}` : null;

  const copy = () => {
    const link = getLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gerarEEnviar = async () => {
    if (!valorGestao || isNaN(Number(valorGestao.replace(",", ".")))) {
      setPropostaMsg("❌ Informe um valor válido"); return;
    }
    setEnviando(true); setPropostaMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/proposta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valorGestao: Number(valorGestao.replace(",", ".")) }),
    });
    const data = await res.json();
    setEnviando(false);
    if (data.error) { setPropostaMsg("❌ " + data.error); }
    else {
      setPropostaMsg("✅ Proposta enviada para " + empresa.email);
      setProposalStatus("ENVIADA");
      setProposalToken(data.token);
      router.refresh();
    }
  };

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-700">📋 Proposta Comercial</h3>
        <span className={`text-xs ${propostaStatusColor[proposalStatus] || "text-slate-400"}`}>
          {propostaStatusLabel[proposalStatus] || proposalStatus}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">Etapa intermediária entre a apresentação e o contrato: uma proposta com valor e condições para a empresa aceitar online.</p>

      <div className="space-y-3">
        {/* Valor de gestão */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Valor de Gestão por Estagiário (R$/mês)</label>
          <input
            type="number" min="0" step="0.01" value={valorGestao}
            onChange={e => setValorGestao(e.target.value)} placeholder="Ex: 150.00"
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
          />
        </div>

        {propostaMsg && (
          <p className={`text-xs p-2 rounded-lg ${propostaMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {propostaMsg}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={gerarEEnviar} disabled={enviando || !empresa.email}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {enviando ? "Enviando..." : "📧 Gerar e enviar proposta"}
          </button>

          {proposalToken && (
            <button onClick={copy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
              {copied ? "✅ Link copiado!" : "📋 Copiar link da proposta"}
            </button>
          )}
        </div>

        {!empresa.email && (
          <p className="text-xs text-amber-600">Cadastre um e-mail para a empresa antes de enviar a proposta.</p>
        )}

        {/* Timestamps */}
        {(empresa.proposalSentAt || empresa.proposalViewedAt || empresa.proposalRespondedAt) && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {empresa.proposalSentAt && (
              <p className="text-xs text-slate-400">Enviada em {new Date(empresa.proposalSentAt).toLocaleString("pt-BR")}</p>
            )}
            {empresa.proposalViewedAt && (
              <p className="text-xs text-slate-400">Visualizada em {new Date(empresa.proposalViewedAt).toLocaleString("pt-BR")}</p>
            )}
            {empresa.proposalRespondedAt && (
              <p className="text-xs text-slate-400">Respondida em {new Date(empresa.proposalRespondedAt).toLocaleString("pt-BR")}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

const cpsStatusLabel: Record<string,string> = {
  NAO_GERADO: "Não gerado",
  GERADO: "Gerado",
  AGUARDANDO_ASSINATURA: "Aguardando Assinatura",
  ASSINADO: "Assinado ✓",
};
const cpsStatusColor: Record<string,string> = {
  NAO_GERADO: "text-slate-400",
  GERADO: "text-purple-600",
  AGUARDANDO_ASSINATURA: "text-blue-600",
  ASSINADO: "text-emerald-600 font-bold",
};

export function EmpresaCPS({ empresa }: { empresa: any }) {
  const [valorGestao, setValorGestao] = useState<string>(empresa.valorGestao ? String(empresa.valorGestao) : "");
  const [cpsMsg, setCpsMsg] = useState<string|null>(null);
  const [savingCps, setSavingCps] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);
  const [emailsAssinar, setEmailsAssinar] = useState<string[]>([empresa.email || ""]);
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [cpsStatus, setCpsStatus] = useState<string>(empresa.cpsStatus || "NAO_GERADO");
  const [cpsSignedUrl, setCpsSignedUrl] = useState<string|null>(empresa.cpsSignedUrl || null);
  const router = useRouter();

  const salvar = async () => {
    if (!valorGestao || isNaN(Number(valorGestao.replace(",", ".")))) {
      setCpsMsg("❌ Informe um valor válido"); return;
    }
    setSavingCps(true); setCpsMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/cps`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valorGestao: Number(valorGestao.replace(",", ".")) }),
    });
    const data = await res.json();
    setSavingCps(false);
    if (data.error) { setCpsMsg("❌ " + data.error); }
    else { setCpsMsg("✅ Valor salvo!"); router.refresh(); }
  };

  // Baixar CPS como HTML (imprimível como PDF pelo navegador)
  const baixarCPS = async () => {
    if (!empresa.valorGestao) { setCpsMsg("❌ Salve o valor de gestão primeiro."); return; }
    const res = await fetch(`/api/app/empresas/${empresa.id}/cps`);
    if (!res.ok) { const d = await res.json(); setCpsMsg("❌ " + (d.error || "Erro ao gerar CPS.")); return; }
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CPS-${empresa.name.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setCpsStatus("GERADO");
  };

  const setEmail = (idx: number, val: string) => {
    setEmailsAssinar(prev => prev.map((e, i) => i === idx ? val : e));
  };
  const addEmail = () => setEmailsAssinar(prev => [...prev, ""]);
  const removeEmail = (idx: number) => setEmailsAssinar(prev => prev.filter((_, i) => i !== idx));

  const enviarParaAssinatura = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validos = emailsAssinar.map(e => e.trim()).filter(Boolean);
    if (validos.length === 0) { setCpsMsg("❌ Informe ao menos um e-mail."); return; }
    for (const em of validos) {
      if (!emailRegex.test(em)) { setCpsMsg(`❌ E-mail inválido: ${em}`); return; }
    }
    setEnviandoAssinatura(true); setCpsMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/cps/autentique`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: validos }),
    });
    const data = await res.json();
    setEnviandoAssinatura(false);
    if (data.error) { setCpsMsg("❌ " + data.error); }
    else {
      setCpsMsg("✅ CPS enviado para assinatura!");
      setCpsStatus("AGUARDANDO_ASSINATURA");
      setAssinaturaModal(false);
      router.refresh();
    }
  };

  const verificarAssinatura = async () => {
    setVerificando(true); setCpsMsg(null);
    const res = await fetch(`/api/app/empresas/${empresa.id}/cps/autentique`);
    const data = await res.json();
    setVerificando(false);
    if (data.error) { setCpsMsg("❌ " + data.error); return; }
    if (data.allSigned) {
      setCpsStatus("ASSINADO");
      setCpsSignedUrl(data.signedUrl || null);
      setCpsMsg("✅ CPS assinado! Já pode baixar o documento assinado.");
      router.refresh();
    } else {
      const pendentes = (data.signers || []).filter((s: any) => !s.signed).length;
      setCpsMsg(`🔄 Aguardando ${pendentes} assinatura(s).`);
    }
  };

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-700">📄 Contrato de Parceria (CPS)</h3>
        <span className={`text-xs ${cpsStatusColor[cpsStatus] || "text-slate-400"}`}>
          {cpsStatusLabel[cpsStatus] || cpsStatus}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">Contrato comercial entre a empresa e a franquia. Pode ser gerado, baixado em PDF e enviado para assinatura digital.</p>

      <div className="space-y-3">
        {/* Valor de gestão */}
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Valor de Gestão por Estagiário (R$/mês)</label>
          <div className="flex gap-2">
            <input
              type="number" min="0" step="0.01" value={valorGestao}
              onChange={e => setValorGestao(e.target.value)} placeholder="Ex: 150.00"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
            />
            <button onClick={salvar} disabled={savingCps}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50">
              {savingCps ? "..." : "Salvar"}
            </button>
          </div>
        </div>

        {cpsMsg && (
          <p className={`text-xs p-2 rounded-lg ${cpsMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : cpsMsg.startsWith("🔄") ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
            {cpsMsg}
          </p>
        )}

        {/* Ações do CPS */}
        <div className="flex flex-col gap-2">
          {/* Baixar como HTML/PDF */}
          <button onClick={baixarCPS} disabled={!empresa.valorGestao}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            ⬇ Baixar CPS (abrir e imprimir como PDF)
          </button>

          {/* Enviar para assinatura digital */}
          {cpsStatus !== "ASSINADO" && (
            <button onClick={() => { setAssinaturaModal(true); setCpsMsg(null); }} disabled={!empresa.valorGestao}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              📧 Enviar para Assinatura Digital
            </button>
          )}

          {/* Verificar status — disponível enquanto aguardando ou para re-verificar */}
          {(cpsStatus === "AGUARDANDO_ASSINATURA" || cpsStatus === "ASSINADO") && (
            <button onClick={verificarAssinatura} disabled={verificando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {verificando ? "Verificando..." : "🔄 Verificar Assinaturas"}
            </button>
          )}

          {/* Baixar assinado */}
          {cpsSignedUrl && (
            <a href={cpsSignedUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">
              ✅ Baixar CPS Assinado (PDF)
            </a>
          )}
        </div>
      </div>

      {/* Modal: Enviar para Assinatura */}
      <Modal open={assinaturaModal} onClose={() => setAssinaturaModal(false)} title="📧 Enviar CPS para Assinatura">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            O CPS será enviado para assinatura digital via Autentique. Adicione todos os e-mails que precisam assinar o documento.
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600">E-mails para Assinatura *</label>
              <button type="button" onClick={addEmail}
                className="text-xs text-[#0f2a5e] font-bold hover:underline">+ Adicionar e-mail</button>
            </div>
            <div className="space-y-2">
              {emailsAssinar.map((em, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="email" value={em} onChange={e => setEmail(idx, e.target.value)}
                    placeholder={idx === 0 ? "responsavel@empresa.com.br" : "outro@email.com"}
                    className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e]"/>
                  {emailsAssinar.length > 1 && (
                    <button type="button" onClick={() => removeEmail(idx)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Todos os signatários receberão o link por e-mail.</p>
          </div>
          {cpsMsg && (
            <p className={`text-xs p-2 rounded-lg ${cpsMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {cpsMsg}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAssinaturaModal(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button onClick={enviarParaAssinatura} disabled={enviandoAssinatura || emailsAssinar.every(e => !e.trim())} className="flex-1 justify-center">
              {enviandoAssinatura ? "Enviando..." : "📧 Enviar"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
