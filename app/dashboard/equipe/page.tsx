"use client";
import { useState, useEffect } from "react";
import { Card }   from "@/components/ui/Card";
import { Badge }  from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Modal }  from "@/components/ui/Modal";

const MODULOS = [
  { key: "financeiro",   label: "💰 Financeiro" },
  { key: "contratos",    label: "📄 Contratos" },
  { key: "estudantes",   label: "🎓 Estudantes" },
  { key: "empresas",     label: "🏢 Empresas" },
  { key: "vagas",        label: "💼 Vagas" },
  { key: "processos",    label: "📋 Processos Seletivos" },
  { key: "crm",          label: "📞 CRM" },
  { key: "instituicoes", label: "🏫 Instituições" },
  { key: "configuracoes",label: "⚙️ Configurações" },
];

export default function EquipePage() {
  const [employees, setEmployees]   = useState<any[]>([]);
  const [novoModal, setNovoModal]   = useState(false);
  const [editModal, setEditModal]   = useState<any>(null);
  const [senhaModal, setSenhaModal] = useState<{ nome: string; email: string; senha: string } | null>(null);
  const [loading, setLoading]       = useState(false);
  const [form, setForm] = useState({ name: "", email: "", cargo: "", permissoes: [] as string[] });

  const load = () =>
    fetch("/api/app/equipe").then(r => r.json()).then(d => setEmployees(d.employees || []));

  useEffect(() => { load(); }, []);

  const togglePerm = (key: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(key) ? current.filter(p => p !== key) : [...current, key]);
  };

  const criar = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    const res  = await fetch("/api/app/equipe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setEmployees(p => [data.employee, ...p]);
      setSenhaModal({ nome: form.name, email: form.email, senha: data.senhaGerada });
      setNovoModal(false);
      setForm({ name: "", email: "", cargo: "", permissoes: [] });
    } else {
      alert(data.error || "Erro ao criar colaborador");
    }
    setLoading(false);
  };

  const salvarEdicao = async () => {
    if (!editModal) return;
    await fetch(`/api/app/equipe/${editModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargo: editModal.cargo, permissoes: editModal.permissoes }),
    });
    setEditModal(null);
    load();
  };

  const desativar = async (id: string, ativo: boolean) => {
    if (!confirm(ativo ? "Desativar este colaborador?" : "Reativar este colaborador?")) return;
    await fetch(`/api/app/equipe/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ativo }),
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Equipe</h1>
          <p className="text-slate-500 text-sm mt-1">
            {employees.filter(e => e.user.active).length} colaboradores ativos
          </p>
        </div>
        <Button onClick={() => setNovoModal(true)}>+ Convidar Colaborador</Button>
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Nome","Cargo","Permissões","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">Nenhum colaborador cadastrado.</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${!emp.user.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold">{emp.user.name}</p>
                  <p className="text-xs text-slate-400">{emp.user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{emp.cargo || "—"}</td>
                <td className="px-4 py-3">
                  {emp.permissoes.length === 0
                    ? <span className="text-xs text-slate-400">Nenhuma</span>
                    : (
                      <div className="flex flex-wrap gap-1">
                        {emp.permissoes.slice(0, 3).map((p: string) => (
                          <span key={p} className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full capitalize">{p}</span>
                        ))}
                        {emp.permissoes.length > 3 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">+{emp.permissoes.length - 3}</span>
                        )}
                      </div>
                    )
                  }
                </td>
                <td className="px-4 py-3">
                  <Badge variant={emp.user.active ? "green" : "gray"}>{emp.user.active ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditModal({ ...emp, permissoes: [...emp.permissoes] })}>✏️ Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => desativar(emp.id, emp.user.active)}>
                      {emp.user.active ? "⛔" : "✅"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal Novo Colaborador */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Convidar Colaborador">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="João Silva"/>
            <Input label="E-mail *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com"/>
          </div>
          <Input label="Cargo" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Analista de Estágios"/>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">Módulos com acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULOS.map(m => (
                <label key={m.key} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors text-sm ${form.permissoes.includes(m.key) ? "border-[#0f2a5e] bg-blue-50 text-[#0f2a5e] font-semibold" : "border-slate-200 hover:border-slate-300"}`}>
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5"
                    checked={form.permissoes.includes(m.key)}
                    onChange={() => togglePerm(m.key, form.permissoes, (v) => setForm(p => ({ ...p, permissoes: v })))}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setNovoModal(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={loading || !form.name || !form.email}>
              {loading ? "Criando..." : "Criar Colaborador"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Permissões */}
      <Modal open={editModal !== null} onClose={() => setEditModal(null)} title="Editar Colaborador">
        {editModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Editando permissões de <strong>{editModal.user.name}</strong></p>
            <Input
              label="Cargo"
              value={editModal.cargo || ""}
              onChange={e => setEditModal((p: any) => ({ ...p, cargo: e.target.value }))}
            />
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">Módulos com acesso</label>
              <div className="grid grid-cols-2 gap-2">
                {MODULOS.map(m => (
                  <label key={m.key} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors text-sm ${editModal.permissoes.includes(m.key) ? "border-[#0f2a5e] bg-blue-50 text-[#0f2a5e] font-semibold" : "border-slate-200 hover:border-slate-300"}`}>
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5"
                      checked={editModal.permissoes.includes(m.key)}
                      onChange={() => togglePerm(m.key, editModal.permissoes, (v) => setEditModal((p: any) => ({ ...p, permissoes: v })))}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal senha gerada */}
      <Modal open={senhaModal !== null} onClose={() => setSenhaModal(null)} title="✅ Colaborador Criado!">
        {senhaModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              O colaborador <strong>{senhaModal.nome}</strong> foi criado com sucesso.
              Compartilhe as credenciais de acesso:
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="text-sm"><span className="font-semibold text-slate-500">E-mail:</span> {senhaModal.email}</p>
              <p className="text-sm"><span className="font-semibold text-slate-500">Senha:</span>
                <span className="ml-2 font-mono font-black text-[#0f2a5e] bg-yellow-100 px-2 py-0.5 rounded">{senhaModal.senha}</span>
              </p>
            </div>
            <p className="text-xs text-slate-400">⚠️ Peça ao colaborador para alterar a senha no primeiro acesso.</p>
            <Button onClick={() => setSenhaModal(null)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
