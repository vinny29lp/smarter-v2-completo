"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  validarCPF, validarEmail, validarTelefone, validarCEP,
  formatarCPF, formatarCEP, formatarTelefone,
  buscarCEP,
} from "@/lib/validations";

interface Props { franchiseId: string; institutions: any[]; }

export function EstudanteForm({ franchiseId, institutions }: Props) {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError]           = useState("");
  const [etapa, setEtapa]           = useState(1);
  const [form, setForm] = useState({
    nome:"", cpf:"", rg:"", dataNasc:"", sexo:"F",
    email:"", celular:"", telefone:"",
    endereco:"", bairro:"", cidade:"", uf:"", cep:"",
    curso:"", periodo:"1", institutionId:"", previsaoConclusao:"",
    observacoes:"", senha:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  // ── Formatação ao sair do campo ───────────────────────────────────────────
  const handleCPFBlur    = () => { if (form.cpf) set("cpf", formatarCPF(form.cpf)); };
  const handleCelularBlur = () => { if (form.celular) set("celular", formatarTelefone(form.celular)); };
  const handleCEPBlur    = () => {
    if (form.cep) {
      const fmt = formatarCEP(form.cep);
      set("cep", fmt);
      if (validarCEP(fmt)) lookupCEP(fmt);
    }
  };

  const lookupCEP = async (cep: string) => {
    setCepLoading(true);
    const addr = await buscarCEP(cep);
    setCepLoading(false);
    if (addr) {
      setForm(p => ({
        ...p,
        endereco: addr.logradouro || p.endereco,
        bairro:   addr.bairro    || p.bairro,
        cidade:   addr.localidade || p.cidade,
        uf:       addr.uf        || p.uf,
      }));
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.nome||!form.email||!form.curso) { setError("Preencha: Nome, E-mail e Curso."); return; }
    if (!validarEmail(form.email)) { setError("E-mail inválido."); return; }
    if (form.cpf && !validarCPF(form.cpf)) { setError("CPF inválido. Verifique o número digitado."); return; }
    if (form.celular && !validarTelefone(form.celular)) { setError("Celular inválido. Informe DDD + número."); return; }
    if (form.cep && !validarCEP(form.cep)) { setError("CEP inválido. Use o formato 00000-000."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/app/estudantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          cpf: form.cpf || null,
          rg: form.rg || null,
          dataNasc: form.dataNasc || null,
          sexo: form.sexo,
          celular: form.celular || null,
          telefone: form.telefone || null,
          endereco: form.endereco || null,
          bairro: form.bairro || null,
          cidade: form.cidade || null,
          uf: form.uf || null,
          cep: form.cep || null,
          curso: form.curso,
          periodo: form.periodo || null,
          previsaoConclusao: form.previsaoConclusao || null,
          institutionId: form.institutionId || null,
          franchiseId: franchiseId || null,
          observacoes: form.observacoes || null,
          senha: form.senha || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar estudante.");
        setLoading(false);
        return;
      }
      router.push("/dashboard/estudantes");
      router.refresh();
    } catch(e:any) {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-6">
        {["Dados Pessoais","Acadêmico","Acesso"].map((l,i)=>(
          <div key={i} className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${etapa===i+1?"bg-[#0f2a5e] text-white":etapa>i+1?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{i+1}. {l}</div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {etapa===1&&(
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Dados Pessoais</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Nome Completo *" value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ana Lima"/></div>
            <Input label="CPF" value={form.cpf} onChange={e=>set("cpf",e.target.value)} onBlur={handleCPFBlur} placeholder="000.000.000-00"/>
            <Input label="RG" value={form.rg} onChange={e=>set("rg",e.target.value)} placeholder="00.000.000-0"/>
            <Input label="Data de Nascimento" type="date" value={form.dataNasc} onChange={e=>set("dataNasc",e.target.value)}/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Sexo</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.sexo} onChange={e=>set("sexo",e.target.value)}>
                <option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option>
              </select>
            </div>
            <Input label="E-mail *" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="ana@email.com"/>
            <Input label="Celular" value={form.celular} onChange={e=>set("celular",e.target.value)} onBlur={handleCelularBlur} placeholder="(11) 98888-1111"/>
            {/* CEP com lookup automático */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                CEP {cepLoading && <span className="text-[#0f2a5e] font-normal ml-1">Buscando...</span>}
              </label>
              <input type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                value={form.cep} onChange={e=>set("cep",e.target.value)} onBlur={handleCEPBlur}
                placeholder="01310-000" maxLength={9}/>
            </div>
            <div/>
            <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Rua das Flores, 100"/></div>
            <Input label="Bairro" value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Jardim Paulista"/>
            <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
            <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP" maxLength={2}/>
          </div>
        </Card>
      )}

      {etapa===2&&(
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Dados Acadêmicos</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Curso *" value={form.curso} onChange={e=>set("curso",e.target.value)} placeholder="Administração de Empresas"/></div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Período</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.periodo} onChange={e=>set("periodo",e.target.value)}>
                {["1","2","3","4","5","6","7","8","9","10"].map(p=><option key={p} value={p}>{p}º Período</option>)}
              </select>
            </div>
            <Input label="Previsão de Conclusão" value={form.previsaoConclusao} onChange={e=>set("previsaoConclusao",e.target.value)} placeholder="Julho/2026"/>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Instituição de Ensino</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.institutionId} onChange={e=>set("institutionId",e.target.value)}>
                <option value="">Selecione (opcional)...</option>
                {institutions.map((i:any)=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Observações</label>
              <textarea className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] h-20 resize-none" value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} placeholder="Informações adicionais..."/>
            </div>
          </div>
        </Card>
      )}

      {etapa===3&&(
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Acesso ao Portal</h3>
          <p className="text-xs text-slate-400 mb-4">O estudante receberá acesso ao portal com e-mail e senha para acompanhar seu estágio.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-3 bg-slate-50 rounded-xl text-sm"><strong>E-mail:</strong> {form.email}</div>
            <div className="col-span-2"><Input label="Senha inicial (opcional — gerada automaticamente se vazio)" value={form.senha} onChange={e=>set("senha",e.target.value)} placeholder="Deixe em branco para gerar automaticamente"/></div>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">✅ Após salvar, o estudante já pode fazer login com as credenciais acima.</div>
        </Card>
      )}

      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={()=>etapa>1?setEtapa(p=>p-1):router.back()}>{etapa>1?"← Voltar":"Cancelar"}</Button>
        {etapa<3
          ?<Button onClick={()=>{setError("");setEtapa(p=>p+1);}}>Próximo →</Button>
          :<Button onClick={handleSubmit} disabled={loading}>{loading?"Cadastrando...":"Cadastrar Estudante ✓"}</Button>
        }
      </div>
    </div>
  );
}
