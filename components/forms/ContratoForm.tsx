"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContract } from "@/lib/actions/contracts";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AIButton } from "@/components/ai/AIButton";

interface Props { franchiseId:string; students:any[]; companies:any[]; institutions:any[]; }

export function ContratoForm({ franchiseId, students, companies, institutions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [etapa, setEtapa] = useState(1);
  const [form, setForm] = useState({
    studentId:"", companyId:"", institutionId:"",
    tipoEstagio:"Nao Obrigatorio",
    bolsa:"", valorEmpresa:"", auxTransporte:"", beneficios:"Auxilio Transporte",
    dataInicio:"", dataFim:"", vencimento:"5",
    atividades:"", localEstagio:"", cidade:"", uf:"",
    chDiaria:"6", chSemanal:"30", diasSemana:"Segunda a Sexta",
    horarioInicio:"08:00", horarioFim:"14:00", intervalo:"60",
    supervisorNome:"", supervisorCargo:"", supervisorEmail:"", supervisorTel:"",
    coordNome:"", coordCargo:"", coordEmail:"", coordTel:"",
    apoliceSeguro:"212709/M-65358303000126", seguradora:"PORTO SEGURO S.A",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const chTotal = parseInt(form.chDiaria||"0") * (form.diasSemana.includes("Sábado")?6:5);

  // Módulo 2 — Payload para IA de atividades TCE
  const selectedStudent = students.find(s => s.id === form.studentId);
  const nivelEscolar    = selectedStudent?.nivelEscolar || "";
  const aiAtividadesPayload = {
    curso: selectedStudent?.curso || "",
    area: nivelEscolar === "MEDIO"
      ? "Ensino Médio / Técnico"
      : selectedStudent?.curso || "Ensino Superior",
    nivelEscolar,
    empresa: companies.find(c => c.id === form.companyId)?.name || "",
    setor: companies.find(c => c.id === form.companyId)?.setor || "",
    bolsa: form.bolsa,
    cargaHoraria: String(chTotal),
    chDiaria: form.chDiaria,
    diasSemana: form.diasSemana,
    tipoEstagio: form.tipoEstagio,
  };

  const handleSubmit = async () => {
    if (!form.studentId||!form.companyId||!form.bolsa||!form.dataInicio||!form.dataFim) {
      setError("Preencha: Estudante, Empresa, Bolsa e Datas."); return;
    }
    if (!form.supervisorNome) { setError("Informe o Supervisor da Empresa (obrigatório pela Lei 11.788/2008)."); return; }
    if (!form.apoliceSeguro) { setError("Informe a Apólice de Seguro (obrigatório pela Lei 11.788/2008)."); return; }
    setLoading(true); setError("");
    try {
      await createContract({
        ...form,
        franchiseId,
        bolsa: parseFloat(form.bolsa),
        valorEmpresa: form.valorEmpresa ? parseFloat(form.valorEmpresa) : null,
        auxTransporte: form.auxTransporte ? parseFloat(form.auxTransporte) : null,
        vencimento: parseInt(form.vencimento),
        dataInicio: new Date(form.dataInicio),
        dataFim: new Date(form.dataFim),
        chDiaria: parseInt(form.chDiaria),
        chSemanal: chTotal,
        intervalo: parseInt(form.intervalo),
        institutionId: form.institutionId || null,
      });
      router.push("/dashboard/contratos"); router.refresh();
    } catch(e:any) {
      // Mostrar mensagem específica do servidor quando disponível
      const msg = e?.message || String(e) || "";
      setError(msg ? `Erro: ${msg}` : "Erro inesperado ao criar contrato. Tente novamente.");
    }
    setLoading(false);
  };

  const dias = Math.ceil((new Date(form.dataFim).getTime()-new Date(form.dataInicio).getTime())/(1000*60*60*24));
  const anos = dias/365;

  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-6">
        {["Partes","Estágio","Supervisor & Seguro"].map((l,i)=>(
          <div key={i} className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${etapa===i+1?"bg-[#0f2a5e] text-white":etapa>i+1?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{i+1}. {l}</div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {anos>2&&form.dataFim&&(<div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">⚠️ O estágio ultrapassa 2 anos. Verifique exceção legal (PcD) — Lei 11.788/2008, art. 11.</div>)}

      {etapa===1&&(
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Partes do Contrato</h3>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Estagiário(a) *</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.studentId} onChange={e=>set("studentId",e.target.value)}>
              <option value="">Selecione o estudante...</option>
              {students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.curso||"Sem curso"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Empresa Concedente *</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.companyId} onChange={e=>set("companyId",e.target.value)}>
              <option value="">Selecione a empresa...</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cidade}/{c.uf}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Instituição de Ensino</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.institutionId} onChange={e=>set("institutionId",e.target.value)}>
              <option value="">Selecione (opcional)...</option>
              {institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">ℹ️ O número do contrato é gerado automaticamente pelo sistema.</div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de Estágio</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.tipoEstagio} onChange={e=>set("tipoEstagio",e.target.value)}>
                <option value="Nao Obrigatorio">Não Obrigatório</option>
                <option value="Obrigatorio">Obrigatório</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {etapa===2&&(
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Dados do Estágio</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bolsa (R$) *" type="number" value={form.bolsa} onChange={e=>set("bolsa",e.target.value)} placeholder="1500"/>
            <Input label="Valor cobrado Empresa (R$)" type="number" value={form.valorEmpresa} onChange={e=>set("valorEmpresa",e.target.value)} placeholder="1800"/>
            <Input label="Auxílio Transporte (R$)" type="number" value={form.auxTransporte} onChange={e=>set("auxTransporte",e.target.value)} placeholder="200"/>
            <Input label="Benefícios" value={form.beneficios} onChange={e=>set("beneficios",e.target.value)} placeholder="Auxílio Transporte"/>
            <Input label="Data de Início *" type="date" value={form.dataInicio} onChange={e=>set("dataInicio",e.target.value)}/>
            <Input label="Data de Término *" type="date" value={form.dataFim} onChange={e=>set("dataFim",e.target.value)}/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">C.H. Diária (máx. 6h)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.chDiaria} onChange={e=>set("chDiaria",e.target.value)}>
                {["4","5","6"].map(h=><option key={h} value={h}>{h}h/dia</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Dias da Semana</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.diasSemana} onChange={e=>set("diasSemana",e.target.value)}>
                <option>Segunda a Sexta</option>
                <option>Segunda a Sábado</option>
              </select>
            </div>
            <Input label="Horário Início" type="time" value={form.horarioInicio} onChange={e=>set("horarioInicio",e.target.value)}/>
            <Input label="Horário Fim" type="time" value={form.horarioFim} onChange={e=>set("horarioFim",e.target.value)}/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Intervalo (minutos)</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.intervalo} onChange={e=>set("intervalo",e.target.value)}>
                <option value="0">Sem intervalo</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min (1h)</option>
              </select>
            </div>
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-bold">
              ⏱ Total: {chTotal}h/semana {chTotal>30&&<span className="text-red-500">⚠️ Excede limite legal (30h)</span>}
            </div>
            <Input label="Vencimento (dia do mês)" type="number" value={form.vencimento} onChange={e=>set("vencimento",e.target.value)} placeholder="5"/>
            <Input label="Cidade do Estágio" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Atividades do Estágio *</label>
                <AIButton
                  label="Gerar atividades conforme Lei 11.788/08"
                  endpoint="/api/app/ai/tce-atividades"
                  payload={aiAtividadesPayload}
                  resultLabel="Atividades geradas pela IA"
                  disabled={!form.studentId && !form.companyId}
                  onResult={(text) => set("atividades", text)}
                />
              </div>
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-24 resize-none" value={form.atividades} onChange={e=>set("atividades",e.target.value)} placeholder="Descreva as atividades que o estagiário irá desenvolver..."/>
            </div>
            <div className="col-span-2"><Input label="Local do Estágio" value={form.localEstagio} onChange={e=>set("localEstagio",e.target.value)} placeholder="Av. Paulista, 1000 — São Paulo/SP"/></div>
          </div>
        </Card>
      )}

      {etapa===3&&(
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Supervisor & Seguro</h3>
          <p className="text-xs text-slate-400">Obrigatório pela Lei 11.788/2008</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Supervisor da Empresa *" value={form.supervisorNome} onChange={e=>set("supervisorNome",e.target.value)} placeholder="Maria Santos"/>
            <Input label="Cargo" value={form.supervisorCargo} onChange={e=>set("supervisorCargo",e.target.value)} placeholder="Coordenadora de RH"/>
            <Input label="E-mail do Supervisor" value={form.supervisorEmail} onChange={e=>set("supervisorEmail",e.target.value)} placeholder="maria@empresa.com.br"/>
            <Input label="Telefone do Supervisor" value={form.supervisorTel} onChange={e=>set("supervisorTel",e.target.value)} placeholder="(11) 99999-2222"/>
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600 mb-3">Coordenador da Instituição de Ensino</p>
            </div>
            <Input label="Nome do Orientador" value={form.coordNome} onChange={e=>set("coordNome",e.target.value)} placeholder="Prof. Dr. Carlos Silva"/>
            <Input label="Cargo" value={form.coordCargo} onChange={e=>set("coordCargo",e.target.value)} placeholder="Coordenador de Estágios"/>
            <Input label="E-mail" value={form.coordEmail} onChange={e=>set("coordEmail",e.target.value)} placeholder="carlos@universidade.edu.br"/>
            <div className="col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600 mb-3">Seguro de Vida Obrigatório</p>
            </div>
            <Input label="Apólice de Seguro *" value={form.apoliceSeguro} onChange={e=>set("apoliceSeguro",e.target.value)}/>
            <Input label="Seguradora" value={form.seguradora} onChange={e=>set("seguradora",e.target.value)}/>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">✅ Após criar, os 11 documentos serão gerados automaticamente para este contrato.</div>
        </Card>
      )}

      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={()=>etapa>1?setEtapa(p=>p-1):router.back()}>{etapa>1?"← Voltar":"Cancelar"}</Button>
        {etapa<3
          ?<Button onClick={()=>{setError("");setEtapa(p=>p+1);}}>Próximo →</Button>
          :<Button onClick={handleSubmit} disabled={loading}>{loading?"Criando...":"Criar Contrato ✓"}</Button>
        }
      </div>
    </div>
  );
}
