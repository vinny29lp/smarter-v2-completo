"use client";

export const dynamic = "force-dynamic";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const SETORES = ["Tecnologia","Saúde","Educação","Financeiro","Varejo","Indústria","Serviços","Agronegócio","Logística","Outro"];

function CadastroContent() {
  const params = useSearchParams();
  const ref = params.get("ref") || "";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name:"", razaoSocial:"", cnpj:"", setor:"", email:"", telefone:"",
    responsavel:"", cargoResponsavel:"", site:"",
    endereco:"", bairro:"", cidade:"", uf:"", cep:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!form.name || !form.cnpj || !form.email || !form.responsavel) {
      setError("Preencha: Nome, CNPJ, E-mail e Responsável."); return;
    }
    setLoading(true); setError("");
    const res = await fetch("/api/public/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, franchiseRef: ref }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Cadastro Enviado!</h2>
        <p className="text-slate-500 text-sm">Sua empresa foi cadastrada com sucesso. Nossa equipe entrará em contato em breve para confirmar o acesso.</p>
        <p className="text-xs text-slate-400 mt-4">Você pode fechar esta página.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a5e] to-[#1a3d8f] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-sm mb-3">
            <span className="font-black text-[#f5c400]">S</span> Smarter Estágios
          </div>
          <h1 className="text-2xl font-black text-white">Cadastro de Empresa</h1>
          <p className="text-white/70 text-sm mt-1">Preencha os dados para se tornar empresa parceira</p>
        </div>

        <div className="flex gap-2 mb-5">
          {["Dados da Empresa","Responsável","Endereço"].map((l,i) => (
            <div key={i} className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all ${step===i+1?"bg-[#f5c400] text-[#0f2a5e]":step>i+1?"bg-white/20 text-white":"bg-white/10 text-white/50"}`}>
              {i+1}. {l}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Nome Fantasia *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="TechCorp"/></div>
              <div className="col-span-2"><Input label="Razão Social" value={form.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)} placeholder="TechCorp Brasil Ltda."/></div>
              <Input label="CNPJ *" value={form.cnpj} onChange={e=>set("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Setor</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.setor} onChange={e=>set("setor",e.target.value)}>
                  <option value="">Selecione...</option>
                  {SETORES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <Input label="E-mail Corporativo *" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="rh@empresa.com.br"/>
              <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 99999-0000"/>
              <div className="col-span-2"><Input label="Site" value={form.site} onChange={e=>set("site",e.target.value)} placeholder="www.empresa.com.br"/></div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Nome do Responsável *" value={form.responsavel} onChange={e=>set("responsavel",e.target.value)} placeholder="João Silva"/></div>
              <div className="col-span-2"><Input label="Cargo" value={form.cargoResponsavel} onChange={e=>set("cargoResponsavel",e.target.value)} placeholder="Diretor de RH"/></div>
              <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                ℹ️ O responsável receberá as comunicações sobre o processo de cadastro.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Av. Paulista, 1000"/></div>
              <Input label="Bairro" value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Bela Vista"/>
              <Input label="Cidade *" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
              <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP"/>
              <Input label="CEP" value={form.cep} onChange={e=>set("cep",e.target.value)} placeholder="01310-100"/>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            {step > 1 && <Button variant="secondary" onClick={()=>setStep(p=>p-1)}>← Voltar</Button>}
            {step < 3
              ? <Button className="flex-1 justify-center" onClick={()=>{setError("");setStep(p=>p+1);}}>Próximo →</Button>
              : <Button className="flex-1 justify-center" onClick={handleSubmit} disabled={loading}>{loading?"Enviando...":"Enviar Cadastro ✓"}</Button>
            }
          </div>
          <div className="text-center mt-3">
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 underline">Já tenho cadastro → Fazer login</a>
          </div>
        </Card>

        <p className="text-white/40 text-xs text-center mt-4">Smarter Estágios — Sistema de Gestão de Estágios</p>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <Suspense fallback={null}>
      <CadastroContent />
    </Suspense>
  );
}
