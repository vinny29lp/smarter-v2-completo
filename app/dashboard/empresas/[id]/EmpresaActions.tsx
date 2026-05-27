"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

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
    </Card>
  );
}

export function EmpresaCPS({ empresa }: { empresa: any }) {
  const [valorGestao, setValorGestao] = useState<string>(empresa.valorGestao ? String(empresa.valorGestao) : "");
  const [cpsMsg, setCpsMsg] = useState<string|null>(null);
  const [savingCps, setSavingCps] = useState(false);
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

  const gerar = () => window.open(`/api/app/empresas/${empresa.id}/cps`, "_blank");

  return (
    <Card className="p-5 mb-4">
      <h3 className="text-sm font-bold text-slate-700 mb-1">📄 Contrato de Prestação de Serviços</h3>
      <p className="text-xs text-slate-400 mb-4">Contrato comercial entre a empresa e o agente de integração (franquia). Gerado por empresa, não por contrato de estágio.</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Valor de Gestão por Estagiário (R$/mês)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorGestao}
              onChange={e => setValorGestao(e.target.value)}
              placeholder="Ex: 150.00"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f2a5e] transition-colors"
            />
            <button
              onClick={salvar}
              disabled={savingCps}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {savingCps ? "..." : "Salvar"}
            </button>
          </div>
        </div>
        {cpsMsg && (
          <p className={`text-xs p-2 rounded-lg ${cpsMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {cpsMsg}
          </p>
        )}
        <button
          onClick={gerar}
          disabled={!valorGestao}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2a5e] text-white rounded-xl text-sm font-bold hover:bg-[#1a3d8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📄 Gerar Contrato (CPS)
        </button>
        {empresa.valorGestao && (
          <p className="text-xs text-center text-slate-400">
            Valor atual: <strong className="text-slate-600">R$ {Number(empresa.valorGestao).toLocaleString("pt-BR", {minimumFractionDigits:2})}/estagiário</strong>
          </p>
        )}
      </div>
    </Card>
  );
}
