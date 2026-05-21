"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmpresaForm } from "@/components/forms/EmpresaForm";

export function EmpresaActions({ empresa }: { empresa: any }) {
  const router = useRouter();
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acessoMsg, setAcessoMsg] = useState<string|null>(null);

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

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-3">Ações</h3>
      <div className="space-y-2">
        {empresa.pendente && (
          <Button className="w-full justify-center" onClick={aprovar} disabled={loading}>
            ✓ Aprovar Empresa
          </Button>
        )}
        {(!empresa.users || empresa.users.length === 0) && (
          <Button className="w-full justify-center" onClick={criarAcesso} disabled={loading}>
            🔑 Criar Acesso ao Portal
          </Button>
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

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Empresa" size="xl">
        <EmpresaForm franchiseId={empresa.franchiseId} empresa={empresa} onSuccess={() => { setEditModal(false); router.refresh(); }}/>
      </Modal>
    </Card>
  );
}
