"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function InstituicaoEdit({ instituicao }: { instituicao: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: instituicao.name || "",
    razaoSocial: instituicao.razaoSocial || "",
    cnpj: instituicao.cnpj || "",
    tipo: instituicao.tipo || "Privada",
    email: instituicao.email || "",
    telefone: instituicao.telefone || "",
    coordenador: instituicao.coordenador || "",
    cargoCoord: instituicao.cargoCoord || "",
    endereco: instituicao.endereco || "",
    cidade: instituicao.cidade || "",
    uf: instituicao.uf || "",
    cep: instituicao.cep || "",
    site: instituicao.site || "",
    cursos: (instituicao.cursos || []).join(", "),
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch(`/api/app/instituicoes/${instituicao.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cursos: form.cursos.split(",").map((c: string) => c.trim()).filter(Boolean),
      }),
    });
    if (res.ok) { setMsg("Salvo com sucesso! ✓"); router.refresh(); }
    else { setMsg("Erro ao salvar."); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {msg && <p className={`text-sm font-bold ${msg.includes("Erro")?"text-red-500":"text-emerald-600"}`}>{msg}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome *" value={form.name} onChange={e=>set("name",e.target.value)}/>
        <Input label="Razão Social" value={form.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)}/>
        <Input label="CNPJ" value={form.cnpj} onChange={e=>set("cnpj",e.target.value)}/>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Tipo</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white" value={form.tipo} onChange={e=>set("tipo",e.target.value)}>
            {["Publica Federal","Publica Estadual","Privada","Tecnica","EJA","Outro"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <Input label="E-mail" type="email" value={form.email} onChange={e=>set("email",e.target.value)}/>
        <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)}/>
        <Input label="Coordenador(a)" value={form.coordenador} onChange={e=>set("coordenador",e.target.value)}/>
        <Input label="Cargo" value={form.cargoCoord} onChange={e=>set("cargoCoord",e.target.value)}/>
        <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)}/></div>
        <Input label="Cidade" value={form.cidade} onChange={e=>set("cidade",e.target.value)}/>
        <div className="grid grid-cols-2 gap-2">
          <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)}/>
          <Input label="CEP" value={form.cep} onChange={e=>set("cep",e.target.value)}/>
        </div>
        <Input label="Site" value={form.site} onChange={e=>set("site",e.target.value)} placeholder="www.instituicao.edu.br"/>
        <div className="col-span-2">
          <Input label="Cursos (separados por vírgula)" value={form.cursos} onChange={e=>set("cursos",e.target.value)} placeholder="Administração, Contabilidade, Marketing..."/>
        </div>
      </div>
      <Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar Alterações"}</Button>
    </div>
  );
}
