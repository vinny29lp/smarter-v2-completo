"use client";
import { useState, useEffect } from "react";
import { Card }   from "@/components/ui/Card";
import { Badge }  from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Modal }  from "@/components/ui/Modal";

const MODULOS = [
  { key: "financeiro",    label: "💰 Financeiro" },
  { key: "contratos",     label: "📄 Contratos" },
  { key: "estudantes",    label: "🎓 Estudantes" },
  { key: "empresas",      label: "🏢 Empresas" },
  { key: "vagas",         label: "💼 Vagas" },
  { key: "processos",     label: "📋 Processos Seletivos" },
  { key: "crm",           label: "📞 CRM" },
  { key: "instituicoes",  label: "🏫 Instituições" },
  { key: "configuracoes", label: "⚙️ Configurações" },
];

const EMPTY_FORM = { name: "", email: "", cargo: "", senha: "", confirmarSenha: "", permissoes: [] as string[] };

export default function EquipePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [novoModal,  setNovoModal]  = useState(false);
  const [editModal,  setEditModal]  = useState<any>(null);
  const [senhaModal, setSenhaModal] = useState<any>(null); // { emp } — change password modal
  const [deleteModal,setDeleteModal]= useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  const load = () =>
    fetch("/api/app/equipe").then(r => r.json()).then(d => setEmployees(d.employees || []));

  useEffect(() => { load(); }, []);

  const togglePerm = (key: string, current: string[], setter: (v: string[]) => void) =>
    setter(current.includes(key) ? current.filter(p => p !== key) : [...current, key]);

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const criar = async () => {
    setErroForm("");
    if (!form.name || !form.email) { setErroForm("Nome e e-mail são obrigatórios."); return; }
    if (!form.senha) { setErroForm("Defina uma senha para o colaborador."); return; }
    if (form.senha.length < 6) { setErroForm("A senha deve ter pelo menos 6 caracteres."); return; }
    if (form.senha !== form.confirmarSenha) { setErroForm("As senhas não coincidem."); return; }
    setLoading(true);
    const res  = await fetch("/api/app/equipe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, cargo: form.cargo, permissoes: form.permissoes, senha: form.senha }),
    });
    const data = await res.json();
    if (res.ok) {
      setEmployees(p => [data.employee, ...p]);
      setNovoModal(false);
      setForm({ ...EMPTY_FORM });
    } else {
      setErroForm(data.error || "Erro ao criar colaborador");
    }
    setLoading(false);
  };

  // ── EDIT PROFILE ─────────────────────────────────────────────────────────────
  const salvarEdicao = async () => {
    if (!editModal) return;
    setErroForm("");
    if (!editModal.user.name || !editModal.user.email) { setErroForm("Nome e e-mail são obrigatórios."); return; }
    setLoading(true);
    const res = await fetch(`/api/app/equipe/${editModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editModal.user.name,
        email: editModal.user.email,
        cargo: editModal.cargo,
        permissoes: editModal.permissoes,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEmployees(p => p.map(e => e.id === editModal.id ? data.employee : e));
      setEditModal(null);
    } else {
      setErroForm(data.error || "Erro ao salvar");
    }
    setLoading(false);
  };

  // ── CHANGE PASSWORD ──────────────────────────────────────────────────────────
  const salvarSenha = async () => {
    if (!senhaModal) return;
    setErroForm("");
    if (!novaSenha || novaSenha.length < 6) { setErroForm("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarNovaSenha) { setErroForm("As senhas não coincidem."); return; }
    setLoading(true);
    const res = await fetch(`/api/app/equipe/${senhaModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novaSenha }),
    });
    const data = await res.json();
    if (res.ok) {
      setSenhaModal(null);
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } else {
      setErroForm(data.error || "Erro ao alterar senha");
    }
    setLoading(false);
  };

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────
  const toggleAtivo = async (emp: any) => {
    const novoAtivo = !emp.user.active;
    await fetch(`/api/app/equipe/${emp.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: novoAtivo }),
    });
    setEmployees(p => p.map(e => e.id === emp.id ? { ...e, user: { ...e.user, active: novoAtivo } } : e));
  };

  // ── DELETE ────────────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deleteModal) return;
    await fetch(`/api/app/equipe/${deleteModal.id}`, { method: "DELETE" });
    setEmployees(p => p.filter(e => e.id !== deleteModal.id));
    setDeleteModal(null);
  };

  const ativos   = employees.filter(e => e.user.active).length;
  const inativos = employees.filter(e => !e.user.active).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Equipe</h1>
          <p className="text-slate-500 text-sm mt-1">
            {ativos} ativo{ativos !== 1 ? "s" : ""}{inativos > 0 ? ` · ${inativos} inativo${inativos !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setErroForm(""); setNovoModal(true); }}>
          + Novo Colaborador
        </Button>
      </div>

      {/* Table */}
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {["Colaborador","Cargo","Módulos","Status","Ações"].map(h => (
                <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="font-semibold">Nenhum colaborador cadastrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Colaborador" para começar</p>
                </td>
              </tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!emp.user.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold">{emp.user.name}</p>
                  <p className="text-xs text-slate-400">{emp.user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{emp.cargo || "—"}</td>
                <td className="px-4 py-3">
                  {emp.permissoes.length === 0 ? (
                    <span className="text-xs text-slate-400">Nenhum</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {emp.permissoes.slice(0, 3).map((p: string) => (
                        <span key={p} className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full capitalize">{p}</span>
                      ))}
                      {emp.permissoes.length > 3 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">+{emp.permissoes.length - 3}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={emp.user.active ? "green" : "gray"}>
                    {emp.user.active ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="secondary"
                      onClick={() => { setErroForm(""); setEditModal({ ...emp, permissoes: [...emp.permissoes], user: { ...emp.user } }); }}>
                      ✏️ Editar
                    </Button>
                    <Button size="sm" variant="secondary"
                      onClick={() => { setErroForm(""); setNovaSenha(""); setConfirmarNovaSenha(""); setSenhaModal(emp); }}>
                      🔑 Senha
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => toggleAtivo(emp)}
                      title={emp.user.active ? "Bloquear acesso" : "Reativar acesso"}>
                      {emp.user.active ? "⛔" : "✅"}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => setDeleteModal(emp)}
                      title="Excluir colaborador">
                      🗑️
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── Modal Novo Colaborador ── */}
      <Modal open={novoModal} onClose={() => setNovoModal(false)} title="Novo Colaborador">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome completo *" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="João Silva"/>
            <Input label="E-mail *" type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com"/>
          </div>
          <Input label="Cargo" value={form.cargo}
            onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Analista de Estágios"/>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Senha *" type="password" value={form.senha}
              onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} placeholder="Mínimo 6 caracteres"/>
            <Input label="Confirmar Senha *" type="password" value={form.confirmarSenha}
              onChange={e => setForm(p => ({ ...p, confirmarSenha: e.target.value }))} placeholder="Repita a senha"/>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">Módulos com acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULOS.map(m => (
                <label key={m.key} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors text-sm ${form.permissoes.includes(m.key) ? "border-[#0f2a5e] bg-blue-50 text-[#0f2a5e] font-semibold" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="checkbox" className="w-3.5 h-3.5"
                    checked={form.permissoes.includes(m.key)}
                    onChange={() => togglePerm(m.key, form.permissoes, v => setForm(p => ({ ...p, permissoes: v })))}/>
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroForm}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setNovoModal(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={loading || !form.name || !form.email || !form.senha}>
              {loading ? "Criando..." : "Criar Colaborador"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar Perfil Completo ── */}
      <Modal open={editModal !== null} onClose={() => setEditModal(null)} title="Editar Colaborador">
        {editModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome completo *" value={editModal.user.name}
                onChange={e => setEditModal((p: any) => ({ ...p, user: { ...p.user, name: e.target.value } }))}/>
              <Input label="E-mail *" type="email" value={editModal.user.email}
                onChange={e => setEditModal((p: any) => ({ ...p, user: { ...p.user, email: e.target.value } }))}/>
            </div>
            <Input label="Cargo" value={editModal.cargo || ""}
              onChange={e => setEditModal((p: any) => ({ ...p, cargo: e.target.value }))}/>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">Módulos com acesso</label>
              <div className="grid grid-cols-2 gap-2">
                {MODULOS.map(m => (
                  <label key={m.key} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors text-sm ${editModal.permissoes.includes(m.key) ? "border-[#0f2a5e] bg-blue-50 text-[#0f2a5e] font-semibold" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="checkbox" className="w-3.5 h-3.5"
                      checked={editModal.permissoes.includes(m.key)}
                      onChange={() => togglePerm(m.key, editModal.permissoes, v => setEditModal((p: any) => ({ ...p, permissoes: v })))}/>
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroForm}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Alterar Senha ── */}
      <Modal open={senhaModal !== null} onClose={() => setSenhaModal(null)} title="Alterar Senha">
        {senhaModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Definindo nova senha para <strong>{senhaModal.user.name}</strong>
            </p>
            <Input label="Nova Senha *" type="password" value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres"/>
            <Input label="Confirmar Nova Senha *" type="password" value={confirmarNovaSenha}
              onChange={e => setConfirmarNovaSenha(e.target.value)} placeholder="Repita a senha"/>

            {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroForm}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setSenhaModal(null)}>Cancelar</Button>
              <Button onClick={salvarSenha} disabled={loading || !novaSenha}>
                {loading ? "Salvando..." : "Alterar Senha"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Confirmar Exclusão ── */}
      <Modal open={deleteModal !== null} onClose={() => setDeleteModal(null)} title="Excluir Colaborador">
        {deleteModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir <strong>{deleteModal.user.name}</strong>?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ O acesso ao sistema será removido. Esta ação não pode ser desfeita.
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
              <Button onClick={confirmarDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
