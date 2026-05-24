"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

export function EmpresaActions({ empresa }: { empresa: any }) {
  const router = useRouter();
  const [editModal, setEditModal] = useState(false);
  const [senhaModal, setSenhaModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAcesso, setSavingAcesso] = useState(false);
  const [acessoMsg, setAcessoMsg] = useState<string|null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

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
        <Button variant="secondary" className="w-full justify-center" onClick={() => setEditModal(true)}>
          ✏️ Editar Dados
        </Button>
        <Button variant={empresa.status === "ATIVA" ? "danger" : "primary"} className="w-full justify-center" onClick={inativar} disabled={loading}>
          {empresa.status === "ATIVA" ? "⛔ Inativar" : "✓ Reativar"}
        </Button>
        {empresa.email && (
          <a href={`mailto:${empresa.email}`} className="block text-center text-xs border border-slate-200 hover:border-blue-400 px-3 py-2 rounded-xl font-semibold transition-colors text-slate-600">
            ✉️ Enviar E-mail
          </a>
        )}
      </div>

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
    </Card>
  );
}
