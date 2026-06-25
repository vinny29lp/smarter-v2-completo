"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SolicitarVagaForm({ empresa }: { empresa: { name: string; cidade: string; uf: string } | null }) {
  const params = useSearchParams();
  const empresaId = params.get("empresa") || "";

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    funcao: "",
    atividades: "",
    bolsa: "",
    auxTransporte: "",
    horario: "",
    diasTrabalho: "",
    cargaHoraria: "30",
    beneficios: "",
    modalidade: "Presencial",
    cursoDesejado: "",
    preferenciaGenero: "indiferente",
    nivel: "",
    observacoes: "",
    supervisorNome: "",
    supervisorCargo: "",
    supervisorEmail: "",
    supervisorTel: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.funcao || !form.atividades || !form.bolsa || !form.horario || !form.diasTrabalho || !form.supervisorNome) {
      setError("Preencha todos os campos obrigatórios (*).");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/solicitar-vaga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, empresaId }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (!empresaId) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-black text-slate-800 mb-2">Link inválido</h2>
        <p className="text-slate-500 text-sm">Este link não está associado a uma empresa. Solicite um novo link à sua unidade Smarter.</p>
      </Card>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Solicitação enviada!</h2>
        <p className="text-slate-500 text-sm">Recebemos o perfil da vaga. Nossa equipe entrará em contato em breve para dar andamento ao processo seletivo.</p>
        <p className="text-xs text-slate-400 mt-4">Você pode fechar esta página.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#f5c400] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black text-[#0f2a5e]">S</span>
          </div>
          <h1 className="text-2xl font-black text-white">Smarter Estágios</h1>
          {empresa && (
            <p className="text-white/70 text-sm mt-1">
              Solicitação de Vaga — <span className="text-white font-bold">{empresa.name}</span>
            </p>
          )}
          <p className="text-white/50 text-xs mt-1">Preencha o perfil da vaga que deseja abrir</p>
        </div>

        <Card className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {/* Bloco 1 — Dados da Vaga */}
          <div>
            <h2 className="text-sm font-black text-slate-700 mb-3 pb-2 border-b border-slate-100">📋 Dados da Vaga</h2>
            <div className="space-y-3">
              <Input label="Função / Cargo *" value={form.funcao} onChange={e => set("funcao", e.target.value)} placeholder="Auxiliar Administrativo, Assistente de Marketing..." />

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Atividades a serem exercidas *</label>
                <textarea
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none"
                  value={form.atividades}
                  onChange={e => set("atividades", e.target.value)}
                  placeholder="Descreva as principais atividades que o estagiário irá realizar..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Valor da Bolsa (R$) *" type="number" value={form.bolsa} onChange={e => set("bolsa", e.target.value)} placeholder="1200" />
                <Input label="Auxílio Transporte (R$)" type="number" value={form.auxTransporte} onChange={e => set("auxTransporte", e.target.value)} placeholder="200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Horário de Trabalho *" value={form.horario} onChange={e => set("horario", e.target.value)} placeholder="08:00 às 14:00" />
                <Input label="Carga Horária Semanal (h)" type="number" value={form.cargaHoraria} onChange={e => set("cargaHoraria", e.target.value)} placeholder="30" />
              </div>

              <Input label="Dias de Trabalho *" value={form.diasTrabalho} onChange={e => set("diasTrabalho", e.target.value)} placeholder="Segunda a Sexta, Segunda a Sábado..." />

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Benefícios</label>
                <textarea
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none"
                  value={form.beneficios}
                  onChange={e => set("beneficios", e.target.value)}
                  placeholder="Vale refeição, plano de saúde, estacionamento..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Modalidade</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.modalidade} onChange={e => set("modalidade", e.target.value)}>
                  {["Presencial", "Híbrido", "Remoto"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Bloco 2 — Perfil do Candidato */}
          <div>
            <h2 className="text-sm font-black text-slate-700 mb-3 pb-2 border-b border-slate-100">🎓 Perfil do Candidato</h2>
            <div className="space-y-3">
              <Input label="Curso Desejado" value={form.cursoDesejado} onChange={e => set("cursoDesejado", e.target.value)} placeholder="Administração, TI, Marketing, Qualquer área..." />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Preferência de Gênero</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.preferenciaGenero} onChange={e => set("preferenciaGenero", e.target.value)}>
                    <option value="indiferente">Indiferente</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Nível de Ensino</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.nivel} onChange={e => set("nivel", e.target.value)}>
                    <option value="">Indiferente</option>
                    <option value="medio">Ensino Médio</option>
                    <option value="superior">Ensino Superior</option>
                    <option value="pos">Pós-Graduação</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 3 — Supervisor */}
          <div>
            <h2 className="text-sm font-black text-slate-700 mb-3 pb-2 border-b border-slate-100">👤 Supervisor do Estagiário</h2>
            <div className="space-y-3">
              <Input label="Nome do Supervisor *" value={form.supervisorNome} onChange={e => set("supervisorNome", e.target.value)} placeholder="João Silva" />
              <Input label="Cargo do Supervisor" value={form.supervisorCargo} onChange={e => set("supervisorCargo", e.target.value)} placeholder="Gerente de RH" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="E-mail do Supervisor" type="email" value={form.supervisorEmail} onChange={e => set("supervisorEmail", e.target.value)} placeholder="joao@empresa.com.br" />
                <Input label="Telefone / WhatsApp" value={form.supervisorTel} onChange={e => set("supervisorTel", e.target.value)} placeholder="(11) 99999-0000" />
              </div>
            </div>
          </div>

          {/* Bloco 4 — Observações */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Observações adicionais</label>
            <textarea
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-16 resize-none"
              value={form.observacoes}
              onChange={e => set("observacoes", e.target.value)}
              placeholder="Alguma informação adicional que julgar importante..."
            />
          </div>

          <Button
            className="w-full justify-center"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar Solicitação de Vaga →"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
