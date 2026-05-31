"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function NovaInstituicaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name:"", razaoSocial:"", cnpj:"", tipo:"Privada",
    email:"", telefone:"", coordenador:"", cargoCoord:"",
    cidade:"", uf:"", endereco:"", cep:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!form.name) { setError("Nome é obrigatório."); return; }
    setLoading(true);
    const res = await fetch("/api/app/instituicoes", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    router.push("/dashboard/instituicoes");
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/instituicoes" className="text-slate-400 hover:text-slate-600 text-sm">← Instituições</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Nova Instituição</h1>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <div className="max-w-2xl">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Nome *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="USP"/></div>
            <div className="col-span-2"><Input label="Razão Social" value={form.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)} placeholder="Universidade de Sao Paulo"/></div>
            <Input label="CNPJ" value={form.cnpj} onChange={e=>set("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.tipo} onChange={e=>set("tipo",e.target.value)}>
                {["Publica Federal","Publica Estadual","Privada","Tecnica","EJA","Outro"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="E-mail" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="estagios@inst.edu.br"/>
            <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 9999-0000"/>
            <Input label="Coordenador(a)" value={form.coordenador} onChange={e=>set("coordenador",e.target.value)} placeholder="Prof. Dr. Carlos Silva"/>
            <Input label="Cargo" value={form.cargoCoord} onChange={e=>set("cargoCoord",e.target.value)} placeholder="Coordenador de Estagios"/>
            <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Rua da Reitoria, 374"/></div>
            <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Sao Paulo"/>
            <div className="grid grid-cols-2 gap-2">
              <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP"/>
              <Input label="CEP" value={form.cep} onChange={e=>set("cep",e.target.value)} placeholder="01310-000"/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={()=>router.back()}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading?"Salvando...":"Cadastrar Instituição"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
