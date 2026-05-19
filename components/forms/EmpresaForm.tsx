"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const SETORES = ["Tecnologia","Saúde","Educação","Financeiro","Varejo","Indústria","Serviços","Agronegócio","Logística","Jurídico","Contabilidade","Outro"];

interface Props {
  franchiseId: string;
  empresa?: any;
  onSuccess?: () => void;
}

export function EmpresaForm({ franchiseId, empresa, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name:             empresa?.name             || "",
    razaoSocial:      empresa?.razaoSocial      || "",
    cnpj:             empresa?.cnpj             || "",
    setor:            empresa?.setor            || "",
    email:            empresa?.email            || "",
    telefone:         empresa?.telefone         || "",
    responsavel:      empresa?.responsavel      || "",
    cargoResponsavel: empresa?.cargoResponsavel || "",
    endereco:         empresa?.endereco         || "",
    bairro:           empresa?.bairro           || "",
    cidade:           empresa?.cidade           || "",
    uf:               empresa?.uf               || "",
    cep:              empresa?.cep              || "",
    site:             empresa?.site             || "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.cnpj || !form.email || !form.cidade) {
      setError("Preencha os campos obrigatórios: Nome, CNPJ, E-mail e Cidade."); return;
    }
    setLoading(true); setError("");
    try {
      if (empresa) {
        await updateCompany(empresa.id, form);
      } else {
        await createCompany({ ...form, franchiseId });
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/empresas");
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message?.includes("cnpj") ? "CNPJ já cadastrado no sistema." : "Erro ao salvar. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Dados da Empresa</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome Fantasia *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="TechCorp"/>
          <Input label="Razão Social" value={form.razaoSocial} onChange={e=>set("razaoSocial",e.target.value)} placeholder="TechCorp Brasil Ltda."/>
          <Input label="CNPJ *" value={form.cnpj} onChange={e=>set("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Setor</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f2a5e] bg-white"
              value={form.setor} onChange={e=>set("setor",e.target.value)}>
              <option value="">Selecione...</option>
              {SETORES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <Input label="E-mail *" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="rh@empresa.com.br"/>
          <Input label="Telefone" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(11) 99999-0000"/>
          <Input label="Site" value={form.site} onChange={e=>set("site",e.target.value)} placeholder="www.empresa.com.br"/>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Responsável</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome do Responsável" value={form.responsavel} onChange={e=>set("responsavel",e.target.value)} placeholder="João Silva"/>
          <Input label="Cargo" value={form.cargoResponsavel} onChange={e=>set("cargoResponsavel",e.target.value)} placeholder="Diretor de RH"/>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Av. Paulista, 1000"/></div>
          <Input label="Bairro" value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Bela Vista"/>
          <Input label="Cidade *" value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="São Paulo"/>
          <Input label="UF" value={form.uf} onChange={e=>set("uf",e.target.value)} placeholder="SP"/>
          <Input label="CEP" value={form.cep} onChange={e=>set("cep",e.target.value)} placeholder="01310-100"/>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onSuccess || (() => router.back())}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : empresa ? "Salvar Alterações" : "Cadastrar Empresa"}
        </Button>
      </div>
    </div>
  );
}
