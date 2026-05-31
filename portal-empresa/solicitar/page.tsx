"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const AREAS = ["Administrativo","Comercial","Contabilidade","Design","Financeiro","Jurídico","Logística","Marketing","RH","Tecnologia","Saúde","Outro"];

export default function EmpresaSolicitarEstagiario() {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({
    titulo: "", area: "", descricao: "", requisitos: "",
    bolsa: "", cargaHoraria: "30", horario: "08:00 - 14:00",
    modalidade: "Presencial", cidade: "", observacao: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.titulo || !form.bolsa) {
      setError("Preencha o título e o valor da bolsa."); return;
    }
    setLoading(true); setError("");
    const res = await fetch("/api/portal/empresa/solicitar-estagiario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setDone(true); }
    else { setError("Erro ao enviar. Tente novamente."); }
    setLoading(false);
  };

  if (done) return (
    <div className="max-w-lg mx-auto mt-10">
      <Card className="p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black mb-2">Solicitação Enviada!</h2>
        <p className="text-slate-500 text-sm mb-4">
          Sua solicitação foi enviada ao consultor Smarter. Em breve entraremos em contato com candidatos.
        </p>
        <Button onClick={() => { setDone(false); setForm({ titulo:"",area:"",descricao:"",requisitos:"",bolsa:"",cargaHoraria:"30",horario:"08:00 - 14:00",modalidade:"Presencial",cidade:"",observacao:"" }); }}>
          + Nova Solicitação
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-slate-800 mb-2">Solicitar Novo Estagiário</h1>
      <p className="text-slate-500 text-sm mb-6">
        Preencha os dados e nossa equipe buscará os melhores candidatos.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Título da Vaga *" value={form.titulo} onChange={e => set("titulo", e.target.value)} placeholder="Assistente Administrativo"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Área</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={form.area} onChange={e => set("area", e.target.value)}>
              <option value="">Selecione...</option>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Modalidade</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={form.modalidade} onChange={e => set("modalidade", e.target.value)}>
              {["Presencial","Híbrido","Remoto"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Descrição das atividades</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none"
              value={form.descricao} onChange={e => set("descricao", e.target.value)}
              placeholder="Descreva o que o estagiário irá fazer..."/>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Requisitos</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-14 resize-none"
              value={form.requisitos} onChange={e => set("requisitos", e.target.value)}
              placeholder="Cursando qual curso? Alguma habilidade específica?"/>
          </div>
          <Input label="Bolsa (R$) *" type="number" value={form.bolsa} onChange={e => set("bolsa", e.target.value)} placeholder="1500"/>
          <Input label="Horário" value={form.horario} onChange={e => set("horario", e.target.value)} placeholder="08:00 - 14:00"/>
          <Input label="Cidade" value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="São Paulo / SP"/>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Observações adicionais</label>
            <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-14 resize-none"
              value={form.observacao} onChange={e => set("observacao", e.target.value)}
              placeholder="Preferência de perfil, curso específico..."/>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !form.titulo || !form.bolsa} className="w-full justify-center">
          {loading ? "Enviando..." : "Enviar Solicitação →"}
        </Button>
      </Card>
    </div>
  );
}
