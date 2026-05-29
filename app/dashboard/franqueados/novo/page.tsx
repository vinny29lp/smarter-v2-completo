"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { validarCNPJ, validarEmail, validarTelefone, validarCEP, formatarCNPJ, formatarCEP, formatarTelefone, buscarCEP } from "@/lib/validations";

export default function NovoFranqueadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState<{email:string;senha:string}|null>(null);
  const [form, setForm] = useState({
    name:"", razaoSocial:"", cnpj:"", responsavel:"", email:"",
    emailLogin:"", telefone:"", cidade:"", uf:"", endereco:"", cep:"",
    mensalidade:"200", plano:"completo", senha:"",
  });
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));
  const [cepLoading, setCepLoading] = useState(false);

  const handleCEPBlur = async () => {
    if (!form.cep) return;
    const fmt = formatarCEP(form.cep);
    set("cep", fmt);
    if (validarCEP(fmt)) {
      setCepLoading(true);
      const addr = await buscarCEP(fmt);
      setCepLoading(false);
      if (addr) setForm(p => ({ ...p, endereco: addr.logradouro||p.endereco, cidade: addr.localidade||p.cidade, uf: addr.uf||p.uf, cep: fmt }));
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name||!form.responsavel||!form.email) { setError("Preencha: Nome, Responsável e E-mail."); return; }
    if (!validarEmail(form.email)) { setError("E-mail inválido."); return; }
    if (form.cnpj && !validarCNPJ(form.cnpj)) { setError("CNPJ inválido."); return; }
    if (form.telefone && !validarTelefone(form.telefone)) { setError("Telefone inválido."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/app/franqueados", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setSucesso({ email: data.user.email, senha: data.senhaGerada });
    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Franqueado Cadastrado!</h2>
          <p className="text-slate-500 text-sm mb-6">E-mail de boas-vindas enviado com as credenciais de acesso.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-bold text-slate-400 mb-2">CREDENCIAIS DE ACESSO:</p>
            <p className="text-sm"><strong>Login:</strong> {sucesso.email}</p>
            <p className="text-sm"><strong>Senha:</strong> {sucesso.senha}</p>
            <p className="text-xs text-slate-400 mt-2">⚠️ Anote a senha — ela não será exibida novamente.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push("/dashboard/franqueados")}>Ver Lista</Button>
            <Button onClick={() => { setSucesso(null); setForm({name:"",razaoSocial:"",cnpj:"",responsavel:"",email:"",emailLogin:"",telefone:"",cidade:"",uf:"",endereco:"",cep:"",mensalidade:"200",plano:"completo",senha:""}); }}>
              + Novo Franqueado
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/franqueados" className="text-slate-400 hover:text-slate-600 text-sm">← Franqueados</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-black text-slate-800">Novo Franqueado</h1>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <div className="max-w-2xl space-y-5">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Dados da Unidade</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome da Unidade *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Smarter Rio de Janeiro"/>
            <Input label="Razão Social" value={form.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)} placeholder="Smarter RJ Ltda."/>
            <Input label="CNPJ" value={form.cnpj} onChange={e=>set("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Plano</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.plano} onChange={e=>set("plano",e.target.value)}>
                {["basico","completo","premium"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <Input label="Mensalidade (R$)" type="number" value={form.mensalidade} onChange={e=>set("mensalidade",e.target.value)} placeholder="200"/>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Responsável e Acesso</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome do Responsável *" value={form.responsavel} onChange={e=>set("responsavel",e.target.value)} placeholder="João Silva"/>
            <Input label="E-mail de Contato *" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="contato@franquia.com.br"/>
            <Input label="E-mail de Login (se diferente)" type="email" value={form.emailLogin} onChange={e=>set("emailLogin",e.target.value)} placeholder="joao@franquia.com.br"/>
            <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(21) 99999-0000"/>
            <Input label="Senha inicial (opcional)" value={form.senha} onChange={e=>set("senha",e.target.value)} placeholder="Gerada automaticamente se vazio"/>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Endereço</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Av. Rio Branco, 1"/></div>
            <Input label="Cidade *" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Rio de Janeiro"/>
            <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="RJ"/>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">CEP {cepLoading && <span className="text-[#0f2a5e] font-normal ml-1">Buscando...</span>}</label>
              <input type="text" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e]"
                value={form.cep} onChange={e=>set("cep",e.target.value)} onBlur={handleCEPBlur} placeholder="20090-003" maxLength={9}/>
            </div>
          </div>
        </Card>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          ✉️ Após cadastrar, o franqueado recebe e-mail de boas-vindas com login e senha de acesso ao sistema.
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={()=>router.back()}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading?"Cadastrando...":"Cadastrar Franqueado"}</Button>
        </div>
      </div>
    </div>
  );
}
